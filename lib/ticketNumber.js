const crypto = require("crypto");

const SUFFIX_CHARS = "ABCDEF0123456789";
const SUFFIX_LENGTH = 6;

function randomSuffix() {
  const bytes = crypto.randomBytes(SUFFIX_LENGTH);
  let out = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    out += SUFFIX_CHARS[bytes[i] % SUFFIX_CHARS.length];
  }
  return out;
}

function formatDateForTicket(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function generateTicketNumber() {
  return `HH-${formatDateForTicket()}-${randomSuffix()}`;
}

/**
 * Generates a ticket number and checks it against the DB for a collision.
 * With 6 hex-ish chars per day, collisions are astronomically unlikely —
 * this loop is a cheap safety net, not a load-bearing assumption.
 */
async function generateUniqueTicketNumber(supabase, maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateTicketNumber();

    const { data, error } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_number", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  throw new Error("Could not generate a unique ticket number — please retry.");
}

/**
 * Secure random token embedded in the ticket's QR code (Phase 4).
 * Never derived from customer name/mobile/payment details.
 */
function generateQrToken() {
  return crypto.randomBytes(24).toString("base64url");
}

module.exports = {
  generateTicketNumber,
  generateUniqueTicketNumber,
  generateQrToken,
};
