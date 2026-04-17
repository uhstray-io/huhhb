"""Extra layer tests covering previously uncovered branches."""
from uhh_memory.layers import assemble_context


def test_wing_filter_excludes_other_wings(palace):
    """Covers the branch on line 13 where wing != requested wing is skipped."""
    palace.add_drawer(wing="work", room="auth", content="work content")
    palace.add_drawer(wing="personal", room="notes", content="personal content")
    ctx = assemble_context(palace=palace, wing="work")
    assert all(d["wing"] == "work" for d in ctx["l1"])
    assert len(ctx["l1"]) == 1


def test_wing_filter_none_includes_all(palace):
    palace.add_drawer(wing="work", room="auth", content="work content")
    palace.add_drawer(wing="personal", room="notes", content="personal content")
    ctx = assemble_context(palace=palace, wing=None)
    assert len(ctx["l1"]) == 2


def test_total_drawers_reflects_count(palace):
    palace.add_drawer(wing="work", room="auth", content="a")
    palace.add_drawer(wing="work", room="billing", content="b")
    ctx = assemble_context(palace=palace)
    assert ctx["total_drawers"] == 2
