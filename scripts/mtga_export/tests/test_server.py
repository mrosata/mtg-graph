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
