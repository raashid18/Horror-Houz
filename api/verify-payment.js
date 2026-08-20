const crypto = require("crypto");
const { getSupabaseAdmin } = require("../lib/supabaseAdmin");
const { getRazorpayClient } = require("../lib/razorpay");
const { generateUniqueTicketNumber, generateQrToken } = require("../lib/ticketNumber");

const TICKET_FIELDS =
  "ticket_number, customer_name, quantity, amount, payment_method, ticket_status, created_at";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment verification fields." });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("verify-payment: RAZORPAY_KEY_SECRET is not set");
    return res.status(500).json({ error: "Payment verification is not configured." });
  }

  // ---------------------------------------------------------
  // 1. Verify the signature. This is the ONLY thing that proves the
  //    payment actually happened — the frontend saying "success" proves
  //    nothing on its own.
  // ---------------------------------------------------------
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSignature);
  const givenBuf = Buffer.from(String(razorpay_signature));

  const isValidSignature =
    expectedBuf.length === givenBuf.length &&
    crypto.timingSafeEqual(expectedBuf, givenBuf);

  if (!isValidSignature) {
    return res.status(400).json({ error: "Payment could not be verified." });
  }

  const supabase = getSupabaseAdmin();

  try {
    // ---------------------------------------------------------
    // 2. Duplicate protection. If this exact payment already produced a
    //    ticket (page refresh, resent verification call, double-click),
    //    return the existing ticket instead of creating a second one.
    // ---------------------------------------------------------
    const { data: existing, error: existingError } = await supabase
      .from("tickets")
      .select(TICKET_FIELDS)
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return res.status(200).json(existing);
    }

    // ---------------------------------------------------------
    // 3. Pull booking details back from Razorpay's order notes — not
    //    from the request body — now that we know order_id/payment_id
    //    are genuinely linked by a valid signature.
    // ---------------------------------------------------------
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.fetch(razorpay_order_id);

    const customerName = order.notes && order.notes.customer_name;
    const customerMobile = order.notes && order.notes.customer_mobile;
    const quantity = Number(order.notes && order.notes.quantity);
    const amount = order.amount / 100; // paise -> rupees, matches the CASH flow's units

    if (!customerName || !customerMobile || !quantity) {
      console.error("verify-payment: order notes missing expected fields for", order.id);
      return res.status(500).json({ error: "Could not read booking details for this payment." });
    }

    const ticketNumber = await generateUniqueTicketNumber(supabase);
    const qrToken = generateQrToken();

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        ticket_number: ticketNumber,
        customer_name: customerName,
        customer_mobile: customerMobile,
        quantity,
        amount,
        payment_method: "ONLINE",
        payment_status: "PAID",
        ticket_status: "CONFIRMED",
        razorpay_order_id,
        razorpay_payment_id,
        qr_token: qrToken,
      })
      .select(TICKET_FIELDS)
      .single();

    if (error) {
      // Unique violation on razorpay_payment_id: a concurrent request
      // (e.g. a second verify call that raced this one) already won.
      if (error.code === "23505") {
        const { data: raceWinner } = await supabase
          .from("tickets")
          .select(TICKET_FIELDS)
          .eq("razorpay_payment_id", razorpay_payment_id)
          .maybeSingle();
        if (raceWinner) return res.status(200).json(raceWinner);
      }
      console.error("verify-payment insert error:", error.message);
      return res.status(500).json({ error: "Payment verified but ticket creation failed. Contact support." });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error("verify-payment error:", err.message);
    return res.status(500).json({ error: "Something went wrong verifying your payment." });
  }
};
