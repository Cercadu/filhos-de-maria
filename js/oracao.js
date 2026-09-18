(function () {
  const form = document.getElementById("prayer-form");
  const list = document.getElementById("prayers-list");
  const testimonialForm = document.getElementById("testimonial-form");
  const testimonialList = document.getElementById("testimonials-list");
  const candleForm = document.getElementById("candle-form");
  const candlesGrid = document.getElementById("candles-grid");
  const PRAYED_KEY = "afim_prayed_ids";

  // ---------- Sub-abas Velas / Pedidos / Testemunhos ----------
  document.getElementById("oracao-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-tab");
    if (!btn) return;
    document.querySelectorAll("#oracao-tabs .admin-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const panel = btn.dataset.panel;
    document.getElementById("panel-velas").style.display = panel === "velas" ? "block" : "none";
    document.getElementById("panel-pedidos").style.display = panel === "pedidos" ? "block" : "none";
    document.getElementById("panel-testemunhos").style.display = panel === "testemunhos" ? "block" : "none";
  });

  function prayedIds() {
    try { return JSON.parse(localStorage.getItem(PRAYED_KEY) || "[]"); } catch { return []; }
  }
  function markPrayed(id) {
    const ids = prayedIds();
    ids.push(id);
    localStorage.setItem(PRAYED_KEY, JSON.stringify(ids));
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    if (hours < 1) return "há poucos minutos";
    if (hours === 1) return "há 1 hora";
    return `há ${hours} horas`;
  }

  // ---------- Velas ----------
  function renderCandle(c) {
    const el = document.createElement("div");
    el.className = "candle-chip";
    el.innerHTML = `
      <span class="candle-icon">🕯️</span>
      <span class="candle-name">${escapeHtml(c.name || "Anônimo")}</span>
      <span class="candle-time">${timeAgo(c.createdAt)}</span>
    `;
    return el;
  }

  async function loadCandles() {
    try {
      const { candles } = await window.AfimApi.getCandles();
      candlesGrid.innerHTML = "";
      if (!candles.length) {
        candlesGrid.innerHTML = `<div class="empty-state">Nenhuma vela acesa nas últimas 24 horas. Acenda a primeira! 🕯️</div>`;
        return;
      }
      candles.forEach((c) => candlesGrid.appendChild(renderCandle(c)));
    } catch {
      candlesGrid.innerHTML = `<div class="empty-state">Não foi possível carregar o mural agora.</div>`;
    }
  }

  candleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = candleForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Acendendo...";
    try {
      await window.AfimApi.lightCandle(document.getElementById("c-name").value.trim());
      candleForm.reset();
      window.afimToast("Vela acesa! 🕯️");
      loadCandles();
    } catch {
      window.afimToast("Não foi possível acender agora. Tente novamente.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "🕯️ Acender uma vela";
    }
  });

  // ---------- Mural de pedidos de oração ----------
  function renderPrayer(p) {
    const already = prayedIds().includes(p.id);
    const el = document.createElement("div");
    el.className = "prayer-card";
    el.innerHTML = `
      <div class="name">${escapeHtml(p.name || "Um irmão(ã) em oração")}</div>
      <div class="msg">${escapeHtml(p.message)}</div>
      <div class="meta">
        <span class="date">${formatDate(p.createdAt)}</span>
        <button class="pray-btn ${already ? "done" : ""}" data-id="${p.id}">🙏 Em Oração (${p.prayCount || 0})</button>
      </div>
    `;
    const btn = el.querySelector(".pray-btn");
    btn.addEventListener("click", async () => {
      if (prayedIds().includes(p.id)) return;
      btn.disabled = true;
      try {
        const { prayCount } = await window.AfimApi.prayFor(p.id);
        btn.textContent = `🙏 Em Oração (${prayCount})`;
        btn.classList.add("done");
        markPrayed(p.id);
      } catch {
        btn.disabled = false;
      }
    });
    return el;
  }

  async function loadPrayers() {
    try {
      const { prayers } = await window.AfimApi.getPrayers();
      list.innerHTML = "";
      if (!prayers.length) {
        list.innerHTML = `<div class="empty-state">Nenhum pedido público nos últimos 7 dias. Seja o primeiro a compartilhar! 🕊️</div>`;
        return;
      }
      prayers.forEach((p) => list.appendChild(renderPrayer(p)));
    } catch {
      list.innerHTML = `<div class="empty-state">Não foi possível carregar o mural agora.</div>`;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    const message = document.getElementById("p-message").value.trim();
    if (!message) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      await window.AfimApi.submitPrayer({
        name: document.getElementById("p-name").value.trim(),
        message,
        contact: document.getElementById("p-contact").value.trim(),
        isPublic: document.getElementById("p-public").checked,
      });
      form.reset();
      document.getElementById("p-public").checked = true;
      window.afimToast("Pedido enviado! Nossa comunidade vai orar por você. 🙏");
    } catch (err) {
      window.afimToast("Não foi possível enviar agora. Tente novamente.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar pedido de oração 🙏";
    }
  });

  // ---------- Mural de testemunhos ----------
  function renderTestimonial(t) {
    const el = document.createElement("div");
    el.className = "prayer-card testimonial-card";
    el.innerHTML = `
      <div class="name">✨ ${escapeHtml(t.name)}</div>
      <div class="msg">${escapeHtml(t.message)}</div>
      <div class="meta"><span class="date">${formatDate(t.createdAt)}</span></div>
    `;
    return el;
  }

  async function loadTestimonials() {
    try {
      const { testimonials } = await window.AfimApi.getTestimonials();
      testimonialList.innerHTML = "";
      if (!testimonials.length) {
        testimonialList.innerHTML = `<div class="empty-state">Nenhum testemunho publicado ainda. Compartilhe o seu! ✨</div>`;
        return;
      }
      testimonials.forEach((t) => testimonialList.appendChild(renderTestimonial(t)));
    } catch {
      testimonialList.innerHTML = `<div class="empty-state">Não foi possível carregar os testemunhos agora.</div>`;
    }
  }

  testimonialForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = testimonialForm.querySelector("button[type=submit]");
    const message = document.getElementById("t-message").value.trim();
    if (!message) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      await window.AfimApi.submitTestimonial({
        name: document.getElementById("t-name").value.trim(),
        message,
      });
      testimonialForm.reset();
      window.afimToast("Testemunho enviado! Obrigado por compartilhar. ✨");
    } catch (err) {
      window.afimToast("Não foi possível enviar agora. Tente novamente.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "✨ Compartilhar testemunho";
    }
  });

  loadCandles();
  loadPrayers();
  loadTestimonials();
})();
