import { leaderboard } from '../systems/Leaderboard';

function shouldReset(): boolean {
  const url = new URL(location.href);
  return url.searchParams.get('resetLeaderboard') === '1' &&
    !localStorage.getItem('chv_leaderboard_reset_done');
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
