import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { GlassCard } from '../../components/ui/GlassCard';
import { User, Mail, Building, Settings, LogOut, Shield, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { officerLogout } from '../../lib/authHelpers';
import CountUpBase from 'react-countup';
const CountUp = CountUpBase.default || CountUpBase;

export function OfficerProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ total: 0, resolved: 0, avgResolution: '—' });
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState({ name: '', mobile: '', email: '', address: '', department: '' });
  const [savingKyc, setSavingKyc] = useState(false);
  const [kycMessage, setKycMessage] = useState('');
  const [kycError, setKycError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { getMe, getAnalytics, getOfficerKyc } = await import('../../services/api');
        const [me, analytics] = await Promise.all([
          getMe().catch(() => null),
          getAnalytics().catch(() => []),
        ]);
        if (me) setProfile(me);
        const kycData = await getOfficerKyc().catch(() => null);
        if (kycData) {
          setKyc({
            name: kycData.name || me?.name || '',
            mobile: kycData.mobile || me?.phone || '',
            email: kycData.email || me?.email || '',
            address: kycData.address || '',
            department: kycData.department || '',
          });
        } else if (me) {
          setKyc({
            name: me.name || '',
            mobile: me.phone || '',
            email: me.email || '',
            address: '',
            department: '',
          });
        }

        if (Array.isArray(analytics) && analytics.length) {
          const resolved = analytics.filter(c => c.status === 'resolved').length;
          setStats({ total: analytics.length, resolved, avgResolution: '—' });
        }
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const name = profile?.name
    || localStorage.getItem('jansetu_name')
    || 'Officer';
  const role = (profile?.role || localStorage.getItem('jansetu_role') || 'officer').toUpperCase();
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    officerLogout(); // clears all tokens + redirects to /officer/login
  };

  const handleKycChange = (field, value) => {
    setKyc(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveKyc = async () => {
    setSavingKyc(true);
    setKycError('');
    setKycMessage('');
    try {
      const { saveOfficerKyc } = await import('../../services/api');
      const res = await saveOfficerKyc(kyc);
      const data = res?.data || {};
      setKyc({
        name: data.name || kyc.name,
        mobile: data.mobile || kyc.mobile,
        email: data.email || kyc.email,
        address: data.address || kyc.address,
        department: data.department || kyc.department,
      });
      setKycMessage('KYC saved to Supabase successfully.');
    } catch (err) {
      setKycError(err.message || 'Could not save KYC.');
    } finally {
      setSavingKyc(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto' }}>

      {/* Profile header */}
      <GlassCard layer={3} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '24px' }}>
        <div style={{
          width: 80, height: 80, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--teal-primary), var(--blue-electric))',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: 'white'
        }}>
          {initials || <User size={36} />}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.4rem', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
            {loading ? '…' : name}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Shield size={14} /> {role}
            </span>
            {profile?.phone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                📱 +91 {profile.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}
              </span>
            )}
            {profile?.email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={14} /> {profile.email}
              </span>
            )}
          </div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 20,
          background: 'rgba(47,143,91,0.12)', border: '1px solid rgba(47,143,91,0.25)',
          fontSize: 12, fontWeight: 700, color: 'var(--status-low)', letterSpacing: '0.06em'
        }}>
          ACTIVE
        </div>
      </GlassCard>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <GlassCard layer={2} style={{ textAlign: 'center', padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Complaints</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--teal-primary)', marginTop: '0.5rem' }}>
            {loading ? '—' : <CountUp end={stats.total} duration={1.2} />}
          </div>
        </GlassCard>
        <GlassCard layer={2} style={{ textAlign: 'center', padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resolved</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--status-low)', marginTop: '0.5rem' }}>
            {loading ? '—' : <CountUp end={stats.resolved} duration={1.2} />}
          </div>
        </GlassCard>
        <GlassCard layer={2} style={{ textAlign: 'center', padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trust Level</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#B45309', marginTop: '0.5rem' }}>
            {loading ? '—' : (profile?.trust_level || 'trusted').toUpperCase()}
          </div>
        </GlassCard>
      </div>

      {/* Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <GlassCard layer={2} style={{ padding: '20px' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Officer KYC</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="login-input" placeholder="Full Name" value={kyc.name} onChange={(e) => handleKycChange('name', e.target.value)} />
            <input className="login-input" placeholder="Mobile Number" value={kyc.mobile} onChange={(e) => handleKycChange('mobile', e.target.value)} />
            <input className="login-input" placeholder="Official Email" value={kyc.email} onChange={(e) => handleKycChange('email', e.target.value)} />
            <input className="login-input" placeholder="Department" value={kyc.department} onChange={(e) => handleKycChange('department', e.target.value)} />
          </div>
          <textarea
            className="login-input"
            placeholder="Full Address"
            value={kyc.address}
            onChange={(e) => handleKycChange('address', e.target.value)}
            rows={3}
            style={{ marginTop: 10, width: '100%', resize: 'vertical' }}
          />
          <button
            onClick={handleSaveKyc}
            disabled={savingKyc}
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0,157,196,0.35)',
              background: 'rgba(0,157,196,0.14)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {savingKyc ? 'Saving...' : 'Save KYC'}
          </button>
          {kycMessage && <p style={{ color: '#22c55e', marginTop: 8, fontSize: 13 }}>{kycMessage}</p>}
          {kycError && <p style={{ color: '#ff6b6b', marginTop: 8, fontSize: 13 }}>{kycError}</p>}

          <div className="section-label" style={{ marginBottom: 12, marginTop: 18 }}>Account Details</div>
          {[
            ['User ID',     profile?.user_id ? profile.user_id.slice(0, 8) + '…' : '—'],
            ['Role',        role],
            ['Trust Score', profile?.trust_score ?? '—'],
            ['Verified',    profile?.is_verified ? 'Yes ✓' : 'Pending'],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{loading ? '…' : String(value)}</span>
            </div>
          ))}
        </GlassCard>

        <GlassCard layer={2} style={{ padding: '20px' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer'
            }}>
              <Settings size={16} /> Profile Settings
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer'
            }}>
              <Mail size={16} /> Notifications
            </button>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                background: 'rgba(196,75,58,0.06)', border: '1px solid rgba(196,75,58,0.2)',
                borderRadius: 8, color: 'var(--status-high)', fontSize: 13, cursor: 'pointer', fontWeight: 600
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
