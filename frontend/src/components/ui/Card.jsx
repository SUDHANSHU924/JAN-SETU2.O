import React from 'react';
import './Card.css';

export function Card({ children, className = '', style = {}, hoverable = false, state, ...props }) {
  return (
    <div
      className={`ui-card ${hoverable ? 'ui-card--hoverable' : ''} ${className}`}
      style={style}
      state={state}
      {...props}
    >
      {children}
    </div>
  );
}
