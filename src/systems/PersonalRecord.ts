type RecordMode = 'arcade' | 'custom';

interface PersonalRecordProfile {
  hiScore?: number;
  arcadeHiScore?: number;
  customHiScore?: number;
  pseudo?: string;
}

/** Snapshot before any save: a run only competes with its own mode's score. */
export function snapshotPersonalRecord(
  profile: PersonalRecordProfile,
  mode: RecordMode,
  score: number,
  isTestRun = false
) {
  // Profiles from before mode-specific scores used the shared record for arcade.
  const legacyArcadeScore = profile.customHiScore === undefined ? profile.hiScore : 0;
  const storedRecord = mode === 'arcade'
    ? profile.arcadeHiScore ?? legacyArcadeScore
    : profile.customHiScore;
  const previousRecord = Number.isFinite(storedRecord) ? Math.max(0, storedRecord!) : 0;
  return {
    previousRecord,
    isNewRecord: !isTestRun && Number.isFinite(score) && score > previousRecord
  };
}

export function getKnownPseudo(profile: PersonalRecordProfile, legacyPseudo: string | null): string {
  return (profile.pseudo?.trim() || legacyPseudo?.trim() || '').toUpperCase().slice(0, 12);
}
