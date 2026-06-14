import sqlite3
from mtga_export.carddb import parse_mtga_sqlite

def _make_db(path):
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE Localizations (Id INTEGER, Text TEXT, Format TEXT)")
    conn.execute("CREATE TABLE Cards (GrpId INTEGER, TitleId INTEGER, ExpansionCode TEXT, CollectorNumber TEXT)")
    conn.execute("INSERT INTO Localizations VALUES (10, 'Abrade', 'en-US')")
    conn.execute("INSERT INTO Cards VALUES (70000, 10, 'DMU', '131')")
    conn.commit()
    conn.close()

def test_parse_mtga_sqlite_maps_grpid(tmp_path):
    db = tmp_path / "data_cards.mtga"
    _make_db(str(db))
    lookup = parse_mtga_sqlite(str(db))
    assert lookup[70000] == {"name": "Abrade", "set": "DMU", "collector_number": "131"}

from mtga_export.carddb import raw_path_globs, name_to_id

def test_raw_path_globs_includes_mac_bottles():
    globs = raw_path_globs("darwin")
    joined = " ".join(globs)
    assert "Whisky" in joined and "CrossOver" in joined
    assert all("MTGA_Data/Downloads/Raw" in g for g in globs)

def test_raw_path_globs_windows():
    globs = raw_path_globs("win32")
    assert any("Steam" in g for g in globs)

def test_name_to_id_lowercases():
    lookup = {70000: {"name": "Abrade", "set": "DMU", "collector_number": "131"}}
    assert name_to_id(lookup)["abrade"] == 70000
