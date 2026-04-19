"""Extra layer tests covering previously uncovered branches."""
from memory.layers import assemble_context


def test_wing_filter_excludes_other_wings(nexus):
    nexus.add_drawer(wing="work", room="auth", content="work content")
    nexus.add_drawer(wing="personal", room="notes", content="personal content")
    ctx = assemble_context(nexus=nexus, wing="work")
    assert all(d["wing"] == "work" for d in ctx["l1"])
    assert len(ctx["l1"]) == 1


def test_wing_filter_none_includes_all(nexus):
    nexus.add_drawer(wing="work", room="auth", content="work content")
    nexus.add_drawer(wing="personal", room="notes", content="personal content")
    ctx = assemble_context(nexus=nexus, wing=None)
    assert len(ctx["l1"]) == 2


def test_total_drawers_reflects_count(nexus):
    nexus.add_drawer(wing="work", room="auth", content="a")
    nexus.add_drawer(wing="work", room="billing", content="b")
    ctx = assemble_context(nexus=nexus)
    assert ctx["total_drawers"] == 2
