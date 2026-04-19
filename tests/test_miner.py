import pytest
from pathlib import Path
from memory.miner import mine_directory, chunk_text

def test_chunk_text_splits_on_double_newline():
    text = "Block one.\n\nBlock two.\n\nBlock three."
    chunks = chunk_text(text, max_chars=800)
    assert len(chunks) == 3

def test_chunk_text_splits_long_block():
    long_block = "x " * 500  # 1000 chars
    chunks = chunk_text(long_block, max_chars=800)
    assert len(chunks) >= 2
    assert all(len(c) <= 850 for c in chunks)  # allows slight overlap

def test_mine_directory_creates_drawers(nexus, tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "auth.py").write_text("def check_token(token):\n    return token is not None\n\nThis handles auth logic.")
    count_before = nexus.count()
    mine_directory(nexus=nexus, path=str(src), wing="work")
    assert nexus.count() > count_before

def test_mine_directory_skips_binary_files(nexus, tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "image.png").write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    count_before = nexus.count()
    mine_directory(nexus=nexus, path=str(src), wing="work")
    assert nexus.count() == count_before

def test_mine_directory_infers_room_from_filename(nexus, tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "billing.py").write_text("Billing module content here.\n\nHandles subscriptions.")
    mine_directory(nexus=nexus, path=str(src), wing="work")
    drawers = nexus.get_drawers(wing="work", room="billing")
    assert len(drawers) > 0
