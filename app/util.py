"""Small helpers shared across features."""
import threading

_locks, _locks_lock = {}, threading.Lock()


def key_lock(key):
    """One lock per key, so two requests for the same cache entry don't both call the model."""
    with _locks_lock:
        return _locks.setdefault(key, threading.Lock())
