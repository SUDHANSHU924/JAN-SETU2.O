import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

export function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      className={`theme-toggle ${isDark ? 'theme-toggle--dark' : 'theme-toggle--light'}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Track */}
      <span className="theme-toggle__track">
        <span className="theme-toggle__thumb">
          {isDark
            ? <Moon size={12} strokeWidth={2.5} />
            : <Sun size={12} strokeWidth={2.5} />
          }
        </span>
        {/* Background icons */}
        <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden>
          <Sun size={10} strokeWidth={2} />
        </span>
        <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden>
          <Moon size={10} strokeWidth={2} />
        </span>
      </span>
    </button>
  );
}
