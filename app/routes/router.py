"""Route registry: handlers register with @get / @post; the HTTP handler looks them up by path.

GET handlers are called as fn(h, query) with query from parse_qs; POST handlers as fn(h, body) with the parsed JSON object.
`h` is the request handler (see http.py): h.send(...) for JSON/files, h.stream_chat(...) for streamed replies.
"""

GET, POST = {}, {}


def get(*paths):
    def register(fn):
        for p in paths:
            GET[p] = fn
        return fn
    return register


def post(*paths, max_body=65536):
    def register(fn):
        for p in paths:
            POST[p] = (fn, max_body)
        return fn
    return register


def first(query, key):
    return (query.get(key) or [""])[0]
