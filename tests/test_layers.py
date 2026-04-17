import pytest
from uhh_memory.layers import assemble_context

def test_l0_always_included(palace):
    ctx = assemble_context(palace=palace, query=None)
    assert "palace" in ctx["l0"].lower() or "memory" in ctx["l0"].lower()

def test_l1_top_drawers_returned(palace):
    palace.add_drawer(wing="work", room="auth", content="Auth system uses JWT tokens with 24h expiry.")
    palace.add_drawer(wing="work", room="billing", content="Billing runs on Stripe with monthly plans.")
    ctx = assemble_context(palace=palace, query=None)
    assert len(ctx["l1"]) <= 15
    assert all(isinstance(d, dict) for d in ctx["l1"])

def test_l2_search_results_when_query_given(palace):
    palace.add_drawer(wing="work", room="auth", content="JWT token validation happens in middleware.")
    ctx = assemble_context(palace=palace, query="token validation")
    assert len(ctx["l2"]) > 0
    assert any("token" in d["content"].lower() for d in ctx["l2"])

def test_l2_empty_when_no_query(palace):
    palace.add_drawer(wing="work", room="auth", content="some content")
    ctx = assemble_context(palace=palace, query=None)
    assert ctx["l2"] == []
