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
