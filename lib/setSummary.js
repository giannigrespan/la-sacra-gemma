const DOT = '·';

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function groupSets(sets) {
  const groups = [];
  for (const set of sets || []) {
    const weight = numeric(set?.weight);
    const reps = numeric(set?.reps);
    const rpe = set?.rpe == null || set.rpe === '' ? null : numeric(set.rpe, null);
    const last = groups[groups.length - 1];
    if (last && last.weight === weight) {
      last.reps.push(reps);
      last.rpes.push(rpe);
    } else {
      groups.push({ weight, reps: [reps], rpes: [rpe] });
    }
  }
  return groups;
}

/** Repeating strictly-increasing rep pattern, e.g. 1,2,3,1,2,3 → ladder 1-2-3 ×2. */
export function detectLadder(reps) {
  if (!Array.isArray(reps) || reps.length < 4) return null;
  const maxPeriod = Math.floor(reps.length / 2);
  for (let period = 2; period <= maxPeriod; period += 1) {
    if (reps.length % period !== 0) continue;
    const pattern = reps.slice(0, period);
    let increasing = true;
    for (let index = 1; index < pattern.length; index += 1) {
      if (!(pattern[index] > pattern[index - 1])) {
        increasing = false;
        break;
      }
    }
    if (!increasing) continue;
    let matches = true;
    for (let index = period; index < reps.length; index += 1) {
      if (reps[index] !== pattern[index % period]) {
        matches = false;
        break;
      }
    }
    if (matches) return { pattern, rounds: reps.length / period };
  }
  return null;
}

function rpeSuffix(rpes, formatNumber) {
  if (!rpes.some((rpe) => rpe != null)) return '';
  const same = rpes.every((rpe) => rpe != null && rpe === rpes[0]);
  if (same) return ` RPE ${formatNumber(rpes[0])}`;
  const label = rpes.map((rpe) => (rpe == null ? '—' : formatNumber(rpe))).join(DOT);
  return ` RPE ${label}`;
}

function rpeDescription(rpes, formatNumber) {
  if (!rpes.some((rpe) => rpe != null)) return '';
  const same = rpes.every((rpe) => rpe != null && rpe === rpes[0]);
  if (same) return `, RPE ${formatNumber(rpes[0])}`;
  const label = rpes.map((rpe) => (rpe == null ? 'non indicato' : formatNumber(rpe))).join(', ');
  return `, RPE ${label}`;
}

export function summarizeSets(sets, formatNumber) {
  const groups = groupSets(sets);
  if (!groups.length) return '—';
  return groups
    .map((group) => {
      const load = `${formatNumber(group.weight)} kg`;
      const ladder = detectLadder(group.reps);
      let body;
      if (ladder) {
        body = `ladder ${ladder.pattern.join('-')} ×${ladder.rounds}`;
      } else if (group.reps.every((reps) => reps === group.reps[0])) {
        body = `${group.reps.length}×${group.reps[0]}`;
      } else {
        body = group.reps.join(DOT);
      }
      return `${body} @ ${load}${rpeSuffix(group.rpes, formatNumber)}`;
    })
    .join(' + ');
}

export function describeSets(sets, formatNumber) {
  const groups = groupSets(sets);
  if (!groups.length) return 'Nessuna serie';
  return groups
    .map((group) => {
      const load = `${formatNumber(group.weight)} kg`;
      const ladder = detectLadder(group.reps);
      const rpe = rpeDescription(group.rpes, formatNumber);
      if (ladder) {
        return `ladder da ${ladder.pattern.join(', ')} ripetizioni per ${ladder.rounds} giri a ${load}${rpe}`;
      }
      if (group.reps.every((reps) => reps === group.reps[0])) {
        const count = group.reps.length;
        return `${count} serie da ${group.reps[0]} a ${load}${rpe}`;
      }
      return `serie da ${group.reps.join(', ')} ripetizioni a ${load}${rpe}`;
    })
    .join('; poi ');
}
