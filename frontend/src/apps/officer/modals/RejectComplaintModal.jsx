import React, { useState } from 'react';
import './modals.css';
import ModalPortal from './ModalPortal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = ['jansetu_officer_token', 'jansetu_token'];
const getToken = () => TOKEN_KEY.map(k => localStorage.getItem(k)).find(Boolean) || '';

const REJECTION_TYPES = [
  { value: 'Invalid',           label: '❌ Invalid Complaint' },
  { value: 'Duplicate',         label: '🔁 Duplicate' },
  { value: 'OutOfJurisdiction', label: '📍 Out of Jurisdiction' },
  { value: 'AlreadyResolved',   label: '✅ Already Resolved' },
  { value: 'IncompleteInfo',    label: '📝 Incomplete Information' },
  { value: 'Other',             label: '📌 Other' },
];

export default function RejectComplaintModal({ complaint, isOpen, onClose, onSuccess, onError }) {
  const [step, setStep]             = useState(1);
  const [rejType, setRejType]       = useState('Invalid');
  const [reason, setReason]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState('');

  if (!isOpen || !complaint) return null;

  const handleClose = () => { setStep(1); setReason(''); setErr(''); onClose(); };

  const handleReject = async () => {
    if (reason.trim().length < 10) { setErr('Rejection reason must be at least 10 characters.'); return; }
    const token = getToken();
    if (!token) { setErr('Not logged in. Please login first.'); return; }

    setLoading(true); setErr('');
    try {
      // DELETE — removes from Supabase + notifies citizen
      const res = await fetch(`${API_BASE}/api/v1/complaints/${complaint.complaint_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rejection_type: rejType, reason: reason.trim() }),
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (res.status === 401) { setErr('Unauthorized — please login again.'); return; }
      if (res.status === 404) { setErr('Complaint not found or already removed.'); return; }
      if (!res.ok) { setErr(data.detail || data.message || `Error ${res.status}`); return; }

      onSuccess?.('Complaint rejected & permanently deleted. Citizen notified. 🗑️');
      setStep(1); setReason(''); setRejType('Invalid');
    } catch {
      setErr('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="jq-overlay" onClick={handleClose}>
        <div className="jq-modal jq-modal--danger" onClick={e => e.stopPropagation()}>

        <div className="jq-modal__header">
          <h3 className="jq-modal__title" style={{ color: '#ef4444' }}>
            🚫 Reject Complaint
          </h3>
          <button className="jq-modal__close" onClick={handleClose}>×</button>
        </div>

        <div className="jq-modal__body">
          {/* Steps */}
          <div className="jq-steps">
            <div className={`jq-step ${step === 1 ? 'active' : ''}`} style={step === 1 ? { color: '#ef4444' } : {}}>
              <span className="jq-step-num">1</span>
              <span>Confirm</span>
            </div>
            <div className="jq-step-div" />
            <div className={`jq-step ${step === 2 ? 'active' : ''}`} style={step === 2 ? { color: '#ef4444' } : {}}>
              <span className="jq-step-num">2</span>
              <span>Reason</span>
            </div>
          </div>

          {err && <div className="jq-error-msg">⚠️ {err}</div>}

          {step === 1 && (
            <>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{complaint.title}</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>
                  {complaint.id} · {complaint.category}
                </div>
                {complaint.citizen?.name && (
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
                    Citizen: {complaint.citizen.name}
                    {complaint.citizen.phone && ` · ${complaint.citizen.phone}`}
                  </div>
                )}
              </div>

              <div className="jq-warning-box">
                ⚠️ <strong>This action cannot be undone.</strong>
                <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 12 }}>
                  <li>Complaint will be <strong>permanently deleted</strong> from Supabase</li>
                  <li>Citizen will receive a rejection notification</li>
                  <li>This cannot be recovered</li>
                </ul>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="jq-field">
                <label className="jq-label">Rejection Type *</label>
                <select className="jq-select" value={rejType} onChange={e => setRejType(e.target.value)}
                  style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                  {REJECTION_TYPES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="jq-field">
                <label className="jq-label">Rejection Reason * <span style={{ fontWeight: 400, textTransform: 'none', color: '#6b7280' }}>(min 10 chars)</span></label>
                <textarea
                  className="jq-textarea"
                  style={{ borderColor: 'rgba(239,68,68,0.3)', minHeight: 100 }}
                  value={reason}
                  onChange={e => { setReason(e.target.value); setErr(''); }}
                  placeholder="Explain why this complaint is being rejected..."
                  maxLength={500}
                  autoFocus
                />
                <div className="jq-char-count">{reason.length}/500 (min 10)</div>
              </div>
            </>
          )}
        </div>

        <div className="jq-modal__footer">
          {step === 1 ? (
            <>
              <button className="jq-btn jq-btn--outline" onClick={handleClose}>Cancel</button>
              <button className="jq-btn jq-btn--danger" onClick={() => { setErr(''); setStep(2); }}>
                Continue →
              </button>
            </>
          ) : (
            <>
              <button className="jq-btn jq-btn--outline" onClick={() => { setErr(''); setStep(1); }} disabled={loading}>
                ← Back
              </button>
              <button className="jq-btn jq-btn--danger" onClick={handleReject} disabled={loading}>
                {loading ? '⏳ Rejecting…' : '🗑️ Confirm Rejection'}
              </button>
            </>
          )}
        </div>
        </div>
      </div>
    </ModalPortal>
  );
}
