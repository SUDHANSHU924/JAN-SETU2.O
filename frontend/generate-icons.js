/**
 * generate-icons.js
 * Generates all PWA icon PNGs for both Citizen and Officer portals
 * using the Canvas API via Node.
 * Run: node generate-icons.js
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT   = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function drawIcon({ size, bg, accent, shape, label }) {
  const c   = createCanvas(size, size);
  const ctx = c.getContext('2d');
  const r   = size * 0.22;    // corner radius for maskable safe zone

  // Background
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Inner circle
  ctx.fillStyle = accent + '33';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Icon shape (SVG path scaled)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = size * 0.04;
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  const s = size / 24;  // scale factor from 24px viewbox

  ctx.save();
  ctx.translate(size / 2 - 12 * s, size / 2 - 12 * s);
  ctx.scale(s, s);

  if (shape === 'house') {
    // Home icon
    ctx.beginPath();
    ctx.moveTo(3, 9);
    ctx.lineTo(12, 2);
    ctx.lineTo(21, 9);
    ctx.lineTo(21, 20);
    ctx.quadraticCurveTo(21, 22, 19, 22);
    ctx.lineTo(5, 22);
    ctx.quadraticCurveTo(3, 22, 3, 20);
    ctx.closePath();
    ctx.fill();
    // Door
    ctx.fillStyle = bg;
    ctx.fillRect(9, 14, 6, 8);
  } else {
    // Shield icon (officer)
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(20, 6);
    ctx.lineTo(20, 13);
    ctx.quadraticCurveTo(20, 18, 12, 22);
    ctx.quadraticCurveTo(4, 18, 4, 13);
    ctx.lineTo(4, 6);
    ctx.closePath();
    ctx.fill();
    // Checkmark inside shield
    ctx.strokeStyle = bg;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(9, 12);
    ctx.lineTo(11, 14);
    ctx.lineTo(15, 10);
    ctx.stroke();
  }

  ctx.restore();

  return c.toBuffer('image/png');
}

// ── Citizen icons ─────────────────────────────────────────────────────
SIZES.forEach(size => {
  const buf = drawIcon({ size, bg: '#009DC4', accent: '#87CEFA', shape: 'house' });
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), buf);
  console.log(`✅ icon-${size}.png`);
});

// ── Officer icons ─────────────────────────────────────────────────────
SIZES.forEach(size => {
  const buf = drawIcon({ size, bg: '#006A85', accent: '#009DC4', shape: 'shield' });
  fs.writeFileSync(path.join(OUT, `icon-officer-${size}.png`), buf);
  console.log(`✅ icon-officer-${size}.png`);
});

console.log('\n🎉 All icons generated!');
