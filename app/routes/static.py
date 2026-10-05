"""The page, its scripts, and the model list."""
import os

from ..config import MODEL, MODELS, SD_FILE, WEB_DIR
from .router import get

JS = "text/javascript; charset=utf-8"


def _serve(url_paths, fs_path, ctype, headers=None):
    @get(*url_paths)
    def serve(h, q):
        with open(fs_path, "rb") as f:
            h.send(200, f.read(), ctype, headers)


_serve(("/", "/index.html"), os.path.join(WEB_DIR, "index.html"), "text/html; charset=utf-8")
# Served with a CSP (a Blob worker would inherit the page's origin and network access): no fetch/XHR/WebSocket/importScripts.
_serve(("/worker.js",), os.path.join(WEB_DIR, "worker.js"), JS,
       {"Content-Security-Policy": "default-src 'none'; script-src 'unsafe-eval'; connect-src 'none'"})
for _name in ("sysdesign.js", "whiteboard.js", "jobs.js", "applications.js", "workspace.js", "aipair.js", "day.js", "assess.js", "behavioral.js"):
    _serve(("/" + _name,), os.path.join(WEB_DIR, _name), JS)
_serve(("/sysdesign_data.js",), SD_FILE, JS)


@get("/api/models")
def models(h, q):
    h.send(200, {"default": MODEL, "models": [{"id": i, "label": l} for i, l in MODELS]})
