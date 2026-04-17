import pytest

def test_add_drawer_generates_id(palace):
    drawer_id = palace.add_drawer(wing="work", room="auth", content="Token expiry logic here")
    assert drawer_id.startswith("work_auth_")

def test_list_wings_returns_added_wings(palace):
    palace.add_drawer(wing="work", room="auth", content="content a")
    palace.add_drawer(wing="personal", room="notes", content="content b")
    wings = palace.list_wings()
    assert "work" in wings
    assert "personal" in wings

def test_get_drawers_for_wing(palace):
    palace.add_drawer(wing="work", room="auth", content="auth content")
    palace.add_drawer(wing="personal", room="notes", content="personal content")
    drawers = palace.get_drawers(wing="work")
    assert all(d["wing"] == "work" for d in drawers)
    assert len(drawers) == 1

def test_delete_drawer(palace):
    drawer_id = palace.add_drawer(wing="work", room="auth", content="to delete")
    palace.delete_drawer(drawer_id=drawer_id)
    drawers = palace.get_drawers(wing="work")
    assert len(drawers) == 0

def test_drawer_count(palace):
    palace.add_drawer(wing="work", room="auth", content="a")
    palace.add_drawer(wing="work", room="billing", content="b")
    assert palace.count() == 2
