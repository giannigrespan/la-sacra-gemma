'use client';

import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { buildStrengthReport, canonicalExerciseName } from '../lib/strength';

const strengthReport = buildStrengthReport(workoutsData.workouts, maxesData);

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

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{label}</p>
      <p className="chart-tooltip-value">{formatNumber(payload[0].value)} kg</p>
    </div>
  );
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
          <LineChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#b4b4b8"
              tick={{ fill: '#b4b4b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              stroke="#b4b4b8"
              tick={{ fill: '#b4b4b8', fontSize: 12 }}
              width={64}
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
              dot={{ r: 4, fill: '#10b981', stroke: '#0a0a0b', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#ecfdf5', stroke: '#10b981', strokeWidth: 2 }}
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

function SessionCard({ workout, open, onToggle }) {
  const peak = sessionPeak(workout);
  const panelId = `session-${workout.date}`;
  const exerciseCount = (workout.exercises || []).length;

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
            {workout.avgIntensity > 0 ? ` · RPE ${formatNumber(workout.avgIntensity)}` : ''}
          </span>
          <span className="session-volume">
            <span className="volume-num">{formatNumber(workout.totalVolume || 0)}</span>
            <span className="volume-unit">kg di volume</span>
          </span>
        </button>
      </h3>

      <div id={panelId} className="session-body" hidden={!open}>
        {workout.notes ? <p className="session-notes">{workout.notes}</p> : null}

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

  const workouts = [...workoutsData.workouts].sort(
    (a, b) => parseISODate(b.date).utc - parseISODate(a.date).utc
  );

  const totalVolume = workouts.reduce((sum, workout) => sum + (workout.totalVolume || 0), 0);
  const totalSessions = workouts.length;
  const avgVolume = totalSessions ? Math.round(totalVolume / totalSessions) : 0;

  const chartData = [...workouts]
    .sort((a, b) => parseISODate(a.date).utc - parseISODate(b.date).utc)
    .map((workout) => ({
      date: formatShortDate(workout.date),
      volume: workout.totalVolume || 0,
    }));

  const chartLabel = chartData
    .map((point) => `${point.date}: ${formatNumber(point.volume)} kg`)
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
              <h2 id="volume-heading">Volume nel tempo</h2>
              <p>Chilogrammi sollevati in ogni sessione.</p>
            </div>
            <div className="chart-plot" role="img" aria-label={`Grafico del volume nel tempo. ${chartLabel}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#b4b4b8"
                    tick={{ fill: '#b4b4b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    stroke="#b4b4b8"
                    tick={{ fill: '#b4b4b8', fontSize: 12 }}
                    width={64}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip content={<VolumeTooltip />} cursor={{ stroke: 'rgba(16,185,129,0.45)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    name="Volume"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#volumeFill)"
                    dot={{ r: 4, fill: '#10b981', stroke: '#0a0a0b', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#ecfdf5', stroke: '#10b981', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {activeLift && (
          <section className="panel chart-panel strength-panel" aria-labelledby="forza-heading">
            <div className="panel-head">
              <h2 id="forza-heading">Forza stimata</h2>
              <p>1RM stimato con Epley sul miglior set di ogni sessione. La linea tratteggiata è il massimale di riferimento.</p>
            </div>
            <div className="lift-tabs" role="group" aria-label="Scegli l'alzata">
              {strengthReport.lifts.map((lift) => {
                const selected = lift.canonical === activeLift.canonical;
                return (
                  <button
                    key={lift.canonical}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedLift(lift.canonical)}
                  >
                    {lift.name}
                  </button>
                );
              })}
            </div>
            <div>
              {activeLift.canonical === 'trazioni' && strengthReport.bodyweight ? (
                <p className="lift-note">
                  Per le trazioni il carico è il peso corporeo ({formatNumber(strengthReport.bodyweight)} kg) più la zavorra.
                </p>
              ) : null}
              <StrengthChart lift={activeLift} />
            </div>
          </section>
        )}

        {strengthReport.records.length > 0 && (
          <section className="records" aria-labelledby="record-heading">
            <h2 id="record-heading">Record personali</h2>
            <p className="section-lead">Migliori stime, carichi e ripetizioni trovati nello storico, con la data in cui sono stati fatti.</p>
            <div className="record-list">
              {strengthReport.records.map((record) => (
                <article key={record.canonical} className="record-card">
                  <h3>{record.name}</h3>
                  <dl>
                    <div>
                      <dt>e1RM</dt>
                      <dd>
                        {formatNumber(record.e1rm)} kg
                        <span>{formatMediumDate(record.e1rmDate)}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Carico</dt>
                      <dd>
                        {formatNumber(record.heaviest)} kg
                        <span>{formatMediumDate(record.heaviestDate)}</span>
                      </dd>
                    </div>
                  </dl>
                  {record.repRecords.length > 0 && (
                    <ul className="rep-records">
                      {record.repRecords.map((rep) => (
                        <li key={`${record.canonical}-${rep.weight}`}>
                          {rep.reps}×{formatNumber(rep.weight)} kg
                          <span>{formatMediumDate(rep.date)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
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
