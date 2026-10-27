const EPSILON = 1e-6;

const EXERCISE_ALIASES = {
  'trazioni (kg aggiunti)': 'trazioni',
};

const MAIN_LIFT_ORDER = [
  'stacco',
  'squat frontale',
  'box squat',
  'floor press',
  'military press',
  'rematore',
  'trazioni',
];

export function canonicalExerciseName(name) {
  const key = String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (EXERCISE_ALIASES[key]) return EXERCISE_ALIASES[key];
  const withoutNote = key.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (EXERCISE_ALIASES[withoutNote]) return EXERCISE_ALIASES[withoutNote];
  return withoutNote;
}

/** Epley: weight * (1 + reps / 30). A single rep is already a 1RM. */
export function estimateOneRepMax(weight, reps) {
  const load = Number(weight);
  const repetitions = Number(reps);
  if (!Number.isFinite(load) || !Number.isFinite(repetitions) || load <= 0 || repetitions <= 0) {
    return 0;
  }
  if (repetitions === 1) return load;
  return load * (1 + repetitions / 30);
}

export function intensityZone(percent) {
  if (percent < 70) return 'light';
  if (percent <= 85) return 'moderate';
  return 'heavy';
}

function weightKey(weight) {
  return Math.round(Number(weight) * 1000) / 1000;
}

function referenceEntries(maxesDocument) {
  const entries = Array.isArray(maxesDocument?.maxes) ? maxesDocument.maxes : [];
  return entries
    .map((entry) => {
      const name = entry.name || entry.exercise;
      const weight = Number(entry.weight);
      const reps = Number(entry.reps);
      if (!name || !Number.isFinite(weight) || !Number.isFinite(reps)) return null;
      return {
        name,
        weight,
        reps,
        date: entry.date || maxesDocument.asOf || maxesDocument.date || null,
        canonical: canonicalExerciseName(name),
        e1rm: estimateOneRepMax(weight, reps),
      };
    })
    .filter(Boolean);
}

function emptyRecord() {
  return {
    e1rm: 0,
    e1rmDate: null,
    heaviest: 0,
    heaviestDate: null,
    repsAtWeight: new Map(),
  };
}

/**
 * Pure summary of estimated 1RMs, intensity against reference maxes, and
 * personal records. Reference maxes do not block a record: a session that
 * beats both history and maxes.json is still a PR.
 */
export function buildStrengthReport(workouts, maxesDocument) {
  const references = new Map();
  for (const entry of referenceEntries(maxesDocument)) {
    references.set(entry.canonical, entry);
  }

  const ordered = [...(workouts || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const bests = new Map();
  const bySession = {};
  const series = {};
  const displayNames = new Map();

  for (const reference of references.values()) {
    displayNames.set(reference.canonical, reference.name);
    series[reference.canonical] = [];
  }

  for (const workout of ordered) {
    const sessionStats = {};
    bySession[workout.date] = sessionStats;

    for (const exercise of workout.exercises || []) {
      const canonical = canonicalExerciseName(exercise.name);
      if (!references.has(canonical)) {
        displayNames.set(canonical, exercise.name);
      }

      const sets = exercise.sets || [];
      let e1rm = 0;
      let topWeight = 0;
      const repsByWeight = new Map();

      for (const set of sets) {
        const load = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        e1rm = Math.max(e1rm, estimateOneRepMax(load, reps));
        topWeight = Math.max(topWeight, load);
        if (load > 0 && reps > 0) {
          const key = weightKey(load);
          repsByWeight.set(key, Math.max(repsByWeight.get(key) || 0, reps));
        }
      }

      const prior = bests.get(canonical) || emptyRecord();
      const pr = {
        e1rm: e1rm > prior.e1rm + EPSILON,
        weight: topWeight > prior.heaviest + EPSILON,
        reps: false,
      };

      for (const [weight, reps] of repsByWeight) {
        const previous = prior.repsAtWeight.get(weight);
        if (previous && reps > previous.reps) pr.reps = true;
      }

      const repsAtWeight = new Map(prior.repsAtWeight);
      for (const [weight, reps] of repsByWeight) {
        const previous = repsAtWeight.get(weight);
        if (!previous || reps > previous.reps) {
          repsAtWeight.set(weight, { reps, date: workout.date });
        }
      }

      bests.set(canonical, {
        e1rm: pr.e1rm ? e1rm : prior.e1rm,
        e1rmDate: pr.e1rm ? workout.date : prior.e1rmDate,
        heaviest: pr.weight ? topWeight : prior.heaviest,
        heaviestDate: pr.weight ? workout.date : prior.heaviestDate,
        repsAtWeight,
      });

      const reference = references.get(canonical);
      let intensity = null;
      if (reference && reference.e1rm > 0 && topWeight > 0) {
        const loads = sets.map((set) => Number(set.weight) || 0).filter((load) => load > 0);
        const average = loads.reduce((sum, load) => sum + load, 0) / loads.length;
        const topSetPercent = (topWeight / reference.e1rm) * 100;
        intensity = {
          topSetPercent,
          averagePercent: (average / reference.e1rm) * 100,
          zone: intensityZone(topSetPercent),
        };
      }

      const hasPr = pr.e1rm || pr.weight || pr.reps;
      sessionStats[canonical] = {
        e1rm,
        intensity,
        pr: hasPr ? pr : null,
      };

      if (!series[canonical]) series[canonical] = [];
      if (e1rm > 0) series[canonical].push({ date: workout.date, e1rm });
    }
  }

  const liftOrder = [];
  for (const canonical of MAIN_LIFT_ORDER) {
    if (references.has(canonical)) liftOrder.push(canonical);
  }
  for (const reference of references.values()) {
    if (!liftOrder.includes(reference.canonical)) liftOrder.push(reference.canonical);
  }

  const recordOrder = [...liftOrder];
  const extras = [...bests.keys()]
    .filter((canonical) => !recordOrder.includes(canonical))
    .sort((a, b) => displayNames.get(a).localeCompare(displayNames.get(b), 'it'));
  recordOrder.push(...extras);

  const records = recordOrder
    .filter((canonical) => bests.has(canonical))
    .map((canonical) => {
      const best = bests.get(canonical);
      const repRecords = [...best.repsAtWeight.entries()]
        .map(([weight, info]) => ({ weight, reps: info.reps, date: info.date }))
        .sort((a, b) => b.weight - a.weight || b.reps - a.reps);
      return {
        canonical,
        name: displayNames.get(canonical),
        e1rm: best.e1rm,
        e1rmDate: best.e1rmDate,
        heaviest: best.heaviest,
        heaviestDate: best.heaviestDate,
        repRecords,
      };
    });

  const lifts = liftOrder.map((canonical) => ({
    canonical,
    name: displayNames.get(canonical) || canonical,
    reference: references.get(canonical) || null,
    series: series[canonical] || [],
  }));

  return {
    bodyweight: Number(maxesDocument?.bodyweight) || null,
    lifts,
    bySession,
    records,
  };
}
