from memory.nexus import Nexus

L0_TEMPLATE = (
    "You have access to uhh:memory — Uhstray.io's team memory nexus. "
    "Use it to recall project context, decisions, and team knowledge. "
    "Search with specific queries to retrieve relevant drawers."
)

def assemble_context(*, nexus: Nexus, wing: str | None = None, query: str | None = None) -> dict:
    all_drawers = []
    for w in nexus.list_wings():
        if wing and w != wing:
            continue
        all_drawers.extend(nexus.get_drawers(wing=w))

    l1 = sorted(all_drawers, key=lambda d: d.get("created_at", "0"), reverse=True)[:15]
    l2 = nexus.search(query=query, wing=wing, n_results=5) if query else []

    return {
        "l0": L0_TEMPLATE,
        "l1": l1,
        "l2": l2,
        "total_drawers": nexus.count(),
    }
