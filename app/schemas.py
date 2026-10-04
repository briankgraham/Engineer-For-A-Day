"""JSON schemas for structured model output, plus the validator for them."""


# ---------- schema ----------
def _obj(props):
    return {"type": "object", "properties": props, "required": list(props), "additionalProperties": False}


_STR, _STRS = {"type": "string"}, {"type": "array", "items": {"type": "string"}}
SCHEMA = _obj({
    "summary": _STR,
    "statement_note": _STR,
    "approaches": {"type": "array", "items": _obj({
        "name": _STR, "idea": _STR, "insight": _STR, "time": _STR, "space": _STR, "code": _STR})},
    "trace": {"type": "array", "items": _obj({"approach": _STR, "example": _STR, "steps": _STRS})},
    "tips": _obj({"clarify": _STRS, "edge_cases": _STRS, "mistakes": _STRS, "followups": _STRS}),
})


SCHEMA_SD = _obj({
    "summary": _STR,
    "functional": _STRS,
    "non_functional": _STRS,
    "estimation": _STRS,
    "api": _STRS,
    "data_model": _STRS,
    "architecture": _obj({"overview": _STR, "components": {"type": "array", "items": _obj({"name": _STR, "role": _STR})}, "diagram": _STR}),
    "deep_dives": {"type": "array", "items": _obj({"title": _STR, "challenge": _STR, "options": _STRS, "choice": _STR})},
    "tradeoffs": _STRS,
    "failure_modes": _STRS,
    "followups": _STRS,
})


SCHEMA_SD_EVAL = _obj({
    "score": {"type": "integer"},
    "summary": _STR,
    "strengths": _STRS,
    "gaps": _STRS,
    "missing_components": {"type": "array", "items": _obj({"name": _STR, "why": _STR})},
    "suggestions": _STRS,
    "followups": _STRS,
})


SCHEMA_SD_GRADE = _obj({
    "verdict": _STR,  # "pass" or "fail"; checked in grade_sd
    "summary": _STR,
    "steps": {"type": "array", "items": _obj({"step": _STR, "score": {"type": "integer"}, "evidence": _STR})},
    "strengths": _STRS,
    "blockers": _STRS,
    "next_steps": _STRS,
})


AP_AREAS = ("decomposition", "prompting", "verification", "flaw_detection", "correctness", "communication")
# A served planted flaw: questioned or avoided it / used it, then fixed it / it shipped / heard it, did nothing either way.
AP_OUTCOMES = ("caught", "fixed_late", "shipped", "unchallenged")
SCHEMA_AP_EVAL = _obj({
    "summary": _STR,
    "scores": {"type": "array", "items": _obj({"area": _STR, "score": {"type": "integer"}, "evidence": _STR})},
    "flaws": {"type": "array", "items": _obj({"id": _STR, "outcome": _STR, "evidence": _STR})},
    "strengths": _STRS,
    "improvements": _STRS,
})
# Review scenarios: "review" (the written findings) replaces "decomposition", and each issue seeded in the PR gets an outcome.
AP_AREAS_REVIEW = ("review",) + AP_AREAS[1:]
AP_ISSUE_OUTCOMES = ("found_fixed", "found", "fixed_silently", "missed")
SCHEMA_AP_EVAL_REVIEW = _obj({
    **SCHEMA_AP_EVAL["properties"],
    "issues": {"type": "array", "items": _obj({"id": _STR, "outcome": _STR, "evidence": _STR})},
})

# Object design scenarios: "design" (design.md and the code's structure) replaces "decomposition", plus how the design took the follow-up.
AP_AREAS_LLD = ("design",) + AP_AREAS[1:]
SCHEMA_AP_EVAL_LLD = _obj({
    **SCHEMA_AP_EVAL["properties"],
    "followup_assessment": _STR,
})


DAY_AREAS = ("debugging", "code_quality", "testing", "review", "communication", "prioritization", "judgment")
DAY_TASK_OUTCOMES = ("done", "partial", "missed", "not_reached")
DAY_ISSUE_OUTCOMES = ("found", "missed")
DAY_FLAW_OUTCOMES = AP_OUTCOMES
SCHEMA_DAY_EVAL = _obj({
    "summary": _STR,
    "level": _obj({"verdict": _STR, "explanation": _STR}),  # verdict is one of BH_LEVEL_FIT; checked in evaluate_day
    "scores": {"type": "array", "items": _obj({"area": _STR, "score": {"type": "integer"}, "evidence": _STR})},
    "tasks": {"type": "array", "items": _obj({"id": _STR, "outcome": _STR, "evidence": _STR, "missed": _STRS})},
    "flaws": {"type": "array", "items": _obj({"id": _STR, "outcome": _STR, "evidence": _STR})},
    "issues": {"type": "array", "items": _obj({"id": _STR, "outcome": _STR, "evidence": _STR})},
    "strengths": _STRS,
    "improvements": _STRS,
})


PRACTICE_KINDS = ("function", "class")
PRACTICE_COMPARE = ("exact", "unordered", "first_arg_mutated")
PRACTICE_TYPES = ("plain", "list", "tree")
SCHEMA_PRACTICE = _obj({
    "statement": _STR,
    "statement_note": _STR,
    "kind": _STR,
    "function_name": _STR,
    "starter_code": _STR,
    "arg_types": _STRS,
    "return_type": _STR,
    "compare": _STR,
    "tests": {"type": "array", "items": _obj({"name": _STR, "input_json": _STR, "expected_json": _STR})},
    "reference_solution": _STR,
})


BH_AREAS = ("structure", "ownership", "scope", "results", "reflection", "communication")
BH_LEVEL_FIT = ("below", "at", "above")
SCHEMA_BH_GRADE = _obj({
    "summary": _STR,
    "level_fit": _obj({"verdict": _STR, "explanation": _STR}),  # verdict is one of BH_LEVEL_FIT; checked in grade_bh
    "scores": {"type": "array", "items": _obj({"area": _STR, "score": {"type": "integer"}, "evidence": _STR, "quote": _STR})},
    "strengths": _STRS,
    "improvements": _STRS,
    "prepare": _STRS,
})


def valid(value, schema):
    t = schema["type"]
    if t == "string":
        return isinstance(value, str)
    if t == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if t == "array":
        return isinstance(value, list) and all(valid(v, schema["items"]) for v in value)
    if t == "object":
        return (isinstance(value, dict) and set(value) == set(schema["properties"])
                and all(valid(value[k], s) for k, s in schema["properties"].items()))
    return False

