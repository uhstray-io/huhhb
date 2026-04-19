import click
from pathlib import Path
from memory.nexus import Nexus
from memory.miner import mine_directory
from memory.layers import assemble_context
from memory.config import load_config

@click.group()
def main():
    """uhh:memory — Uhstray.io AI memory nexus."""

@main.command()
@click.option("--nexus", "nexus_path", default=None, help="Custom nexus path")
def init(nexus_path):
    """Initialize the memory nexus."""
    cfg = load_config()
    path = nexus_path or cfg["nexus_path"]
    Path(path).mkdir(parents=True, exist_ok=True)
    nexus = Nexus(nexus_path=path)
    click.echo(f"Nexus initialized at {path}")
    click.echo(f"Drawers: {nexus.count()}")

@main.command()
@click.argument("path")
@click.option("--wing", required=True, help="Wing to mine into")
@click.option("--nexus", "nexus_path", default=None)
def mine(path, wing, nexus_path):
    """Mine a directory into the nexus."""
    cfg = load_config()
    nexus = Nexus(nexus_path=nexus_path or cfg["nexus_path"])
    count = mine_directory(nexus=nexus, path=path, wing=wing)
    click.echo(f"Mined {count} drawers into wing '{wing}'")

@main.command()
@click.argument("query")
@click.option("--wing", default=None)
@click.option("--results", "n_results", default=5)
@click.option("--nexus", "nexus_path", default=None)
def search(query, wing, n_results, nexus_path):
    """Search the nexus."""
    cfg = load_config()
    nexus = Nexus(nexus_path=nexus_path or cfg["nexus_path"])
    results = nexus.search(query=query, wing=wing, n_results=n_results)
    if not results:
        click.echo("No results found.")
        return
    for r in results:
        click.echo(f"\n[{r['id']}] ({r.get('wing','?')}/{r.get('room','?')}) dist={r.get('distance', 0):.3f}")
        click.echo(r["content"][:300])

@main.command()
@click.option("--nexus", "nexus_path", default=None)
def status(nexus_path):
    """Show nexus status."""
    cfg = load_config()
    nexus = Nexus(nexus_path=nexus_path or cfg["nexus_path"])
    click.echo(f"Drawers: {nexus.count()}")
    wings = nexus.list_wings()
    click.echo(f"Wings: {', '.join(wings) if wings else 'none'}")

@main.command("wake-up")
@click.option("--wing", default=None)
@click.option("--nexus", "nexus_path", default=None)
def wake_up(wing, nexus_path):
    """Print L0+L1 context for session start."""
    cfg = load_config()
    nexus = Nexus(nexus_path=nexus_path or cfg["nexus_path"])
    ctx = assemble_context(nexus=nexus, wing=wing)
    click.echo("=== L0: Identity ===")
    click.echo(ctx["l0"])
    click.echo(f"\n=== L1: Recent ({len(ctx['l1'])} drawers) ===")
    for d in ctx["l1"]:
        click.echo(f"[{d.get('wing','?')}/{d.get('room','?')}] {d['content'][:120]}")
