import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FileText, Activity, User } from 'lucide-react';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/citizen',         label: 'Home',     icon: Home,     exact: true },
  { to: '/citizen/file',    label: 'File',     icon: FileText, exact: false },
  { to: '/citizen/track',   label: 'Track',    icon: Activity, exact: false, badge: '2' },
  { to: '/citizen/profile', label: 'Profile',  icon: User,     exact: false },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Bottom Navigation">
      <div className="bottom-nav__items">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `bottom-nav__item ${isActive ? 'active' : ''}`}
            aria-label={label}
          >
            {badge && <span className="bottom-nav__badge">{badge}</span>}
            <Icon size={24} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
