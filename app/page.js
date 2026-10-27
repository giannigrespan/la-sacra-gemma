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

export default function Home() {
  const defaultLift = strengthReport.lifts.some((lift) => lift.canonical === 'stacco')
    ? 'stacco'
    : strengthReport.lifts[0]?.canonical;
  const [selectedLift, setSelectedLift] = useState(defaultLift);
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
              {workouts.map((workout) => {
                const peak = sessionPeak(workout);
                return (
                  <article key={workout.date} className="session">
                    <header className="session-top">
                      <div>
                        <p className="session-kicker">Sessione</p>
                        <h3>{formatLongDate(workout.date)}</h3>
                        <p className="session-meta">
                          {(workout.exercises || []).length} esercizi
                          {peak > 0 ? ` · carico massimo ${formatNumber(peak)} kg` : ''}
                        </p>
                      </div>
                      <p className="session-volume">
                        <span className="volume-num">{formatNumber(workout.totalVolume || 0)}</span>
                        <span className="volume-unit">kg di volume</span>
                      </p>
                    </header>

                    {workout.avgIntensity > 0 && (
                      <p className="intensity">Intensità media RPE {formatNumber(workout.avgIntensity)}</p>
                    )}

                    {workout.notes ? <p className="session-notes">{workout.notes}</p> : null}

                    {workout.analysis ? (
                      <section className="analysis" aria-label={`Analisi del ${formatLongDate(workout.date)}`}>
                        <h4>Analisi</h4>
                        <p>{workout.analysis}</p>
                      </section>
                    ) : null}

                    <div className="exercises">
                      {(workout.exercises || []).map((exercise, exerciseIndex) => {
                        const stats = strengthReport.bySession[workout.date]?.[canonicalExerciseName(exercise.name)];
                        const intensity = stats?.intensity;
                        return (
                        <section key={`${workout.date}-${exerciseIndex}`} className="exercise">
                          <div className="exercise-head">
                            <div className="exercise-title">
                              <h4>
                                {exercise.name}
                                {stats?.pr && (
                                  <span className="pr-badge">
                                    PR
                                    <span className="sr-only">: {prDescription(stats.pr)}</span>
                                  </span>
                                )}
                              </h4>
                              {stats?.e1rm > 0 && (
                                <p className="e1rm-line">e1RM {formatNumber(stats.e1rm)} kg</p>
                              )}
                            </div>
                            <p className="exercise-volume">{formatNumber(exerciseVolume(exercise))} kg</p>
                          </div>
                          {intensity && (
                            <div className="load-meter">
                              <div className="load-meter-row">
                                <span className={`load-badge zone-${intensity.zone}`}>
                                  {formatPercent(intensity.topSetPercent)} e1RM
                                </span>
                                <span className="load-average">media {formatPercent(intensity.averagePercent)}</span>
                                <span className={`load-zone zone-${intensity.zone}`}>{ZONE_LABEL[intensity.zone]}</span>
                              </div>
                              <div
                                className="load-bar"
                                role="img"
                                aria-label={`${exercise.name} ${formatPercent(intensity.topSetPercent)} e1RM, media ${formatPercent(intensity.averagePercent)}, ${ZONE_LABEL[intensity.zone]}`}
                              >
                                <span
                                  className={`load-bar-fill zone-${intensity.zone}`}
                                  style={{ width: `${Math.min(100, intensity.topSetPercent)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="table-wrap">
                            <table>
                              <caption className="sr-only">Serie di {exercise.name}</caption>
                              <thead>
                                <tr>
                                  <th scope="col">Serie</th>
                                  <th scope="col" className="num">Rip.</th>
                                  <th scope="col" className="num">Carico</th>
                                  <th scope="col" className="num">RPE</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(exercise.sets || []).map((set, index) => (
                                  <tr key={`${exercise.name}-${index}`}>
                                    <th scope="row">{index + 1}</th>
                                    <td className="num">{set.reps}</td>
                                    <td className="num">{formatNumber(set.weight)} kg</td>
                                    <td className="num">{set.rpe == null ? '—' : set.rpe}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {exercise.notes ? <p className="exercise-notes">{exercise.notes}</p> : null}
                        </section>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
