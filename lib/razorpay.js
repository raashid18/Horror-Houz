// Server-only. Only ever require() this from files under /api.
// RAZORPAY_KEY_SECRET must never be sent to or read by the browser.
// RAZORPAY_KEY_ID is a public identifier and is fine to expose to the
// frontend — it's returned from /api/create-order for Checkout to use.

const Razorpay = require("razorpay");

let cachedClient = null;

function getRazorpayClient() {
  if (cachedClient) return cachedClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables."
    );
  }

  cachedClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return cachedClient;
}

module.exports = { getRazorpayClient };
