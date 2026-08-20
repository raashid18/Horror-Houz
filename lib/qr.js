const QRCode = require("qrcode");

/**
 * Generates a scannable QR code PNG for a verification URL.
 * Deliberately plain black-on-white (not theme red-on-black) —
 * high contrast keeps it reliably scannable across phone cameras
 * and dedicated scanners, which matters more than matching the
 * ticket's color palette here.
 */
async function generateTicketQrPng(verifyUrl) {
  return QRCode.toBuffer(verifyUrl, {
    type: "png",
    width: 500,
    margin: 2,
    color: {
      dark: "#050505",
      light: "#FFFFFF",
    },
  });
}

module.exports = { generateTicketQrPng };
