import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_cache_between_tests():
    """Throttle counters live in the cache; keep tests independent of each other."""
    cache.clear()
    yield
    cache.clear()
