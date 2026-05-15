import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { FileText, Activity, Zap, CheckCircle, AlertCircle, Loader, ArrowRight, Plus, Bell, X } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import CountUpBase from 'react-countup';
const CountUp = CountUpBase.default || CountUpBase;
import './Citizen.css';

const statusMap = {
  submitted:   { label: 'Submitted',   color: '#6BA9B6', bg: 'rgba(107, 169, 182, 0.1)',  icon: <Loader size={12}/> },
  processing:  { label: 'Processing',  color: '#C89B2D', bg: 'rgba(200, 155, 45, 0.1)',  icon: <Loader size={12}/> },
  assigned:    { label: 'Assigned',    color: '#26878F', bg: 'rgba(38,135,143,0.1)',   icon: <Zap size={12}/> },
  in_progress: { label: 'In Progress', color: '#26878F', bg: 'rgba(38,135,143,0.12)',  icon: <Activity size={12}/> },
  resolved:    { label: 'Resolved',    color: '#2F8F5B', bg: 'rgba(47, 143, 91, 0.1)',   icon: <CheckCircle size={12}/> },
  rejected:    { label: 'Rejected',    color: '#C44B3A', bg: 'rgba(196, 75, 58, 0.1)',   icon: <AlertCircle size={12}/> },
};

const CATEGORY_ICONS = {
  'Roads': '🛣️', 'Road & Infrastructure': '🛣️', 'Water Supply': '💧', 'Utilities': '💧',
  'Sanitation': '🗑️', 'Electricity': '⚡', 'Street Lighting': '💡', 'Infrastructure': '🏗️',
  'Public Health': '🏥', 'Parks & Recreation': '🌳', 'General': '📋',
};

function StatusPill({ status }) {
  const s = statusMap[status] || statusMap.submitted;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 600, padding: '3px 8px',
      borderRadius: 20, color: s.color, background: s.bg,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      whiteSpace: 'nowrap'
    }}>
      {s.icon} {s.label}
    </span>
  );
}

function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function Home() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifs, setDismissedNotifs] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const { getMyComplaints } = await import('../../services/api');
        const data = await getMyComplaints();
        setComplaints(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load complaints:', err);
      } finally {
        setLoading(false);
      }
    })();

    // Fetch notifications
    (async () => {
      try {
        const token = localStorage.getItem('jansetu_token') || localStorage.getItem('jansetu_officer_token') || '';
        if (!token) return;
        const r = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const data = await r.json();
          setNotifications(Array.isArray(data) ? data.filter(n => !n.is_read) : []);
        }
      } catch {}
    })();
  }, []);

  const filed    = complaints.length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;
  const pending  = complaints.filter(c => c.status !== 'resolved').length;

  return (
    <div className="animate-fade-in">

      {/* Quick Stats */}
      <div className="quick-stats-grid stagger-children" style={{ marginBottom: 24 }}>
        <GlassCard layer={2} className="stat-mini-card animate-fade-up">
          <span className="stat-mini-card__num" style={{ color: 'var(--teal-primary)' }}>
            <CountUp end={filed} duration={1.2} />
          </span>
          <span className="stat-mini-card__label">Filed</span>
        </GlassCard>
        <GlassCard layer={2} className="stat-mini-card animate-fade-up">
          <span className="stat-mini-card__num" style={{ color: 'var(--status-low)' }}>
            <CountUp end={resolved} duration={1.2} />
          </span>
          <span className="stat-mini-card__label">Resolved</span>
        </GlassCard>
        <GlassCard layer={2} className="stat-mini-card animate-fade-up">
          <span className="stat-mini-card__num" style={{ color: 'var(--status-med)' }}>
            <CountUp end={pending} duration={1.2} />
          </span>
          <span className="stat-mini-card__label">Pending</span>
        </GlassCard>
      </div>

      {/* Primary Action Cards */}
      <div className="home-desktop-grid" style={{ marginBottom: 28 }}>
        <GlassCard layer={3}
          className="action-hero-card action-hero-card--primary"
          onClick={() => navigate('/citizen/file')}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/citizen/file')}
        >
          <div className="action-hero-card__icon"><Plus size={28} strokeWidth={2} /></div>
          <div className="action-hero-card__body">
            <div className="action-hero-card__title">File a Complaint</div>
            <div className="action-hero-card__sub">Report any civic issue near you. Takes under 2 minutes.</div>
          </div>
          <div className="action-hero-card__arrow"><ArrowRight size={20} /></div>
        </GlassCard>

        <GlassCard layer={2}
          className="action-hero-card action-hero-card--outline"
          onClick={() => navigate('/citizen/track')}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/citizen/track')}
        >
          <div className="action-hero-card__icon action-hero-card__icon--outline"><Activity size={28} strokeWidth={2} /></div>
          <div className="action-hero-card__body">
            <div className="action-hero-card__title">Track Status</div>
            <div className="action-hero-card__sub">Live updates on your filed complaints and SLA timers.</div>
          </div>
          <div className="action-hero-card__arrow action-hero-card__arrow--outline"><ArrowRight size={20} /></div>
        </GlassCard>
      </div>

      {/* Notifications */}
      {notifications.filter(n => !dismissedNotifs.has(n.notif_id)).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--teal-primary)', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={13} /> Notifications
          </div>
          {notifications.filter(n => !dismissedNotifs.has(n.notif_id)).map(n => (
            <div key={n.notif_id} style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 8,
              background: n.type === 'complaint_resolved' ? 'rgba(0,201,167,0.1)'
                : n.type === 'complaint_rejected' ? 'rgba(255,77,109,0.1)'
                : 'rgba(38,135,143,0.1)',
              border: `1px solid ${n.type === 'complaint_resolved' ? 'rgba(0,201,167,0.3)'
                : n.type === 'complaint_rejected' ? 'rgba(255,77,109,0.3)'
                : 'rgba(38,135,143,0.3)'}`,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{n.body}</div>
              </div>
              <button
                onClick={() => setDismissedNotifs(prev => new Set([...prev, n.notif_id]))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Complaints List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Your Complaints</div>
          <button
            onClick={() => navigate('/citizen/track')}
            style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View all →
          </button>
        </div>

        {loading ? (
          <GlassCard layer={2} style={{ textAlign: 'center', padding: '32px 20px' }}>
            <Loader size={20} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--teal-primary)' }} />
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading your complaints…</div>
          </GlassCard>
        ) : complaints.length === 0 ? (
          <GlassCard layer={2} style={{ textAlign: 'center', padding: '32px 20px' }}>
            <FileText size={32} style={{ color: 'var(--color-text-secondary)', margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>No complaints filed yet.</div>
            <button
              onClick={() => navigate('/citizen/file')}
              style={{ marginTop: 12, color: 'var(--teal-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              File your first complaint →
            </button>
          </GlassCard>
        ) : (
          <div className="complaints-grid stagger-children">
            {complaints.slice(0, 5).map((c) => {
              const catIcon = CATEGORY_ICONS[c.category] || '📋';
              const shortId = c.tracking_token
                ? c.tracking_token.slice(-8).toUpperCase()
                : (c.complaint_id || '').toString().slice(-4).toUpperCase();
              return (
                <GlassCard layer={2} key={c.complaint_id || c.tracking_token} className="complaint-card animate-fade-up"
                  onClick={() => navigate(`/citizen/track?token=${encodeURIComponent(c.tracking_token || '')}`)}
                >
                  <div className="complaint-card__icon">
                    <span style={{ fontSize: 20 }}>{catIcon}</span>
                  </div>
                  <div className="complaint-card__body">
                    <div className="complaint-card__title">
                      {(c.text_original || c.text || 'Complaint').slice(0, 70) || 'Civic Issue'}
                    </div>
                    <div className="complaint-card__meta">{c.category || 'General'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="complaint-card__id">#{shortId}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>· {timeAgo(c.created_at)}</span>
                    </div>
                  </div>
                  <div className="complaint-card__right">
                    <StatusPill status={c.status} />
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
