/**
 * JanSetu Commander — Complaint Queue
 * Fully wired: View / Update / Resolve / Reject
 * Data source: GET /api/v1/complaints/queue (officer auth required)
 */
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Eye, RotateCcw, XCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { GlassCard } from '../../components/ui/GlassCard';

import ComplaintDetailModal  from './modals/ComplaintDetailModal';
import UpdateComplaintModal  from './modals/UpdateComplaintModal';
import ResolveComplaintModal from './modals/ResolveComplaintModal';
import RejectComplaintModal  from './modals/RejectComplaintModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEYS = ['jansetu_officer_token', 'jansetu_token'];
const getToken = () => TOKEN_KEYS.map(k => localStorage.getItem(k)).find(Boolean) || '';

const FILTERS = ['All', 'High Priority', 'SLA < 24h'];

// ── Sub-components ──────────────────────────────────────────────────────────
function SLABadge({ hours }) {
  const h = Number(hours) || 0;
  const color = h < 2 ? '#ef4444' : h < 24 ? '#f59e0b' : '#6b7280';
  const label = h < 1 ? `${Math.round(h * 60)}m` : h < 24 ? `${h.toFixed(1)}h` : `${Math.round(h)}h`;
  return <span style={{ color, fontWeight: 700, fontSize: 12 }}>⏱ {label}</span>;
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, padding: '13px 26px', borderRadius: 12, fontWeight: 600, fontSize: 13,
      background: type === 'error' ? '#ef4444' : '#059669',
      color: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      animation: 'fadeIn 0.2s ease', whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function Queue() {
  const [filter, setFilter]         = useState(0);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [toast, setToast]           = useState(null);

  // Modal state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [viewModalOpen,    setViewModalOpen]    = useState(false);
  const [updateModalOpen,  setUpdateModalOpen]  = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [rejectModalOpen,  setRejectModalOpen]  = useState(false);

  const token = getToken();

  // ── Fetch queue ─────────────────────────────────────────────────────────
  async function fetchComplaints(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/complaints/queue`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.status === 401) {
        setError('Session expired — please login again.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || `Server error ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setComplaints(Array.isArray(data) ? data : []);
    } catch {
      setError('Cannot reach backend. Is the server running on port 8000?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComplaints(false);
    const t = setInterval(() => fetchComplaints(true), 30000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toast helper ─────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }

  // ── Modal handlers ───────────────────────────────────────────────────────
  function handleViewClick(c) {
    setSelectedComplaint(c);
    setViewModalOpen(true);
  }
  function handleUpdateClick(c) {
    setSelectedComplaint(c);
    setUpdateModalOpen(true);
  }
  function handleResolveClick(c) {
    setSelectedComplaint(c);
    setResolveModalOpen(true);
  }
  function handleRejectClick(c) {
    setSelectedComplaint(c);
    setRejectModalOpen(true);
  }

  // ── Success callbacks ────────────────────────────────────────────────────
  function handleUpdateSuccess(msg) {
    setUpdateModalOpen(false);
    showToast(msg || 'Complaint updated successfully!');
    fetchComplaints(true);
  }
  function handleResolveSuccess(msg) {
    setResolveModalOpen(false);
    showToast(msg || 'Complaint resolved!');
    if (selectedComplaint) {
      setComplaints(prev => prev.filter(c => c.complaint_id !== selectedComplaint.complaint_id));
    }
  }
  function handleRejectSuccess(msg) {
    setRejectModalOpen(false);
    showToast(msg || 'Complaint rejected and deleted.');
    if (selectedComplaint) {
      setComplaints(prev => prev.filter(c => c.complaint_id !== selectedComplaint.complaint_id));
    }
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const visible = complaints.filter(c => {
    if (filter === 1) return String(c.priority).toLowerCase() === 'high';
    if (filter === 2) return Number(c.sla_hours ?? c.slaHours ?? 999) < 24;
    return true;
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      <Toast msg={toast?.msg} type={toast?.type} />

      {/* Modals */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
      />
      <UpdateComplaintModal
        complaint={selectedComplaint}
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        onSuccess={handleUpdateSuccess}
        onError={e => showToast(e, 'error')}
      />
      <ResolveComplaintModal
        complaint={selectedComplaint}
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        onSuccess={handleResolveSuccess}
        onError={e => showToast(e, 'error')}
      />
      <RejectComplaintModal
        complaint={selectedComplaint}
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSuccess={handleRejectSuccess}
        onError={e => showToast(e, 'error')}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Complaint Queue</h2>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
            {complaints.length} active · auto-refresh 30s
          </div>
        </div>
        <button
          onClick={() => fetchComplaints(false)}
          style={{
            background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.3)',
            color: 'var(--teal-primary)', padding: '8px 14px', borderRadius: 8,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600,
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* No-token warning */}
      {!token && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
          marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#ef4444', fontSize: 13, fontWeight: 600,
        }}>
          <AlertCircle size={16} />
          Not logged in — action buttons require authentication.
          <a href="/officer/login" style={{ marginLeft: 'auto', color: 'var(--teal-primary)', textDecoration: 'underline' }}>
            Login →
          </a>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444',
        }}>
          ⚠️ {error}
          <button onClick={() => fetchComplaints(false)} style={{ marginLeft: 10, background: 'none', border: 'none', color: 'var(--teal-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
            Retry ↺
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        {FILTERS.map((f, i) => (
          <button key={i} className={`filter-tab ${filter === i ? 'active' : ''}`} onClick={() => setFilter(i)}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ maxWidth: 840 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: 24, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>
              ⟳
            </div>
            <div style={{ fontSize: 14 }}>Loading complaints from Supabase…</div>
          </div>
        ) : visible.length === 0 ? (
          <GlassCard layer={2} style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ color: '#6b7280', fontSize: 14 }}>No complaints match this filter.</div>
          </GlassCard>
        ) : (
          visible.map(c => {
            const priority = String(c.priority || 'medium').toLowerCase();
            const slaH = Number(c.sla_hours ?? c.slaHours ?? 120);
            const leftColor = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#10b981';
            const isResolved = ['resolved', 'closed'].includes(String(c.status).toLowerCase());
            const citizenName = c.citizen?.name || c.citizen_name || 'Citizen';

            return (
              <GlassCard
                key={c.complaint_id}
                layer={2}
                hoverEffect
                style={{
                  marginBottom: 14,
                  padding: '16px 20px',
                  borderLeft: `4px solid ${leftColor}`,
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{c.id}</span>
                    <Badge variant={priority}>{priority.toUpperCase()}</Badge>
                    {c.critical && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', letterSpacing: 1 }}>● CRITICAL</span>
                    )}
                  </div>
                  <SLABadge hours={slaH} />
                </div>

                {/* Title */}
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, lineHeight: 1.45, color: '#f1f5f9' }}>
                  {c.title}
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge>{c.category || c.cat}</Badge>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{c.department || c.dept}</span>
                </div>

                {/* Status + citizen */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>👤 {citizenName}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                    background: isResolved ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)',
                    color: isResolved ? '#10b981' : '#9ca3af',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {String(c.status || '').replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* VIEW */}
                  <button
                    id={`btn-view-${c.complaint_id}`}
                    onClick={() => handleViewClick(c)}
                    style={btnStyle()}
                  >
                    <Eye size={13} /> View
                  </button>

                  {/* UPDATE */}
                  <button
                    id={`btn-update-${c.complaint_id}`}
                    onClick={() => handleUpdateClick(c)}
                    disabled={isResolved}
                    style={btnStyle({ color: 'var(--teal-primary)', border: '1px solid var(--teal-primary)', disabled: isResolved })}
                  >
                    <RotateCcw size={13} /> Update
                  </button>

                  {/* REJECT */}
                  <button
                    id={`btn-reject-${c.complaint_id}`}
                    onClick={() => handleRejectClick(c)}
                    disabled={isResolved}
                    style={btnStyle({ color: '#ef4444', border: '1px solid #ef4444', disabled: isResolved })}
                  >
                    <XCircle size={13} /> Reject
                  </button>

                  {/* RESOLVE */}
                  <button
                    id={`btn-resolve-${c.complaint_id}`}
                    onClick={() => handleResolveClick(c)}
                    disabled={isResolved}
                    style={btnStyle({ bg: isResolved ? 'rgba(16,185,129,0.15)' : 'var(--teal-primary)', color: isResolved ? '#10b981' : '#0c1626', border: 'none', disabled: isResolved })}
                  >
                    <CheckCircle2 size={13} /> {isResolved ? '✓ Done' : 'Resolve'}
                  </button>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Button style helper ─────────────────────────────────────────────────────
function btnStyle({ bg, color, border, disabled } = {}) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12, fontWeight: 600, transition: 'opacity 0.15s',
    opacity: disabled ? 0.4 : 1,
    background: bg || 'transparent',
    color: color || '#9ca3af',
    border: border || '1px solid rgba(255,255,255,0.12)',
  };
}
