#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const firebaseTsPath = path.resolve(__dirname, '../src/config/firebase.ts');
let dbUrl = 'https://chromavore-5426b-default-rtdb.europe-west1.firebasedatabase.app';

try {
  const content = fs.readFileSync(firebaseTsPath, 'utf8');
  const match = content.match(/databaseURL:\s*['"]([^'"]+)['"]/);
  if (match) dbUrl = match[1];
} catch (e) {
  // Fallback to default
}

console.log('--- CHROMAVORE FIREBASE RTDB DIAGNOSTIC ---');
dbUrl = dbUrl.trim().replace(/\/+$/, '');
console.log(`Database URL: ${dbUrl}`);

if (!dbUrl) {
  console.error('❌ databaseURL is empty in src/config/firebase.ts!');
  process.exit(1);
}

try {
  // 1. Test Read
  console.log('\n1. Testing GET /leaderboard.json ...');
  const readRes = await fetch(`${dbUrl}/leaderboard.json`);
  console.log(`HTTP Status: ${readRes.status} ${readRes.statusText}`);
  if (readRes.ok) {
    const data = await readRes.json();
    console.log('✅ Read permission: GRANTED');
    console.log('Data summary:', data ? Object.keys(data) : 'null (empty DB)');
  } else {
    console.error(`❌ Read permission: DENIED (${readRes.status})`);
  }

  // 2. Test Write
  console.log('\n2. Testing PUT /leaderboard/arcade/__PING__.json ...');
  const testPayload = { pseudo: '__PING__', score: 1, kills: 1, date: new Date().toISOString() };
  const writeRes = await fetch(`${dbUrl}/leaderboard/arcade/__PING__.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });
  console.log(`HTTP Status: ${writeRes.status} ${writeRes.statusText}`);

  if (writeRes.ok) {
    console.log('✅ Write permission: GRANTED');
    // Clean up ping entry
    await fetch(`${dbUrl}/leaderboard/arcade/__PING__.json`, { method: 'DELETE' });
    console.log('✅ Ping test entry successfully removed.');
    console.log('\n🎉 ALL CHECKS PASSED: Firebase Realtime Database is ready!');
  } else {
    console.error(`❌ Write permission: DENIED (${writeRes.status} ${writeRes.statusText})`);
    console.log('\n👉 ACTION REQUIRED IN FIREBASE CONSOLE:');
    console.log('1. Go to Firebase Console > Realtime Database > Rules tab.');
    console.log('2. Set rules to:');
    console.log(JSON.stringify({
      rules: {
        leaderboard: {
          ".read": true,
          ".write": true
        },
        players: {
          ".read": true,
          ".write": true
        }
      }
    }, null, 2));
    console.log('3. Click "Publish".');
  }
} catch (err) {
  console.error('❌ Network error connecting to Firebase:', err.message);
}
