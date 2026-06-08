# KARD · pro-slot interface

> The card engine is intentionally swappable. Default implementation is hardcoded for transparent play. Three functions form the entire contract.
> Drop your engine in, keep the rest.

---

## The contract

In `index.html`, look for the block marked:

```js
// CARD ENGINE · the swappable interface (see src/pro-slot.md)
const cardEngine = { ... };
```

Three functions. Replace any of them — independently, no need to do all three.

### L1 · `generatePack(theme, count)`

```js
async generatePack(theme: string, count: number = 5): Promise<Card[]>
```

Generate fresh cards. Default: random pull from the starter deck pool. Pro-slot ideas:
- LLM call → "generate 5 cards themed around X with attack/health/cost/ability JSON"
- diffusion model for card art generation alongside stats
- procedural generation from a config seed
- gacha-style weighted randomness with a paywall

**Card schema** (return shape):
```ts
type Card = {
  id: string;            // unique
  name: string;
  faction: string;       // one of: MAGNA, LIBERTY, CROWN, EQUITY, HEARTH, GUILD, ADMIRALTY
  cost: number;          // 1-10
  type: 'creature' | 'spell';
  attack?: number;       // creature only
  health?: number;       // creature only
  abilities?: string[];  // ['charge','taunt','shield','lifesteal','silence','rush']
  text: string;          // human-readable description
  art?: string;          // text prompt OR URL
}
```

---

### L2 · `resolveAbility(card, ctx)`

```js
resolveAbility(card: Card, ctx: { state, owner, target, source, action }): { ok: boolean, ... }
```

Resolve a card's ability when it's played (mostly for spells). Default: hardcoded `switch` statement on card ID for the 56 starter cards · fall-through to no-op for unknown.

Pro-slot ideas:
- LLM rules-judge for any unknown ability text (the killer feature) · "card X with ability text Y is played against board state Z · what happens?"
- ML model trained on Hearthstone replays to score ability outcomes
- procedural rules engine that parses ability text grammar

**Context shape:**
```ts
{
  state: GameState,  // full live state (see below)
  owner: Player,     // who played the card
  target: string,    // uid of targeted minion OR 'enemy_hero' / 'my_hero' OR null
  source: Card,      // the card being resolved
  action: 'play'     // for v1 always 'play' · future: 'attack', 'death', 'turn_start' etc.
}
```

**Game state shape:**
```ts
{
  turn: number,
  activePlayer: 'me' | 'enemy',
  me:    { hp, mana, maxMana, deck: cardId[], hand: cardId[], board: Minion[] },
  enemy: { hp, mana, maxMana, deck, hand, board },
  log: { text, kind }[],
  chain: AuditEntry[],
  prevHash: string,
}

type Minion = {
  cardId: string,
  attack: number,
  health: number,
  maxHealth: number,
  abilities: string[],
  canAttack: boolean,
  uid: string,
}
```

**Mutations you can perform** (use the existing helpers in `index.html`):
- `damageMinion(minion, n)` · handles shield interaction
- `silenceMinion(minion)` · clears abilities
- `returnMinion(player, uid)` · back to hand
- `banishToDeck(minion)` · shuffles back into deck
- `cleanBoard()` · removes dead minions
- direct mutation: `player.hp -= n`, `player.mana += n`, `drawCard(player)` etc.

---

### L3 · `opponentMove(state)`

```js
opponentMove(state: GameState): Move[]
```

Plan the opponent's entire turn. Return an ordered list of moves. Default: greedy heuristic (play highest-cost affordable card, attack high-value targets, hit face if lethal).

Pro-slot ideas:
- minimax with depth-3 lookahead and material valuation
- LLM strategic move-picker ("you are the opponent · here is the board state · pick the next 5 moves")
- reinforcement-learning agent trained against the default heuristic
- ELO-tiered difficulty (Easy / Medium / Hard / Champion)

**Move shape:**
```ts
type Move =
  | { kind: 'play', idx: number, target?: string }
  | { kind: 'attack', srcUid: string, dstUid: string }   // dstUid can be 'my_hero'
  | { kind: 'end' }                                       // not currently consumed
```

`state` is a **deep copy** for planning — mutating it doesn't affect the real game. The real game re-resolves moves against the live state when executing, so plan freely.

---

## Audit-chain compatibility

Every move automatically calls `hashMove(who, kind, data)` which appends to `M.chain` and updates `M.prevHash` (async SHA-256). Don't bypass this — the export/replay/trophy-mint features depend on it. If your engine fires moves directly, they need to land through `playCard()` / `attackTarget()` / `endTurn()` to be recorded.

If you want to add new move kinds beyond play/attack, also call `hashMove('me'|'enemy', kind, data)` once per discrete action.

---

## What's already wired

- 30-card deck with max-2-of-any
- 30 HP heroes
- mana curve 1→10
- 7-card hand limit, 7-slot board
- fatigue when deck empties
- taunt/charge/rush/shield/lifesteal/silence keywords
- spell targeting for the 56 starter cards
- match-history audit chain + JSON export
- mesh emit (`fall-signal` BroadcastChannel)
- local-storage persistence

---

## Patches over rewrites

If you want to fork rather than swap-in: keep the `cardEngine` interface stable. The whole game expects those three method signatures. Anything else (the cards, the UI, the styling) is yours to mangle.

PRs welcome. Estate doctrine markers (◊, κ, prime numbers) are optional — strip them for white-label deploys.

**◊·κ=φ⁴**
