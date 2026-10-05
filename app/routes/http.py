"""The HTTP request handler: guards, JSON in/out, route dispatch, and server-sent-event streaming for chat."""
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from ..config import ALLOWED_HOSTS, ALLOWED_ORIGINS, API_HEADER
from ..errors import ApiError
from ..llm import BACKEND, take_budget, translate
from . import aipair, applications, behavioral, day, jobs, practice, static, sysdesign, validate, walkthrough  # noqa: F401  (importing registers the routes)
from .router import GET, POST

DEFAULT_BODY_CAP = 65536


class Handler(BaseHTTPRequestHandler):
    server_version = "Walkthrough"

    def send(self, code, body, ctype="application/json", headers=None):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def _guard(self, post):
        if self.headers.get("Host") not in ALLOWED_HOSTS:
            raise ApiError(403, "Forbidden.")
        if post and self.headers.get("Origin") not in ALLOWED_ORIGINS:
            raise ApiError(403, "Forbidden.")
        if self.path.startswith("/api/") and self.headers.get("X-Requested-With") != API_HEADER:
            raise ApiError(403, "Forbidden.")

    def _run(self, post, fn):
        try:
            self._guard(post)
            fn()
        except ApiError as e:
            self.send(e.status, {"error": e.message})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            err = translate(e)
            self.send(err.status, {"error": err.message})

    def do_GET(self):
        def go():
            u = urlparse(self.path)
            q = parse_qs(u.query)
            validate.set_model((q.get("model") or [""])[0])
            fn = GET.get(u.path)
            if fn is None:
                raise ApiError(404, "Not found.")
            fn(self, q)
        self._run(False, go)

    def do_POST(self):
        def go():
            u = urlparse(self.path)
            route = POST.get(u.path)
            cap = route[1] if route else DEFAULT_BODY_CAP
            try:
                n = int(self.headers.get("Content-Length", "0"))
                if not 0 < n <= cap:
                    raise ValueError
                body = json.loads(self.rfile.read(n))
                if not isinstance(body, dict):
                    raise ValueError
            except ValueError:
                raise ApiError(400, "Bad request.")
            validate.set_model(body.get("model"))
            if route is None:
                raise ApiError(404, "Not found.")
            route[0](self, body)
        self._run(True, go)

    def stream_chat(self, system, messages, transform=None):
        take_budget()
        chunks = BACKEND.chat(system, messages)
        if transform:
            chunks = transform(chunks)
        try:
            first = next(chunks, "")
        except Exception as e:
            raise translate(e)
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        try:
            for t in (first, *chunks):
                if t:
                    self.wfile.write(b"data: " + json.dumps({"t": t}).encode() + b"\n\n")
                    self.wfile.flush()
            self.wfile.write(b'data: {"done":true}\n\n')
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as e:
            self.wfile.write(b"data: " + json.dumps({"error": translate(e).message}).encode() + b"\n\n")
