# KARD · Konomi protocol

> How the sovereign-identity layer · κ-ledger · and P2P duel signaling actually work.
> Bake-it-yourself · MIT.

---

## 1 · Sovereign identity (Ed25519)

On first launch, KARD generates an Ed25519 keypair via libsodium-wasm (loaded as ESM from `https://esm.run/libsodium-wrappers`). The keypair is stored in your browser's IndexedDB. **It never leaves your device.**

- **Public key** is your peer ID — it shows in the P2P duel handshake so opponents can identify you across sessions.
- **Private key** signs every trophy and every κ-ledger entry.
- **Seed export/import** lets you carry your identity to another device (the seed is the first 32 bytes of the private key, hex-encoded).

If you wipe browser data without exporting the seed, the identity is gone forever. That's the trade for zero-server sovereignty.

```js
// the public surface (in index.html)
KONOMI.publicKeyHex          // hex string · 64 chars
await KONOMI.sign(msg)       // → hex signature
await KONOMI.verify(msg, sig, publicKeyHex) // → boolean
await KONOMI.mintTrophy(match) // → { envelope, signature }
await KONOMI.exportSeed()    // → hex string
await KONOMI.importSeed(hex) // restores from another device
```

---

## 2 · Trophy mint envelope

When you win a duel, KARD signs an envelope and attaches it to the match in your local history:

```json
{
  "envelope": {
    "kind": "kard-trophy-v1",
    "issuer":   "9f3a7b…",
    "issuedAt": "2026-06-08T14:23:11Z",
    "winner":   "9f3a7b…",
    "match": {
      "startedAt": "2026-06-08T14:11:02Z",
      "endedAt":   "2026-06-08T14:23:09Z",
      "finalHash": "8d2e91…",
      "turns": 12
    }
  },
  "signature": "a31fb2…"
}
```

Anyone with your public key can verify the trophy is genuinely yours and tied to the match's specific final hash. Forgery is computationally infeasible without your private key.

---

## 3 · κ-ledger (KCC)

Every κ transaction is signed and persisted. Wins earn κ (default `+7` per duel). Booster packs and cosmetics will eventually cost κ — for v2.0, the ledger is purely a record-of-receipts layer.

```js
KCC.balance       // current κ
KCC.lifetime      // total earned ever
KCC.wins          // match wins count
KCC.ledger        // [{kind, delta, reason, ts, sig, balance}] · newest first

await KCC.earn(7, 'duel win · 2026-06-08T14:11:02Z')
await KCC.spend(3, 'booster pack · CROWN')
```

Every entry includes:
- `delta` · positive for earn, negative for spend
- `reason` · human-readable provenance
- `ts` · unix ms
- `balance` · post-transaction
- `sig` · Ed25519 signature over JSON-stringified entry (minus the `sig` field itself)

### Mesh broadcast

KCC also broadcasts on `BroadcastChannel('kcc-signal')` so sister tools in the same browser see your balance update in real time:

```js
{
  type: 'kcc:earn',
  tool: 'kard',
  delta: 7,
  balance: 23,
  issuer: '9f3a7b…'
}
```

The pattern mirrors what GroundLevel and fall-euaiact use for cross-tool messaging.

---

## 4 · P2P duel (WebRTC, no server)

Two players. Two browsers. Zero infrastructure.

### Signaling (manual SDP paste)

1. **Host** opens KARD → Duel · P2P tab → clicks "Generate offer"
2. KARD creates a WebRTC `RTCPeerConnection`, opens a `DataChannel`, gathers ICE candidates (STUN-only)
3. Host gets a JSON blob: `{ sdp: <RTCSessionDescription>, peerId: <KONOMI public key hex> }`
4. Host pastes that blob into a chat / DM / LinkedIn comment / wherever
5. **Guest** opens KARD → pastes the offer → clicks "Generate answer"
6. Guest produces another JSON blob with their SDP + peerId
7. Guest sends it back · host pastes it · channel opens
8. Both peers now share a DataChannel for moves

### Move protocol (DataChannel JSON)

Each peer mirrors moves to the other:

```json
{ "kind": "match:start", "host": "9f3a…" }
{ "kind": "play",   "card": "m03", "target": "uid-xyz" }
{ "kind": "attack", "src": "uid-abc", "dst": "uid-xyz" }
{ "kind": "endTurn" }
{ "kind": "resign" }
```

Each side independently hashes moves into its own audit chain (same SHA-256 prevHash pattern). If the chains diverge, something is wrong — that's the cheat-detection layer.

### Caveats (honest framing)

- **STUN-only.** ~80% of consumer networks let WebRTC through with STUN. ~20% (symmetric NATs / corporate firewalls) need a TURN relay we don't currently host. v2.1 will add an optional TURN config field.
- **Manual signaling.** You exchange offer/answer by hand. v2.1 could add a tiny signaling-relay (still no game data on the server, just SDP handshake).
- **No anti-cheat beyond hash divergence.** A malicious peer could send fake state. The chain catches divergence but doesn't auto-arbitrate. v2.x will add adversarial verification (think fall-verify pattern).

---

## 5 · LLM rules-judge (WebLLM or BYOK)

For ability text that the hardcoded resolver doesn't understand (custom cards · LLM-generated booster packs · house rules), KARD can call out to a rules-judge LLM:

- **Path A · WebLLM** · Llama-3.2-3B-Instruct, ~2GB one-time download via `import('https://esm.run/@mlc-ai/web-llm')`. Works offline after first load. Opt-in toggle.
- **Path B · BYOK** · paste an Anthropic / OpenAI / Google key. Light, fast, costs cents per match.

The judge receives card text + current board state and returns a small JSON describing what happens. The game applies the JSON to state. This is how AI-generated cards become playable without writing new hardcoded handlers.

```js
RULES_LLM.judgeSpell(card, ctx) // → { damage_target_minion?, amount?, heal_hero?, draw?, silence?, explain? }
```

Returns `null` if not available · the hardcoded resolver continues as before.

---

## 6 · Sister-tool mesh

KARD listens on `BroadcastChannel('fall-signal')` for other estate tools (`tool:ready` messages). The Settings panel shows whichever sister tools are open in the same browser. Doctrine pattern: every tool emits, every tool listens · estate-wide telepathy without a server.

```js
new BroadcastChannel('fall-signal').postMessage({ type: 'tool:ready', tool: 'kard', ts: Date.now() });
```

---

## 7 · What this enables

- **Verifiable wins** · trophies are cryptographically yours, no platform can revoke them
- **Cross-device identity** · seed-export, seed-import, your reputation moves with you
- **No-server multiplayer** · KARD has no backend cost, no privacy-leaky middleman
- **Audit-chained match history** · same SHA-256 prevHash pattern as fall-euaiact and GroundLevel
- **κ becomes real currency** in v2.x · spendable on booster packs, cosmetics, faction unlocks (all priced in κ, all earned in play)

---

## 8 · What it doesn't do (yet)

- **TURN relay** for the ~20% of networks where STUN-only fails
- **Tournament brackets** with multi-peer mesh signaling
- **Cross-instance Konomi mesh** (your κ-ledger entries only show in your tabs in this browser; a future v2.x WebRTC sync layer could federate κ-ledgers between trusted peers)
- **Real ability resolution via LLM judge in the gameplay loop** (the function exists; wiring it as the primary L2 resolution path lands in v2.1)

---

## 9 · The seven primes (faction → prime number)

| Faction | Prime |
|---|---|
| MAGNA | 2 |
| LIBERTY | 3 |
| CROWN | 5 |
| EQUITY | 7 |
| HEARTH | 11 |
| GUILD | 13 |
| ADMIRALTY | 17 |

Product of primes (`2 × 3 × 5 × 7 × 11 × 13 × 17 = 510510`) is the κ-supremum · the maximum issuable κ in any single match. (Decorative · not enforced in v2.0 · could become a balance constraint in v2.x.)

---

**◊·κ=φ⁴** · seed minted on first boot · trophies are yours forever · the cards remember
