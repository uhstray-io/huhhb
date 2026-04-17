"""Extra palace tests covering previously uncovered branches."""


def test_get_drawers_filters_by_room(palace):
    """Covers the room filter branch on palace.py line 32."""
    palace.add_drawer(wing="work", room="auth", content="auth content")
    palace.add_drawer(wing="work", room="billing", content="billing content")
    drawers = palace.get_drawers(wing="work", room="auth")
    assert len(drawers) == 1
    assert drawers[0]["room"] == "auth"


def test_get_drawers_no_room_filter_returns_all(palace):
    palace.add_drawer(wing="work", room="auth", content="auth content")
    palace.add_drawer(wing="work", room="billing", content="billing content")
    drawers = palace.get_drawers(wing="work", room=None)
    assert len(drawers) == 2


def test_search_with_wing_filter(palace):
    palace.add_drawer(wing="work", room="auth", content="FastAPI authentication endpoint")
    palace.add_drawer(wing="personal", room="notes", content="personal reminder notes")
    results = palace.search(query="authentication", wing="work", n_results=5)
    assert all(r["wing"] == "work" for r in results)
