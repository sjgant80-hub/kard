#!/usr/bin/env node
// ◊·κ=φ⁴ · build-zoo.js · prime 191
// Generates decks/konomi-zoo.json from real repos in two orgs.
// Each card is the substrate's fork-grant for a real repository.
//
// Usage:
//   GITHUB_TOKEN=$(gh auth token) node scripts/build-zoo.js
//
// What it does:
//   1. Lists public, non-fork repos in sjgant80-hub and teslasolar
//   2. Tries to load kcc-project.json (canonical paths) for prime + ring
//   3. Falls back to deterministic stats from name hash + description heuristics
//   4. Maps each repo into a card (creature OR spell OR substrate)
//   5. Emits decks/konomi-zoo.json with both orgs' cards · ~150-250 cards total
//
// Schema preserves v2 card shape:
//   { id, name, faction, cost, type, attack, health, abilities, text, art,
//     prime, ring, konomi_grant (repo URL), edition (AIN | Tesla), org }

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
if (!TOKEN) { console.error('GITHUB_TOKEN required'); process.exit(1); }

// ─── Faction routing ─────────────────────────────────────────
const FACTIONS = [
  { id:'GROUND',  ring:'R0', prime:2,  hz:7.83,  icon:'◯', tagline:'R0 · body · 7.83 Hz · the substrate animals' },
  { id:'SIGNAL',  ring:'R1', prime:3,  hz:15.66, icon:'↯', tagline:'R1 · signal · 15.66 Hz · the messengers' },
  { id:'GATE',    ring:'R2', prime:5,  hz:23.49, icon:'⊞', tagline:'R2 · filter · 23.49 Hz · the gatekeepers' },
  { id:'HEART',   ring:'R3', prime:7,  hz:31.32, icon:'♥', tagline:'R3 · care · 31.32 Hz · the empathic ones' },
  { id:'VOICE',   ring:'R4', prime:11, hz:39.15, icon:'✦', tagline:'R4 · build · 39.15 Hz · the makers' },
  { id:'MIRROR',  ring:'R5', prime:13, hz:46.98, icon:'◈', tagline:'R5 · verify · 46.98 Hz · the witnesses' },
  { id:'WATCHER', ring:'R6', prime:17, hz:54.81, icon:'◉', tagline:'R6 · govern · 54.81 Hz · the cerebellum · 79% timing' },
];

const ABILITIES = {
  charge:    'Can attack the turn it is played.',
  taunt:     'Enemies must attack this creature first.',
  shield:    'First damage dealt to this is absorbed.',
  lifesteal: 'Damage dealt by this heals your hero.',
  silence:   'Removes target abilities.',
  rush:      'Can attack creatures (not hero) on the turn played.',
  spell:     'One-shot effect · resolves and discards.',
  mesh:      'When played: draw a card if opponent has a creature with your ring.',
  forge:     'Spend +2 mana when playing to make this +2/+2.',
  konomi:    'Damage from this cannot be absorbed by shield.',
  recurse:   'When destroyed: return to your hand with +1/+1.',
  timing:    'Resolves first in turn order regardless of play order (R0→R6).',
  substrate: 'Cannot be silenced or removed by enemy spells.',
};

// ─── Content-based faction routing (when no manifest) ─────────
const FACTION_RULES = [
  { faction:'SIGNAL',  re:/^(si-didy|fall-signal|signal|reach|fallreach|fallpost|broadcast|comm|sync)/i },
  { faction:'GATE',    re:/^(fall-vetter|vetter|fall-euaiact|euaia|gate|filter|nas-shim|shield|fallshield|onion)/i },
  { faction:'HEART',   re:/^(fallcrm|crm|falllearn|learn|exitengine|exit|botler|fallhire|hire|fallharmony|harmony)/i },
  { faction:'VOICE',   re:/^(fall-forge|forge|fallcarousel|carousel|fallpost|post|fallcorp|corp|fallinvoice|invoice|audiofabric|audio|operator)/i },
  { faction:'MIRROR',  re:/^(audit|fall-verify|verify|fall-vetter|mirror|fall-substrate|substrate|fallescape|escape|fallanno|anno)/i },
  { faction:'WATCHER', re:/^(cassie|fallmind|fallcompass|compass|fall-registry|registry|fallmap|fallfind|find|groundlevel|ground|niceassos)/i },
  { faction:'GROUND',  re:/^(seed|core|substrate|fallcore|fallcube|cube|fallforge|forge|fallnet|net|onion|kard|fallstack|stack|fallback|back)/i },
];

// teslasolar-specific rules (Thomas's tribes)
const TESLA_RULES = [
  { faction:'WATCHER', re:/^(kp2p|onlybrains|onlyass|konomi|konomioke|broly|hummingbird|LookingGlass|BloomCad|elseif)/i },
  { faction:'VOICE',   re:/^(eliza|forge|builder|crafts|guild|acg|ACG)/i },
  { faction:'SIGNAL',  re:/^(signal|sync|comm|broadcast|mesh|p2p|bridge)/i },
  { faction:'GROUND',  re:/^(ground|core|substrate|earth|MianoCube|miano)/i },
  { faction:'MIRROR',  re:/^(audit|verify|witness|truth|reflect|mirror)/i },
  { faction:'GATE',    re:/^(filter|gate|wall|moat|fence|sentinel)/i },
  { faction:'HEART',   re:/^(care|heart|warmth|hearth|nurture|kin)/i },
];

// ─── deterministic hash → stats ─────────────────────────────
function hash(s) {
  return crypto.createHash('sha256').update(String(s)).digest();
}
function intFrom(hashBuf, offset) {
  return hashBuf.readUInt32BE(offset);
}

function pickFaction(repo, org, manifest) {
  if (manifest?.ring) {
    const m = FACTIONS.find(f => f.ring === manifest.ring);
    if (m) return m;
  }
  // also try prime-based routing if no ring
  const p = manifest?.prime;
  if (p) {
    if (p === 2)  return FACTIONS[0];
    if (p === 3)  return FACTIONS[1];
    if (p === 5)  return FACTIONS[2];
    if (p === 7)  return FACTIONS[3];
    if (p === 11) return FACTIONS[4];
    if (p === 13) return FACTIONS[5];
    if (p === 17) return FACTIONS[6];
    if (p <= 50)    return FACTIONS[2];
    if (p <= 200)   return FACTIONS[4];
    if (p <= 1000)  return FACTIONS[5];
    return FACTIONS[6];
  }
  const rules = org === 'teslasolar' ? TESLA_RULES : FACTION_RULES;
  for (const r of rules) if (r.re.test(repo.name)) return FACTIONS.find(f => f.id === r.faction);
  // hash fallback
  const h = hash(repo.name);
  return FACTIONS[h[0] % FACTIONS.length];
}

function statsFrom(repo, faction, manifest) {
  const h = hash(repo.name + ':' + (manifest?.prime || 0));
  const cost = manifest?.prime
    ? Math.max(1, Math.min(7, Math.round(Math.log2(manifest.prime + 1) / 1.5)))
    : Math.max(1, Math.min(7, (intFrom(h, 0) % 7) + 1));
  const attack = Math.max(1, Math.min(8, (intFrom(h, 4) % 7) + 1));
  const health = Math.max(1, Math.min(8, (intFrom(h, 8) % 7) + 1));
  return { cost, attack, health };
}

function pickAbilities(repo, faction, manifest) {
  // ring-specific bias
  const bias = {
    R0: ['taunt','substrate'],
    R1: ['charge','rush'],
    R2: ['taunt','shield','silence'],
    R3: ['lifesteal','mesh'],
    R4: ['forge','charge'],
    R5: ['konomi','recurse','shield'],
    R6: ['timing','substrate','konomi'],
  }[faction.ring] || ['mesh'];
  const h = hash(repo.name + ':abilities');
  // pick 1-2 abilities deterministically
  const count = (h[0] % 100) < 40 ? 1 : 2;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(bias[h[i+1] % bias.length]);
  }
  return Array.from(new Set(out));
}

function isSpellCandidate(repo) {
  // doctrines / specs / patterns / readonly artefacts feel spell-y
  return /(spec|doctrine|manifesto|theory|paper|essay|seed|cookbook|template)/i.test(repo.name + ' ' + (repo.description || ''));
}

function isLegendary(repo, manifest) {
  // legendaries: primes > 500 OR explicitly tagged · OR substrate keystones
  if (manifest?.prime && manifest.prime > 500) return true;
  if (/(niceassos-spec|fallmind-v2|cassie-anthropic|MianoCube|kp2p|onlybrains|fallcore)/i.test(repo.name)) return true;
  return false;
}

function makeArt(repo, faction) {
  const animals = {
    GROUND:  ['mole','tortoise','crab','snail','newt','frog','badger','toad'],
    SIGNAL:  ['eel','otter','finch','bat','hare','cricket','swallow','dragonfly'],
    GATE:    ['fox','stoat','spider','octopus','owl','heron','mantis','crow'],
    HEART:   ['dog','bear','pelican','okapi','otter','wolf','elephant','seal'],
    VOICE:   ['phoenix','bowerbird','thrush','spider','bee','salamander','magpie','crane'],
    MIRROR:  ['koi','crow','watchdog','canary','newt','moth','raccoon','snake'],
    WATCHER: ['murmuration','jellyfish','heron','crane','lion','elephant','rhino','elk'],
  }[faction.id];
  const animal = animals[hash(repo.name + ':art')[0] % animals.length];
  const tagline = (repo.description || '').slice(0, 60) || faction.tagline;
  return `a brass-on-void ${animal} · the etched form of "${repo.name}" · ${tagline}`;
}

function makeText(repo, abilities, manifest) {
  const abil = abilities.length ? `${abilities[0].charAt(0).toUpperCase()+abilities[0].slice(1)}.` : '';
  const purpose = (repo.description || '').replace(/[^\w\s\-·.,/]/g, '').slice(0, 80);
  return `${abil} ${purpose}`.trim();
}

// ─── GitHub API ─────────────────────────────────────────────
async function gh(path) {
  const r = await fetch('https://api.github.com' + path, {
    headers: { Authorization: 'Bearer ' + TOKEN, 'User-Agent':'konomi-zoo-builder' },
  });
  if (!r.ok) throw new Error('GH ' + r.status + ' ' + path);
  return r.json();
}

async function listRepos(org) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const items = await gh(`/users/${org}/repos?per_page=100&page=${page}&type=public`);
    if (!items.length) break;
    for (const r of items) {
      if (r.fork) continue;
      if (r.archived) continue;
      out.push({ name: r.name, description: r.description, stars: r.stargazers_count, html_url: r.html_url, default_branch: r.default_branch || 'main' });
    }
    if (items.length < 100) break;
  }
  return out;
}

async function fetchManifest(org, repo) {
  // try canonical Thomas locations first, then Simon's
  const paths = ['_kcc/tags/kcc-project.json', 'kcc-project.json', '.kcc/project.json'];
  for (const p of paths) {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${org}/${repo.name}/${repo.default_branch}/${p}`);
      if (!r.ok) continue;
      const t = await r.text();
      try { return JSON.parse(t); } catch (_) { /* may be malformed · skip */ }
    } catch (_) {}
  }
  return null;
}

// ─── main ──────────────────────────────────────────────────
const SKIP_NAMES = new Set([
  // Simon's substrate (already covered + private)
  'niceassos-spec','niceassos-seed','niceassos-mesh','fallmind-v2','cassie-anthropic','master-seed','konomi-dot-protocol','kat-tribute',
  // tribute/personal
  '.github','contact',
]);

async function main() {
  console.log('◊ building konomi-zoo from real repos in 2 orgs…');
  const simon = await listRepos('sjgant80-hub');
  console.log('  sjgant80-hub:', simon.length, 'public non-fork repos');
  const thomas = await listRepos('teslasolar');
  console.log('  teslasolar:    ', thomas.length, 'public non-fork repos');

  const cards = [];
  const legendaries = [];

  async function processRepo(org, repo) {
    if (SKIP_NAMES.has(repo.name)) return;
    const manifest = await fetchManifest(org, repo);
    const faction = pickFaction(repo, org, manifest);
    const { cost, attack, health } = statsFrom(repo, faction, manifest);
    const abilities = pickAbilities(repo, faction, manifest);
    const spell = isSpellCandidate(repo);
    const legendary = isLegendary(repo, manifest);
    const id = `kz-${org === 'teslasolar' ? 't' : 's'}-${repo.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,32)}`;
    const card = {
      id,
      name: repo.name,
      faction: faction.id,
      cost: legendary ? Math.min(9, cost + 3) : cost,
      type: spell ? 'spell' : (legendary ? 'legendary-hero' : 'creature'),
      attack: spell ? 0 : (legendary ? attack + 2 : attack),
      health: spell ? 0 : (legendary ? health + 4 : health),
      abilities: spell ? ['spell'] : abilities,
      text: makeText(repo, abilities, manifest),
      art: makeArt(repo, faction),
      prime: manifest?.prime || (FACTIONS.find(f=>f.id===faction.id)?.prime),
      ring: faction.ring,
      konomi_grant: repo.html_url,
      edition: org === 'teslasolar' ? 'Tesla' : 'AIN',
      org,
    };
    if (legendary) {
      card.rarity = 'S';
      card.edition_note = (org === 'teslasolar' ? 'TeslaSolar · Thomas-orbit' : 'AIN · Simon-orbit') + ' · ULTRA';
      legendaries.push(card);
    } else {
      cards.push(card);
    }
  }

  // process in batches to be polite to GH raw
  const all = [...simon.map(r => ['sjgant80-hub', r]), ...thomas.map(r => ['teslasolar', r])];
  for (let i = 0; i < all.length; i += 10) {
    await Promise.all(all.slice(i, i+10).map(([org, repo]) => processRepo(org, repo).catch(e => console.warn('  skip', org+'/'+repo.name, e.message))));
    process.stdout.write('.');
  }
  console.log('');
  console.log('  cards:', cards.length, '· legendaries:', legendaries.length);

  // sort cards: by faction, then cost, then prime asc
  cards.sort((a,b) => a.faction.localeCompare(b.faction) || a.cost - b.cost || (a.prime||9999) - (b.prime||9999));
  legendaries.sort((a,b) => a.cost - b.cost);

  const deck = {
    version: '2.1',
    name: 'konomi-zoo',
    title: '◊ Konomi Zoo · the substrate rendered as a bestiary',
    subtitle: `auto-generated from 2 orgs · sjgant80-hub (AIN) + teslasolar (Tesla) · every card a real repo · every card a fork-grant`,
    lineage: 'Architecture: Thomas Frumkin · MianoCube · the prime recursion · Implementation: Simon Gant',
    generated_at: '2026-06-11',
    generator: 'scripts/build-zoo.js',
    factions: FACTIONS,
    abilities: ABILITIES,
    cards,
    legendaries,
    konomi_envelope_at_match_end: {
      kind: 'fall-forge:match_complete',
      payload_shape: {
        winner_pub: '<Ed25519 hex>',
        deck_used: 'konomi-zoo',
        cards_played_winner: ['<card_ids>'],
        kappa_remaining_winner: '<int 0-30>',
        prev_hash: '<sha256 hex>',
        ts: '<ISO 8601>',
        kcc_anchor_request: '<true · request OnlyBrains BSV anchor>',
      },
    },
  };

  const out = path.join(__dirname, '..', 'decks', 'konomi-zoo.json');
  fs.writeFileSync(out, JSON.stringify(deck, null, 2));
  console.log('◊ wrote', out, '·', cards.length, 'cards +', legendaries.length, 'legendaries');
}

main().catch(e => { console.error(e); process.exit(1); });
