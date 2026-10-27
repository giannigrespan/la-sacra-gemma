'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import workoutsData from '../data/workouts.json';

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

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{label}</p>
      <p className="chart-tooltip-value">{formatNumber(payload[0].value)} kg</p>
    </div>
  );
}

export default function Home() {
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
                      <stop offset="0%" stopColor="#ff4d1c" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="#ff4d1c" stopOpacity={0} />
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
                  <Tooltip content={<VolumeTooltip />} cursor={{ stroke: 'rgba(255,77,28,0.45)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    name="Volume"
                    stroke="#ff4d1c"
                    strokeWidth={3}
                    fill="url(#volumeFill)"
                    dot={{ r: 4, fill: '#ff4d1c', stroke: '#0a0a0b', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#fff4ef', stroke: '#ff4d1c', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
                      {(workout.exercises || []).map((exercise, exerciseIndex) => (
                        <section key={`${workout.date}-${exerciseIndex}`} className="exercise">
                          <div className="exercise-head">
                            <h4>{exercise.name}</h4>
                            <p>{formatNumber(exerciseVolume(exercise))} kg</p>
                          </div>
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
                      ))}
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
