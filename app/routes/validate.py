"""Validation of ids, languages and models that come from the browser."""
import re

from ..config import LANGS, MODEL, MODELS, req_state
from ..data import PROBLEMS, SD_PROBLEMS
from ..errors import ApiError


def slug(raw):
    if not isinstance(raw, str) or not re.fullmatch(r"[a-z0-9-]{1,120}", raw) or raw not in PROBLEMS:
        raise ApiError(404, "Unknown problem.")
    return raw


def sd_id(raw):
    if not isinstance(raw, str) or not re.fullmatch(r"[a-z0-9-]{1,80}", raw) or raw not in SD_PROBLEMS:
        raise ApiError(404, "Unknown problem.")
    return raw


def lang(raw):
    if raw is None or raw == "":
        return "python"
    if raw not in LANGS:
        raise ApiError(400, "Unsupported language.")
    return raw


def set_model(raw):
    if raw is None or raw == "":
        raw = MODEL
    if not isinstance(raw, str) or raw not in dict(MODELS):
        raise ApiError(400, "Unknown model.")
    req_state.model = raw
