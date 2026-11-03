'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import workoutsData from '../data/workouts.json';
import maxesData from '../data/maxes.json';
import { describeSets, summarizeSets } from '../lib/setSummary';
import { buildStrengthReport, canonicalExerciseName, intensityZone } from '../lib/strength';
import { buildWorkloadReport, inolZone } from '../lib/workload';

const strengthReport = buildStrengthReport(workoutsData.workouts, maxesData);
const workloadReport = buildWorkloadReport(workoutsData.workouts, maxesData);

const INOL_LABEL = {
  light: 'leggero',
  optimal: 'ottimale',
  hard: 'duro',
  peak: 'molto duro',
};

const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];
const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day, utc: new Date(Date.UTC(year, month - 1, day)) };
}

function formatLongDate(iso) {
  const { year, month, day, utc } = parseISODate(iso);
  const weekday = WEEKDAYS[utc.getUTCDay()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} ${MONTHS[month - 1]} ${year}`;
}

function formatShortDate(iso) {
  const { day, month } = parseISODate(iso);
  return `${String(day).padStart(2, '0')} ${MONTHS_SHORT[month - 1]}`;
}

function formatChartDate(iso) {
  const { day, month } = parseISODate(iso);
  return `${day}/${month}`;
}

function useMedia(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const rounded = Math.round(Math.abs(n) * 10) / 10;
  const [whole, frac] = rounded.toFixed(1).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${grouped}${frac === '0' ? '' : `,${frac}`}`;
}

function exerciseVolume(exercise) {
  return (exercise.sets || []).reduce((sum, set) => sum + (set.reps || 0) * (set.weight || 0), 0);
}

function sessionPeak(workout) {
  let peak = 0;
  for (const exercise of workout.exercises || []) {
    for (const set of exercise.sets || []) {
      if ((set.weight || 0) > peak) peak = set.weight;
    }
  }
  return peak;
}

const ZONE_LABEL = {
  light: 'Leggero',
  moderate: 'Moderato',
  heavy: 'Pesante',
};

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function formatInol(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(2).replace('.', ',')}`;
}

function formatIntensity(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${formatNumber(value)}%`;
}

function joinItalian(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function formatAxisInol(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  if (!Number.isFinite(rounded)) return '';
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
}

function referenceLabel(reference) {
  if (!reference) return '—';
  const reps = Number(reference.reps);
  const repText = Number.isInteger(reps) ? String(reps) : formatNumber(reps);
  return `${formatNumber(reference.weight)} kg · ${repText}RM`;
}

function percentOfMax(bestE1rm, reference) {
  if (!reference || !(reference.e1rm > 0) || !(bestE1rm > 0)) return null;
  return (bestE1rm / reference.e1rm) * 100;
}

function repLine(record) {
  if (!record) return '';
  const reps = (record.repRecords || [])
    .map((rep) => `${rep.reps}×${formatNumber(rep.weight)} kg`)
    .join(' · ');
  const date = record.e1rmDate ? formatMediumDate(record.e1rmDate) : '';
  if (reps && date) return `${reps} · ${date}`;
  return reps || date;
}

function formatMediumDate(iso) {
  const { year, day, month } = parseISODate(iso);
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

function prDescription(pr) {
  const parts = [];
  if (pr.e1rm) parts.push('miglior 1RM stimato');
  if (pr.weight) parts.push('carico più alto');
  if (pr.reps) parts.push('più ripetizioni a un carico già usato');
  return parts.join(', ');
}

function latestWorkoutDate(workouts) {
  let latest = null;
  for (const workout of workouts || []) {
    if (workout?.date && (!latest || workout.date > latest)) latest = workout.date;
  }
  return latest;
}

function chartDomain(points, reference) {
  const values = points.map((point) => point.e1rm);
  if (reference) values.push(reference);
  if (!values.length) return [0, 100];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, max * 0.08, 8);
  return [Math.max(0, Math.floor(min - span * 0.4)), Math.ceil(max + span * 0.28)];
}

function VolumeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const hasLoad = point.includedReps > 0;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{point.date}</p>
      <p className="chart-tooltip-value">{formatNumber(point.volume)} kg</p>
      <p className="chart-tooltip-row">
        Intensità <strong>{formatIntensity(point.intensity)}</strong>
      </p>
      <p className="chart-tooltip-row">
        Volume relativo <strong>{hasLoad ? formatNumber(point.relativeVolume) : '—'}</strong>
      </p>
      <p className="chart-tooltip-row">
        INOL <strong>{hasLoad ? formatInol(point.inol) : '—'}</strong>
      </p>
    </div>
  );
}

function loadChartSummary(points) {
  return points
    .map((point) => {
      const relative = point.includedReps > 0 ? formatNumber(point.relativeVolume) : 'non disponibile';
      const inol = point.includedReps > 0 ? formatInol(point.inol) : 'non disponibile';
      return `${point.date}: volume ${formatNumber(point.volume)} kg, intensità ${formatIntensity(point.intensity)}, volume relativo ${relative}, INOL ${inol}`;
    })
    .join('. ');
}

function StrengthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{label}</p>
      <p className="chart-tooltip-value">e1RM {formatNumber(payload[0].value)} kg</p>
    </div>
  );
}

function StrengthChart({ lift }) {
  const reference = lift.reference?.e1rm || null;
  const data = lift.series.map((point) => ({
    date: formatShortDate(point.date),
    e1rm: Math.round(point.e1rm * 10) / 10,
  }));
  const domain = chartDomain(data, reference);
  const summary = data.map((point) => `${point.date}: ${formatNumber(point.e1rm)} kg`).join(', ');
  const referenceText = reference ? ` Massimale di riferimento ${formatNumber(reference)} kg.` : '';

  if (!data.length) {
    return <p className="empty">Nessuna serie registrata per questa alzata.</p>;
  }

  return (
    <>
      <div
        className="chart-plot"
        role="img"
        aria-label={`1RM stimato di ${lift.name} nel tempo. ${summary}.${referenceText}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#b4b4b8"
              tick={{ fill: '#b4b4b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dy={8}
              padding={{ left: 18, right: 18 }}
            />
            <YAxis
              stroke="#b4b4b8"
              tick={{ fill: '#b4b4b8', fontSize: 11 }}
              width={48}
              axisLine={false}
              tickLine={false}
              domain={domain}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip content={<StrengthTooltip />} cursor={{ stroke: 'rgba(16,185,129,0.45)', strokeWidth: 1 }} />
            {reference ? (
              <ReferenceLine
                y={reference}
                stroke="#6ee7b7"
                strokeDasharray="6 5"
                strokeWidth={2}
              />
            ) : null}
            <Line
              type="linear"
              dataKey="e1rm"
              name="e1RM"
              stroke="#10b981"
              strokeWidth={3}
              // Strict Mode cancels Recharts' draw animation and leaves the stroke hidden.
              isAnimationActive={false}
              dot={{ r: 5, fill: '#10b981', stroke: '#0a0a0b', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#ecfdf5', stroke: '#10b981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="chart-legend">
        <li><span className="swatch swatch-solid" /> e1RM stimato</li>
        {reference ? (
          <li><span className="swatch swatch-dashed" /> Riferimento {formatNumber(reference)} kg</li>
        ) : null}
      </ul>
    </>
  );
}

function MaxRow({ lift, record, selected, onSelect }) {
  const best = record?.e1rm || 0;
  const pct = percentOfMax(best, lift.reference);
  const zone = pct == null ? null : intensityZone(pct);
  const detail = repLine(record);
  const detailTitle = (record?.repRecords || [])
    .map((rep) => `${rep.reps}×${formatNumber(rep.weight)} kg il ${formatMediumDate(rep.date)}`)
    .join(', ');

  return (
    <button
      type="button"
      className={selected ? 'max-row is-selected' : 'max-row'}
      aria-pressed={selected}
      aria-controls="massimale-chart"
      onClick={onSelect}
    >
      <span className="max-name">{lift.name}</span>
      <span className="max-ref">
        {referenceLabel(lift.reference)}
        <span className="sr-only">, massimale di riferimento</span>
      </span>
      <span className="max-e1rm">
        {best > 0 ? (
          <>
            e1RM {formatNumber(best)}
            <span className="sr-only">
              {' '}
              kg
              {record?.e1rmDate ? `, ${formatMediumDate(record.e1rmDate)}` : ''}
              {record?.heaviest ? `, carico più alto ${formatNumber(record.heaviest)} kg` : ''}
            </span>
          </>
        ) : (
          '—'
        )}
      </span>
      {pct != null && (
        <span
          className={`load-badge zone-${zone}`}
          title={`${formatPercent(pct)} del massimale di riferimento (${formatNumber(lift.reference.e1rm)} kg)`}
        >
          {formatPercent(pct)}
          <span className="sr-only"> del massimale</span>
        </span>
      )}
      {detail ? (
        <span className="max-detail" title={detailTitle || undefined}>
          {detail}
        </span>
      ) : null}
    </button>
  );
}

function AccessoryRow({ record }) {
  const detail = repLine(record);
  return (
    <article className="record-row">
      <h3 className="record-name">{record.name}</h3>
      <p className="record-e1rm">
        e1RM {formatNumber(record.e1rm)}
        <span className="sr-only"> kg</span>
      </p>
      {detail ? <p className="record-detail">{detail}</p> : null}
    </article>
  );
}

function ExerciseRow({ exercise, stats }) {
  const intensity = stats?.intensity;
  const summary = summarizeSets(exercise.sets, formatNumber);
  const description = describeSets(exercise.sets, formatNumber);

  return (
    <section className="exercise">
      <h4 className="exercise-name">
        <span className="exercise-name-text">{exercise.name}</span>
        {stats?.pr && (
          <span className="pr-badge">
            PR
            <span className="sr-only">: {prDescription(stats.pr)}</span>
          </span>
        )}
      </h4>
      <p className="exercise-volume">{formatNumber(exerciseVolume(exercise))} kg</p>
      <p className="set-summary" aria-label={description}>
        {summary}
      </p>
      {(stats?.e1rm > 0 || intensity) && (
        <p className="exercise-meta">
          {stats?.e1rm > 0 && (
            <span className="e1rm-line">
              e1RM {formatNumber(stats.e1rm)}
              <span className="sr-only"> kg</span>
            </span>
          )}
          {intensity && (
            <span
              className={`load-badge zone-${intensity.zone}`}
              title={`${formatPercent(intensity.topSetPercent)} del massimale, media ${formatPercent(intensity.averagePercent)}, ${ZONE_LABEL[intensity.zone]}`}
            >
              {formatPercent(intensity.topSetPercent)}
              <span className="sr-only">
                {' '}del massimale, media {formatPercent(intensity.averagePercent)}, {ZONE_LABEL[intensity.zone]}
              </span>
            </span>
          )}
        </p>
      )}
      {exercise.notes ? <p className="exercise-notes">{exercise.notes}</p> : null}
    </section>
  );
}

function SessionWorkload({ workload }) {
  if (!workload) return null;
  const included = workload.exercises.filter((exercise) => exercise.included);
  const excludedNames = [];
  const seen = new Set();
  for (const exercise of workload.exercises) {
    if (exercise.included || seen.has(exercise.name)) continue;
    seen.add(exercise.name);
    excludedNames.push(exercise.name);
  }
  const hasLoad = workload.includedReps > 0;

  return (
    <div className="workload">
      <div className="workload-head">
        <p>
          <span className="workload-kicker">INOL</span>
          <span className="workload-value">{hasLoad ? formatInol(workload.inol) : '—'}</span>
        </p>
        <p className="workload-side">
          {workload.intensity != null ? `Intensità ${formatIntensity(workload.intensity)} · ` : ''}
          Volume relativo {hasLoad ? formatNumber(workload.relativeVolume) : '—'}
        </p>
      </div>
      {included.length > 0 && (
        <ul className="inol-breakdown">
          {included.map((exercise, index) => {
            const zone = inolZone(exercise.inol);
            return (
              <li key={`${exercise.canonical}-${index}`}>
                <span className="inol-name">{exercise.name}</span>
                <span className={`load-badge inol-${zone}`}>
                  {formatInol(exercise.inol)} {INOL_LABEL[zone]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="inol-scale">
        Per esercizio: {'<0,4'} leggero · 0,4–1 ottimale · 1–2 duro · {'>2'} molto duro
      </p>
      {excludedNames.length > 0 && (
        <p className="workload-note">
          {excludedNames.length === 1 ? 'Escluso' : 'Esclusi'} dall&apos;INOL, senza massimale di riferimento: {joinItalian(excludedNames)}.
        </p>
      )}
    </div>
  );
}

function SessionCard({ workout, workload, open, onToggle }) {
  const peak = sessionPeak(workout);
  const panelId = `session-${workout.date}`;
  const exerciseCount = (workout.exercises || []).length;
  const rpe = Number(workout.avgIntensity);
  const showsRpe = rpe > 0 && rpe <= 10;

  return (
    <article className={open ? 'session is-open' : 'session'}>
      <h3 className="session-heading">
        <button
          type="button"
          className="session-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="session-kicker">Sessione</span>
          <span className="session-date">
            <span className="session-date-text">{formatLongDate(workout.date)}</span>
            <span className="session-chevron" aria-hidden="true" />
          </span>
          <span className="session-meta">
            {exerciseCount} {exerciseCount === 1 ? 'esercizio' : 'esercizi'}
            {peak > 0 ? ` · carico massimo ${formatNumber(peak)} kg` : ''}
            {showsRpe ? ` · RPE ${formatNumber(rpe)}` : ''}
            {workload && workload.includedReps > 0 ? ` · INOL ${formatInol(workload.inol)}` : ''}
          </span>
          <span className="session-volume">
            <span className="volume-num">{formatNumber(workout.totalVolume || 0)}</span>
            <span className="volume-unit">kg di volume</span>
          </span>
        </button>
      </h3>

      <div id={panelId} className="session-body" hidden={!open}>
        {workout.notes ? <p className="session-notes">{workout.notes}</p> : null}
        <SessionWorkload workload={workload} />

        <div className="exercises">
          {(workout.exercises || []).map((exercise, exerciseIndex) => {
            const stats = strengthReport.bySession[workout.date]?.[canonicalExerciseName(exercise.name)];
            return (
              <ExerciseRow
                key={`${workout.date}-${exerciseIndex}`}
                exercise={exercise}
                stats={stats}
              />
            );
          })}
        </div>

        {workout.analysis ? (
          <details className="analysis">
            <summary>
              Analisi
              <span className="sr-only"> del {formatLongDate(workout.date)}</span>
            </summary>
            <p>{workout.analysis}</p>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export default function Home() {
  const defaultLift = strengthReport.lifts.some((lift) => lift.canonical === 'stacco')
    ? 'stacco'
    : strengthReport.lifts[0]?.canonical;
  const [selectedLift, setSelectedLift] = useState(defaultLift);
  const [openSessions, setOpenSessions] = useState(() => {
    const latest = latestWorkoutDate(workoutsData.workouts);
    return latest ? { [latest]: true } : {};
  });
  const activeLift = strengthReport.lifts.find((lift) => lift.canonical === selectedLift) || strengthReport.lifts[0];
  const recordsByCanonical = new Map(strengthReport.records.map((record) => [record.canonical, record]));
  const maxCanonicals = new Set(strengthReport.lifts.map((lift) => lift.canonical));
  const otherRecords = strengthReport.records.filter((record) => !maxCanonicals.has(record.canonical));

  const compactChart = useMedia('(max-width: 759px)');
  const workouts = [...workoutsData.workouts].sort(
    (a, b) => parseISODate(b.date).utc - parseISODate(a.date).utc
  );

  const totalVolume = workouts.reduce((sum, workout) => sum + (workout.totalVolume || 0), 0);
  const totalSessions = workouts.length;
  const avgVolume = totalSessions ? Math.round(totalVolume / totalSessions) : 0;

  const chartData = [...workouts]
    .sort((a, b) => parseISODate(a.date).utc - parseISODate(b.date).utc)
    .map((workout) => {
      const workload = workloadReport.byDate[workout.date];
      const intensity = workload?.intensity;
      return {
        date: compactChart ? formatChartDate(workout.date) : formatShortDate(workout.date),
        volume: workout.totalVolume || 0,
        intensity: intensity == null ? null : Math.round(intensity * 10) / 10,
        inol: workload?.inol || 0,
        relativeVolume: workload?.relativeVolume || 0,
        includedReps: workload?.includedReps || 0,
      };
    });

  const chartLabel = loadChartSummary(chartData);
  const inolLabel = chartData
    .map((point) => `${point.date}: INOL ${point.includedReps > 0 ? formatInol(point.inol) : 'non disponibile'}`)
    .join(', ');

  return (
    <div className="wrap">
      <header className="hero">
        <p className="kicker">Diario di forza</p>
        <h1>
          <span className="title-line">La Sacra</span>
          <span className="title-line title-accent">Gemma</span>
        </h1>
        <p className="lede">Volume, intensità e progressi di ogni sessione.</p>
      </header>

      <main>
        <section className="summary" aria-labelledby="riepilogo">
          <h2 id="riepilogo" className="sr-only">Riepilogo</h2>
          <ul className="stats">
            <li className="stat">
              <p className="stat-value">{formatNumber(totalSessions)}</p>
              <p className="stat-label">Sessioni</p>
            </li>
            <li className="stat">
              <p className="stat-value">{formatNumber(totalVolume)}</p>
              <p className="stat-label">Volume totale, kg</p>
            </li>
            <li className="stat">
              <p className="stat-value">{formatNumber(avgVolume)}</p>
              <p className="stat-label">Media per sessione, kg</p>
            </li>
          </ul>
        </section>

        {chartData.length > 0 && (
          <section className="panel chart-panel" aria-labelledby="volume-heading">
            <div className="panel-head">
              <h2 id="volume-heading">Volume e intensità</h2>
              <p>Barre in chilogrammi. La linea, sull&apos;asse destro, è l&apos;intensità media sul massimale di riferimento.</p>
            </div>
            <div className="chart-plot" role="img" aria-label={`Volume, intensità e volume relativo per sessione. ${chartLabel}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 2, left: 0, bottom: 0 }} accessibilityLayer={false}>
                  <CartesianGrid yAxisId="volume" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#b4b4b8"
                    tick={{ fill: '#b4b4b8', fontSize: compactChart ? 10 : 11 }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                    interval={0}
                  />
                  <YAxis
                    yAxisId="volume"
                    stroke="#b4b4b8"
                    tick={{ fill: '#b4b4b8', fontSize: 11 }}
                    width={52}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 'auto']}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <YAxis
                    yAxisId="intensity"
                    orientation="right"
                    stroke="#d1fae5"
                    tick={{ fill: '#d1fae5', fontSize: 11 }}
                    width={40}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    ticks={[0, 50, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                  <Bar
                    yAxisId="volume"
                    dataKey="volume"
                    name="Volume"
                    fill="#10b981"
                    fillOpacity={0.88}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="intensity"
                    type="linear"
                    dataKey="intensity"
                    stroke="#04120d"
                    strokeWidth={6}
                    dot={false}
                    activeDot={false}
                    legendType="none"
                    tooltipType="none"
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="intensity"
                    type="linear"
                    dataKey="intensity"
                    name="Intensità"
                    stroke="#d1fae5"
                    strokeWidth={2.5}
                    connectNulls={false}
                    isAnimationActive={false}
                    dot={{ r: 3.5, fill: '#d1fae5', stroke: '#0a0a0b', strokeWidth: 2 }}
                    activeDot={{ r: 5.5, fill: '#ecfdf5', stroke: '#10b981', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <ul className="chart-legend">
              <li><span className="swatch swatch-bar" /> Volume, kg</li>
              <li><span className="swatch swatch-intensity" /> Intensità media, %</li>
            </ul>

            <div className="panel-subhead">
              <h3 id="inol-heading">INOL per sessione</h3>
              <p>Somma di ripetizioni / (100 − intensità) per gli esercizi con massimale.</p>
            </div>
            <div className="chart-plot chart-plot-inol" role="img" aria-label={`INOL per sessione. ${inolLabel}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16, right: 2, left: 0, bottom: 0 }} accessibilityLayer={false}>
                  <CartesianGrid yAxisId="inol" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#b4b4b8"
                    tick={{ fill: '#b4b4b8', fontSize: compactChart ? 10 : 11 }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                    interval={0}
                  />
                  <YAxis
                    yAxisId="inol"
                    stroke="#b4b4b8"
                    tick={{ fill: '#b4b4b8', fontSize: 11 }}
                    width={52}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 'auto']}
                    tickFormatter={formatAxisInol}
                  />
                  <YAxis
                    yAxisId="pad"
                    orientation="right"
                    width={40}
                    domain={[0, 1]}
                    ticks={[]}
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(110,231,183,0.1)' }} />
                  <Bar
                    yAxisId="inol"
                    dataKey="inol"
                    name="INOL"
                    fill="#6ee7b7"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-note">
              Soglie per esercizio, non per la somma di sessione: sotto 0,4 leggero, 0,4–1 ottimale, 1–2 duro, oltre 2 molto duro. Il tooltip riporta anche il volume relativo.
            </p>
          </section>
        )}

        {activeLift && (
          <section className="panel chart-panel maxes-panel" aria-labelledby="massimali-heading">
            <div className="panel-head">
              <h2 id="massimali-heading">Massimali</h2>
              <p>Riferimento, miglior 1RM stimato e percentuale sul massimale.</p>
            </div>
            <div className="max-list" role="group" aria-label="Scegli l'alzata">
              {strengthReport.lifts.map((lift) => (
                <MaxRow
                  key={lift.canonical}
                  lift={lift}
                  record={recordsByCanonical.get(lift.canonical)}
                  selected={lift.canonical === activeLift.canonical}
                  onSelect={() => setSelectedLift(lift.canonical)}
                />
              ))}
            </div>
            {activeLift.canonical === 'trazioni' && strengthReport.bodyweight ? (
              <p className="lift-note">
                Per le trazioni il carico è il peso corporeo ({formatNumber(strengthReport.bodyweight)} kg) più la zavorra.
              </p>
            ) : null}
            <div id="massimale-chart">
              <StrengthChart key={activeLift.canonical} lift={activeLift} />
            </div>
          </section>
        )}

        {otherRecords.length > 0 && (
          <section className="records" aria-labelledby="record-heading">
            <h2 id="record-heading">Record personali</h2>
            <p className="section-lead">Alzate senza massimale di riferimento.</p>
            <div className="record-list">
              {otherRecords.map((record) => (
                <AccessoryRow key={record.canonical} record={record} />
              ))}
            </div>
          </section>
        )}

        <section className="sessions" aria-labelledby="sessioni-heading">
          <h2 id="sessioni-heading">Sessioni</h2>

          {workouts.length === 0 ? (
            <p className="empty">Nessun allenamento registrato ancora. Il bot inizierà a raccogliere i dati presto.</p>
          ) : (
            <div className="session-list">
              {workouts.map((workout) => (
                <SessionCard
                  key={workout.date}
                  workout={workout}
                  workload={workloadReport.byDate[workout.date]}
                  open={Boolean(openSessions[workout.date])}
                  onToggle={() => {
                    setOpenSessions((current) => ({
                      ...current,
                      [workout.date]: !current[workout.date],
                    }));
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <a
          href="https://www.pexels.com/photo/barbell-and-kettle-bell-on-a-black-mat-6628962/"
          rel="noreferrer"
        >
          Foto: Arturo EG / Pexels
        </a>
      </footer>
    </div>
  );
}
