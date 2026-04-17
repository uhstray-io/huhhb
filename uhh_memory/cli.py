import click
from pathlib import Path
from uhh_memory.palace import Palace
from uhh_memory.miner import mine_directory
from uhh_memory.layers import assemble_context
from uhh_memory.config import load_config

@click.group()
def main():
    """uhh:memory — Uhstray.io AI memory palace."""

@main.command()
@click.option("--palace", "palace_path", default=None, help="Custom palace path")
def init(palace_path):
    """Initialize the memory palace."""
    cfg = load_config()
    path = palace_path or cfg["palace_path"]
    Path(path).mkdir(parents=True, exist_ok=True)
    palace = Palace(palace_path=path)
    click.echo(f"Palace initialized at {path}")
    click.echo(f"Drawers: {palace.count()}")

@main.command()
@click.argument("path")
@click.option("--wing", required=True, help="Wing to mine into")
@click.option("--palace", "palace_path", default=None)
def mine(path, wing, palace_path):
    """Mine a directory into the palace."""
    cfg = load_config()
    palace = Palace(palace_path=palace_path or cfg["palace_path"])
    count = mine_directory(palace=palace, path=path, wing=wing)
    click.echo(f"Mined {count} drawers into wing '{wing}'")

@main.command()
@click.argument("query")
@click.option("--wing", default=None)
@click.option("--results", "n_results", default=5)
@click.option("--palace", "palace_path", default=None)
def search(query, wing, n_results, palace_path):
    """Search the palace."""
    cfg = load_config()
    palace = Palace(palace_path=palace_path or cfg["palace_path"])
    results = palace.search(query=query, wing=wing, n_results=n_results)
    if not results:
        click.echo("No results found.")
        return
    for r in results:
        click.echo(f"\n[{r['id']}] ({r.get('wing','?')}/{r.get('room','?')}) dist={r.get('distance', 0):.3f}")
        click.echo(r["content"][:300])

@main.command()
@click.option("--palace", "palace_path", default=None)
def status(palace_path):
    """Show palace status."""
    cfg = load_config()
    palace = Palace(palace_path=palace_path or cfg["palace_path"])
    click.echo(f"Drawers: {palace.count()}")
    wings = palace.list_wings()
    click.echo(f"Wings: {', '.join(wings) if wings else 'none'}")

@main.command("wake-up")
@click.option("--wing", default=None)
@click.option("--palace", "palace_path", default=None)
def wake_up(wing, palace_path):
    """Print L0+L1 context for session start."""
    cfg = load_config()
    palace = Palace(palace_path=palace_path or cfg["palace_path"])
    ctx = assemble_context(palace=palace, wing=wing)
    click.echo("=== L0: Identity ===")
    click.echo(ctx["l0"])
    click.echo(f"\n=== L1: Recent ({len(ctx['l1'])} drawers) ===")
    for d in ctx["l1"]:
        click.echo(f"[{d.get('wing','?')}/{d.get('room','?')}] {d['content'][:120]}")
