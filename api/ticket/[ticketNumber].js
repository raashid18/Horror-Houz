const { getSupabaseAdmin } = require("../../lib/supabaseAdmin");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ticketNumber } = req.query;
  if (!ticketNumber || typeof ticketNumber !== "string") {
    return res.status(400).json({ error: "ticket_number is required" });
  }

  try {
    const supabase = getSupabaseAdmin();

    // customer_mobile is intentionally excluded — this endpoint can be
    // reached by anyone with a ticket number, so we don't leak PII here.
    const { data, error } = await supabase
      .from("tickets")
      .select("ticket_number, customer_name, quantity, amount, payment_method, ticket_status, created_at")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();

    if (error) {
      console.error("ticket lookup error:", error.message);
      return res.status(500).json({ error: "Could not look up ticket." });
    }

    if (!data) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("ticket lookup error:", err.message);
    return res.status(500).json({ error: "Something went wrong." });
  }
};
