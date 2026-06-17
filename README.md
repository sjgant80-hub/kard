# KARD v5 · the registry duel · fun + elite

Sovereign single-HTML 3D collectible card game. Every card is a GitHub repo (or a starter card if you have none). Two front doors: **Fun Mode** for one-click play, **Elite Mode** for the full v4 power-user surface.

> prime **787** · ◊·κ=1 · MIT · single HTML · runs from `file://`

---

## For the curious — Fun Mode (default)

Click **▶ PLAY** on the landing screen. That's it.

- The game auto-builds a 30-card deck from any GitHub repos you've imported plus the deterministic 30-card **starter pool**.
- You face the AI immediately. No deck-builder. No login. No Konomi vocabulary.
- Card detail in Fun Mode shows only what matters: cost, attack, health, faction, ability text.
- After the match: a clean **WIN/LOSS** overlay with a **▶ play again** button.

Auto-deck logic:

```
0 repos imported  → 30 starter cards
7 repos imported  → 7 of yours + 23 starter
30+ repos        → 30 of yours (deterministic top-30 by prime ascending)
```

The brand mark (top-left) or **← back to landing** in-match returns to the door.

---

## For the architects — Elite Mode (the full v4 experience)

Click **⚔ ELITE MODE** on the landing screen.

Everything KARD v4 shipped, unchanged:

- 30-card **deck builder** with mana-curve histogram, ≤2 copies + 1 legendary cap
- **+ import repo** — any public GitHub repo, scored against the 7-check Konomi compliance gate
- **Konomi compliance scoring** — score ≥5 = ELITE (amber frame, +2 stats), 7/7 = KONOMI MASTER (rainbow frame, +3 stats, all abilities)
- **⚔ play online** — live PeerJS multiplayer or async `.kard.json` challenge files
- **LinkedIn share** — generates a 1200×627 PNG of the match result
- **NFT mint** via `window.KONOMI.nft` (sovereign IDB stub · `KONOMI_NFT_HOOK` marker)
- **Ω autopilot** palette (Ctrl+K) · T0 keyword → T3 LLM fallback (Anthropic / OpenAI / Gemini / OpenRouter)
- Card detail modal with full 7-check Konomi report + prime breakdown + spine factorisation

A toggle in the deck builder lets you **show starter cards in pool** if you want to draft with them on purpose.

---

## Starter Deck reference (30 balanced cards)

Hand-tuned curve **4×1 / 6×2 / 6×3 / 5×4 / 4×5 / 3×6 / 2×7 = 30**.

Public-domain-safe names, generic factionless naming, abilities limited to **Battlecry** (sparingly), stats approximately `cost N → N+1 total` body. All starter cards are flagged `isStarter:true` and are:

- Visually distinct (parchment / grey frame, "STARTER" badge)
- Excluded from Konomi compliance bonuses
- Excluded from NFT minting (`window.KONOMI.nft.mint()` throws on a starter)
- Filtered out of the Elite-Mode pool by default (toggle to include)

| Cost | Cards |
| ---: | ---   |
| 1 | Novice Pixel · Stray Byte · Copper Coin · Quill Scratch |
| 2 | Iron Rune · Watcher Eye · Foundry Rat · Tin Acolyte · Broker Clerk · Town Crier |
| 3 | Ledger Keeper · Grid Warden · Glass Augur · Cobalt Scribe · Bramble Mage · Banner Herald |
| 4 | Merchant Knight · Arc Priest · Loom Witch · Mint Warden · Field Cartographer |
| 5 | Marble Justicar · Bonded Mason · Velvet Baron · Ember Herald |
| 6 | Bronze Archon · Sigil Master · Storm Baron |
| 7 | Iron Titan · Amber Archon |

---

## v4 → v5 changelog

Additions only — v4 logic is preserved verbatim behind Elite Mode.

- **Landing screen mode router** — two equal-weight choices (`▶ PLAY` / `⚔ ELITE MODE`) replaces the cold-start v4 deck-builder dump
- **`state.mode`** — `'landing' | 'fun' | 'elite'` · persisted in IDB so returning users see their last door first (still routed through the landing on cold-start unless `#fun` / `#elite` URL hint is used)
- **`STARTER_DECK`** — the 30-card deterministic balanced pool, baked into the file
- **`buildAutoDeck()`** — combines imported repo cards (up to 30, sorted by prime ascending) with starter cards to pad to exactly 30
- **Split match-history buckets** — `history` panel filters by current mode so Fun stats don't muddle Elite
- **Card detail simplified in Fun Mode** — only name/cost/attack/health/ability text; no prime, no spine, no 7-check report, no NFT button
- **Fun Mode after-match** — clean WIN/LOSS overlay with rematch; no LinkedIn modal (Elite only)
- **Topbar adapts** — Fun Mode hides import-repo / multiplayer / settings / Ω autopilot / tier badge; Elite Mode shows them all
- **Starter pool toggle** in Elite Mode deck builder (show/hide starter cards)
- **PWA / mesh / KONOMI** identifiers updated from `kard-v4` → `kard-v5` (prime 787 unchanged)

---

## Architecture (developers)

Single sovereign HTML file. ~140KB target. Vanilla JS + `<script type="module">`. Two declared CDN exceptions: **Three.js** (3D scene) and **PeerJS** (multiplayer).

```
index.html              # the whole app
  ├── manifest          # PWA via data: URL
  ├── styles            # estate dark palette (--brass --amber --void --cream)
  ├── DOM               # topbar · 3-col layout · landing · 5 modals · palette
  └── script (module)
        ├── IDB         # 'kard-v5' DB · 6 stores (decks · matches · wallet · settings · pool · imported)
        ├── state       # { mode, settings, pool, deck, factions, match, wallet, mp }
        ├── STARTER_DECK  # 30 deterministic balanced cards (isStarter:true)
        ├── buildAutoDeck # personal imports + starter pad
        ├── repoToCard / importAnyRepo / checkKonomiCompliance  # 7-check Konomi gate
        ├── Scene       # Three.js 3D table · OrbitControls · particles
        ├── Game        # turn-based loop · greedy AI · mode-aware end screens
        ├── MP          # PeerJS live + async .kard.json export/import
        ├── Cascade     # T0 / T2 (Ollama probe) / T3 (Anthropic, OpenAI, Gemini, OpenRouter)
        ├── Palette     # Ω autopilot · Ctrl+K · keyword + LLM fallback
        ├── KONOMI shim # sovereign tier · BroadcastChannel('fall-signal') · postMessage API
        └── boot        # mode router · landing · enterMode('fun' | 'elite')
```

`window.KARD` exposes `{ state, Game, Scene, Cascade, MP, repoToCard, importAnyRepo, checkKonomiCompliance, parseRepoUrl, FACTIONS, ABILITY_DESC, PRIME, VERSION, TOOLNAME, STARTER_DECK, buildAutoDeck, enterMode, showLanding }` for mesh debugging.

`window.KONOMI.nft` interface (the `KONOMI_NFT_HOOK` marker): `mint(card, ownerKey)` · `verify(tokenId)` · `transfer(tokenId, to)` · `list(ownerKey)` · `_impl = 'localStorage-stub'`. Starter cards throw on mint.

---

## Versions

- v5 — fun + elite modes (this file)
- v4 — see `archive/v4.html` — repo-agnostic + Konomi-elite + multiplayer + LinkedIn
- v3 — see `archive/v3.html` — registry-driven 3D
- v2 — see `archive/v2.html` — earlier sovereign build

VERSION = `'5.0.0'` · PRIME = `787` · TOOLNAME = `'kard-v5'`

---

MIT · Copyright (c) 2026 Simon Gant · sjgant80-hub
