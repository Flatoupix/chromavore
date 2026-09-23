import { leaderboard } from '../systems/Leaderboard';

// Secret token — change this value to invalidate any old reset URL
const RESET_SECRET = 'chv-reset-2026';

function shouldReset(): boolean {
  const url = new URL(location.href);
  const validFlag = url.searchParams.get('resetLeaderboard') === '1';
  const validSecret = url.searchParams.get('secret') === RESET_SECRET;
  const notAlreadyDone = !localStorage.getItem('chv_leaderboard_reset_done');
  return validFlag && validSecret && notAlreadyDone;
}

async function runReset() {
  try {
    await leaderboard.hardReset();
    localStorage.setItem('chv_leaderboard_reset_done', 'true');
    console.info('✅ Leaderboard reset (local + remote).');
  } catch (e) {
    console.error('⚠️ Leaderboard reset failed:', e);
  }
}

if (shouldReset()) {
  window.addEventListener('load', runReset);
}
