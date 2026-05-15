import React, { useEffect, useRef } from 'react';
import './ProgressRing.css';

export function ProgressRing({ progress = 0, radius = 50, stroke = 10 }) {
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const offset = circumference - (progress / 100) * circumference;

  const circleRef = useRef(null);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.style.strokeDashoffset = offset;
    }
  }, [offset]);

  const id = `grad-${radius}`;
  const size = radius * 2;

  return (
    <div className="progress-ring" style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--teal-primary)" />
            <stop offset="100%" stopColor="var(--blue-electric)" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          ref={circleRef}
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform={`rotate(-90 ${radius} ${radius})`}
          className="progress-ring__circle"
        />
      </svg>
      {/* Center text */}
      <div className="progress-ring__center">
        <span className="progress-ring__value">{progress}</span>
        <span className="progress-ring__label">/ 100</span>
      </div>
    </div>
  );
}
