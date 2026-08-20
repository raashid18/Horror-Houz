const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export class CheckoutCancelledError extends Error {
  constructor() {
    super("Payment was cancelled.");
    this.name = "CheckoutCancelledError";
  }
}

let checkoutScriptPromise = null;

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment gateway. Check your connection."));
    document.head.appendChild(script);
  });

  return checkoutScriptPromise;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = null;
  try { data = await response.json(); } catch (_) { /* non-JSON error page */ }

  if (!response.ok) {
    throw new Error((data && data.error) || "Something went wrong. Please try again.");
  }
  return data;
}

export function createOrder({ customer_name, customer_mobile, quantity }) {
  return postJson("/api/create-order", { customer_name, customer_mobile, quantity });
}

export function verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  return postJson("/api/verify-payment", { razorpay_order_id, razorpay_payment_id, razorpay_signature });
}

/**
 * Opens Razorpay Checkout for an already-created order and resolves
 * with the verified ticket record, or rejects with an Error.
 * A CheckoutCancelledError means the customer just closed the widget —
 * callers should treat that as a quiet return to the payment step,
 * not a scary error message.
 */
export async function payWithRazorpay({ order, customerName, customerMobile, onVerifying }) {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "Horror Houz",
      description: "Entry Ticket",
      prefill: {
        name: customerName,
        contact: customerMobile,
      },
      theme: { color: "#B30000" },
      handler: async function (response) {
        try {
          if (onVerifying) onVerifying();
          const ticket = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          resolve(ticket);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: function () {
          reject(new CheckoutCancelledError());
        },
      },
    };

    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", function (response) {
      reject(new Error(
        (response && response.error && response.error.description) ||
        "Your payment could not be completed."
      ));
    });

    rzp.open();
  });
}
