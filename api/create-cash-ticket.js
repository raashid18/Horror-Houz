const { getSupabaseAdmin } = require("../lib/supabaseAdmin");
const { generateUniqueTicketNumber, generateQrToken } = require("../lib/ticketNumber");
const { validateBookingInput } = require("../lib/validate");

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
  const amount = TICKET_PRICE * quantity;

  try {
    const supabase = getSupabaseAdmin();
    const ticketNumber = await generateUniqueTicketNumber(supabase);
    const qrToken = generateQrToken();

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        ticket_number: ticketNumber,
        customer_name,
        customer_mobile,
        quantity,
        amount,
        payment_method: "CASH",
        payment_status: "CASH",
        ticket_status: "CONFIRMED",
        qr_token: qrToken,
      })
      .select("ticket_number, customer_name, quantity, amount, payment_method, ticket_status, created_at")
      .single();

    if (error) {
      console.error("create-cash-ticket insert error:", error.message);
      return res.status(500).json({ error: "Could not create your ticket. Please try again." });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error("create-cash-ticket error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
