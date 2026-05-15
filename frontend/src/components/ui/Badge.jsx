import React from 'react';
import { motion } from 'framer-motion';
import './Badge.css';

export function Badge({ variant = 'default', children, className = '', style = {}, ...props }) {
  return (
    <motion.span
      className={`badge badge--${variant} ${className}`}
      style={style}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      {...props}
    >
      {children}
    </motion.span>
  );
}
