import { createOrder, payWithRazorpay, CheckoutCancelledError } from "./payment.js";

(() => {
  "use strict";

  /* ---------------------------------------------------------
     Config
     --------------------------------------------------------- */
  const TICKET_PRICE = 80; // ₹ — mirrors backend TICKET_PRICE, display only.
  const MAX_QTY = 10;

  const RULES = [
    "Enter at your own risk.",
    "Follow staff instructions.",
    "No outside food or drinks.",
    "No photography inside the attraction.",
    "Children should be accompanied by adults."
  ];

  const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

  /* ---------------------------------------------------------
     State
     --------------------------------------------------------- */
  let quantity = 1;

  /* ---------------------------------------------------------
     Elements
     --------------------------------------------------------- */
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");

  const qtyValueEl = document.getElementById("qty-value");
  const ticketTotalEl = document.getElementById("ticket-total");
  const qtyMinusBtn = document.getElementById("qty-minus");
  const qtyPlusBtn = document.getElementById("qty-plus");

  const modalQtyValueEl = document.getElementById("modal-qty-value");
  const modalQtyMinusBtn = document.getElementById("modal-qty-minus");
  const modalQtyPlusBtn = document.getElementById("modal-qty-plus");
  const modalTotalEl = document.getElementById("modal-total");
  const paymentTotalEl = document.getElementById("payment-total");

  const rulesList = document.getElementById("rules-list");

  const modal = document.getElementById("booking-modal");
  const openBookingBtns = document.querySelectorAll("[data-open-booking]");
  const closeBookingBtns = document.querySelectorAll("[data-close-booking]");

  const stepDetails = document.getElementById("step-details");
  const stepPayment = document.getElementById("step-payment");
  const stepLoading = document.getElementById("step-loading");
  const stepSuccess = document.getElementById("step-success");
  const loadingText = document.getElementById("loading-text");

  const bookingForm = document.getElementById("booking-form");
  const inputName = document.getElementById("input-name");
  const inputMobile = document.getElementById("input-mobile");
  const errorName = document.getElementById("error-name");
  const errorMobile = document.getElementById("error-mobile");

  const btnBackDetails = document.getElementById("btn-back-details");
  const btnPay = document.getElementById("btn-pay");
  const btnDownload = document.getElementById("btn-download");
  const paymentError = document.getElementById("payment-error");

  const resultTicketNumber = document.getElementById("result-ticket-number");
  const resultAmount = document.getElementById("result-amount");
  const successDemoNote = document.getElementById("success-demo-note");
  const successError = document.getElementById("success-error");

  let lastFocusedEl = null;

  /* ---------------------------------------------------------
     Rules list (editable in one place, per spec)
     --------------------------------------------------------- */
  function renderRules() {
    rulesList.innerHTML = "";
    RULES.forEach((rule) => {
      const li = document.createElement("li");
      li.textContent = rule;
      rulesList.appendChild(li);
    });
  }

  /* ---------------------------------------------------------
     Nav toggle
     --------------------------------------------------------- */
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------------------------------------------------------
     Quantity (page ticket card + modal, kept in sync)
     --------------------------------------------------------- */
  function formatRupees(amount) {
    return "\u20B9" + amount.toLocaleString("en-IN");
  }

  function updateQuantityDisplays() {
    const total = TICKET_PRICE * quantity;
    qtyValueEl.textContent = String(quantity);
    modalQtyValueEl.textContent = String(quantity);
    ticketTotalEl.textContent = formatRupees(total);
    modalTotalEl.textContent = formatRupees(total);
    paymentTotalEl.textContent = formatRupees(total);

    qtyMinusBtn.disabled = quantity <= 1;
    modalQtyMinusBtn.disabled = quantity <= 1;
    qtyPlusBtn.disabled = quantity >= MAX_QTY;
    modalQtyPlusBtn.disabled = quantity >= MAX_QTY;
  }

  function changeQuantity(delta) {
    const next = quantity + delta;
    if (next < 1 || next > MAX_QTY) return;
    quantity = next;
    updateQuantityDisplays();
  }

  qtyMinusBtn.addEventListener("click", () => changeQuantity(-1));
  qtyPlusBtn.addEventListener("click", () => changeQuantity(1));
  modalQtyMinusBtn.addEventListener("click", () => changeQuantity(-1));
  modalQtyPlusBtn.addEventListener("click", () => changeQuantity(1));

  /* ---------------------------------------------------------
     Modal open / close
     --------------------------------------------------------- */
  function showStep(step) {
    [stepDetails, stepPayment, stepLoading, stepSuccess].forEach((el) => {
      el.hidden = el !== step;
    });
  }

  function openModal() {
    lastFocusedEl = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    showStep(stepDetails);
    resetForm();
    inputName.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  openBookingBtns.forEach((btn) => btn.addEventListener("click", openModal));
  closeBookingBtns.forEach((btn) => btn.addEventListener("click", closeModal));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // Basic focus trap within the modal panel.
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const list = Array.from(focusable).filter((el) => el.offsetParent !== null);
    const first = list[0];
    const last = list[list.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ---------------------------------------------------------
     Step 1 → Step 2: validation
     --------------------------------------------------------- */
  function resetForm() {
    bookingForm.reset();
    errorName.textContent = "";
    errorMobile.textContent = "";
    inputName.removeAttribute("aria-invalid");
    inputMobile.removeAttribute("aria-invalid");
  }

  function validateForm() {
    let valid = true;

    const name = inputName.value.trim();
    if (!name) {
      errorName.textContent = "Please enter your name.";
      inputName.setAttribute("aria-invalid", "true");
      valid = false;
    } else {
      errorName.textContent = "";
      inputName.removeAttribute("aria-invalid");
    }

    const mobile = inputMobile.value.trim();
    if (!INDIAN_MOBILE_REGEX.test(mobile)) {
      errorMobile.textContent = "Enter a valid 10-digit mobile number.";
      inputMobile.setAttribute("aria-invalid", "true");
      valid = false;
    } else {
      errorMobile.textContent = "";
      inputMobile.removeAttribute("aria-invalid");
    }

    return valid;
  }

  inputMobile.addEventListener("input", () => {
    inputMobile.value = inputMobile.value.replace(/\D/g, "").slice(0, 10);
  });

  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    showStep(stepPayment);
  });

  btnBackDetails.addEventListener("click", () => showStep(stepDetails));

  /* ---------------------------------------------------------
     Step 2 → Step 3 → Step 4: payment
     CASH calls /api/create-cash-ticket directly.
     ONLINE creates a Razorpay order, opens Checkout, and verifies
     the signed payment server-side before the ticket is created.
     --------------------------------------------------------- */
  function showPaymentError(message) {
    showStep(stepPayment);
    paymentError.hidden = false;
    paymentError.textContent = message;
  }

  async function handleCashBooking() {
    showStep(stepLoading);
    loadingText.textContent = "Confirming Booking\u2026";

    const payload = {
      customer_name: inputName.value.trim(),
      customer_mobile: inputMobile.value.trim(),
      quantity,
    };

    try {
      const response = await fetch("/api/create-cash-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = null;
      try { data = await response.json(); } catch (_) { /* non-JSON error page */ }

      if (!response.ok) {
        throw new Error((data && data.error) || "Could not create your ticket.");
      }

      resultTicketNumber.textContent = data.ticket_number;
      resultAmount.textContent = formatRupees(data.amount);
      successDemoNote.textContent = "Keep this ticket handy for entry.";
      showStep(stepSuccess);
    } catch (err) {
      const isNetworkError = err instanceof TypeError; // fetch throws TypeError on network failure
      showPaymentError(
        isNetworkError
          ? "THE CONNECTION DISAPPEARED\u2026 Please check your internet and try again."
          : err.message
      );
    }
  }

  async function handleOnlineBooking() {
    const name = inputName.value.trim();
    const mobile = inputMobile.value.trim();

    showStep(stepLoading);
    loadingText.textContent = "Preparing Payment\u2026";

    try {
      const order = await createOrder({ customer_name: name, customer_mobile: mobile, quantity });

      const ticket = await payWithRazorpay({
        order,
        customerName: name,
        customerMobile: mobile,
        onVerifying: () => { loadingText.textContent = "Verifying Payment\u2026"; },
      });

      resultTicketNumber.textContent = ticket.ticket_number;
      resultAmount.textContent = formatRupees(ticket.amount);
      successDemoNote.textContent = "Keep this ticket handy for entry.";
      showStep(stepSuccess);
    } catch (err) {
      if (err instanceof CheckoutCancelledError) {
        // Quiet return — a cancelled checkout isn't an error worth alarming over.
        showStep(stepPayment);
        return;
      }
      const isNetworkError = err instanceof TypeError;
      showPaymentError(
        isNetworkError
          ? "THE CONNECTION DISAPPEARED\u2026 Please check your internet and try again."
          : `THE DARKNESS INTERRUPTED\u2026 ${err.message}`
      );
    }
  }

  function getSelectedPaymentMethod() {
    // The Online/Cash radios live in the payment step, which is a sibling
    // of <form id="booking-form">, not inside it — so bookingForm.elements
    // can't see them. Query the DOM directly instead.
    const checked = document.querySelector('input[name="payment_method"]:checked');
    return checked ? checked.value : "ONLINE";
  }

  btnPay.addEventListener("click", () => {
    paymentError.hidden = true;
    paymentError.textContent = "";

    const method = getSelectedPaymentMethod();
    if (method === "CASH") {
      handleCashBooking();
    } else {
      handleOnlineBooking();
    }
  });

  btnDownload.addEventListener("click", async () => {
    const ticketNumber = resultTicketNumber.textContent.trim();

    successError.hidden = true;
    successError.textContent = "";

    const originalLabel = btnDownload.textContent;
    btnDownload.disabled = true;
    btnDownload.textContent = "Preparing Your Ticket\u2026";

    try {
      const response = await fetch(`/api/ticket/${encodeURIComponent(ticketNumber)}/pdf`);

      if (!response.ok) {
        let data = null;
        try { data = await response.json(); } catch (_) { /* not JSON */ }
        throw new Error((data && data.error) || "Could not prepare your ticket.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Horror-Houz-${ticketNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const isNetworkError = err instanceof TypeError;
      successError.hidden = false;
      successError.textContent = isNetworkError
        ? "THE CONNECTION DISAPPEARED\u2026 Please check your internet and try again."
        : err.message;
    } finally {
      btnDownload.disabled = false;
      btnDownload.textContent = originalLabel;
    }
  });

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  renderRules();
  updateQuantityDisplays();
})();