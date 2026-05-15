import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Badge } from '../../components/ui/Badge';
import { GlassCard } from '../../components/ui/GlassCard';
import { Edit2, Globe, Bell as BellIcon, HelpCircle, LogOut, ChevronRight, Phone, Mail, Info, Shield } from 'lucide-react';
import { logout as firebaseLogout } from '../../lib/authHelpers';
import { useUser } from '../../hooks/useUser';
import { apiCall } from '../../utils/api';
import './Profile.css';

const trustHistory = [
  { pts: '+10', reason: 'Complaint resolved', date: '2 days ago', positive: true },
  { pts: '+5',  reason: 'Feedback submitted',  date: '5 days ago', positive: true },
];

const statusColors = {
  resolved:    { color: 'var(--status-low)', bg: 'rgba(0, 201, 167, 0.1)' },
  in_progress: { color: 'var(--teal-primary)', bg: 'rgba(38, 135, 143, 0.1)' },
  submitted:   { color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.05)' },
  assigned:    { color: 'var(--teal-primary)', bg: 'rgba(38, 135, 143, 0.1)' },
};

const SETTINGS = [
  { icon: <Edit2 size={18}/>,    label: 'Edit Profile',        sub: '' },
  { icon: <Globe size={18}/>,    label: 'Language',            sub: 'English' },
  { icon: <BellIcon size={18}/>, label: 'Notifications',       sub: 'Enabled' },
  { icon: <HelpCircle size={18}/>,label: 'Help & Support',     sub: '' },
  { icon: <Info size={18}/>,     label: 'About JanSetu',       sub: 'v1.0.0' },
];

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

export function Profile() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [complaints, setComplaints] = useState([]);
  
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const data = await apiCall('GET', '/grievances/my');
        if (Array.isArray(data)) {
          setComplaints(data);
        }
      } catch (err) {
        console.error("Failed to fetch complaints:", err);
      }
    };
    fetchComplaints();
  }, []);

  const filed = complaints.length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;
  const pending = complaints.filter(c => c.status !== 'resolved').length;

  return (
    <div className="profile-page animate-fade-in">

      <div className="profile-layout">
        {/* ── Left Column ── */}
        <div className="profile-left">

          {/* User Info Card */}
          <GlassCard layer={2} className="profile-user-card">
            <div className="profile-user-avatar">{user?.name ? user.name[0].toUpperCase() : 'C'}</div>
            <div className="profile-user-info">
              <h2 className="profile-user-name">{user?.name || 'Citizen'}</h2>
              <div className="profile-user-detail"><Phone size={13} /> {user?.phone ? '+91 ' + user.phone.replace('+91', '') : 'Not provided'}</div>
              <div className="profile-user-detail"><Mail size={13} /> {user?.email || 'Not provided'}</div>
              <div style={{ marginTop: 8 }}>
                <Badge variant="active">Trusted Citizen</Badge>
              </div>
            </div>
            <button className="profile-edit-btn">
              <Edit2 size={16} />
            </button>
          </GlassCard>

          {/* Trust Score */}
          <GlassCard layer={1} className="profile-section-card">
            <div className="section-label">Trust Score</div>
            <div className="trust-score-layout">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <ProgressRing progress={78} radius={55} stroke={10} />
                <Badge variant="active">Trusted</Badge>
              </div>
              <div className="trust-history">
                {trustHistory.map((h, i) => (
                  <div key={i} className="trust-history-row">
                    <span style={{ fontWeight: 700, fontSize: 13, color: h.positive ? 'var(--status-low)' : 'var(--status-high)', minWidth: 36 }}>{h.pts}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{h.reason}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Stats Grid */}
          <div className="quick-stats-grid" style={{ marginBottom: 24 }}>
            <GlassCard layer={1} className="stat-mini-card">
              <span className="stat-mini-card__num" style={{ color: 'var(--teal-primary)' }}>{filed}</span>
              <span className="stat-mini-card__label">Filed</span>
            </GlassCard>
            <GlassCard layer={1} className="stat-mini-card">
              <span className="stat-mini-card__num" style={{ color: 'var(--status-low)' }}>{resolved}</span>
              <span className="stat-mini-card__label">Resolved</span>
            </GlassCard>
            <GlassCard layer={1} className="stat-mini-card">
              <span className="stat-mini-card__num" style={{ color: 'var(--status-med)' }}>{pending}</span>
              <span className="stat-mini-card__label">Pending</span>
            </GlassCard>
          </div>

          {/* Recent Activity */}
          <GlassCard layer={1} className="profile-section-card">
            <div className="section-label">Recent Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {complaints.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: 12 }}>No recent activity.</div>
              ) : complaints.slice(0, 4).map(c => {
                const sc = statusColors[c.status] || statusColors.submitted;
                const shortId = c.tracking_token ? c.tracking_token.slice(-8) : '';
                return (
                  <div key={c.complaint_id || c.tracking_token} className="profile-activity-item" onClick={() => navigate('/citizen/track')}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.text_original || 'Complaint'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-family-mono)', marginTop: 2 }}>#{shortId} · {timeAgo(c.created_at)}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, color: sc.color, background: sc.bg, flexShrink: 0, textTransform: 'uppercase' }}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <ChevronRight size={14} color="var(--text-tertiary)" />
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* ── Right Column: Settings ── */}
        <div className="profile-right">
          <GlassCard layer={1} className="profile-section-card">
            <div className="section-label">Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SETTINGS.map((s, i) => (
                <div key={i} className="settings-row">
                  <div style={{ color: 'var(--teal-primary)', flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</div>
                    {s.sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.sub}</div>}
                  </div>
                  <ChevronRight size={16} color="var(--text-tertiary)" />
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 8 }}>
              <div
                className="settings-row"
                style={{ color: 'var(--status-high)', cursor: 'pointer' }}
                onClick={async () => {
                  await firebaseLogout();
                  navigate('/login');
                }}
              >
                <LogOut size={18} style={{ color: 'var(--status-high)' }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--status-high)' }}>Logout</span>
              </div>
            </div>
          </GlassCard>

          {/* Quick Tip */}
          <GlassCard layer={1} style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Shield size={18} style={{ color: 'var(--teal-primary)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-primary)', marginBottom: 4 }}>Boost Your Trust Score</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Submit accurate complaints with photos and GPS to earn trust points. Higher scores mean faster resolutions.
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
