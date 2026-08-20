const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const MAX_QUANTITY = 10;

/**
 * Validates raw booking input from the frontend.
 * Returns { valid: true, data } or { valid: false, error }.
 * Never trust these values were already validated client-side.
 */
function validateBookingInput({ customer_name, customer_mobile, quantity }) {
  const name = typeof customer_name === "string" ? customer_name.trim() : "";
  const mobile = typeof customer_mobile === "string" ? customer_mobile.trim() : "";
  const qty = Number(quantity);

  if (!name) {
    return { valid: false, error: "customer_name is required." };
  }
  if (name.length > 100) {
    return { valid: false, error: "customer_name is too long." };
  }
  if (!INDIAN_MOBILE_REGEX.test(mobile)) {
    return { valid: false, error: "A valid 10-digit Indian mobile number is required." };
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
    return { valid: false, error: `quantity must be a whole number between 1 and ${MAX_QUANTITY}.` };
  }

  return { valid: true, data: { customer_name: name, customer_mobile: mobile, quantity: qty } };
}

module.exports = { validateBookingInput, MAX_QUANTITY, INDIAN_MOBILE_REGEX };
