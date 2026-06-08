# ◊ KARD · the κ-deck duel · v2.0

> A sovereign single-file AI-augmentable card duel.
> 7 factions · 56 cards · audit-chained matches · WebRTC P2P · WebLLM rules-judge · libsodium-wasm Ed25519 trophies · κ-ledger · MIT.
> Plays offline. Plays in your browser. Plays peer-to-peer with zero servers.

**Live:** https://sjgant80-hub.github.io/kard

---

## What it is

A turn-based 1v1 card duel in the Hearthstone family — build a 30-card deck, reduce the opponent to 0 HP, win. Each match is SHA-256 hash-chained from move to move · winners get a signed κ-trophy stored locally.

What makes it sovereign:
- **Single HTML file.** Drop on a USB. Opens offline.
- **No accounts.** No tracking. IndexedDB + localStorage persist everything.
- **Ed25519 identity** via libsodium-wasm · keypair generated on first boot · never leaves the device · seed-exportable for cross-device.
- **κ-ledger** · every win mints a signed envelope · every entry is hash-chained · mesh-broadcast on `kcc-signal` for sister tools.
- **WebRTC P2P duels** · manual SDP-paste signaling · STUN-only · zero server cost.
- **WebLLM rules-judge** · optional 2GB Llama load OR BYOK Claude/OpenAI/Gemini for ability resolution beyond the hardcoded keywords.
- **MIT.** Fork it, rebrand it, ship it.
- **Pro-slot architecture.** The card engine is 3 swappable functions. See [`src/pro-slot.md`](./src/pro-slot.md). Konomi protocol documented at [`src/konomi-protocol.md`](./src/konomi-protocol.md).

---

## The 7 factions

| Faction | Icon | Angle | Prime |
|---|---|---|---|
| MAGNA | ⚖ | Constitutional · law warlords | 2 |
| LIBERTY | 🕊 | Personal liberty · privacy | 3 |
| CROWN | 👑 | Criminal · regulatory | 5 |
| EQUITY | ⚪ | Fairness · balance | 7 |
| HEARTH | 🏠 | Home · welfare · sustain | 11 |
| GUILD | ⚒ | Trade · commerce · resource | 13 |
| ADMIRALTY | ⚓ | Cross-border · displacement | 17 |

Same seven strands that power CASSIE and the GroundLevel weave engine. The card game tells the same story through a different surface.

---

## How to play

1. Open the live URL or download `index.html` and open it locally.
2. Click **"Quick duel vs AI"** for a random deck and immediate match.
3. Or **"Build a deck"** to draft 30 cards (max 2 of any).
4. Reduce the opponent to 0 HP. Survive. Win. Mint your trophy.

**Mana curve:** turn 1 = 1 mana, turn 2 = 2 mana, up to 10. Creatures stay on the board. Spells resolve and discard. Same patterns you know.

**Keywords:**
- `charge` · attack the turn played (including hero)
- `rush` · attack creatures only the turn played
- `taunt` · must be attacked first
- `shield` · first damage absorbed
- `lifesteal` · damage heals your hero
- `silence` · removes the target's abilities

---

## The audit chain

Every move (`play`, `attack`) is hashed against the previous move's hash. SHA-256 · same pattern as `fall-euaiact`. When a match ends, the final hash is sealed and stored in local history. You can export any match as JSON for a verifiable replay.

The trophy minted on victory is a signed entry tied to the final hash. (v1: stored locally as JSON. v2: signed against the Konomi master Ed25519 key.)

---

## For builders · the pro-slot

`src/pro-slot.md` documents the 3-function interface. Replace any (or all) of:

- `cardEngine.generatePack(theme, count)` · how new cards are created
- `cardEngine.resolveAbility(card, ctx)` · what happens when a card's ability fires
- `cardEngine.opponentMove(state)` · what the AI plays

Defaults are clean, deterministic, hardcoded. Your engine slots in without touching the UI, the audit chain, the storage layer, or anything else.

**The most interesting slot is L2** — an LLM rules-judge that resolves arbitrary ability text against current board state. That's how AI-generated cards become playable without hand-coding every new keyword.

---

## Architecture

```
.
├── index.html              the game · single file · ~40KB · works offline
├── decks/
│   └── starter.json        56 cards · 8 per faction · ability metadata
├── src/
│   └── pro-slot.md         the 3-function swap contract
├── games/                  audit-chained match exports land here when downloaded
├── LICENSE                 MIT
└── README.md
```

---

## Roadmap

- **v1.0** · 56 starter cards · greedy AI · solo vs CPU · local match history (shipped earlier today)
- **v2.0** (you're here) · WebRTC P2P + libsodium Ed25519 Konomi keys + κ-ledger + WebLLM rules-judge slot + BYOK alt-path · all opt-in, all lazy-loaded, v1.0 still works untouched
- **v2.1** · TURN relay config field (for the ~20% symmetric-NAT cases) · LinkedIn-comment parser as auxiliary input channel · LLM rules-judge wired as the default L2 resolver
- **v2.2** · LLM-generated booster packs (κ-priced · paid for from the ledger) · Annex IV-style provenance trail per card · MagicGen art prompts feed Stable Diffusion / DALL-E on demand
- **v3.0** · tournament brackets (multi-peer signaling · public leaderboard) · cross-instance κ-ledger federation between trusted peers

Anyone can PR any of these. The pro-slot and the Konomi protocol are the seams.

---

## Sister tools in the estate

KARD lives alongside:
- [groundlevel](https://github.com/sjgant80-hub/groundlevel) · sovereign legal toolkit
- [groundlevel-sdk](https://github.com/sjgant80-hub/groundlevel-sdk) · the engines
- [fall-euaiact](https://github.com/sjgant80-hub/fall-euaiact) · EU AI Act SDK + audit-shim
- [nhs-reinjection](https://github.com/sjgant80-hub/nhs-reinjection) · the NHS thesis
- [gymos](https://github.com/sjgant80-hub/gymos) · gym AI ops

Same audit-chain doctrine across every tool. Same `fall-signal` BroadcastChannel for inter-tool messaging when running in the same browser.

---

## Caveats

- **v1.0 game balance is by feel, not playtested at scale.** Open issues if a card is broken / a faction has no chance.
- **AI opponent is greedy heuristic.** Loses to most patient human play. The pro-slot is exactly the place to replace this.
- **No spectator / multiplayer yet.** Solo vs CPU is the v1 mode. Multiplayer comes in v2.0.
- **The Konomi trophy mint** in v1 is a local JSON-signed record. Real Ed25519 against the Konomi master key lands in v1.4.

---

## Licence

MIT · use freely · fork freely · re-skin freely.

**◊·κ=φ⁴ · 7 strands · 1 deck · the cards remember.**
