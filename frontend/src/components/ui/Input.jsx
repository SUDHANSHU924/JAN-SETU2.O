import React from 'react';
import './Input.css';

export function Input({ className = '', icon: Icon, ...props }) {
  return (
    <div className={`ui-input-wrapper ${className}`}>
      {Icon && <Icon className="ui-input-icon" size={18} />}
      <input className={`ui-input ${Icon ? 'ui-input--with-icon' : ''}`} {...props} />
    </div>
  );
}

export function TextArea({ className = '', ...props }) {
  return (
    <textarea className={`ui-input ui-textarea ${className}`} {...props} />
  );
}
