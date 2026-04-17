import pytest

def test_add_drawer_generates_id(nexus):
    drawer_id = nexus.add_drawer(wing="work", room="auth", content="Token expiry logic here")
    assert drawer_id.startswith("work_auth_")

def test_list_wings_returns_added_wings(nexus):
    nexus.add_drawer(wing="work", room="auth", content="content a")
    nexus.add_drawer(wing="personal", room="notes", content="content b")
    wings = nexus.list_wings()
    assert "work" in wings
    assert "personal" in wings

def test_get_drawers_for_wing(nexus):
    nexus.add_drawer(wing="work", room="auth", content="auth content")
    nexus.add_drawer(wing="personal", room="notes", content="personal content")
    drawers = nexus.get_drawers(wing="work")
    assert all(d["wing"] == "work" for d in drawers)
    assert len(drawers) == 1

def test_delete_drawer(nexus):
    drawer_id = nexus.add_drawer(wing="work", room="auth", content="to delete")
    nexus.delete_drawer(drawer_id=drawer_id)
    drawers = nexus.get_drawers(wing="work")
    assert len(drawers) == 0

def test_drawer_count(nexus):
    nexus.add_drawer(wing="work", room="auth", content="a")
    nexus.add_drawer(wing="work", room="billing", content="b")
    assert nexus.count() == 2
