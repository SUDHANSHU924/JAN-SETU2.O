import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import CountUpBase from 'react-countup';
const CountUp = CountUpBase.default || CountUpBase;

function BarChart({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 420, H = 160, BAR_W = Math.min(36, Math.floor((W - 20) / data.length - 8)), GAP = 8;
  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} width="100%" style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const x = i * (BAR_W + GAP) + GAP;
        const barH = Math.max(4, (d.value / max) * H);
        const y = H - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={BAR_W} height={barH} rx={4} fill="url(#barGrad)" opacity={0.85} />
            <text x={x + BAR_W / 2} y={H + 16} textAnchor="middle" fontSize={10} fill="#5C8DA6" fontFamily="Outfit,sans-serif">
              {d.label.slice(0, 6)}
            </text>
            <text x={x + BAR_W / 2} y={y - 4} textAnchor="middle" fontSize={11} fill="#26878F" fontWeight="600" fontFamily="Outfit,sans-serif">
              {d.value}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--teal-primary)" />
          <stop offset="100%" stopColor="var(--blue-electric)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Donut({ segments }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  let start = -Math.PI / 2;
  const R = 60, cx = 80, cy = 80, stroke = 28;
  const paths = segments.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(start);
    const y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(start + angle);
    const y2 = cy + R * Math.sin(start + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
    start += angle;
    return { ...d, path };
  });
  return (
    <svg viewBox="0 0 160 160" width={160} height={160}>
      {paths.map((p, i) => (
        <path key={i} d={p.path} fill="none" stroke={p.color} strokeWidth={stroke} strokeLinecap="butt" />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight="700" fill="#26878F" fontFamily="Outfit,sans-serif">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fill="#5C8DA6" fontFamily="Outfit,sans-serif">Total</text>
    </svg>
  );
}

const PRIORITY_COLORS = {
  high:   'var(--status-high)',
  medium: 'var(--status-med)',
  low:    'var(--status-low)',
};

const rankColor = (r) => r === 1 ? '#D4AF37' : r === 2 ? '#B8B8B8' : r === 3 ? '#CD7F32' : 'var(--color-text-secondary)';

export function Analytics() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getAnalytics } = await import('../../services/api');
        const data = await getAnalytics();
        setRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Analytics load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Compute derived data from real records
  const categoryMap = {};
  const priorityMap = { high: 0, medium: 0, low: 0 };
  const statusMap   = { submitted: 0, assigned: 0, in_progress: 0, resolved: 0, rejected: 0 };

  records.forEach(r => {
    const cat  = r.category || 'General';
    const pri  = (r.priority || 'medium').toLowerCase();
    const stat = (r.status   || 'submitted').toLowerCase();
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    if (pri in priorityMap)  priorityMap[pri]  += 1;
    if (stat in statusMap)   statusMap[stat]   += 1;
  });

  const categoryData = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  const priorityData = Object.entries(priorityMap)
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), value, color: PRIORITY_COLORS[label] }));

  const total     = records.length;
  const resolved  = statusMap.resolved;
  const pending   = total - resolved;
  const resolvedPct = total ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="animate-fade-in">

      {/* Live KPIs from real data */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Complaints', value: total,        suffix: '',  color: 'var(--teal-primary)' },
          { label: 'Resolved',         value: resolved,     suffix: '',  color: 'var(--status-low)' },
          { label: 'Pending',          value: pending,      suffix: '',  color: 'var(--status-med)' },
          { label: 'Resolution Rate',  value: resolvedPct,  suffix: '%', color: 'var(--status-low)' },
        ].map((k, i) => (
          <GlassCard key={i} layer={1} hoverEffect={true} style={{ padding: '20px 24px' }}>
            <span className="kpi-card__label">{k.label}</span>
            <span className="kpi-card__value" style={{ color: k.color }}>
              {loading ? '…' : <CountUp end={k.value} decimals={0} duration={1.5} suffix={k.suffix} />}
            </span>
          </GlassCard>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        <GlassCard layer={1} style={{ padding: 24 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>Complaints by Category</div>
          {loading ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</div>
          ) : categoryData.length ? (
            <BarChart data={categoryData} />
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: 24 }}>No data yet</div>
          )}
        </GlassCard>

        <GlassCard layer={1} style={{ padding: 24 }}>
          <div className="section-label" style={{ marginBottom: 16 }}>Priority Distribution</div>
          {loading ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</div>
          ) : priorityData.length ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Donut segments={priorityData} />
              <div style={{ flex: 1 }}>
                {priorityData.map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1, color: 'var(--text-secondary)' }}>{p.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: p.color }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: 24 }}>No data yet</div>
          )}
        </GlassCard>
      </div>

      {/* Status breakdown */}
      <GlassCard layer={1} style={{ padding: 24, marginBottom: 24 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Status Breakdown</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(statusMap).map(([status, count]) => (
            <div key={status} style={{
              flex: 1, minWidth: 100, textAlign: 'center', padding: '16px 12px',
              background: 'rgba(255,255,255,0.03)', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--teal-primary)', marginBottom: 4 }}>
                {loading ? '—' : count}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {status.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Geo Heatmap placeholder */}
      <GlassCard layer={1} style={{ padding: 24, marginBottom: 24 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Geo-Intelligence Heatmap</div>
        <div style={{
          height: 240, borderRadius: 14, overflow: 'hidden',
          background: 'radial-gradient(circle at center, rgba(38,135,143,0.15) 0%, rgba(6,11,24,1) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', border: '1px solid rgba(255,255,255,0.06)'
        }}>
          {[
            { x: '20%', y: '30%', size: 60, opacity: 0.8, label: '34' },
            { x: '50%', y: '45%', size: 80, opacity: 0.9, label: String(total || 14) },
            { x: '70%', y: '25%', size: 40, opacity: 0.6, label: '18' },
            { x: '35%', y: '65%', size: 50, opacity: 0.7, label: '24' },
            { x: '80%', y: '60%', size: 30, opacity: 0.5, label: '11' },
          ].map((c, i) => (
            <div key={i} style={{
              position: 'absolute', left: c.x, top: c.y,
              width: c.size, height: c.size, borderRadius: '50%',
              background: `rgba(255, 77, 109, ${c.opacity * 0.5})`,
              border: `2px solid rgba(255, 77, 109, ${c.opacity})`,
              boxShadow: `0 0 20px rgba(255, 77, 109, ${c.opacity * 0.4})`,
              transform: 'translate(-50%, -50%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--status-high)'
            }}>{c.label}</div>
          ))}
          <span style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 11, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20, backdropFilter: 'blur(8px)' }}>
            📍 Active Districts
          </span>
        </div>
      </GlassCard>

    </div>
  );
}
