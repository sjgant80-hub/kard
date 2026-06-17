# KARD v3 · the registry duel

A sovereign **single-HTML 3D collectible card game** where every card is a Fall* estate repo, pulled live from `fall-registry/index.json`. Hearthstone/MTG aesthetic. Three.js. IndexedDB. Konomi NFT hook reserved.

**Prime: 787** · 787 mod 127 = 25 = 5² · *double-hot φ-prime squared.*
**Version: 3.0.0** · MIT · ◊·κ=1

---

## For players

KARD v3 is a turn-based duel against an AI opponent. The card pool is generated **live** from the FallStudio estate — every repo in [fall-registry](https://github.com/sjgant80-hub/fall-registry) becomes a card with stats derived from its prime.

### Quick start

1. Open `index.html` (works from `file://` · no server needed)
2. Wait for the registry fetch (or fallback to bundled cards)
3. Build a 30-card deck in the left panel — click cards in the pool to add
4. Click **new match** to duel the AI
5. Play cards by clicking them in your hand · attack by clicking one of your minions then a target
6. Press **Ctrl+K** for the Ω autopilot (search cards, build decks by faction, view history)

### Game rules

- Each player starts with **30 hero HP**, **1 mana**, gains 1 max mana per turn (cap 10)
- Draw 1 at turn start · play cards from hand · attack with minions
- Minions have summoning sickness unless they have **Charge**
- Win at 0 enemy hero HP
- Max **7 minions** on board · max **10 cards** in hand
- **Fatigue**: empty deck deals escalating damage on draw

### Deck rules

- 30 cards total
- Max **2 copies** of common/rare/epic
- Max **1 copy** of legendary
- Save/load to slots in IndexedDB

---

## For builders · the algorithm

### `repoToCard(app)` — deterministic estate → card

```javascript
function repoToCard(app) {
  const prime = app.prime || 2;
  const cost  = Math.max(1, Math.min(10, Math.floor(Math.log10(prime)) + 1));
  const tier  = app.tier || 'C';
  const rarity = {A:'legendary', B:'epic', C:'rare'}[tier] || 'common';
  const baseAttack = {legendary:6, epic:4, rare:3, common:2}[rarity];
  const r = prime % 127;
  const spineWeight = countSpineFactors(r);    // 0–7 spine primes divide r
  const health = Math.max(1, Math.min(12, baseAttack + spineWeight));
  const faction = categoryToFaction(app.category);
  const ability = abilityFor(r, app);
  return { id, name, prime, cost, attack:baseAttack, health, rarity, faction, ability, app };
}
```

Cost scales with prime magnitude (`log10`): 7→1, 137→3, 1409→4. Health derives from how many spine primes factor into `prime mod 127`. So a legendary at prime 787 has `787 mod 127 = 25 = 5²` — 1 spine factor (5) — for `6 + 1 = 7 health`, plus **Spell Power** ability.

### The 8 factions

| category         | faction    | colour       | identity                          |
|------------------|------------|--------------|-----------------------------------|
| infrastructure   | ARCHITECT  | steel-blue   | constructs / draws cards          |
| enterprise       | BARON      | gold         | economy / mana generation         |
| finance          | BANKER     | deep-green   | resource manipulation             |
| creative         | MAGE       | purple       | spell-cast / transformation       |
| visualization    | SEER       | cyan         | reveal / draw / scry              |
| guild            | JUSTICAR   | silver       | counter / audit / negate          |
| sales            | HERALD     | rust-red     | charge / haste / burn             |
| productivity     | SCRIBE     | cream        | cycle / efficiency                |

### Ability table (mod-127 spine residue)

A card has every ability whose spine prime divides `prime mod 127`. Linear-spine cards (prime is literally 2, 3, 5, 7, 11, 13, 17) get **all** the abilities of their own prime as identity.

| residue %     | ability      | effect                                                |
|---------------|--------------|-------------------------------------------------------|
| % 2 (octave)  | Battlecry    | on play, deal 1 dmg to a random enemy minion          |
| % 3 (fifth)   | Pierce       | excess attack damage spills to enemy hero             |
| % 5 (φ-prime) | Spell Power  | your battlecries deal +1 while this is on board       |
| % 7 (bridge)  | Lifesteal    | damage dealt heals your hero                          |
| % 11 (lo-tri) | Charge       | can attack on the turn it is summoned                 |
| % 13 (hi-tri) | Divine Shield| ignores the first damage instance                     |
| % 17 (resolv) | Deathrattle  | on death, draw a card                                 |

### KONOMI NFT hook (`KONOMI_NFT_HOOK`)

Reserved interface for Thomas's future chain integration. Currently a sovereign localStorage/IDB stub.

```javascript
window.KONOMI.nft = {
  async mint(card, ownerKey),    // {tokenId, ownerKey, mintedAt, txHash, card, prime}
  async verify(tokenId),         // token | null
  async transfer(tokenId, to),   // updated token
  async list(ownerKey),          // tokens[]
  _impl: 'localStorage-stub'     // swap when real chain ships
};
```

Each card in the deck builder has a **mint NFT** button (in the card detail modal) that calls `KONOMI.nft.mint(card, profile.ownerKey)`, returns a SHA-256 tokenId, and persists the wallet in IDB. Right sidebar **wallet** tab lists minted tokens. Search the codebase for `KONOMI_NFT_HOOK` to find the swap-in point.

### Architecture

- **One HTML file**, no build step, no npm
- **Three.js v0.160** via importmap CDN (sole external dep, per doctrine exception)
- **IndexedDB** for decks, matches, wallet, settings, pool cache
- **Cascade T0/T2/T3**: offline T0 by default · T2 if Ollama at `127.0.0.1:11434` · T3 if any API key set
- **fall-signal** BroadcastChannel for inter-tool mesh
- **postMessage API** for iframe drives: `{target:'kard-v3', action:'ping|cards|mint'}`
- **PWA** baked via data: URL manifest
- **All estate dark palette** tokens · Cinzel serif for the Hearthstone chrome

### 3D scene

- Hexagonal table (CylinderGeometry-6) with brass torus rim
- 7 minion slots per side, dividing brass line, glowing dividers
- Procedural card textures (256×360 canvas per card) with sacred geometry derived from spine factorization
- Hero portraits at far ends with HP plates
- 10 mana crystal octahedrons per side, animated rotation, opacity tied to current/max
- Deck stacks rendered as physical box stacks (decrement as you draw)
- Particle bursts on summon/death/attack
- OrbitControls for camera (constrained to top-down arc)

### v2 → v3 changelog

- **v2**: 56 static 2D cards · single-file · archived to `archive/v2.html`
- **v3**:
  - Registry-driven card generation (live fetch from fall-registry)
  - Full 3D Three.js scene with hexagonal table
  - Procedural card art derived from prime factorization
  - 8 factions mapped from estate categories
  - 7 abilities derived from mod-127 spine residue
  - Deck builder with curve viz, save/load slots, faction filter
  - Turn-based game loop with AI opponent (greedy: highest-cost play, kill weakest)
  - Match history persisted to IndexedDB
  - **KONOMI NFT hook** (`window.KONOMI.nft`) — sovereign stub, real chain pending
  - Ω autopilot (Ctrl+K) with T0 keyword router + T3 BYOK advice
  - Full Cascade · fall-signal · postMessage · PWA suite

### Files

- `index.html` — the tool
- `archive/v2.html` — preserved v2 build
- `README.md` — this file
- `LICENSE` — MIT
- `.nojekyll` — GitHub Pages legacy deploy marker

### Imports (importmap)

```html
<script type="importmap">
{"imports":{
  "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
}}
</script>
```

Uses `THREE` (full) and `OrbitControls`. Card textures and procedural art are pure 2D canvas (no TextGeometry needed).

### postMessage API

```javascript
// from another estate tool
target.postMessage({target:'kard-v3', source:'mytool', action:'ping'}, '*');
target.postMessage({target:'kard-v3', source:'mytool', action:'cards'}, '*');
target.postMessage({target:'kard-v3', source:'mytool', action:'mint', card:{...}, ownerKey:'me'}, '*');
```

### Estate integration

KARD v3 announces itself on `fall-signal` BroadcastChannel as `{source:'kard-v3', prime:787, version:'3.0.0'}`. Replies to `ping`. Exposed in fall-registry alongside the other 9 FallStudio + 5 TemuOracle + warhummer-69k + falladviser + konomi-cube + fallscene tools.

### License

MIT · Copyright (c) 2026 Simon Gant · sjgant80-hub · ◊·κ=1
