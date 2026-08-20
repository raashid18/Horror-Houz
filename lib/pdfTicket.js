const PDFDocument = require("pdfkit");

const COLORS = {
  bg: "#0D0D0D",
  accent: "#D00000",
  accentDeep: "#8B0000",
  textPrimary: "#F5F5F5",
  textSecondary: "#B8B8B8",
  line: "#333333",
};

const PAGE_WIDTH = 400;
const PAGE_HEIGHT = 780;
const MARGIN_X = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function formatRupees(amount) {
  return `\u20B9${Number(amount).toLocaleString("en-IN")}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Renders a single ticket to a PDF Buffer. Uses PDFKit's built-in
 * Helvetica/Courier fonts rather than the site's Bebas Neue/Cinzel —
 * that avoids bundling font files into the deployment. If you want
 * the exact site typography here later, drop .ttf files under
 * public/fonts and register them with doc.registerFont() before use.
 */
function buildTicketPdf({
  ticketNumber,
  customerName,
  quantity,
  amount,
  paymentMethod,
  ticketStatus,
  createdAt,
  qrPngBuffer,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Background
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.bg);

    // Outer border
    doc
      .roundedRect(14, 14, PAGE_WIDTH - 28, PAGE_HEIGHT - 28, 6)
      .lineWidth(1)
      .strokeColor(COLORS.accentDeep)
      .stroke();

    let y = 46;

    doc
      .fillColor(COLORS.textPrimary)
      .font("Helvetica-Bold")
      .fontSize(30)
      .text("HORROR", MARGIN_X, y, { width: CONTENT_WIDTH, align: "center" });
    y += 32;

    doc
      .fillColor(COLORS.accent)
      .font("Helvetica-Bold")
      .fontSize(30)
      .text("HOUZ", MARGIN_X, y, { width: CONTENT_WIDTH, align: "center" });
    y += 40;

    doc
      .fillColor(COLORS.textSecondary)
      .font("Helvetica")
      .fontSize(9)
      .text("DIGITAL ENTRY TICKET", MARGIN_X, y, {
        width: CONTENT_WIDTH,
        align: "center",
        characterSpacing: 2,
      });
    y += 28;

    y = dashedDivider(doc, y);
    y += 22;

    // Ticket number, boxed
    doc
      .roundedRect(MARGIN_X, y, CONTENT_WIDTH, 40, 4)
      .lineWidth(1)
      .strokeColor(COLORS.accentDeep)
      .dash(2, { space: 2 })
      .stroke()
      .undash();
    doc
      .fillColor(COLORS.textPrimary)
      .font("Courier-Bold")
      .fontSize(15)
      .text(ticketNumber, MARGIN_X, y + 13, { width: CONTENT_WIDTH, align: "center" });
    y += 60;

    const detailRow = (label, value) => {
      doc
        .fillColor(COLORS.textSecondary)
        .font("Helvetica")
        .fontSize(9)
        .text(label.toUpperCase(), MARGIN_X, y, { characterSpacing: 1 });
      doc
        .fillColor(COLORS.textPrimary)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(value, MARGIN_X, y + 12, { width: CONTENT_WIDTH });
      y += 38;
    };

    detailRow("Customer", customerName);
    detailRow("Tickets", String(quantity));
    detailRow("Amount", formatRupees(amount));
    detailRow("Payment", paymentMethod);
    detailRow("Status", ticketStatus);
    detailRow("Booking Date", formatDate(createdAt));

    y += 6;
    y = dashedDivider(doc, y);
    y += 26;

    // QR code on a white plate — keeps it scannable regardless of the
    // dark page behind it.
    const qrSize = 170;
    const platePadding = 14;
    const qrX = (PAGE_WIDTH - qrSize) / 2;

    doc
      .roundedRect(qrX - platePadding, y - platePadding, qrSize + platePadding * 2, qrSize + platePadding * 2, 6)
      .fill("#FFFFFF");
    doc.image(qrPngBuffer, qrX, y, { width: qrSize, height: qrSize });
    y += qrSize + platePadding * 2 + 16;

    doc
      .fillColor(COLORS.textSecondary)
      .font("Helvetica")
      .fontSize(9)
      .text("Scan to verify your ticket.", MARGIN_X, y, { width: CONTENT_WIDTH, align: "center" });
    y += 30;

    doc
      .fillColor(COLORS.accent)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("ENTER IF YOU DARE.", MARGIN_X, y, {
        width: CONTENT_WIDTH,
        align: "center",
        characterSpacing: 1.5,
      });

    doc.end();
  });
}

function dashedDivider(doc, y) {
  doc
    .dash(3, { space: 3 })
    .moveTo(MARGIN_X, y)
    .lineTo(PAGE_WIDTH - MARGIN_X, y)
    .strokeColor(COLORS.line)
    .stroke()
    .undash();
  return y;
}

module.exports = { buildTicketPdf };
