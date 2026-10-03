#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createServer } from 'vite';

// This storage is private to the process. No real profile or remote data is used.
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};
globalThis.fetch = () => { throw new Error('Network access is forbidden in profile tests'); };

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let checks = 0;
function check(name, run) {
  run();
  checks++;
  console.log(`PASS ${name}`);
}

try {
  const { snapshotPersonalRecord, getKnownPseudo } = await vite.ssrLoadModule('/src/systems/PersonalRecord.ts');
  const { FIREBASE_CONFIG } = await vite.ssrLoadModule('/src/config/firebase.ts');
  FIREBASE_CONFIG.databaseURL = '';
  const { profileManager } = await vite.ssrLoadModule('/src/systems/ProfileManager.ts');
  const profile = { hiScore: 1000, arcadeHiScore: 1000, customHiScore: 100 };

  check('lower and equal scores never request a nickname', () => {
    for (const score of [0, 500, 999, 1000]) {
      assert.equal(snapshotPersonalRecord(profile, 'arcade', score).isNewRecord, false);
    }
  });
  check('strict improvement snapshots the previous record before mutation', () => {
    const saved = { ...profile };
    const result = snapshotPersonalRecord(saved, 'arcade', 1001);
    saved.arcadeHiScore = 1001;
    assert.deepEqual(result, { previousRecord: 1000, isNewRecord: true });
    assert.equal(snapshotPersonalRecord(saved, 'arcade', 1001).isNewRecord, false);
  });
  check('first score zero is not a record; first positive score is', () => {
    for (const mode of ['arcade', 'custom']) {
      assert.equal(snapshotPersonalRecord({}, mode, 0).isNewRecord, false);
      assert.equal(snapshotPersonalRecord({}, mode, 1).isNewRecord, true);
    }
  });
  check('mode records remain independent when switching modes', () => {
    assert.equal(snapshotPersonalRecord(profile, 'custom', 101).isNewRecord, true);
    assert.equal(snapshotPersonalRecord(profile, 'arcade', 101).isNewRecord, false);
    assert.equal(snapshotPersonalRecord({ ...profile, customHiScore: 2000 }, 'arcade', 1001).isNewRecord, true);
    assert.equal(snapshotPersonalRecord({ hiScore: 2000, customHiScore: 2000 }, 'arcade', 1).isNewRecord, true);
  });
  check('legacy shared score belongs to arcade, not Chromamancer', () => {
    const legacy = { hiScore: 500 };
    assert.deepEqual(snapshotPersonalRecord(legacy, 'arcade', 100), { previousRecord: 500, isNewRecord: false });
    assert.equal(snapshotPersonalRecord(legacy, 'custom', 1).isNewRecord, true);
  });
  check('laboratory and test runs never qualify', () => {
    for (const mode of ['arcade', 'custom']) {
      assert.equal(snapshotPersonalRecord(profile, mode, 999999, true).isNewRecord, false);
    }
  });
  check('invalid final scores never qualify', () => {
    for (const score of [NaN, Infinity, -1]) {
      assert.equal(snapshotPersonalRecord({}, 'arcade', score).isNewRecord, false);
    }
  });
  check('known nickname comes from profile, with legacy fallback', () => {
    assert.equal(getKnownPseudo({ pseudo: '  Current  ' }, 'OLD'), 'CURRENT');
    assert.equal(getKnownPseudo({ pseudo: ' ' }, 'Legacy'), 'LEGACY');
    assert.equal(getKnownPseudo({}, null), '');
    assert.equal(getKnownPseudo({ pseudo: 'abcdefghijklmnop' }, null), 'ABCDEFGHIJKL');
  });
  check('real profile save and reload retain independent records and nickname', () => {
    profileManager.profile.arcadeHiScore = 1234;
    profileManager.profile.customHiScore = 567;
    profileManager.setPseudo('Reloaded');
    const saved = JSON.parse(storage.get('chv_profile_v1'));
    const reloaded = new profileManager.constructor();
    assert.equal(reloaded.profile.arcadeHiScore, 1234);
    assert.equal(reloaded.profile.customHiScore, 567);
    assert.equal(getKnownPseudo(reloaded.profile, storage.get('chv_last_pseudo')), 'RELOADED');
    assert.equal(snapshotPersonalRecord(reloaded.profile, 'arcade', 1234).isNewRecord, false);
    assert.equal(snapshotPersonalRecord(reloaded.profile, 'custom', 568).isNewRecord, true);
    assert.deepEqual(reloaded.profile, saved);
  });
  check('record decision does not modify a profile or write storage', () => {
    const beforeProfile = structuredClone(profileManager.profile);
    const beforeStorage = [...storage];
    snapshotPersonalRecord(profileManager.profile, 'arcade', 999999);
    assert.deepEqual(profileManager.profile, beforeProfile);
    assert.deepEqual([...storage], beforeStorage);
  });
  console.log(`\n${checks} personal-record checks passed.`);
} finally {
  await vite.close();
}
