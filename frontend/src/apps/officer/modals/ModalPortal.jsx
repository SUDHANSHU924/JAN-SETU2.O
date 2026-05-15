/**
 * ModalPortal — renders children directly in document.body
 * This bypasses any parent stacking contexts (will-change: transform, etc.)
 * which would break position:fixed overlays.
 */
import { createPortal } from 'react-dom';

export default function ModalPortal({ children }) {
  if (typeof document === 'undefined' || !document.body) return null;
  return createPortal(children, document.body);
}
