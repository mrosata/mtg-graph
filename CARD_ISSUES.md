# Card tag-audit issues

Logged by `mtg-graph-card-tag-audit`. Each entry = one card with at least one tag accuracy issue. Consume entries via `mtg-graph-narrow-tag-rule` (precision fixes) or by authoring a new rule (coverage gaps).

Resolved entries are moved to `CARD_ISSUES_RESOLVED.md`.

---

## Tale of Katara and Toph  <!-- deferred from 2026-06-01 audit; needs pipeline-level enhancement -->

**Type:** Enchantment
**Mana cost:** {2}{G}

**Oracle text:**

```
Creatures you control have "Whenever this creature becomes tapped for the first time during each of your turns, put a +1/+1 counter on it."
```

**Current tags:** `(none — card is currently UNTAGGED)`

### Issues

- **missing-all**: zero tags due to anthem-style grant-quote strip — **NOT a single-rule fix**.
  - **What's wrong:** v0.13.4 normalization strips paired `"…"` granted-ability quotes before rules run, so the entire mechanical body of this card disappears. After strip the rule machinery sees only `creatures you control have .` — nothing to match.
  - **Sibling impact:** Citanul Hierophants has the same shape (`Creatures you control have "{T}: Add {G}."`) and is also zero-tagged. Audit 2026-06-01 grep found these two cards plus 17 other anthem-grant cards that DO get some tags from outside the quotes; only these two get nothing.
  - **Suggested fix:** Pipeline-level enhancement. Detect the anthem-grant frame `<subject> (?:has|have) "<inner>"` BEFORE the quote-strip step. Run the rule extractor on the inner span with an explicit "granted via anthem" marker (e.g. `evidence: 'granted: <inner-evidence>'`) and forward applicable tag matches onto the source card. Simpler interim: if the inner grant contains a recognized keyword frame (mana ability `{T}: Add {X}`, counter trigger, ETB trigger, etc.), forward just that one tag.

  This pattern is the dominant remaining source of "real card, zero tags" artifacts. Worth a focused design pass before shipping — naïve forwarding can over-tag (e.g. "Creatures you control have flying" shouldn't make the source card itself fly).

EOF
