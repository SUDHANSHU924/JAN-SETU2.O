import React from 'react';
import { Bell } from 'lucide-react';
import './Header.css';

export function Header({ title = "JANSETU", subtitle, showBell = true }) {
  return (
    <header className="app-header">
      <div className="app-header__info">
        <h1 className="app-header__title">{title}</h1>
        {subtitle && <p className="app-header__subtitle">{subtitle}</p>}
      </div>
      {showBell && (
        <button className="app-header__bell">
          <Bell size={20} color="currentColor" />
          <span className="app-header__bell-dot"></span>
        </button>
      )}
    </header>
  );
}
