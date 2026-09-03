// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — REMOTE FIREBASE LEADERBOARD CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface FirebaseConfig {
  databaseURL: string;
}

// Collez ici l'URL de votre base Firebase Realtime Database
// Ex: 'https://votre-projet-default-rtdb.firebaseio.com'
export const FIREBASE_CONFIG: FirebaseConfig = {
  databaseURL: (typeof localStorage !== 'undefined' ? localStorage.getItem('chv_firebase_url') || '' : '').trim()
};
