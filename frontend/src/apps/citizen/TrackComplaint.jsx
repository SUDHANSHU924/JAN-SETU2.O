import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, Circle, MapPin, User, Zap, Star, MessageSquare } from 'lucide-react';
import './TrackComplaint.css';

const timeline = [
  {
    state: 'Submitted',
    date: 'Oct 14, 10:30 AM',
    done: true,
    desc: 'Complaint received and acknowledged by JanSetu AI.',
    icon: '📥'
  },
  {
    state: 'AI Analysis Complete',
    date: 'Oct 14, 10:35 AM',
    done: true,
    desc: 'Category: General · Priority: High · Auth Score: 87/100',
    icon: '🤖'
  },
  {
    state: 'Assigned to Officer',
    date: 'Oct 14, 11:00 AM',
    done: true,
    desc: 'Assigned to Officer — PWD West Zone',
    icon: '👤'
  },
  {
    state: 'In Progress',
    date: 'Oct 15, 09:00 AM',
    active: true,
    done: false,
    desc: 'Officer has initiated repairs. Site inspection complete.',
    icon: '🔧'
  },
  {
    state: 'Resolved',
    date: 'Pending',
    done: false,
    desc: '',
    icon: '✅'
  },
];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(star => (
        <span
          key={star}
          style={{ cursor: 'pointer', fontSize: 24, color: star <= (hover || value) ? '#F59E0B' : 'var(--color-border)', transition: 'color 0.15s' }}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >★</span>
      ))}
    </div>
  );
}

export function TrackComplaint() {
  const location = useLocation();
  const [tokenInput, setTokenInput] = useState('');
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenFromQuery = params.get('token') || localStorage.getItem('last_tracking_token') || '';
    if (tokenFromQuery) {
      setTokenInput(tokenFromQuery);
      void (async () => {
        setLoading(true);
        setError('');
        try {
          const { trackComplaint } = await import('../../services/api');
          const data = await trackComplaint(tokenFromQuery.trim());
          setComplaint(data);
        } catch (err) {
          setError('Complaint not found. Please check your tracking token.');
          setComplaint(null);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [location.search]);

  const handleTrack = async (e) => {
    e?.preventDefault();
    if (!tokenInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { trackComplaint } = await import('../../services/api');
      const data = await trackComplaint(tokenInput.trim());
      setComplaint(data);
    } catch (err) {
      setError('Complaint not found. Please check your tracking token.');
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="track-page animate-fade-in">

      <GlassCard layer={2} className="track-header-card" style={{ marginBottom: 16 }}>
        <form onSubmit={handleTrack} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            placeholder="Enter tracking token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Tracking...' : 'Track Complaint'}
          </Button>
        </form>
        {error && <div style={{ marginTop: 10, color: 'var(--status-high)', fontSize: 13 }}>{error}</div>}
      </GlassCard>

      {/* Header Card */}
      <GlassCard layer={2} hoverEffect={true} className="track-header-card">
        <div className="track-header-card__top">
          <div>
            <div className="mono" style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{complaint?.tracking_token || '#CMP-8921'}</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10, lineHeight: 1.3 }}>{complaint?.text_original || complaint?.title || 'Pothole on Main Street causing accidents'}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge>{complaint?.category || complaint?.ai_analysis?.category || 'General'}</Badge>
              <Badge variant="high">{complaint?.priority || 'High Priority'}</Badge>
              <Badge style={{ background: 'rgba(0,201,167,0.1)', color: 'var(--teal-primary)', border: '1px solid rgba(0,201,167,0.2)' }}>{complaint?.department || 'PWD'}</Badge>
            </div>
          </div>
          <Badge variant="active" style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}>{(complaint?.status || 'IN PROGRESS').toString().toUpperCase()}</Badge>
        </div>

        {/* Cluster Alert */}
        <div className="cluster-alert">
          <span style={{ fontSize: 14 }}>🔗</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-med)' }}>Cluster Alert</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>14 similar complaints found in this area — Priority boosted</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto' }}>CLT-0041</span>
        </div>

        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 10 }}>
          <MapPin size={14} style={{ verticalAlign: -2 }} /> 123 Main Street, Andheri West · Filed 2 days ago · Officer: {complaint?.officer?.name || 'Assigned Officer'}
        </div>
      </GlassCard>

      {/* Two-column layout */}
      <div className="track-columns">

        {/* ── Left: Timeline ── */}
        <div className="track-left">
          <div className="section-label">Complaint Timeline</div>

          <div className="timeline">
            {timeline.map((item, index) => (
              <div key={index} className={`timeline-item ${item.active ? 'active' : ''} ${item.done ? 'done' : ''}`}>
                <div className="timeline-left">
                  <div className="timeline-icon">
                    {item.done
                      ? <CheckCircle2 size={22} color="var(--color-accent)" />
                      : item.active
                        ? <div className="timeline-pulse" />
                        : <Circle size={22} color="var(--color-border)" />
                    }
                  </div>
                  {index < timeline.length - 1 && (
                    <div className={`timeline-line ${item.done ? 'done' : ''}`} />
                  )}
                </div>
                <div className={`timeline-content ${item.active ? 'active' : ''}`}>
                  <div className="timeline-content__header">
                    <span className="timeline-content__state">{item.icon} {item.state}</span>
                    <span className="timeline-content__date">{item.date}</span>
                  </div>
                  {item.desc && (
                    <div className="timeline-content__desc">{item.desc}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Panels ── */}
        <div className="track-right">

          {/* AI Analysis */}
          <GlassCard layer={1} className="track-side-card">
            <div className="section-label">AI Analysis</div>
            {[
              ['Category',   <Badge>{complaint?.category || complaint?.ai_analysis?.category || 'General'}</Badge>],
              ['Priority',   <Badge variant="high">{complaint?.priority || complaint?.ai_analysis?.priority || 'High'}</Badge>],
              ['Sentiment',  <Badge variant="medium">{complaint?.ai_analysis?.sentiment || 'Distressed'}</Badge>],
              ['Auth Score', <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-primary)' }}>{complaint?.ai_analysis?.auth_score ?? 87}/100</span>],
              ['Confidence', <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--status-low)' }}>{complaint?.ai_analysis?.confidence ?? 94}%</span>],
              ['SLA Pred.',  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--status-low)' }}>~{complaint?.ai_analysis?.sla_days ?? 2.8} days</span>],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                {val}
              </div>
            ))}
          </GlassCard>

          {/* Officer Card */}
          <GlassCard layer={1} className="track-side-card">
            <div className="section-label">Assigned Officer</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--teal-primary), var(--blue-electric))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0
              }}>{complaint?.officer?.name ? complaint.officer.name[0].toUpperCase() : 'O'}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{complaint?.officer?.name || 'Assigned Officer'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>PWD · West Zone</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-low)', display: 'inline-block', boxShadow: '0 0 6px var(--status-low)' }} />
                  <span style={{ fontSize: 11, color: 'var(--status-low)' }}>Active</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Contact: +91 98*** ***10 · Avg resolution: 2.1 days
            </div>
          </GlassCard>

          {/* Feedback Card */}
          <GlassCard layer={1} className="track-side-card">
            <div className="section-label">Your Feedback</div>
            {feedbackSent ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={32} color="var(--teal-primary)" style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Thank you!</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>+10 pts added to your trust score</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <StarRating value={rating} onChange={setRating} />
                </div>
                <textarea
                  className="form-input"
                  placeholder="Tell us about the resolution…"
                />
                <Button
                  variant="primary"
                  style={{ width: '100%', marginTop: 12 }}
                  onClick={() => rating > 0 && setFeedbackSent(true)}
                >
                  Submit Feedback
                </Button>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
