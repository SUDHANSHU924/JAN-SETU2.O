import React, { useEffect, useRef, useCallback } from 'react';
import './AmbientBackground.css';

/**
 * AmbientBackground — Two slowly drifting aurora orbs that give the background
 * a "breathing" feel. Used on every page. Officer dashboard also gets cursor spotlight.
 */
export function AmbientBackground({ showSpotlight = false }) {
  const spotRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);

  // Cursor spotlight for officer dashboard
  const handleMouseMove = useCallback((e) => {
    if (!spotRef.current || !showSpotlight) return;
    spotRef.current.style.left = `${e.clientX}px`;
    spotRef.current.style.top  = `${e.clientY}px`;
  }, [showSpotlight]);

  useEffect(() => {
    if (!showSpotlight) return;
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [showSpotlight, handleMouseMove]);

  return (
    <div className="ambient-bg" aria-hidden="true">
      {/* Aurora Orb 1 — teal */}
      <div ref={orb1Ref} className="ambient-orb ambient-orb--teal" />
      {/* Aurora Orb 2 — blue */}
      <div ref={orb2Ref} className="ambient-orb ambient-orb--blue" />
      {/* Cursor spotlight (officer only) */}
      {showSpotlight && (
        <div ref={spotRef} className="cursor-spotlight" />
      )}
    </div>
  );
}
