import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FileText, Activity, User, Bell, Settings, Shield } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import './CitizenSidebar.css';

export function CitizenSidebar() {
  const { user } = useUser();
  const name = user?.name ? user.name.split(' ')[0] : 'Citizen';

  return (
    <aside className="citizen-sidebar">
      {/* Brand Header */}
      <div className="citizen-sidebar__header">
        <div className="citizen-sidebar__brand">
          <div className="citizen-sidebar__brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="citizen-sidebar__title">JanSetu</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="citizen-sidebar__nav">
        <div className="citizen-sidebar__section-label">Main</div>

        <NavLink to="/citizen" end className={({ isActive }) => `citizen-sidebar__link ${isActive ? 'active' : ''}`}>
          <Home size={16} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/citizen/file" className={({ isActive }) => `citizen-sidebar__link ${isActive ? 'active' : ''}`}>
          <FileText size={16} />
          <span>File Complaint</span>
        </NavLink>

        <NavLink to="/citizen/track" className={({ isActive }) => `citizen-sidebar__link ${isActive ? 'active' : ''}`}>
          <Activity size={16} />
          <span>Track Status</span>
          <span className="citizen-sidebar__link-badge">2</span>
        </NavLink>

        <div className="citizen-sidebar__section-label">Account</div>

        <NavLink to="/citizen/profile" className={({ isActive }) => `citizen-sidebar__link ${isActive ? 'active' : ''}`}>
          <User size={16} />
          <span>Profile</span>
        </NavLink>

        <div onClick={(e) => { e.preventDefault(); alert('Notifications coming soon!'); }} className="citizen-sidebar__link" style={{cursor: 'pointer'}}>
          <Bell size={16} />
          <span>Notifications</span>
        </div>
      </nav>

      {/* User Footer */}
      <div className="citizen-sidebar__footer">
        <div className="citizen-sidebar__user">
          <div className="citizen-sidebar__avatar">{name[0].toUpperCase()}</div>
          <div className="citizen-sidebar__user-info">
            <div className="citizen-sidebar__user-name">{user?.name || 'Citizen'}</div>
            <div className="citizen-sidebar__user-role">Trusted Citizen</div>
          </div>
          <Settings size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
