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

def test_raw_path_globs_includes_mac_locations():
    globs = raw_path_globs("darwin")
    joined = " ".join(globs)
    # native macOS Epic build
    assert "com.wizards.mtga/Downloads/Raw" in joined
    # Windows-under-Wine wrappers
    assert "Whisky" in joined and "CrossOver" in joined
    assert all(g.endswith("Downloads/Raw") for g in globs)


def test_parse_mtga_sqlite_macos_localizations_enus(tmp_path):
    # macOS Epic schema: names live in Localizations_enUS(LocId, Formatted, Loc),
    # while the plain Localizations table only has LocId.
    db = tmp_path / "Raw_CardDatabase.mtga"
    conn = sqlite3.connect(str(db))
    conn.execute("CREATE TABLE Localizations (LocId INTEGER)")
    conn.execute("CREATE TABLE Localizations_enUS (LocId INTEGER, Formatted INTEGER, Loc TEXT)")
    conn.execute("CREATE TABLE Cards (GrpId INTEGER, TitleId INTEGER, ExpansionCode TEXT, CollectorNumber TEXT)")
    conn.execute("INSERT INTO Localizations_enUS VALUES (10, 0, 'Bleachbone Verge')")
    conn.execute("INSERT INTO Cards VALUES (95052, 10, 'DFT', '254')")
    conn.commit()
    conn.close()
    lookup = parse_mtga_sqlite(str(db))
    assert lookup[95052] == {"name": "Bleachbone Verge", "set": "DFT", "collector_number": "254"}

def test_raw_path_globs_windows():
    globs = raw_path_globs("win32")
    assert any("Steam" in g for g in globs)

def test_name_to_id_lowercases():
    lookup = {70000: {"name": "Abrade", "set": "DMU", "collector_number": "131"}}
    assert name_to_id(lookup)["abrade"] == 70000
