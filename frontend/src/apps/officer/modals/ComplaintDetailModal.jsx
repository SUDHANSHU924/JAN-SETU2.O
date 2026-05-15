import React from 'react';
import './modals.css';
import ModalPortal from './ModalPortal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function slaColor(h) {
  if (h < 2)  return '#ef4444';
  if (h < 24) return '#f59e0b';
  return '#00c9a7';
}

function PriorityPill({ priority }) {
  const cls = { high: 'jq-pill--high', medium: 'jq-pill--medium', low: 'jq-pill--low' }[priority] || 'jq-pill--status';
  return <span className={`jq-pill ${cls}`}>{priority?.toUpperCase()}</span>;
}

export default function ComplaintDetailModal({ complaint, isOpen, onClose }) {
  if (!isOpen || !complaint) return null;

  const c = complaint;
  const slaH = Number(c.sla_hours ?? c.slaHours ?? 120);
  const slaTotal = Number(c.sla_days ?? 5) * 24;
  const slaFill = Math.max(0, Math.min(100, (slaH / slaTotal) * 100));
  const citizen = c.citizen || {};

  return (
    <ModalPortal>
      <div className="jq-overlay" onClick={onClose}>
        <div className="jq-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="jq-modal__header">
          <h3 className="jq-modal__title">
            📋 Complaint Details
          </h3>
          <button className="jq-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="jq-modal__body">
          {/* ID row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4b5563' }}>{c.id || `#CMP-${String(c.complaint_id || '').slice(-4).toUpperCase()}`}</span>
              {c.tracking_token && (
                <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>
                  {c.tracking_token}
                </span>
              )}
            </div>
            <PriorityPill priority={c.priority} />
          </div>

          {/* Title */}
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, lineHeight: 1.4, color: '#f1f5f9' }}>
            {c.title || c.description}
          </div>

          {/* SLA */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#9ca3af' }}>SLA Remaining</span>
              <span style={{ fontWeight: 700, color: slaColor(slaH) }}>
                ⏱ {slaH < 1 ? `${Math.round(slaH * 60)}m` : slaH < 24 ? `${slaH.toFixed(1)}h` : `${Math.round(slaH)}h`}
              </span>
            </div>
            <div className="jq-sla-bar">
              <div className="jq-sla-fill" style={{ width: `${slaFill}%`, background: slaColor(slaH) }} />
            </div>
          </div>

          {/* Details grid */}
          <div className="jq-detail-row">
            <span className="jq-detail-label">Status</span>
            <span className="jq-detail-value">
              <span className="jq-pill jq-pill--status">{String(c.status || '').replace(/_/g, ' ').toUpperCase()}</span>
            </span>
          </div>
          <div className="jq-detail-row">
            <span className="jq-detail-label">Category</span>
            <span className="jq-detail-value">{c.category || c.cat || '—'}</span>
          </div>
          <div className="jq-detail-row">
            <span className="jq-detail-label">Department</span>
            <span className="jq-detail-value">{c.department || c.dept || '—'}</span>
          </div>
          <div className="jq-detail-row">
            <span className="jq-detail-label">Filed</span>
            <span className="jq-detail-value">{c.created_at ? new Date(c.created_at).toLocaleString('en-IN') : '—'}</span>
          </div>
          {c.address && (
            <div className="jq-detail-row">
              <span className="jq-detail-label">Address</span>
              <span className="jq-detail-value">{c.address}</span>
            </div>
          )}
          {c.lat && c.lng && (
            <div className="jq-detail-row">
              <span className="jq-detail-label">Location</span>
              <span className="jq-detail-value">
                <a href={`https://maps.google.com/?q=${c.lat},${c.lng}`} target="_blank" rel="noreferrer"
                  style={{ color: '#00c9a7' }}>
                  📍 Open in Maps ↗
                </a>
              </span>
            </div>
          )}
          {c.resolution_text && (
            <div className="jq-detail-row">
              <span className="jq-detail-label">Resolution</span>
              <span className="jq-detail-value" style={{ color: '#00c9a7' }}>{c.resolution_text}</span>
            </div>
          )}

          {/* Citizen card */}
          {(citizen.name || citizen.phone) && (
            <>
              <div className="jq-section-title">Citizen</div>
              <div className="jq-citizen-card">
                <div className="jq-citizen-name">👤 {citizen.name || 'Citizen'}</div>
                {citizen.phone && <div className="jq-citizen-meta">📞 {citizen.phone}</div>}
                {citizen.email && citizen.email !== citizen.phone && (
                  <div className="jq-citizen-meta">✉️ {citizen.email}</div>
                )}
              </div>
            </>
          )}

          {/* Timeline */}
          {Array.isArray(c.timeline) && c.timeline.length > 0 && (
            <>
              <div className="jq-section-title">Timeline</div>
              <div className="jq-timeline">
                {c.timeline.map((t, i) => (
                  <div key={i} className="jq-timeline-item">
                    <div className="jq-timeline-dot" />
                    <div className="jq-timeline-status">{String(t.status || '').replace(/_/g, ' ')}</div>
                    {t.note && <div className="jq-timeline-note">{t.note}</div>}
                    <div className="jq-timeline-time">{timeAgo(t.created_at)} — {t.created_at ? new Date(t.created_at).toLocaleString('en-IN') : ''}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="jq-modal__footer">
          <button className="jq-btn jq-btn--outline" onClick={onClose}>Close</button>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
}
