import { canonicalExerciseName, referenceByCanonical } from './strength';

/**
 * INOL denominator is (100 − intensity). Intensity at or above 99% is capped
 * so the denominator stays at least 1.
 */
export function clampIntensity(percent) {
  const value = Number(percent);
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 99);
}

/** Set INOL = reps / (100 − intensity%). */
export function setInol(reps, intensityPercent) {
  const repetitions = Number(reps);
  if (!Number.isFinite(repetitions) || repetitions <= 0) return 0;
  return repetitions / (100 - clampIntensity(intensityPercent));
}

/**
 * Thresholds are per exercise, not per session sum.
 * <0.4 leggero, 0.4–1 ottimale, 1–2 duro, >2 molto duro.
 * The shared edges 1 and 2 stay in the lower band.
 */
export function inolZone(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0.4) return 'light';
  if (score <= 1) return 'optimal';
  if (score <= 2) return 'hard';
  return 'peak';
}

/**
 * avgIntensity above the RPE scale (0–10) is already a percent of the
 * reference max. Zero and RPE-sized values fall back to the computed average.
 */
export function resolveAverageIntensity(stored, computed) {
  const value = Number(stored);
  if (Number.isFinite(value) && value > 10) return value;
  return computed == null || !Number.isFinite(computed) ? null : computed;
}

function exerciseWorkload(exercise, references) {
  const canonical = canonicalExerciseName(exercise?.name);
  const reference = references.get(canonical);
  if (!reference) {
    return {
      name: exercise?.name || canonical,
      canonical,
      included: false,
      inol: 0,
      relativeVolume: 0,
      reps: 0,
    };
  }

  let inol = 0;
  let relativeVolume = 0;
  let reps = 0;
  for (const set of exercise?.sets || []) {
    const weight = Number(set.weight);
    const repetitions = Number(set.reps);
    // Stored weight is the load already used for volume. Pull-ups include
    // bodyweight plus added load; nothing is added again here.
    if (!(weight > 0) || !(repetitions > 0) || !(reference.e1rm > 0)) continue;
    const intensity = (weight / reference.e1rm) * 100;
    relativeVolume += repetitions * (intensity / 100);
    inol += setInol(repetitions, intensity);
    reps += repetitions;
  }

  return {
    name: exercise?.name || reference.name,
    canonical,
    included: true,
    inol,
    relativeVolume,
    reps,
  };
}

export function sessionWorkload(workout, references) {
  const exercises = (workout?.exercises || []).map((exercise) => exerciseWorkload(exercise, references));
  let inol = 0;
  let relativeVolume = 0;
  let includedReps = 0;
  for (const exercise of exercises) {
    if (!exercise.included) continue;
    inol += exercise.inol;
    relativeVolume += exercise.relativeVolume;
    includedReps += exercise.reps;
  }
  const computed = includedReps > 0 ? (relativeVolume / includedReps) * 100 : null;
  return {
    inol,
    relativeVolume,
    includedReps,
    intensity: resolveAverageIntensity(workout?.avgIntensity, computed),
    computedIntensity: computed,
    exercises,
  };
}

export function buildWorkloadReport(workouts, maxesDocument) {
  const references = referenceByCanonical(maxesDocument);
  const byDate = {};
  for (const workout of workouts || []) {
    if (!workout?.date) continue;
    byDate[workout.date] = sessionWorkload(workout, references);
  }
  return { byDate };
}
