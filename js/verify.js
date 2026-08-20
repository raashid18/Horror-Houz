(async () => {
  "use strict";

  const loadingEl = document.getElementById("verify-loading");
  const resultEl = document.getElementById("verify-result");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function show(html) {
    loadingEl.hidden = true;
    resultEl.hidden = false;
    resultEl.innerHTML = html;
  }

  function renderValid(ticket) {
    show(`
      <p class="verify-icon verify-icon--valid" aria-hidden="true">&check;</p>
      <h1 class="verify-title verify-title--valid">VALID TICKET</h1>
      <p class="verify-brand">HORROR HOUZ</p>
      <div class="verify-detail">
        <span>Ticket</span>
        <strong>${escapeHtml(ticket.ticket_number)}</strong>
      </div>
      <div class="verify-detail">
        <span>Status</span>
        <strong>${escapeHtml(ticket.ticket_status)}</strong>
      </div>
    `);
  }

  function renderInvalid() {
    show(`
      <p class="verify-icon verify-icon--invalid" aria-hidden="true">&cross;</p>
      <h1 class="verify-title verify-title--invalid">INVALID TICKET</h1>
      <p class="verify-message">This ticket could not be found.</p>
    `);
  }

  function renderNetworkError() {
    show(`
      <p class="verify-icon verify-icon--invalid" aria-hidden="true">&cross;</p>
      <h1 class="verify-title verify-title--invalid">THE CONNECTION DISAPPEARED&hellip;</h1>
      <p class="verify-message">Please check your internet connection and try again.</p>
    `);
  }

  // The rewrite in vercel.json (/verify/:token -> /verify.html) keeps the
  // browser's URL as /verify/<token>, so the token is read straight from
  // the path rather than a query string.
  function getTokenFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || "");
  }

  const token = getTokenFromPath();

  if (!token) {
    renderInvalid();
    return;
  }

  try {
    const response = await fetch(`/api/verify/${encodeURIComponent(token)}`);

    if (!response.ok) {
      renderInvalid();
      return;
    }

    const data = await response.json();
    if (data.valid) {
      renderValid(data);
    } else {
      renderInvalid();
    }
  } catch (err) {
    if (err instanceof TypeError) {
      renderNetworkError();
    } else {
      renderInvalid();
    }
  }
})();