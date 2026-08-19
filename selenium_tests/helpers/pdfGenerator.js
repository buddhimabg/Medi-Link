const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures');

if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

async function createValidReportPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const textLines = [
    { text: "MEDILINK DIAGNOSTIC LABORATORY", font: boldFont, size: 16, x: 50, y: 750 },
    { text: "Patient Name: Jane Test          Age: 32 years          Sex: Female", font, size: 11, x: 50, y: 720 },
    { text: "Report Date: 19/08/2026         Ref No: LAB-TEST-9001", font, size: 11, x: 50, y: 700 },
    { text: "=================================================================", font, size: 10, x: 50, y: 680 },
    { text: "TEST NAME                      RESULT     UNIT         REFERENCE RANGE", font: boldFont, size: 11, x: 50, y: 660 },
    { text: "=================================================================", font, size: 10, x: 50, y: 640 },
    { text: "Hemoglobin                     14.5       g/dL         13.0 - 17.0", font, size: 11, x: 50, y: 610 },
    { text: "Fasting Blood Sugar            125        mg/dL        70 - 100", font, size: 11, x: 50, y: 580 },
    { text: "Vitamin D                      22         ng/mL        30 - 100", font, size: 11, x: 50, y: 550 },
    { text: "=================================================================", font, size: 10, x: 50, y: 520 },
    { text: "End of Report.", font, size: 10, x: 50, y: 490 }
  ];

  for (const line of textLines) {
    page.drawText(line.text, {
      x: line.x,
      y: line.y,
      size: line.size,
      font: line.font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(FIXTURE_DIR, 'valid_lab_report.pdf');
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

async function createInvalidReportPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const textLines = [
    "ACME CONSULTING SERVICES",
    "Invoice No: INV-10023",
    "Date: 19/08/2026",
    "",
    "Item 1: General Office Supply - $150.00",
    "Item 2: Shipping Fee - $20.00",
    "Total Paid: $170.00",
    "",
    "Thank you for your business!"
  ];

  let y = 750;
  for (const line of textLines) {
    if (line) {
      page.drawText(line, { x: 50, y, size: 12, font, color: rgb(0.2, 0.2, 0.2) });
    }
    y -= 30;
  }

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(FIXTURE_DIR, 'invalid_lab_report.pdf');
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

async function ensureFixtures() {
  const validPath = await createValidReportPdf();
  const invalidPath = await createInvalidReportPdf();
  return { validPath, invalidPath };
}

module.exports = {
  createValidReportPdf,
  createInvalidReportPdf,
  ensureFixtures,
  FIXTURE_DIR
};
