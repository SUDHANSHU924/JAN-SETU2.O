import React, { useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import './GlassCard.css';

export function GlassCard({ children, className = '', layer = 2, onClick, hoverEffect = true, style, ...props }) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for tilt (normalized -0.5 to 0.5)
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);

  // Motion values for spotlight pixel position
  const spotX = useMotionValue(-999);
  const spotY = useMotionValue(-999);

  // Springs for smooth snap-back
  const springConfig = { stiffness: 260, damping: 22 };
  const rotateX = useSpring(useTransform(tiltY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(tiltX, [-0.5, 0.5], [-8, 8]), springConfig);

  // Derive spotlight transform from raw motion values (no hooks in JSX)
  const spotTransX = useTransform(spotX, (x) => x - 200);
  const spotTransY = useTransform(spotY, (y) => y - 200);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (hoverEffect) {
      tiltX.set((x / rect.width) - 0.5);
      tiltY.set((y / rect.height) - 0.5);
    }
    spotX.set(x);
    spotY.set(y);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    tiltX.set(0);
    tiltY.set(0);
    spotX.set(-999);
    spotY.set(-999);
  };

  const shadowVar = isHovered && hoverEffect
    ? `var(--shadow-layer-${Math.min(layer + 1, 4)})`
    : `var(--shadow-layer-${layer})`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`glass-card-base glass ${className}`}
      style={{ boxShadow: shadowVar, ...style }}
      animate={{ scale: isHovered && hoverEffect ? 1.015 : 1 }}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      {...props}
    >
      <motion.div
        style={{
          rotateX: hoverEffect ? rotateX : 0,
          rotateY: hoverEffect ? rotateY : 0,
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}
        className="glass-card-inner"
      >
        {children}

        {/* Spotlight — uses pre-computed transforms (no hooks in JSX) */}
        {hoverEffect && isHovered && (
          <motion.div
            className="card-spotlight"
            style={{ x: spotTransX, y: spotTransY }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
