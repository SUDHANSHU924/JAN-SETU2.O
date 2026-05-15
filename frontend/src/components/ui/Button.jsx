import React from 'react';
import { motion } from 'framer-motion';
import './Button.css';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className = '',
  style = {},
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <motion.button
      type={type}
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}
      style={style}
      disabled={disabled || loading}
      onClick={onClick}
      whileTap={!(disabled || loading) ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      {...props}
    >
      {loading && <span className="ui-button__spinner" />}
      {children}
    </motion.button>
  );
}
