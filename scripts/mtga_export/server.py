from __future__ import annotations
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from .carddb import load_card_db, name_to_id, name_to_ids, is_basic
from .memory import get_memory
from .scan import find_collection, find_collection_by_deck
from .export import resolve_rows

PROC_HINTS = ["MTGA.exe", "mtga", "magicthegathering", "wine", "crossover", "whisky"]

DEFAULT_PORT = 17171

class Engine:
    def __init__(self, out_dir: Path):
        self.db = load_card_db(sys.platform, out_dir / "arena_id_lookup.json")
        self._n2i = name_to_id(self.db) if self.db else {}
        self._name_to_ids = name_to_ids(self.db) if self.db else {}
        self._card_ids = set(self.db) if self.db else set()
        self._mem = None
        self._pid = None

    def _ensure_mem(self):
        if self._mem is None:
            self._mem = get_memory()
        self._pid = self._mem.find_process(PROC_HINTS)
        return self._pid is not None

    def health(self):
        import os
        root = (os.name != "nt" and os.geteuid() == 0)
        found = False
        try:
            found = self._ensure_mem()
        except Exception:
            found = False
        return {
            "platform": sys.platform,
            "running_as_root": bool(root),
            "arena_process_found": found,
            "card_db_ready": bool(self.db),
        }

    def search(self, q: str):
        q = q.lower()
        out = []
        for name, gid in self._n2i.items():
            if q in name:
                info = self.db[gid]
                out.append({"grpId": gid, "name": info["name"], "set": info["set"], "collectorNumber": info["collector_number"]})
            if len(out) >= 20:
                break
        return out

    def scan(self, anchors=None):
        if not self._ensure_mem():
            return ("no_process", None)
        return find_collection(self._mem, anchors or [], self._card_ids)

    def scan_deck(self, entries):
        if not self._ensure_mem():
            return ("no_process", None, {"matched": 0, "total": 0})
        merged: dict[str, int] = {}
        for e in entries:
            nm = str(e.get("name", "")).strip()
            if not nm or is_basic(nm):
                continue
            merged[nm.lower()] = merged.get(nm.lower(), 0) + int(e.get("count", 0))
        constraints = []
        for nm, cnt in merged.items():
            gids = self._name_to_ids.get(nm)
            if gids and cnt >= 1:
                constraints.append({"gids": gids, "count": min(cnt, 4)})
        return find_collection_by_deck(self._mem, constraints, self._card_ids)

def build_handler_class(engine: "Engine"):
    class Handler(BaseHTTPRequestHandler):
        @staticmethod
        def handle_scan(eng, body):
            if "deck" in body:
                status, payload, meta = eng.scan_deck(body["deck"])
                if status == "ok":
                    rows = resolve_rows(payload, eng.db)
                    return 200, json.dumps({"status": "ok", "collection": rows, **meta})
                return 200, json.dumps({"status": status, **meta})
            anchors = [(a["grpId"], a["quantity"]) for a in body.get("anchors", [])]
            status, payload = eng.scan(anchors=anchors or None)
            if status == "ok":
                rows = resolve_rows(payload, eng.db)
                return 200, json.dumps({"status": "ok", "collection": rows})
            return 200, json.dumps({"status": status})

        def _send(self, status, body):
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.end_headers()
            self.wfile.write(body.encode("utf-8"))

        def do_OPTIONS(self):
            self._send(204, "")

        def do_GET(self):
            u = urlparse(self.path)
            if u.path == "/api/health":
                self._send(200, json.dumps(engine.health()))
            elif u.path == "/api/cards/search":
                q = parse_qs(u.query).get("q", [""])[0]
                self._send(200, json.dumps(engine.search(q)))
            else:
                self._send(404, json.dumps({"error": "not found"}))

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b"{}"
            try:
                body = json.loads(raw or b"{}")
                if not isinstance(body, dict):
                    raise ValueError("body must be a JSON object")
            except (ValueError, json.JSONDecodeError):
                self._send(400, json.dumps({"error": "invalid JSON body"}))
                return
            if urlparse(self.path).path == "/api/scan":
                try:
                    status, payload = self.handle_scan(engine, body)
                except (KeyError, TypeError, ValueError, AttributeError):
                    self._send(400, json.dumps({"error": "malformed request body"}))
                    return
                self._send(status, payload)
            else:
                self._send(404, json.dumps({"error": "not found"}))

        def log_message(self, *args):
            pass

    return Handler

def serve(out_dir: Path, port: int = DEFAULT_PORT) -> int:
    engine = Engine(out_dir)
    handler = build_handler_class(engine)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"MTGA bridge on http://127.0.0.1:{port} — leave this open, scan from the app.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0
