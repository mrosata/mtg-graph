from __future__ import annotations

from mtga_export.export import resolve_rows, to_json_array, to_txt

LOOKUP = {
    70000: {"name": "Abrade", "set": "DMU", "collector_number": "131"},
    70001: {"name": "Abrade", "set": "DMU", "collector_number": "131"},  # dup printing
    70002: {"name": "Sheoldred", "set": "DMU", "collector_number": "107"},
}

def test_resolve_rows_merges_by_name_set():
    rows = resolve_rows({70000: 2, 70001: 2, 70002: 1}, LOOKUP)
    abrade = next(r for r in rows if r["name"] == "Abrade")
    assert abrade["count"] == 4
    assert {"count": 1, "name": "Sheoldred", "set": "DMU", "cn": "107"} in rows

def test_to_json_array_shape():
    rows = [{"count": 4, "name": "Abrade", "set": "DMU", "cn": "131"}]
    assert to_json_array(rows) == rows  # already the app's expected shape

def test_to_txt_format():
    rows = [{"count": 4, "name": "Abrade", "set": "DMU", "cn": "131"}]
    assert to_txt(rows) == "4 Abrade (DMU)\n"
