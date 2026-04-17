import os
from pathlib import Path
from uhh_memory.palace import Palace

SKIP_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".exe", ".bin", ".pyc"}
ROOM_KEYWORDS = {
    "auth": ["auth", "login", "token", "session", "password"],
    "billing": ["billing", "payment", "subscription", "invoice", "stripe"],
    "api": ["api", "endpoint", "route", "handler", "request"],
    "deploy": ["deploy", "docker", "kubernetes", "ci", "cd", "github"],
    "config": ["config", "settings", "env", "environment"],
}

def infer_room(filename: str) -> str:
    stem = Path(filename).stem.lower()
    for room, keywords in ROOM_KEYWORDS.items():
        if any(k in stem for k in keywords):
            return room
    return "general"

def chunk_text(text: str, max_chars: int = 800, overlap: int = 100) -> list[str]:
    blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
    chunks: list[str] = []
    for block in blocks:
        if len(block) > max_chars:
            for i in range(0, len(block), max_chars - overlap):
                chunks.append(block[i : i + max_chars])
        else:
            chunks.append(block)
    return chunks

def mine_directory(*, palace: Palace, path: str, wing: str) -> int:
    added = 0
    for root, _dirs, files in os.walk(path):
        for fname in files:
            fpath = Path(root) / fname
            if fpath.suffix.lower() in SKIP_EXTENSIONS:
                continue
            try:
                content = fpath.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            if len(content) < 50:
                continue
            room = infer_room(fname)
            for chunk in chunk_text(content):
                palace.add_drawer(wing=wing, room=room, content=chunk)
                added += 1
    return added
