import React, { useState } from 'react';
import './modals.css';
import ModalPortal from './ModalPortal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = ['jansetu_officer_token', 'jansetu_token'];
const getToken = () => TOKEN_KEY.map(k => localStorage.getItem(k)).find(Boolean) || '';

export default function ResolveComplaintModal({ complaint, isOpen, onClose, onSuccess, onError }) {
  const [step, setStep]           = useState(1); // 1 = confirm, 2 = resolution text
  const [resolution, setResolution] = useState('');
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');

  if (!isOpen || !complaint) return null;

  const handleClose = () => { setStep(1); setResolution(''); setErr(''); onClose(); };

  const handleResolve = async () => {
    if (resolution.trim().length < 10) { setErr('Resolution must be at least 10 characters.'); return; }
    const token = getToken();
    if (!token) { setErr('Not logged in. Please login first.'); return; }

    setLoading(true); setErr('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/complaints/${complaint.complaint_id}/resolve-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resolution: resolution.trim() }),
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (res.status === 401) { setErr('Unauthorized — please login again.'); return; }
      if (res.status === 404) { setErr('Complaint not found.'); return; }
      if (!res.ok) { setErr(data.detail || data.message || `Error ${res.status}`); return; }

      onSuccess?.('Complaint resolved! Citizen has been notified. ✅');
      setStep(1); setResolution('');
    } catch {
      setErr('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="jq-overlay" onClick={handleClose}>
        <div className="jq-modal" onClick={e => e.stopPropagation()}>

        <div className="jq-modal__header">
          <h3 className="jq-modal__title">✅ Resolve Complaint</h3>
          <button className="jq-modal__close" onClick={handleClose}>×</button>
        </div>

        <div className="jq-modal__body">
          {/* Steps */}
          <div className="jq-steps">
            <div className={`jq-step ${step === 1 ? 'active' : ''}`}>
              <span className="jq-step-num">1</span>
              <span>Confirm</span>
            </div>
            <div className="jq-step-div" />
            <div className={`jq-step ${step === 2 ? 'active' : ''}`}>
              <span className="jq-step-num">2</span>
              <span>Resolution</span>
            </div>
          </div>

          {err && <div className="jq-error-msg">⚠️ {err}</div>}

          {step === 1 && (
            <>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{complaint.title}</div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>
                  {complaint.id} · {complaint.category} · {String(complaint.status || '').replace(/_/g,' ').toUpperCase()}
                </div>
                {complaint.citizen?.name && (
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
                    Citizen: {complaint.citizen.name}
                    {complaint.citizen.phone && ` · ${complaint.citizen.phone}`}
                  </div>
                )}
              </div>

              <div className="jq-warning-box">
                ⚠️ Marking as resolved will:
                <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 12 }}>
                  <li>Remove this complaint from the active queue</li>
                  <li>Set status to <strong>resolved</strong> in Supabase</li>
                  <li>Send notification to the citizen</li>
                </ul>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="jq-field">
              <label className="jq-label">Resolution Details * <span style={{ fontWeight: 400, textTransform: 'none', color: '#6b7280' }}>(min 10 chars)</span></label>
              <textarea
                className="jq-textarea"
                style={{ minHeight: 120 }}
                value={resolution}
                onChange={e => { setResolution(e.target.value); setErr(''); }}
                placeholder="Describe how the issue was resolved. e.g. 'Road repaired on 14 May. Contractor Sharma completed work at 3pm. Inspected and approved.'"
                maxLength={1000}
                autoFocus
              />
              <div className="jq-char-count">{resolution.length}/1000 (min 10)</div>
            </div>
          )}
        </div>

        <div className="jq-modal__footer">
          {step === 1 ? (
            <>
              <button className="jq-btn jq-btn--outline" onClick={handleClose}>Cancel</button>
              <button className="jq-btn jq-btn--primary" onClick={() => { setErr(''); setStep(2); }}>
                Continue →
              </button>
            </>
          ) : (
            <>
              <button className="jq-btn jq-btn--outline" onClick={() => { setErr(''); setStep(1); }} disabled={loading}>
                ← Back
              </button>
              <button className="jq-btn jq-btn--primary" onClick={handleResolve} disabled={loading}>
                {loading ? '⏳ Resolving…' : '✅ Confirm Resolution'}
              </button>
            </>
          )}
        </div>
        </div>
      </div>
    </ModalPortal>
  );
}
