import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { GlassCard } from '../../components/ui/GlassCard';
import CountUpBase from 'react-countup';
import { apiCall } from '../../utils/api';
const CountUp = CountUpBase.default || CountUpBase;

const escalations = [
  { id: '#CMP-DYNAMIC', reason: 'Citizen complaint escalated', level: 2 },
];

function SLATimer({ hours }) {
  const color = hours < 1 ? 'var(--color-urgent-text)' : hours < 24 ? 'var(--color-warning-text)' : 'var(--color-accent)';
  const className = hours < 1 ? 'timer-breach' : hours < 24 ? 'timer-warning' : 'timer-normal';
  const label = hours < 1
    ? `${Math.round(hours * 60)}m left`
    : hours < 24
      ? `${hours.toFixed(1)}h left`
      : `${Math.round(hours)}h`;
  return (
    <span className={`mono queue-card__sla ${className}`} style={{ color }}>
      ⏱ {label}
    </span>
  );
}

function PriorityBorder({ priority }) {
  const color = priority === 'high' ? 'var(--color-urgent-text)' : priority === 'medium' ? 'var(--color-warning-text)' : 'var(--color-success-text)';
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, bottom: 0,
      width: 4, background: color, borderRadius: '4px 0 0 4px'
    }} />
  );
}

const DEPT_BARS = [
  { label: 'Resolution Time', pct: 40 },
  { label: 'Citizen Rating',  pct: 35 },
  { label: 'Backlog',         pct: 25 },
];

const FILTERS = ['All', 'High Priority', 'SLA Warning'];

export function Dashboard() {
  const [activeFilter, setActiveFilter] = useState(0);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const data = await apiCall('GET', '/grievances/queue');
        setComplaints(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadComplaints();
  }, []);

  const visibleComplaints = complaints.map((c) => ({
    id: c.complaint_id || c.id || c.tracking_token || '#CMP-0000',
    title: c.text_original || c.title || 'Complaint',
    cat: c.category || c.cat || 'General',
    dept: c.department || c.dept || 'JanSetu',
    citizen: c.citizen_name || c.citizen || 'Citizen',
    priority: (c.priority || 'medium').toString().toLowerCase(),
    slaHours: Number(c.sla_hours ?? c.slaHours ?? 24),
    status: (c.status || 'assigned').toString().toLowerCase(),
    critical: Boolean(c.critical || Number(c.sla_hours ?? c.slaHours ?? 24) < 1),
  })).filter(c => {
    if (activeFilter === 1) return c.priority === 'high';
    if (activeFilter === 2) return c.slaHours < 24;
    return true;
  });

  return (
    <div className="animate-fade-in">
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

      {/* KPI Strip */}
      <div className="kpi-grid stagger-children" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Complaints', value: complaints.length.toString(), trend: 'Overall', up: true  },
          { label: 'Active Cases',     value: complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length.toString(),   trend: 'Pending',  up: false },
          { label: 'SLA Breaches',     value: complaints.filter(c => Number(c.slaHours) < 1 && c.status !== 'resolved').length.toString(),    trend: '⚠ Alert', up: false, red: true },
          { label: 'Resolved Today',   value: complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length.toString(),    trend: 'Total Solved',  up: true, green: true },
        ].map((k, i) => (
          <GlassCard key={i} layer={3} className="kpi-card animate-fade-up">
            <span className="kpi-card__label">{k.label}</span>
            <span className="kpi-card__value" style={{ color: k.red ? 'var(--color-urgent-text)' : k.green ? 'var(--color-success-text)' : 'var(--color-accent)' }}>
              {k.value}
            </span>
            <span className="kpi-card__trend" style={{ color: k.up ? 'var(--color-success-text)' : k.red ? 'var(--color-urgent-text)' : 'var(--color-warning-text)' }}>
              {k.up ? <TrendingUp size={14}/> : k.red ? <AlertTriangle size={14}/> : <TrendingDown size={14}/>}
              {k.trend}
            </span>
          </GlassCard>
        ))}
      </div>

      {/* Main 2-col layout */}
      <div className="dashboard-columns">

        {/* ── Left: Complaint Queue ── */}
        <div>
          <div className="filter-tabs">
            {FILTERS.map((f, i) => (
              <button key={i} className={`filter-tab ${activeFilter === i ? 'active' : ''}`} onClick={() => setActiveFilter(i)}>
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>
          ) : visibleComplaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20 }}>No complaints</div>
          ) : visibleComplaints.map(c => (
            <GlassCard key={c.id} layer={2} className={`queue-card priority-border-${c.priority} ${c.critical ? 'critical' : ''}`}>
              {c.critical && <div className="active-badge">ACTIVE</div>}
              <PriorityBorder priority={c.priority} />
              <div style={{ paddingLeft: 8 }}>
                <div className="queue-card__row-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="queue-card__id">{c.id.substring(0,10)}</span>
                    <Badge variant={c.priority}>{c.priority.toUpperCase()}</Badge>
                  </div>
                  <SLATimer hours={c.slaHours} />
                </div>
                <div className="queue-card__title">{c.title}</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <Badge>{c.cat}</Badge>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', alignSelf: 'center' }}>{c.dept}</span>
                </div>
                <div className="queue-card__row-bottom">
                  <span>👤 {c.citizen}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px',
                    borderRadius: 20, background: 'rgba(38, 135, 143, 0.1)',
                    color: 'var(--color-accent)', textTransform: 'uppercase'
                  }}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* ── Right: Insight Panel ── */}
        <div>
          {/* Dept Score */}
          <GlassCard layer={2} className="insight-card">
            <div className="section-label">Dept Score</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--color-accent)', lineHeight: 1, marginBottom: 4 }}>
              <CountUp end={78} duration={1.2} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Rank 2 of 18 departments</div>
            {DEPT_BARS.map(d => (
              <div key={d.label} className="dept-bar-row">
                <span className="dept-bar-label">{d.label}</span>
                <div className="dept-bar-track">
                  <div className="dept-bar-fill" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="dept-bar-pct">{d.pct}%</span>
              </div>
            ))}
          </GlassCard>

          {/* Escalations */}
          <GlassCard layer={2} className="insight-card">
            <div className="section-label">Recent SLA Breaches</div>
            {complaints.filter(c => Number(c.slaHours) < 0 && c.status !== 'resolved').slice(0,3).map((e, idx) => (
              <div key={idx} className="escalation-item">
                <span className={`escalation-level esc-l${Number(e.slaHours) < -24 ? 3 : 2}`}>L{Number(e.slaHours) < -24 ? 3 : 2}</span>
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 600 }}>{(e.tracking_token || e.id || '').slice(0,10)}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Breached by {Math.abs(Number(e.slaHours)).toFixed(1)}h</div>
                </div>
              </div>
            ))}
            {complaints.filter(c => Number(c.slaHours) < 0 && c.status !== 'resolved').length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No SLA breaches!</div>
            )}
          </GlassCard>

          {/* Today Stats */}
          <GlassCard layer={2} className="insight-card">
            <div className="section-label">Today</div>
            <div className="today-stats">
              <div className="today-stat">
                <span className="today-stat__num"><CountUp end={complaints.filter(c => c.status === 'submitted' || c.status === 'assigned').length} /></span>
                <div className="today-stat__label">Open</div>
              </div>
              <div className="today-stat">
                <span className="today-stat__num"><CountUp end={complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length} /></span>
                <div className="today-stat__label">Resolved</div>
              </div>
              <div className="today-stat">
                <span className="today-stat__num">2.1h</span>
                <div className="today-stat__label">Avg Resp.</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
