import React, { useState } from 'react';
import './modals.css';
import ModalPortal from './ModalPortal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = ['jansetu_officer_token', 'jansetu_token'];
const getToken = () => TOKEN_KEY.map(k => localStorage.getItem(k)).find(Boolean) || '';

const VALID_STATUSES = [
  { value: 'in_progress',  label: '🔄 In Progress' },
  { value: 'processing',   label: '⚙️ Processing' },
  { value: 'review',       label: '🔍 Under Review' },
  { value: 'assigned',     label: '📋 Assigned' },
  { value: 'on_hold',      label: '⏸ On Hold' },
];

export default function UpdateComplaintModal({ complaint, isOpen, onClose, onSuccess, onError }) {
  const [status, setStatus]   = useState('in_progress');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  if (!isOpen || !complaint) return null;

  const validate = () => {
    if (!status) return 'Please select a status.';
    if (note.trim().length > 0 && note.trim().length < 5) return 'Note must be at least 5 characters.';
    return null;
  };

  const handleSubmit = async () => {
    const vErr = validate();
    if (vErr) { setErr(vErr); return; }
    const token = getToken();
    if (!token) { setErr('Not logged in. Please login first.'); return; }

    setLoading(true); setErr('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/complaints/${complaint.complaint_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, note: note.trim() }),
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (res.status === 401) { setErr('Unauthorized — please login again.'); return; }
      if (res.status === 404) { setErr('Complaint not found.'); return; }
      if (!res.ok) { setErr(data.detail || data.message || `Error ${res.status}`); return; }

      onSuccess?.('Status updated successfully! Citizen has been notified.');
      // reset
      setStatus('in_progress'); setNote('');
    } catch {
      setErr('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setErr(''); setNote(''); setStatus('in_progress'); onClose(); };

  return (
    <ModalPortal>
      <div className="jq-overlay" onClick={handleClose}>
        <div className="jq-modal" onClick={e => e.stopPropagation()}>

        <div className="jq-modal__header">
          <h3 className="jq-modal__title">🔄 Update Status</h3>
          <button className="jq-modal__close" onClick={handleClose}>×</button>
        </div>

        <div className="jq-modal__body">
          {/* Complaint ref */}
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 18, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{complaint.title}</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>
              {complaint.id || `#${String(complaint.complaint_id).slice(-6).toUpperCase()}`} · {complaint.category}
            </div>
          </div>

          {err && <div className="jq-error-msg">⚠️ {err}</div>}

          <div className="jq-field">
            <label className="jq-label">New Status *</label>
            <select className="jq-select" value={status} onChange={e => setStatus(e.target.value)}>
              {VALID_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="jq-field">
            <label className="jq-label">Note for Citizen <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea
              className="jq-textarea"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Officer dispatched to site, work begins Monday..."
              maxLength={500}
            />
            <div className="jq-char-count">{note.length}/500</div>
          </div>
        </div>

        <div className="jq-modal__footer">
          <button className="jq-btn jq-btn--outline" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button className="jq-btn jq-btn--primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Saving…' : '✓ Save Update'}
          </button>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
}
