"""In-memory bounded LRU cache with Time-To-Live (TTL) for Gemini creative ideas."""

import hashlib
import json
import threading
import time
from collections import OrderedDict

from app.models import CreativeIdeas, EventInput


class IdeasCache:
    """Thread-safe bounded in-memory LRU cache with TTL."""

    def __init__(self, max_size: int = 128, ttl_seconds: int = 3600) -> None:
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, tuple[float, CreativeIdeas]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> CreativeIdeas | None:
        """Retrieve a cached entry if present and not expired."""
        with self._lock:
            if key not in self._cache:
                return None
            created_at, ideas = self._cache[key]
            if time.time() - created_at > self.ttl_seconds:
                del self._cache[key]
                return None
            # Move to end to indicate recent use (LRU)
            self._cache.move_to_end(key)
            return ideas

    def set(self, key: str, ideas: CreativeIdeas) -> None:
        """Store ideas in cache. Fallback results must NOT be stored."""
        if ideas.source != "ai":
            return

        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = (time.time(), ideas)
            if len(self._cache) > self.max_size:
                # Evict oldest entry
                self._cache.popitem(last=False)

    def clear(self) -> None:
        """Evict all entries from the cache."""
        with self._lock:
            self._cache.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)


# Global singleton cache instance
ideas_cache = IdeasCache()


def compute_cache_key(event: EventInput, refinement: str | None = None) -> str:
    """Generate a deterministic SHA-256 fingerprint from sanitized event parameters and refinement."""
    key_dict = {
        "event_type": event.event_type.value,
        "event_date": event.event_date.isoformat(),
        "guest_count": event.guest_count,
        "budget_inr": event.budget_inr,
        "city": event.city.strip().lower(),
        "city_tier": event.city_tier.value,
        "dietary_preferences": sorted([d.value for d in event.dietary_preferences]),
        "indoor_outdoor": event.indoor_outdoor.value,
        "age_group": event.age_group.value if event.age_group else None,
        "theme_notes": event.theme_notes.strip().lower(),
        "refinement": (refinement or "").strip().lower(),
    }
    raw_payload = json.dumps(key_dict, sort_keys=True)
    return hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()
