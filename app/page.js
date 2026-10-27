'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import workoutsData from '../data/workouts.json';

export default function Home() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    // Sort by date descending
    const sorted = [...workoutsData.workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
    setWorkouts(sorted);
  }, []);

  const totalVolume = workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  const totalSessions = workouts.length;
  const avgVolume = totalSessions ? Math.round(totalVolume / totalSessions) : 0;

  const chartData = [...workouts]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(w => ({
      date: new Date(w.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
      volume: w.totalVolume || 0,
      intensity: w.avgIntensity || 0
    }));

  return (
    <div className="container">
      <header>
        <h1>La <span>Sacra Gemma</span></h1>
        <p className="subtitle">Diario di allenamento — volume, intensità, progressi</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalSessions}</div>
          <div className="stat-label">Sessioni</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalVolume.toLocaleString('it-IT')}</div>
          <div className="stat-label">Volume totale (kg)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgVolume.toLocaleString('it-IT')}</div>
          <div className="stat-label">Volume medio / sessione</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="chart-container">
          <h2 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Volume nel tempo</h2>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
              <Line type="monotone" dataKey="volume" stroke="#d4af37" strokeWidth={3} dot={{ fill: '#d4af37' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Allenamenti recenti</h2>

      {workouts.length === 0 ? (
        <div className="empty">Nessun allenamento registrato ancora. Il bot inizierà a raccogliere i dati presto.</div>
      ) : (
        <div className="workouts">
          {workouts.map((w, i) => (
            <div key={i} className="workout-card">
              <div className="workout-header">
                <span className="date">{new Date(w.date).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="volume">Volume: {w.totalVolume?.toLocaleString('it-IT') || 0} kg</span>
              </div>
              {w.exercises?.map((ex, j) => (
                <div key={j} className="exercise">
                  <strong>{ex.name}</strong>
                  <div className="sets">
                    {ex.sets?.map((s, k) => (
                      <span key={k} className="set-badge">
                        {s.reps}×{s.weight}kg{s.rpe ? ` @RPE${s.rpe}` : ''}
                      </span>
                    ))}
                  </div>
                  {ex.notes && <div className="notes">{ex.notes}</div>}
                </div>
              ))}
              {w.notes && <div className="notes">Note sessione: {w.notes}</div>}
              {w.analysis && <div className="notes" style={{ color: 'var(--accent)' }}>Analisi: {w.analysis}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
