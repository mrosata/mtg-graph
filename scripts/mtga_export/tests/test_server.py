import json
from mtga_export.server import build_handler_class
from mtga_export.memory.fake import FakeMemory
import struct

class _Engine:
    def __init__(self, status, payload):
        self._status, self._payload = status, payload
        self.db = {70000: {"name": "Abrade", "set": "DMU", "collector_number": "131"}}
    def scan(self, anchors=None):
        return self._status, self._payload
    def search(self, q):
        return [{"grpId": 70000, "name": "Abrade", "set": "DMU", "collectorNumber": "131"}]
    def health(self):
        return {"platform": "test", "running_as_root": True, "arena_process_found": True, "card_db_ready": True}

def test_scan_ok_returns_rows():
    engine = _Engine("ok", {70000: 4})
    handler = build_handler_class(engine)
    # exercise the pure response builder rather than sockets:
    status, body = handler.handle_scan(engine, {"anchors": []})
    assert status == 200
    assert {"count": 4, "name": "Abrade", "set": "DMU", "cn": "131"} in json.loads(body)["collection"]

def test_scan_ambiguous_status():
    engine = _Engine("ambiguous", 3)
    handler = build_handler_class(engine)
    status, body = handler.handle_scan(engine, {})
    assert json.loads(body)["status"] == "ambiguous"

def test_health_reports_api_version(tmp_path):
    from mtga_export.server import Engine, BRIDGE_API_VERSION
    (tmp_path / "arena_id_lookup.json").write_text(
        '{"100": {"name": "X", "set": "DMU", "collector_number": "1"}}'
    )
    h = Engine(tmp_path).health()
    assert h["version"] == BRIDGE_API_VERSION == 2


def test_handle_scan_deck_branch_ok():
    class DeckEngine:
        db = {70000: {"name": "Abrade", "set": "DMU", "collector_number": "131"}}
        def scan_deck(self, entries):
            assert entries == [{"name": "Abrade", "count": 4}]
            return ("ok", {70000: 4}, {"matched": 9, "total": 10})
    engine = DeckEngine()
    handler = build_handler_class(engine)
    status, body = handler.handle_scan(engine, {"deck": [{"name": "Abrade", "count": 4}]})
    assert status == 200
    out = json.loads(body)
    assert out["status"] == "ok"
    assert out["matched"] == 9 and out["total"] == 10
    assert {"count": 4, "name": "Abrade", "set": "DMU", "cn": "131"} in out["collection"]

def test_handle_scan_deck_inconclusive():
    class DeckEngine:
        db = {}
        def scan_deck(self, entries):
            return ("inconclusive", None, {"matched": 3, "total": 12})
    engine = DeckEngine()
    handler = build_handler_class(engine)
    status, body = handler.handle_scan(engine, {"deck": [{"name": "X", "count": 2}]})
    assert json.loads(body) == {"status": "inconclusive", "matched": 3, "total": 12}
