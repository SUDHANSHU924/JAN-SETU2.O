import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, AlertTriangle, BarChart2, User } from 'lucide-react';
import './OfficerBottomNav.css';

const NAV_ITEMS = [
  { to: '/officer',              label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { to: '/officer/queue',        label: 'Queue',      icon: List,            exact: false, badge: '142' },
  { to: '/officer/escalations',  label: 'Escalations',icon: AlertTriangle,   exact: false, badge: '5',  badgeWarn: true },
  { to: '/officer/analytics',    label: 'Analytics',  icon: BarChart2,       exact: false },
  { to: '/officer/profile',      label: 'Profile',    icon: User,            exact: false },
];

export function OfficerBottomNav() {
  return (
    <nav className="officer-bottom-nav" role="navigation" aria-label="Officer Bottom Navigation">
      <div className="officer-bottom-nav__items">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact, badge, badgeWarn }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `officer-bottom-nav__item ${isActive ? 'active' : ''}`}
            aria-label={label}
          >
            {badge && (
              <span className={`officer-bottom-nav__badge ${badgeWarn ? 'warn' : ''}`}>
                {badge}
              </span>
            )}
            <Icon size={21} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
