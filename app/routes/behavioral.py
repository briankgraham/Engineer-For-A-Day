"""Behavioral: the AI interviewer chat and grading a finished answer."""
from ..chat import chat_messages
from ..features.behavioral import MSG_CAP, grade_bh, interviewer_system, question_fields
from .router import post


@post("/api/bh/chat", max_body=262144)
def chat(h, body):
    f = question_fields(body)
    messages = chat_messages(body, cap=MSG_CAP)
    asked = sum(m["role"] == "assistant" for m in messages)
    h.stream_chat(interviewer_system(f, asked), messages)


@post("/api/bh/grade", max_body=262144)
def grade(h, body):
    h.send(200, grade_bh(body))
