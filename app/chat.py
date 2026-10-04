"""Validation of chat message lists sent by the browser."""
from .errors import ApiError


def chat_messages(body, cap=4000):
    msgs = body.get("messages")
    if not isinstance(msgs, list) or not 1 <= len(msgs) <= 30:
        raise ApiError(400, "Bad messages.")
    out = []
    for i, m in enumerate(msgs):
        want = "user" if i % 2 == 0 else "assistant"
        if not isinstance(m, dict) or m.get("role") != want or not isinstance(m.get("content"), str) or not 0 < len(m["content"]) <= cap:
            raise ApiError(400, "Bad messages.")
        out.append({"role": want, "content": m["content"]})
    if out[-1]["role"] != "user":
        raise ApiError(400, "Bad messages.")
    return out
