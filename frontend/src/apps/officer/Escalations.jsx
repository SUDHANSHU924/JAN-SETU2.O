import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { apiCall } from '../../utils/api';

const timelineEvents = [
  { id: '#CMP-8910', level: 2, from: 1, to: 2, time: 'Recently', reason: 'SLA priority update' },
];

function EscCard({ id, title, extra, extraColor = 'var(--text-secondary)', dept }) {
  return (
    <GlassCard layer={1} hoverEffect={false} style={{
      padding: '10px 14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 8, fontSize: 13
    }}>
      <div>
        <span className="mono" style={{ fontWeight: 600, color: 'var(--teal-primary)', marginRight: 8 }}>{id}</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{dept}</span>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{title}</div>
      </div>
      <span style={{ color: extraColor, fontWeight: 700, fontFamily: 'var(--font-family-mono)', fontSize: 12, whiteSpace: 'nowrap', marginLeft: 12 }}>{extra}</span>
    </GlassCard>
  );
}

export function Escalations() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const data = await apiCall('GET', '/grievances/queue');
        if (Array.isArray(data)) setComplaints(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const activeComplaints = complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed');
  
  const L1 = activeComplaints.filter(c => Number(c.slaHours) > 0 && Number(c.slaHours) < 24).map(c => ({
    id: (c.tracking_token || c.id || '').substring(0, 10), title: c.title, time: `${Number(c.slaHours).toFixed(1)}h left`, dept: c.dept || 'General'
  }));

  const L2 = activeComplaints.filter(c => Number(c.slaHours) <= 0 && Number(c.slaHours) > -24).map(c => ({
    id: (c.tracking_token || c.id || '').substring(0, 10), title: c.title, breach: `Breached ${Math.abs(Number(c.slaHours)).toFixed(1)}h`, dept: c.dept || 'General'
  }));

  const L3 = activeComplaints.filter(c => Number(c.slaHours) <= -24 || c.critical).map(c => ({
    id: (c.tracking_token || c.id || '').substring(0, 10), title: c.title, breach: `Breached ${Math.abs(Number(c.slaHours)).toFixed(1)}h`, dept: c.dept || 'General'
  }));

  const slaBreaches = activeComplaints.filter(c => Number(c.slaHours) <= 0).map(c => ({
    id: (c.tracking_token || c.id || '').substring(0, 10), title: c.title, overdue: `${Math.abs(Number(c.slaHours)).toFixed(1)} hours`, officer: c.officer_name || 'Assigned Officer'
  }));

  return (
    <div className="animate-fade-in">
      {loading && <div style={{ marginBottom: 16 }}>Loading escalations...</div>}

      {/* ── 3 Level Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>

        {/* L1 */}
        <GlassCard layer={2} style={{ borderTop: '4px solid var(--status-med)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-family-display)', color: 'var(--text-primary)' }}>Level 1</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>→ Officer Alert</div>
            </div>
            <Badge variant="medium">{L1.length} PENDING</Badge>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
            Standard complaints nearing SLA deadline.
          </p>
          {L1.map(c => <EscCard key={c.id} {...c} extra={c.time} extraColor="var(--status-med)" />)}
        </GlassCard>

        {/* L2 */}
        <GlassCard layer={2} style={{ borderTop: '4px solid var(--status-high)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-family-display)', color: 'var(--text-primary)' }}>Level 2</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>→ Senior Officer</div>
            </div>
            <Badge variant="high">{L2.length} ESCALATED</Badge>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
            SLA breached. Requires immediate supervisor review.
          </p>
          {L2.map(c => <EscCard key={c.id} {...c} extra={c.breach} extraColor="var(--status-high)" />)}
        </GlassCard>

        {/* L3 — full drama */}
        <GlassCard layer={3} style={{
          borderTop: '4px solid var(--status-sla)', padding: 20,
          boxShadow: '0 8px 40px rgba(255,77,109,0.15), 0 0 0 1px rgba(255,77,109,0.2), inset 0 1px 0 rgba(255,255,255,0.10)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-family-display)', color: 'var(--status-high)' }}>Level 3</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>→ Public Board</div>
            </div>
            <Badge variant="sla">{L3.length} CRITICAL</Badge>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
            Severe delays impacting community trust.
          </p>
          {L3.map(c => <EscCard key={c.id} {...c} extra={c.breach} extraColor="var(--status-sla)" />)}
        </GlassCard>
      </div>

      {/* ── SLA Breach Alerts ── */}
      <div className="section-label">SLA Breach Alerts</div>
      <div style={{ marginBottom: 28 }}>
        {slaBreaches.map(b => (
          <GlassCard layer={3} hoverEffect={true} key={b.id} style={{
            border: '1px solid rgba(255, 77, 109, 0.3)',
            background: 'rgba(255, 77, 109, 0.05)',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            marginBottom: 12
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--status-high)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 0 16px rgba(255,77,109,0.4)'
            }}>
              <AlertTriangle size={20} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 3 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                <span className="mono" style={{ color: 'var(--status-high)', fontWeight: 700 }}>{b.id}</span>
                {' '}· Overdue by{' '}
                <strong style={{ color: 'var(--status-high)' }}>{b.overdue}</strong>
                {' '}· {b.officer}
              </div>
            </div>
            <Button variant="primary" style={{ background: 'linear-gradient(135deg, var(--status-high), #FF6B6B)', flexShrink: 0, gap: 6 }}>
              Review <ArrowRight size={14} />
            </Button>
          </GlassCard>
        ))}
      </div>

      {/* ── SLA Analysis ── */}
      <div className="section-label">SLA Breach Analysis</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Breaches (30d)', value: slaBreaches.length,   sub: 'Needs attention', subColor: 'var(--status-low)',     valColor: 'var(--status-high)' },
          { label: 'Avg Resolution Delay', value: '4.5h', sub: 'Calculated from SLA', subColor: 'var(--status-high)',    valColor: 'var(--status-med)'  },
          { label: 'Active L3 Critical',   value: L3.length,  sub: 'Immediate Action Required',     subColor: 'var(--status-high)', valColor: 'var(--teal-primary)' },
        ].map((s, i) => (
          <GlassCard layer={2} hoverEffect={false} key={i} style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 30, fontWeight: 700, color: s.valColor, marginBottom: 6, textShadow: `0 0 12px ${s.valColor}66` }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.subColor, fontWeight: 600 }}>{s.sub}</div>
          </GlassCard>
        ))}
      </div>

      {/* ── Escalation Timeline ── */}
      <div className="section-label">Recent Escalation Events</div>
      <GlassCard layer={2} hoverEffect={false} style={{ padding: 20 }}>
        {timelineEvents.map((e, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 0',
            borderBottom: i < timelineEvents.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            fontSize: 13
          }}>
            <span style={{
              minWidth: 40, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-family-display)',
              padding: '3px 8px', borderRadius: 20, textAlign: 'center', textTransform: 'uppercase',
              background: e.level === 3 ? 'var(--status-high-glow)' : e.level === 2 ? 'var(--status-med-glow)' : 'var(--teal-glow)',
              color:      e.level === 3 ? 'var(--status-high)'      : e.level === 2 ? 'var(--status-med)'      : 'var(--teal-primary)',
            }}>L{e.level}</span>
            <span className="mono" style={{ color: 'var(--teal-primary)', fontWeight: 600 }}>{e.id}</span>
            <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{e.reason}</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: e.level === 3 ? 'var(--status-high)' : e.level === 2 ? 'var(--status-med)' : 'var(--teal-primary)' }}>
              L{e.from} → L{e.to}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{e.time}</span>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
