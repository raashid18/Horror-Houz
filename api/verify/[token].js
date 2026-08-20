const { getSupabaseAdmin } = require("../../lib/supabaseAdmin");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ valid: false, error: "Method not allowed" });
  }

  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ valid: false, error: "token is required" });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Deliberately minimal response: anyone who scans a QR code reaches
    // this endpoint, including a stranger who finds a dropped or discarded
    // printed ticket. No customer name, mobile, amount, or payment method —
    // just enough to confirm the ticket is real.
    const { data, error } = await supabase
      .from("tickets")
      .select("ticket_number, ticket_status")
      .eq("qr_token", token)
      .maybeSingle();

    if (error) {
      console.error("verify lookup error:", error.message);
      return res.status(500).json({ valid: false, error: "Could not verify ticket." });
    }

    if (!data) {
      return res.status(404).json({ valid: false });
    }

    return res.status(200).json({
      valid: true,
      ticket_number: data.ticket_number,
      ticket_status: data.ticket_status,
    });
  } catch (err) {
    console.error("verify error:", err.message);
    return res.status(500).json({ valid: false, error: "Could not verify ticket." });
  }
};