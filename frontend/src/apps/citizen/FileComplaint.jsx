import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { GlassCard } from '../../components/ui/GlassCard';
import { Check, MapPin, Mic, MicOff, Upload, Zap, CheckCircle, Loader } from 'lucide-react';
import './FileComplaint.css';

// ── 3-step flow: Details → Location → Review ──────────────────────
const STEPS = [
  { label: 'Details',  icon: '📝' },
  { label: 'Location', icon: '📍' },
  { label: 'Review',   icon: '🔍' },
];

const LANGUAGES = ['English', 'हिन्दी', 'मराठी', 'தமிழ்', 'తెలుగు', 'বাংলা', 'ಕನ್ನಡ'];

const LANG_CODE_MAP = {
  'English': 'en-IN',
  'हिन्दी': 'hi-IN',
  'मराठी': 'mr-IN',
  'தமிழ்': 'ta-IN',
  'తెలుగు': 'te-IN',
  'বাংলা': 'bn-IN',
  'ಕನ್ನಡ': 'kn-IN',
};

const CATEGORIES = [
  'Road & Infrastructure', 'Water Supply', 'Sanitation', 'Electricity',
  'Street Lighting', 'Public Health', 'Parks & Recreation', 'Other',
];

const AUTH_SIGNALS = [
  { label: 'AI Confidence',    value: 94 },
  { label: 'Media Validation', value: 87 },
  { label: 'Reputation',       value: 78 },
  { label: 'Geo Match',        value: 91 },
  { label: 'Novelty Score',    value: 82 },
];

export function FileComplaint() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(0);
  const [lang, setLang]             = useState('English');
  const [trackingToken, setTrackingToken] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [text, setText]             = useState('');
  const [address, setAddress]       = useState('');
  const [wordCount, setWordCount]   = useState(0);
  const [gps, setGps]               = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recogError, setRecogError] = useState('');
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const complaintCategory = selectedCategory || 'General';

  useEffect(() => {
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  }, [text]);

  const captureGPS = () => {
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: 'Location captured from GPS',
          });
          setAddress('Location captured from GPS');
          setGpsLoading(false);
        },
        () => {
          setGps({ lat: 19.076, lng: 72.877, address: 'Mumbai (default)' });
          setAddress('Mumbai (default)');
          setGpsLoading(false);
        }
      );
    } else {
      setGps({ lat: 19.076, lng: 72.877, address: 'Mumbai (default)' });
      setAddress('Mumbai (default)');
      setGpsLoading(false);
    }
  };

  // ── Web Speech API transcription ────────────────────────────────────────
  const startRecording = () => {
    setRecogError('');
    setTranscript('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecogError('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = LANG_CODE_MAP[lang] || 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t + ' ';
        else interim += t;
      }
      setTranscript((finalText + interim).trim());
    };

    recognition.onerror = (event) => {
      console.error('[SPEECH] error:', event.error);
      if (event.error === 'not-allowed') {
        setRecogError('Microphone access denied. Please allow mic in browser settings.');
      } else if (event.error === 'no-speech') {
        setRecogError('No speech detected. Try speaking closer to the mic.');
      } else {
        setRecogError(`Speech error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Auto-fill the complaint text if transcript is non-empty
      if (finalText.trim()) setText((prev) => prev ? prev + ' ' + finalText.trim() : finalText.trim());
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };


  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { submitComplaint } = await import('../../services/api');
      const response = await submitComplaint({
        text: text || 'No description provided',
        language: lang,
        lat: gps?.lat ?? 19.076,
        lng: gps?.lng ?? 72.877,
        address: address || gps?.address || 'Location not captured',
        media_urls: [],
        category: complaintCategory,
      });

      const generatedToken = response.tracking_token || response.trackingToken;
      if (!generatedToken) {
        throw new Error(response?.detail || 'Backend did not return a tracking token');
      }

      setTrackingToken(generatedToken);
      localStorage.setItem('last_tracking_token', generatedToken);
      setSubmitted(true);
    } catch (err) {
      alert(err?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const authTotal = Math.round(AUTH_SIGNALS.reduce((s, a) => s + a.value, 0) / AUTH_SIGNALS.length);

  // ── Success screen ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="file-complaint-page">
        <GlassCard layer={2} className="form-card">
          <div className="submit-success">
            <div className="submit-success__checkmark">
              <CheckCircle size={36} color="#2D6A4F" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Complaint Filed!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Your complaint has been submitted and is being processed by our AI engine.
            </p>
            <div className="submit-success__id">{trackingToken}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>📱</span> SMS confirmation sent to +91 98765 43210
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <Button variant="primary" onClick={() => { setSubmitted(false); setStep(0); setText(''); setGps(null); setTrackingToken(''); setMediaFile(null); setSelectedCategory(''); setAddress(''); }}>
                File Another
              </Button>
              <Button variant="outline" onClick={() => navigate(`/citizen/track?token=${encodeURIComponent(trackingToken)}`)}>
                Track This Complaint
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="file-complaint-page animate-fade-in">

      {/* Step Indicator */}
      <div className="step-indicator">
        {STEPS.map((s, i) => (
          <div key={s.label} className={`step-item ${i < step ? 'done' : i === step ? 'active' : ''}`}>
            <div className="step-circle">
              {i < step ? <Check size={16} strokeWidth={3} /> : i + 1}
            </div>
            <span className="step-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Step 0: Details ── */}
      {step === 0 && (
        <GlassCard layer={2} className="form-card animate-fade-in">
          <div className="section-label">Complaint Details</div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="">Select a category…</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Describe the issue</label>
            <textarea
              className="form-textarea"
              placeholder="Describe the problem in detail. Include what happened, when it started, and how it affects you…"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="word-count">{wordCount} words</div>
          </div>

          {/* AI Live Preview */}
          {wordCount >= 10 && (
            <div className="ai-preview-card">
              <div className="ai-preview-card__header">
                <Zap size={14} /> AI Reading Your Complaint
              </div>
              <div className="ai-preview-card__row">
                <span className="ai-preview-card__label">Category</span>
                <Badge>{complaintCategory}</Badge>
              </div>
              <div className="ai-preview-card__row">
                <span className="ai-preview-card__label">Priority</span>
                <Badge variant="high">High</Badge>
              </div>
              <div className="ai-preview-card__row">
                <span className="ai-preview-card__label">Confidence</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-primary)' }}>94%</span>
              </div>
            </div>
          )}

          {/* Filing Language */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Filing Language
            </div>
            <div className="lang-row">
              {LANGUAGES.map(l => (
                <button key={l} className={`lang-chip ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="step-nav">
            <Button variant="primary" onClick={() => setStep(1)} style={{ flex: 1 }}>
              Next: Location →
            </Button>
          </div>
        </GlassCard>
      )}

      {/* ── Step 1: Location ── */}
      {step === 1 && (
        <GlassCard layer={2} className="form-card animate-fade-in">
          <div className="section-label">Location &amp; Evidence</div>

          {/* GPS Card */}
          <div className={`gps-card ${gps ? 'captured' : ''}`}>
            <div className="gps-card__icon">
              <MapPin size={22} />
            </div>
            <div className="gps-card__info">
              <div className="gps-card__title">
                {gps ? gps.address : 'Capture your location'}
              </div>
              <div className="gps-card__sub">
                {gps
                  ? `${gps.lat.toFixed(4)}°N, ${gps.lng.toFixed(4)}°E · Zone: Bangalore South ✓`
                  : "We'll use GPS to match the right municipal zone"}
              </div>
            </div>
            {!gps && (
              <Button variant="primary" onClick={captureGPS} style={{ flexShrink: 0 }}>
                {gpsLoading ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Detecting…</> : 'Capture GPS'}
              </Button>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Manual Address (optional)</label>
            <input
              className="form-input"
              placeholder="Street, Area, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Upload Zone */}
          <div 
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <div className="upload-zone__icon"><Upload size={22} /></div>
            <div className="upload-zone__title">Attach Evidence</div>
            <div className="upload-zone__sub">Drop photos or videos · JPG, PNG, MP4 · Max 50 MB</div>
            {mediaFile && (
              <div style={{ fontSize: '12px', color: 'var(--teal-primary)', marginTop: '8px' }}>
                ✓ {mediaFile.name}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setMediaFile(file);
                  console.log("[FILE] Selected:", file.name, file.type, file.size);
                }
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                zIndex: 10,
              }}
            />
          </div>

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              background: isRecording
                ? 'linear-gradient(135deg,#e53e3e,#c53030)'
                : 'linear-gradient(135deg,rgba(0,212,200,0.1),rgba(0,153,160,0.08))',
              color: isRecording ? '#fff' : 'var(--teal-primary)',
              border: `1px solid ${isRecording ? 'rgba(229,62,62,0.4)' : 'rgba(0,212,200,0.3)'}`,
              borderRadius: '12px',
              padding: '13px 20px',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            {isRecording
              ? <><MicOff size={16} /> Stop Recording</>
              : <><Mic size={16} /> 🎤 Speak Your Complaint (Voice to Text)</>}
          </button>

          {/* Live transcript preview */}
          {isRecording && transcript && (
            <div style={{
              marginTop: 8, padding: '10px 12px',
              background: 'rgba(0,212,200,0.06)',
              border: '1px solid rgba(0,212,200,0.2)',
              borderRadius: 10, fontSize: 13, color: 'var(--teal-primary)',
              fontStyle: 'italic',
            }}>
              🎙 <em>{transcript}</em>
            </div>
          )}

          {/* Final transcript after stop */}
          {!isRecording && transcript && (
            <div style={{
              marginTop: 8, padding: '10px 12px',
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 10, fontSize: 13,
            }}>
              <span style={{ fontWeight: 700, color: '#22c55e' }}>✓ Transcript added to complaint:</span>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)' }}>{transcript}</p>
            </div>
          )}

          {/* Error */}
          {recogError && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: 'rgba(255,107,107,0.08)',
              border: '1px solid rgba(255,107,107,0.2)',
              borderRadius: 10, fontSize: 12, color: '#ff6b6b',
            }}>
              ⚠ {recogError}
            </div>
          )}

          <div className="step-nav">
            <Button variant="outline" onClick={() => setStep(0)}>← Back</Button>
            <Button variant="primary" onClick={() => setStep(2)} style={{ flex: 1 }}>
              Next: Review →
            </Button>
          </div>
        </GlassCard>
      )}

      {/* ── Step 2: Review ── */}
      {step === 2 && (
        <GlassCard layer={2} className="form-card animate-fade-in">
          <div className="section-label">Review &amp; AI Analysis</div>

          {/* Summary */}
          <div style={{
            background: 'rgba(0,157,196,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: 16, marginBottom: 20
          }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Badge>{complaintCategory}</Badge>
              <Badge variant="high">High</Badge>
              <Badge variant="active">{lang}</Badge>
              {gps && (
                <Badge style={{ background: 'rgba(45,106,79,0.1)', color: 'var(--status-low)', border: '1px solid rgba(45,106,79,0.2)' }}>
                  📍 GPS Captured
                </Badge>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {text || 'Pothole on main road causing traffic congestion and risk of accidents near junction…'}
            </p>
          </div>

          {/* Auth Score */}
          <div className="section-label" style={{ marginBottom: 12 }}>Authentication Score</div>
          {AUTH_SIGNALS.map(s => (
            <div key={s.label} className="auth-bar-row">
              <span className="auth-bar-label">{s.label}</span>
              <div className="auth-bar-track">
                <div className="auth-bar-fill" style={{ width: `${s.value}%` }} />
              </div>
              <span className="auth-bar-value">{s.value}%</span>
            </div>
          ))}

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', background: 'rgba(0,157,196,0.06)',
            borderRadius: 12, marginTop: 16, marginBottom: 20
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Total Auth Score</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal-primary)' }}>{authTotal}/100</div>
            </div>
            <Badge variant="active" style={{ fontSize: 13, padding: '6px 14px' }}>ACCEPTED</Badge>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
            background: 'rgba(45,106,79,0.06)', borderRadius: 12, marginBottom: 20,
            border: '1px solid rgba(45,106,79,0.15)'
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Expected SLA Resolution</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--status-low)' }}>~2.8 days</span>
          </div>

          <div className="step-nav">
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button variant="primary" onClick={handleSubmit} style={{ flex: 1 }} disabled={submitting}>
              {submitting
                ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
                : 'Submit to JanSetu AI →'
              }
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
