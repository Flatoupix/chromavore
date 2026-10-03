#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import ts from 'typescript';

// All persistence belongs to this process; external requests are forbidden.
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};
globalThis.fetch = () => { throw new Error('Discovery tests must never reach the network'); };
const noop = () => {};
const context = new Proxy({}, {
  get: (target, key) => key in target ? target[key] : key === 'measureText' ? () => ({ width: 20 }) : key.startsWith('create') ? () => ({ addColorStop: noop }) : noop,
  set: (target, key, value) => (target[key] = value, true)
});
class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase(); this.style = {}; this.children = []; this.listeners = new Map(); this.isConnected = true;
    this.classList = { add: noop, remove: noop, toggle: noop };
  }
  setAttribute(key, value) { this[key] = value; }
  addEventListener(type, fn) { this.listeners.set(type, [...(this.listeners.get(type) || []), fn]); }
  removeEventListener() {}
  dispatch(type) { for (const fn of this.listeners.get(type) || []) fn({ target: this, preventDefault: noop, stopPropagation: noop }); }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  before(...children) { elements.get('skill-discovery-modal').children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  add(child) { this.children.push(child); }
  focus() { document.activeElement = this; }
  getContext() { return context; }
  querySelectorAll() { return this.children; }
}
const elements = new Map(['c', 'skill-discovery-modal', 'discovery-dismiss'].map(id => [id, new Element(id === 'c' ? 'canvas' : id === 'discovery-dismiss' ? 'button' : 'div')]));
globalThis.document = { createElement: tag => new Element(tag), getElementById: id => elements.get(id), body: new Element('body') };
document.activeElement = elements.get('c');
elements.get('skill-discovery-modal').children.push(elements.get('discovery-dismiss'));
globalThis.window = { addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }) };
globalThis.Option = class extends Element { constructor(text, value) { super('option'); this.text = text; this.value = value; } };

// The queue tests exercise the actual manager. Rendering is deliberately replaced
// with a presentation-only spy, and its dependency boundary is checked separately.
const vite = await createServer({
  server: { middlewareMode: true }, appType: 'custom',
  plugins: [{
    name: 'isolated-discovery-view', enforce: 'pre',
    resolveId(id, importer) { if (id === './DiscoveryPreview' && importer?.endsWith('/DiscoveryManager.ts')) return '\0discovery-test-view'; },
    load(id) { if (id === '\0discovery-test-view') return 'export class DiscoveryCardView { show(card) { this.card = card; } stop() { this.stopped = true; } }'; }
  }]
});
let checks = 0;
const check = (name, action) => { action(); checks++; console.log(`PASS ${name}`); };
const arrows = { left: '←', right: '→', up: '↑', down: '↓' };
try {
  const { FIREBASE_CONFIG } = await vite.ssrLoadModule('/src/config/firebase.ts');
  FIREBASE_CONFIG.databaseURL = '';
  const { profileManager } = await vite.ssrLoadModule('/src/systems/ProfileManager.ts');
  const { SKILL_TREE } = await vite.ssrLoadModule('/src/systems/ProgressionSystem.ts');
  const { SKILL_NODES } = await vite.ssrLoadModule('/src/config/skillTree.ts');
  const { SKILL_COMBOS, input } = await vite.ssrLoadModule('/src/core/InputManager.ts');
  const { getArcadeDiscovery, getCustomDiscovery, getBaseDiscovery, getPickupDiscovery, BASE_DISCOVERY_IDS } = await vite.ssrLoadModule('/src/ui/DiscoveryCatalog.ts');
  const allCards = [];

  check('every progression unlock and every purchased rank has complete unique content', () => {
    for (const mode of ['arcade', 'custom']) {
      for (const skill of SKILL_TREE) {
        const card = getArcadeDiscovery(skill, mode);
        assert.equal(card.id, `${mode}:${skill.id}`);
        assert.equal(card.variant, skill.version);
        allCards.push(card);
      }
    }
    for (const node of SKILL_NODES) {
      for (let rank = 1; rank <= node.maxRank; rank++) {
        const card = getCustomDiscovery(node.id, rank);
        assert.ok(card, `${node.id} rank ${rank}`);
        assert.equal(card.id, `custom:${node.id}:rank:${rank}`);
        assert.match(card.unlockLabel, new RegExp(`RANK ${rank} / ${node.maxRank}`));
        allCards.push(card);
      }
      assert.equal(getCustomDiscovery(node.id, 0), null);
      assert.equal(getCustomDiscovery(node.id, node.maxRank + 1), null);
    }
    assert.equal(getCustomDiscovery('unknown', 1), null);
    assert.equal(new Set(allCards.map(card => card.id)).size, allCards.length);
    for (const card of allCards) {
      for (const field of ['title', 'icon', 'unlockLabel', 'description', 'usage', 'preview', 'previewCaption']) assert.ok(card[field]?.trim(), `${card.id}: ${field}`);
      assert.ok(Array.isArray(card.keys));
    }
  });
  check('arcade never teaches Chromamancer sequence mode or mana spending', () => {
    for (const card of allCards.filter(card => card.mode === 'arcade')) {
      assert.doesNotMatch(JSON.stringify(card), /double.?tap\s+(?:and\s+hold\s+)?Shift|double.?shift|release Shift to cast|\bMana\b/i, card.id);
    }
  });
  check('all five sequence skills teach the actual primary/alternate controls and mana cost', () => {
    const nodeForCombo = { wiggle: 'emp_overcharge', nitro: 'hyper_nitro', quantum_laser: 'quantum_laser', kinetic_bastion: 'kinetic_bastion', singularity_nova: 'singularity_nova' };
    for (const combo of SKILL_COMBOS) {
      const node = SKILL_NODES.find(node => node.id === nodeForCombo[combo.id]);
      for (let rank = 1; rank <= node.maxRank; rank++) {
        const card = getCustomDiscovery(node.id, rank);
        assert.deepEqual(card.keys, combo.sequence.map(key => arrows[key]), card.id);
        assert.deepEqual(card.alternateKeys, combo.altSequence.map(key => arrows[key]), card.id);
        assert.equal(card.cost, `${combo.manaCost} Mana`);
        assert.match(card.usage, /Double-tap Shift.*release Shift to cast/);
      }
    }
  });
  check('passive effects invent no activation keys or spell costs', () => {
    for (const id of ['deep_freeze', 'magnetic_core', 'aegis_shield', 'pellet_resonance', 'super_frequency', 'singularity_mastery']) {
      const node = SKILL_NODES.find(node => node.id === id);
      for (let rank = 1; rank <= node.maxRank; rank++) {
        const card = getCustomDiscovery(id, rank);
        assert.deepEqual(card.keys, [], card.id);
        assert.equal(card.cost, undefined, card.id);
        assert.doesNotMatch(card.usage, /press|double.?tap|cast|release Shift/i, card.id);
      }
    }
  });
  check('base pickups retain their distinct effects and modes', () => {
    for (const mode of ['arcade', 'custom']) for (const id of BASE_DISCOVERY_IDS) {
      const card = getBaseDiscovery(id, mode);
      assert.ok(card.description && card.usage && card.preview);
      assert.equal(card.id, `${mode}:base:${id}`);
    }
    const aliases = { phase: 'phase', timewarp: 'timewarp', magnet: 'force_field', force_field: 'force_field', nova: 'action_nova', overdrive: 'action_overdrive', void_relic: 'void_relic', vortex_portal: 'vortex_portal', power_pellet: 'power_pellet' };
    for (const mode of ['arcade', 'custom']) for (const [pickup, id] of Object.entries(aliases)) {
      assert.deepEqual(getPickupDiscovery(pickup, mode), getBaseDiscovery(id, mode));
      assert.equal(getPickupDiscovery(pickup, mode).mode, mode);
    }
    assert.equal(getPickupDiscovery('unknown', 'arcade'), null);
    assert.match(getBaseDiscovery('force_field', 'arcade').description, /active ghosts remain dangerous/i);
    assert.match(getBaseDiscovery('phase', 'arcade').description, /safely through/);
    assert.doesNotMatch(getBaseDiscovery('phase', 'arcade').description, /destroy|eliminate/i);
  });
  check('catalog evaluation is pure and preserves old discovery IDs', () => {
    profileManager.profile.discoveredSkills = ['wiggle', 'nitro'];
    profileManager.saveProfile();
    const before = structuredClone(profileManager.profile);
    const saved = [...storage];
    for (const skill of SKILL_TREE) getArcadeDiscovery(skill);
    for (const node of SKILL_NODES) getCustomDiscovery(node.id, node.maxRank);
    assert.deepEqual(profileManager.profile, before);
    assert.deepEqual([...storage], saved);
  });

  check('arcade movement gestures execute once, respect cooldowns, and never cast in Chromamancer', () => {
    profileManager.profile.careerGhosts = 2000;
    profileManager.profile.gameMode = 'arcade';
    input.isInputBlocked = false;
    input.clearAllInputs();
    let emp = 0, nitro = 0;
    const gesture = directions => {
      directions.forEach(direction => input.registerMotion(direction));
      input.checkKombos(() => emp++, () => nitro++);
    };
    gesture(['left', 'right', 'left', 'right']);
    assert.equal(emp, 1);
    assert.ok(input.wiggleCd > 0);
    gesture(['right', 'left', 'right', 'left']);
    assert.equal(emp, 1);
    gesture(['up', 'down', 'up', 'down']);
    assert.equal(nitro, 1);
    assert.ok(input.nitroActive > 0);
    profileManager.profile.gameMode = 'custom';
    input.wiggleCd = 0;
    gesture(['left', 'right', 'left', 'right']);
    assert.equal(emp, 1);
    profileManager.profile.gameMode = 'arcade';
    input.clearAllInputs();
  });

  const { DiscoveryPreview } = await vite.ssrLoadModule('/src/ui/DiscoveryPreview.ts');
  const { spriteAtlas } = await vite.ssrLoadModule('/src/graphics/SpriteAtlas.ts');
  check('nonlethal miniatures retain ghosts while destructive effects remove only their targets', () => {
  const sourceBefore = structuredClone(profileManager.profile);
  const saved = [...storage];
  const originalGhost = spriteAtlas.drawGhost;
  let drawn = [];
  spriteAtlas.drawGhost = (...args) => drawn.push(args);
  try {
    const preview = new DiscoveryPreview(new Element('canvas'));
    const count = card => { drawn = []; preview.scene(context, card, 2.4, false); return drawn.length; };
    for (const id of ['phase', 'timewarp']) assert.equal(count(getBaseDiscovery(id, 'arcade')), 3, id);
    assert.equal(count(getCustomDiscovery('aegis_shield', 1)), 3);
    assert.equal(count(getCustomDiscovery('singularity_mastery', 3)), 3);
    assert.equal(count(getBaseDiscovery('action_nova', 'arcade')), 0);
    assert.equal(count(getCustomDiscovery('emp_overcharge', 1)), 0);
    assert.equal(count(getArcadeDiscovery(SKILL_TREE.find(skill => skill.id === 'laser_v1'))), 1);
    assert.equal(count(getArcadeDiscovery(SKILL_TREE.find(skill => skill.id === 'cryo_v1'))), 2);
    assert.deepEqual(profileManager.profile, sourceBefore);
    assert.deepEqual([...storage], saved);
  } finally { spriteAtlas.drawGhost = originalGhost; }
  });

  const { DiscoveryManager } = await vite.ssrLoadModule('/src/ui/DiscoveryManager.ts');
  let opens = 0, closes = 0, laboratory = null;
  const manager = new DiscoveryManager(() => opens++, () => closes++, type => laboratory = type);
  const first = getArcadeDiscovery(SKILL_TREE[0], 'arcade');
  const second = getArcadeDiscovery(SKILL_TREE[1], 'arcade');
  const otherMode = getArcadeDiscovery(SKILL_TREE[0], 'custom');
  const dismiss = () => elements.get('discovery-dismiss').dispatch('click');

  check('enqueue is ordered, deduplicated, deferred, and persistent across profile reload', () => {
    manager.enqueue(first); manager.enqueue(first); manager.enqueue(otherMode); manager.enqueue(second);
    assert.deepEqual(profileManager.profile.pendingDiscoveries, [first.id, otherMode.id, second.id]);
    assert.equal(manager.isOpen, false);
    manager.update('arcade', false);
    assert.equal(manager.isOpen, false);
    profileManager.profile = new profileManager.constructor().profile;
    assert.deepEqual(profileManager.profile.pendingDiscoveries, [first.id, otherMode.id, second.id]);
    manager.update('arcade', true);
    assert.equal(manager.isOpen, true);
    assert.equal(manager.active.id, first.id);
    assert.equal(opens, 1);
  });
  check('simultaneous discoveries never resume gameplay between cards or cross modes', () => {
    manager.update('custom', true);
    assert.equal(manager.active.id, first.id);
    dismiss();
    assert.equal(manager.active.id, second.id);
    assert.equal(closes, 0);
    dismiss();
    assert.equal(manager.isOpen, false);
    assert.equal(closes, 1);
    assert.deepEqual(profileManager.profile.pendingDiscoveries, [otherMode.id]);
    assert.ok(profileManager.profile.discoveredSkills.includes('wiggle'));
    assert.ok(profileManager.profile.discoveredSkills.includes(first.id));
    manager.enqueue(first);
    assert.deepEqual(profileManager.profile.pendingDiscoveries, [otherMode.id]);
    manager.update('custom', true);
    assert.equal(manager.active.id, otherMode.id);
    dismiss();
  });
  check('review exposes unlocked cards only and never changes profile or queue', () => {
    profileManager.profile.careerGhosts = SKILL_TREE[1].threshold;
    profileManager.profile.skillUpgrades = { emp_overcharge: 2 };
    const available = manager.available('custom');
    assert.ok(available.some(card => card.id === 'custom:emp_overcharge:rank:2'));
    assert.ok(!available.some(card => card.id === 'custom:emp_overcharge:rank:3'));
    assert.ok(!manager.available('arcade').some(card => card.id.includes(':rank:')));
    assert.ok(!available.some(card => card.id === 'custom:nova_v1'), 'Arcade-only pickups must not be offered in Chromamancer');
    const before = structuredClone(profileManager.profile);
    const saved = [...storage];
    manager.review('arcade', second.id);
    assert.equal(manager.active.id, second.id);
    assert.equal(manager.labButton.style.display, 'inline-block');
    dismiss();
    assert.deepEqual(profileManager.profile, before);
    assert.deepEqual([...storage], saved);
  });
  check('arcade item review preserves laboratory access', () => {
    manager.review('arcade', second.id);
    manager.labButton.dispatch('click');
    assert.equal(laboratory, SKILL_TREE[1].baseId);
    assert.equal(manager.isOpen, false);
  });

  check('new discovery IDs keep the existing sequence guide and old profiles compatible', () => {
    profileManager.profile.discoveredSkills = ['custom:emp_overcharge:rank:2'];
    assert.equal(profileManager.isSkillDiscovered('wiggle'), true);
    assert.equal(profileManager.isSkillDiscovered('nitro'), false);
    profileManager.profile.discoveredSkills = ['wiggle'];
    profileManager.profile.pendingDiscoveries = [];
    manager.enqueue(getCustomDiscovery('emp_overcharge', 1));
    assert.deepEqual(profileManager.profile.pendingDiscoveries, []);
    manager.enqueue(getCustomDiscovery('emp_overcharge', 2));
    assert.deepEqual(profileManager.profile.pendingDiscoveries, ['custom:emp_overcharge:rank:2']);
  });

  check('preview module has no executable gameplay, profile, sound, or storage dependency', () => {
    const source = readFileSync(new URL('../src/ui/DiscoveryPreview.ts', import.meta.url), 'utf8');
    const ast = ts.createSourceFile('DiscoveryPreview.ts', source, ts.ScriptTarget.Latest, true);
    const imports = ast.statements.filter(ts.isImportDeclaration).filter(node => !node.importClause?.isTypeOnly).map(node => node.moduleSpecifier.text);
    for (const name of imports) assert.ok(/SpriteAtlas|DiscoveryCatalog|entities\/Player/.test(name), `Unexpected preview dependency ${name}`);
    assert.doesNotMatch(source, /new\s+Player\s*\(|Player\.(?!drawChromavore\b)\w+\s*\(/, 'Only the existing pure player sprite drawing function is allowed');
    const identifiers = new Set();
    const visit = node => { if (ts.isIdentifier(node)) identifiers.add(node.text); ts.forEachChild(node, visit); };
    visit(ast);
    for (const forbidden of ['localStorage', 'sessionStorage', 'profileManager', 'sounds', 'experienceSystem', 'progression', 'superItems', 'powerups', 'badges', 'fetch']) assert.ok(!identifiers.has(forbidden), `Preview references ${forbidden}`);
  });
  console.log(`\n${checks} discovery contract checks passed (${allCards.length} unlock/rank cards).`);
} finally {
  await vite.close();
}
