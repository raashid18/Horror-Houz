const { validateBookingInput } = require("../lib/validate");
const { getRazorpayClient } = require("../lib/razorpay");

const TICKET_PRICE = Number(process.env.TICKET_PRICE || 80);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const check = validateBookingInput(req.body || {});
  if (!check.valid) {
    return res.status(400).json({ error: check.error });
  }

  const { customer_name, customer_mobile, quantity } = check.data;

  // Amount is ALWAYS derived from TICKET_PRICE server-side.
  // The frontend never gets to say what the price is.
  const amountPaise = TICKET_PRICE * quantity * 100;

  try {
    const razorpay = getRazorpayClient();

    // Booking details ride along in the order's own notes. verify-payment
    // reads them back from Razorpay (not from the browser) once the
    // signature is confirmed, so a tampered resend can't change who or
    // what a paid order is attached to.
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `hh_${Date.now()}`,
      notes: {
        customer_name,
        customer_mobile,
        quantity: String(quantity),
      },
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("create-order error:", err.message);
    return res.status(500).json({ error: "Could not start payment. Please try again." });
  }
};
