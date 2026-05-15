import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, TrendingUp, AlertTriangle, User, Settings as SettingsIcon } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import './Sidebar.css';

export function Sidebar() {
  const { user } = useUser();
  const name = user?.name || 'Officer';

  return (
    <aside className="officer-sidebar">
      {/* Brand Header */}
      <div className="officer-sidebar__header">
        <div className="officer-sidebar__brand">
          <div className="officer-sidebar__brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <div className="officer-sidebar__title">JanSetu</div>
            <div className="officer-sidebar__role">Officer Portal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="officer-sidebar__nav">
        <div className="officer-sidebar__section-label">Command</div>

        <NavLink to="/officer" end className={({ isActive }) => `officer-sidebar__link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/officer/queue" className={({ isActive }) => `officer-sidebar__link ${isActive ? 'active' : ''}`}>
          <List size={16} />
          <span>Complaint Queue</span>
          <span className="officer-sidebar__link-badge">142</span>
        </NavLink>

        <NavLink to="/officer/escalations" className={({ isActive }) => `officer-sidebar__link ${isActive ? 'active' : ''}`}>
          <AlertTriangle size={16} />
          <span>Escalations</span>
          <span className="officer-sidebar__link-badge">5</span>
        </NavLink>

        <NavLink to="/officer/analytics" className={({ isActive }) => `officer-sidebar__link ${isActive ? 'active' : ''}`}>
          <TrendingUp size={16} />
          <span>Analytics</span>
        </NavLink>

        <div className="officer-sidebar__section-label">Account</div>

        <NavLink to="/officer/profile" className={({ isActive }) => `officer-sidebar__link ${isActive ? 'active' : ''}`}>
          <User size={16} />
          <span>My Profile</span>
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="officer-sidebar__footer">
        <div className="officer-sidebar__user">
          <div className="officer-sidebar__avatar">{name[0].toUpperCase()}</div>
          <div className="officer-sidebar__user-info">
            <div className="officer-sidebar__user-name">{name}</div>
            <div className="officer-sidebar__user-role">JanSetu Portal</div>
          </div>
          <SettingsIcon size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
