const { getSupabaseAdmin } = require("../../../lib/supabaseAdmin");
const { generateTicketQrPng } = require("../../../lib/qr");
const { buildTicketPdf } = require("../../../lib/pdfTicket");
const { buildVerifyUrl } = require("../../../lib/verifyUrl");

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

    // qr_token is selected here (unlike the plain GET /api/ticket/{n}
    // endpoint) because it's needed to build the QR itself. It never
    // appears as visible text in the PDF or the JSON response — only
    // encoded inside the QR image, which is the whole point of it.
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("ticket_number, customer_name, quantity, amount, payment_method, ticket_status, qr_token, created_at")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();

    if (error) {
      console.error("pdf lookup error:", error.message);
      return res.status(500).json({ error: "Could not prepare your ticket." });
    }
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const verifyUrl = buildVerifyUrl(req, ticket.qr_token);
    const qrPngBuffer = await generateTicketQrPng(verifyUrl);

    const pdfBuffer = await buildTicketPdf({
      ticketNumber: ticket.ticket_number,
      customerName: ticket.customer_name,
      quantity: ticket.quantity,
      amount: ticket.amount,
      paymentMethod: ticket.payment_method,
      ticketStatus: ticket.ticket_status,
      createdAt: ticket.created_at,
      qrPngBuffer,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Horror-Houz-${ticket.ticket_number}.pdf"`
    );
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("pdf generation error:", err.message);
    return res.status(500).json({ error: "Could not prepare your ticket. Please try again." });
  }
};
