// Shared PDFKit drawing helpers used by the invoice and prescription PDFs
// (dashed detail boxes, label/value rows, and circular rubber-stamp seals).

const dashedRoundedRect = (doc, x, y, w, h, radius = 6, color = '#94a3b8') => {
  doc.save();
  doc.lineWidth(1).strokeColor(color).dash(3, { space: 2 });
  doc.roundedRect(x, y, w, h, radius).stroke();
  doc.undash();
  doc.restore();
};

const labelValue = (doc, label, value, x, y, opts = {}) => {
  const { labelSize = 8, valueSize = 9.5, valueColor = '#1e293b', labelColor = '#64748b' } = opts;
  doc.font('Helvetica').fontSize(labelSize).fillColor(labelColor).text(label, x, y, { continued: true });
  doc.font('Helvetica-Bold').fontSize(valueSize).fillColor(valueColor).text(`  ${value ?? 'N/A'}`);
};

/**
 * Places characters along a circular arc. `flip` orients text on the bottom
 * half of a ring so it reads upright instead of upside-down.
 */
const drawArcText = (doc, { text, cx, cy, radius, startDeg, endDeg, fontSize = 6.5, color = '#dc2626', flip = false }) => {
  const chars = text.split('');
  const n = chars.length;
  doc.font('Helvetica-Bold').fontSize(fontSize).fillColor(color);
  chars.forEach((ch, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const deg = startDeg + (endDeg - startDeg) * t;
    const rad = (deg * Math.PI) / 180;
    const x = cx + radius * Math.sin(rad);
    const y = cy - radius * Math.cos(rad);
    const rotateDeg = flip ? deg + 180 : deg;
    doc.save();
    doc.translate(x, y);
    doc.rotate(rotateDeg, { origin: [0, 0] });
    doc.text(ch, -doc.widthOfString(ch) / 2, -fontSize / 2, { lineBreak: false });
    doc.restore();
  });
};

/**
 * Draws a rotated circular "rubber stamp" seal: double ring, arced text
 * along the top and bottom, and 1-2 lines of centered text in the middle.
 */
const drawSeal = (doc, { cx, cy, r, color, topText, bottomText, centerLines, rotateDeg = -10 }) => {
  doc.save();
  doc.rotate(rotateDeg, { origin: [cx, cy] });
  doc.lineWidth(1.5).strokeColor(color);
  doc.circle(cx, cy, r).stroke();
  doc.circle(cx, cy, r - 6).stroke();

  if (topText) {
    drawArcText(doc, { text: topText, cx, cy, radius: r - 16, startDeg: -95, endDeg: 95, fontSize: 5.8, color, flip: false });
  }
  if (bottomText) {
    drawArcText(doc, { text: bottomText, cx, cy, radius: r - 16, startDeg: 265, endDeg: 95, fontSize: 5.8, color, flip: true });
  }

  // Keep centered text well clear of the inner ring and arc text.
  const lines = centerLines || [];
  const innerWidth = (r - 22) * 2;
  const lineHeight = Math.max(...lines.map((l) => l.size || 9)) + 4;
  const startY = cy - ((lines.length - 1) * lineHeight) / 2 - (lines[0]?.size || 9) / 2;
  lines.forEach((line, i) => {
    doc.font(line.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(line.size || 9).fillColor(color)
      .text(line.text, cx - innerWidth / 2, startY + i * lineHeight, { width: innerWidth, align: 'center', lineBreak: false, ellipsis: true });
  });
  doc.restore();
};

module.exports = { dashedRoundedRect, labelValue, drawArcText, drawSeal };
