/**
 * Builds the /verify/{qr_token} URL encoded in a ticket's QR code.
 * PUBLIC_APP_URL should be set in production to your real domain —
 * QR codes printed on posters/banners need a stable link, not a
 * per-deployment Vercel preview URL. Falls back to the incoming
 * request's own host so local dev / preview testing still works
 * without it configured.
 */
function buildVerifyUrl(req, token) {
  const configured = process.env.PUBLIC_APP_URL;
  if (configured) {
    return `${configured.replace(/\/+$/, "")}/verify/${token}`;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}/verify/${token}`;
}

module.exports = { buildVerifyUrl };
