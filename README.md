# KARD v4 · the registry duel goes online

A sovereign 3D collectible card game where every card is a GitHub repo. v4 extends v3 (3D Hearthstone-style table · registry-driven cards · IDB persistence · KONOMI NFT hook) with four new feature jumps:

1. **Import any GitHub repo** — paste a URL, fetch metadata via the GitHub API, mint a card into your collection.
2. **Konomi compliance scorer** — a 7-point check against v20.4 doctrine. Score ≥5 = elite (visual + stat buff). 7/7 = KONOMI MASTER (rainbow frame, all abilities).
3. **Multiplayer over PeerJS** — peer-to-peer real-time duels through the free public PeerJS broker (WebRTC). Async fallback via challenge files.
4. **LinkedIn share** — generates a 1200×627 battle-result PNG and opens the LinkedIn composer pre-filled.

Single HTML file · vanilla JS + Three.js + PeerJS · runs from `file://` · ◊·κ=1.

---

## For users · how to play

1. Open `index.html` in any modern browser.
2. **Build a deck** in the left panel. 30 cards · max 2 copies (1 for legendaries). Use `auto deck` if you don't care to curate.
3. **Click "new match"** to start vs the AI, or **"⚔ play online"** to duel a human via PeerJS.
4. Click a card in your hand to play it. Click your own minion, then a target, to attack.
5. After the match, the share modal opens with a downloadable PNG you can attach to LinkedIn.

### Shortcuts

- **Ctrl/Cmd + K** — Ω autopilot palette (router for every feature; supports `import owner/repo`, `play online`, `share`, `elite`, `legendaries`, faction names)
- **Shift + click** any card — open its detail modal (with full konomi compliance report)
- **Right-click** any card in the pool — same as shift-click
- **Esc** — close any modal

### Import any repo

Click **"+ import repo"** in the top bar. Paste any of:

- `owner/repo`
- `github.com/owner/repo`
- `https://github.com/owner/repo`

The game fetches the repo's metadata via the public GitHub API, runs the 7-check konomi compliance scorer against its raw `index.html` / `README.md` / `LICENSE`, derives the card's prime + faction + stats, and adds it to your collection. Persisted in IndexedDB so it's there next time.

### Play online (multiplayer over PeerJS)

Click **"⚔ play online"**. Your peer ID appears at the top of the modal — share it with your opponent. Or paste theirs and click `connect`. Both players exchange decks over the WebRTC data channel, then play live. Each action (play, attack, end turn) is broadcast as a small JSON message.

If the live connection fails or you'd rather play turn-by-turn, switch to the **async** tab: export your turn as a `.kard.json` challenge file, send it to your opponent (Signal / Slack / email), they import it, take their turn, export back. PGN-style.

### Share to LinkedIn

After any match ends, a share modal pops up automatically with a 1200×627 result card. Click `download PNG`, then `open LinkedIn composer` — LinkedIn's URL deep-link is pre-filled with your post text. Attach the PNG manually in the composer (LinkedIn's API does not allow direct image attach via deep-link).

---

## For developers · architecture

Single HTML file. Vanilla JS modules via importmap (Three.js + PeerJS as the two declared CDN exceptions).

### Files

- `index.html` — the tool · ~140KB · single sovereign artifact
- `archive/v2.html`, `archive/v3.html` — predecessors, untouched
- `LICENSE` — MIT
- `.nojekyll` — Pages legacy deploy

### Key extension points (search the source)

| Symbol | What it does |
|---|---|
| `repoToCard(app)` | Pure function: app metadata → game card. Honours `app.konomi` for stat bonus. |
| `importAnyRepo(url, onProgress)` | Full pipeline: parse URL → GitHub API → konomi scorer → `repoToCard` → IDB persist → re-render pool. |
| `checkKonomiCompliance(owner, repo, repoMeta)` | The 7-check scanner. Fetches `main` or `master` branch, runs every check in `KONOMI_CHECKS`. |
| `KONOMI_CHECKS` | The 7-check array. Each item: `{id, label, test(html, repoMeta, licence, readme) → bool}`. |
| `parseRepoUrl(s)` | Accepts `owner/repo`, `github.com/owner/repo`, or full HTTPS URL. |
| `MP` | PeerJS multiplayer manager: `init`, `connect`, `attach`, `send`, `onData`, `disconnect`. |
| `asyncExport()` / `asyncImport(file)` | Challenge-file flow. JSON includes deck, board, hand, hp, mana — perspective-flipped on import. |
| `paintShareCanvas()` / `downloadSharePNG()` / `openLinkedInShare()` | Battle-result PNG generator + LinkedIn deep-link. |
| `window.KARD` | Console hook exposing `state`, `Game`, `Scene`, `MP`, `importAnyRepo`, `checkKonomiCompliance`, `KONOMI_CHECKS`, etc. |

### Konomi compliance scoring · the elite multiplier

The 7 checks, applied against any imported repo:

1. **KONOMI sovereign shim** — `window.KONOMI =` present in `index.html`
2. **fall-signal mesh hook** — `new BroadcastChannel('fall-signal')` present
3. **prime meta tag** — `<meta name="prime" content="...">` present
4. **single-file sovereign** — repo size < 500 KB AND has `<script>` AND no `node_modules`
5. **<400KB build gate** — `index.html` length < 409600 bytes
6. **MIT licence** — `LICENSE` contains "MIT"
7. **two-audience README** — `README.md` contains both a dev-facing section AND a user-facing section

Stat bonuses derived from score:

| Score | Tier | Bonus | Frame |
|---|---|---|---|
| 0–2 | standard | none | brass |
| 3–4 | well-formed | +1/+1 | brass+shoulder |
| 5–6 | **ELITE** | +2/+2 | amber glow |
| 7 | **KONOMI MASTER** | +3/+3 + all 7 abilities | rainbow, animated |

### Multiplayer protocol

Wire messages over the PeerJS data channel (all small JSON):

```js
{type:'hello',   name:string, deck:Card[]}
{type:'play',    handIdx:int, target:Target|null, uid:string}
{type:'attack',  attackerIdx:int, target:Target}
{type:'endturn'}
{type:'over',    winner:'me'|'foe'|'draw'}
{type:'chat',    text:string}
```

Authoritative state lives on whichever player's turn it is. Simple but works for friendly play — no anti-cheat.

### Forked-instance detection

When KARD is loaded from a fork (`location.hostname` matches `<owner>.github.io` and `owner !== 'sjgant80-hub'`), it best-effort seeds the pool with up to 5 of the owner's repos via the GitHub API. Documented in `loadRegistry()`.

### Estate plumbing (preserved from v3)

- `window.KONOMI` shim (sovereign tier · prime 787 · `check()` returns ok)
- `window.KONOMI.nft.{mint,verify,transfer,list}` · `_impl: 'localStorage-stub'` · swap for chain when ready
- `BroadcastChannel('fall-signal')` hello/ping handshake
- `window.addEventListener('message')` action router (`ping`, `cards`, `mint`, **`import`** new in v4)

---

## v3 → v4 changelog

### Added

- **§1 importAnyRepo + parseRepoUrl** — full repo-agnostic import path.
- **§2 KONOMI_CHECKS + checkKonomiCompliance** — 7-point scorer, score-based stat multiplier (+0/+1/+2/+3), elite/master visual tiers, all-abilities buff at 7/7.
- **§3 MP module + PeerJS CDN script** — live peer-to-peer matches with deck exchange, action broadcast, disconnect handling.
- **§3b async challenge-file mode** — export/import `.kard.json` for turn-by-turn async play.
- **§4 paintShareCanvas + LinkedIn deep-link** — 1200×627 result PNG + composer pre-fill.
- IDB store: `imported` (persists fetched-from-github cards across reloads).
- Settings: `displayName` (used as MP handle + on share card).
- Forked-instance owner-repo seeding.
- Top bar buttons: `+ import repo`, `⚔ play online`, multiplayer status badge.
- Palette entries: `import a GitHub repo`, `play online`, `find KONOMI master cards`, `find elite cards`, `share last match`.
- `postMessage` action: `import` (mesh-driven repo imports).
- Card detail modal: full 7-check pass/fail report when card has konomi data.
- `Game.computeMVP()` + per-side damage tracking for the share PNG.
- `dominantFaction()` helper for the share card.

### Changed

- `repoToCard()` now honours `app.konomi` for kBonus stat multiplier and propagates `elite`/`konomiMaster` flags.
- `abilityFor()` grants all 7 abilities when `app.konomi.konomiMaster === true`.
- `Game.newMatch(opponent?)` accepts an opponent object `{deck, name}` for multiplayer; falls back to AI deck builder when absent.
- `Game.playCard` / `Game.attack` / `Game.endTurn` broadcast to peer when `state.match.multiplayer`.
- `Game.endMatch` records `multiplayer`, `opponentName`, `myFaction`, `foeFaction`, `mvp` in the IDB match row; auto-opens share modal.
- `loadRegistry()` merges any previously-imported repos from IDB and detects forked instances.
- Card pool rendering: elite/master classes, k-badge, kBonus label in sub.
- Hand cards: elite/master classes with extra glow + animation.
- `<meta name="prime" content="787">` added (so v4 itself passes its own scorer).
- IDB version bumped: `kard-v3` → `kard-v4` (fresh DB; v3 data preserved separately).

### Preserved (every v3 feature still works)

- Registry fetch + ~50-card fallback pool
- Deck builder (30 cards · ≤2 copies · 1 legendary cap · curve · auto-build · slots)
- 3D hex table · heroes · mana crystals · deck stacks
- Procedural card art (2D canvas + 3D texture)
- Hover/drag/summon/attack/death animations
- Turn-based loop (now AI **or** human)
- IDB match history + deck slots
- Card detail modal (extended, not replaced)
- `window.KONOMI.nft.{mint,verify,transfer,list}` interface
- Ω autopilot Ctrl+K palette (extended router)
- Three.js + OrbitControls imports
- fall-signal mesh hello/pong
- postMessage ping/cards/mint actions

---

## CDN exceptions (declared)

- `three@0.160.0` — 3D table + cards (inherited from v3)
- `peerjs@1.5.4` — WebRTC multiplayer (new in v4, documented in brief)

Both load from `unpkg`. No npm, no build step, no server.

---

## License

MIT · Copyright (c) 2026 Simon Gant · sjgant80-hub

prime 787 · 787 mod 127 = 25 = 5² · double-hot mark · ◊·κ=1
