import sqlite3

def parse_mtga_sqlite(path: str) -> dict[int, dict]:
    """Return {GrpId: {name, set, collector_number}} from one .mtga SQLite file."""
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        cur = conn.cursor()
        tables = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "Cards" not in tables or "Localizations" not in tables:
            return {}
        loc = {}
        try:
            rows = cur.execute("SELECT Id, Text FROM Localizations WHERE Format LIKE '%en-US%' OR Format IS NULL")
        except sqlite3.Error:
            rows = cur.execute("SELECT Id, Text FROM Localizations")
        for lid, text in rows.fetchall():
            if text:
                loc[lid] = text
        cols = {r[1] for r in cur.execute("PRAGMA table_info(Cards)")}
        sel_set = "ExpansionCode" if "ExpansionCode" in cols else "NULL"
        sel_cn = "CollectorNumber" if "CollectorNumber" in cols else "NULL"
        lookup = {}
        for grp, title, set_code, cn in cur.execute(
            f"SELECT GrpId, TitleId, {sel_set}, {sel_cn} FROM Cards"
        ):
            if title in loc:
                lookup[grp] = {
                    "name": loc[title],
                    "set": set_code or "",
                    "collector_number": str(cn) if cn else "",
                }
        return lookup
    finally:
        conn.close()
