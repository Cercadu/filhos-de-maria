(function () {
  const form = document.getElementById("prayer-form");
  const list = document.getElementById("prayers-list");
  const PRAYED_KEY = "afim_prayed_ids";

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

  function renderPrayer(p) {
    const already = prayedIds().includes(p.id);
    const el = document.createElement("div");
    el.className = "prayer-card";
    el.innerHTML = `
      <div class="name">${escapeHtml(p.name || "Um irmão(ã) em oração")}</div>
      <div class="msg">${escapeHtml(p.message)}</div>
      <div class="meta">
        <span class="date">${formatDate(p.createdAt)}</span>
        <button class="pray-btn ${already ? "done" : ""}" data-id="${p.id}">🙏 Orei por isso (${p.prayCount || 0})</button>
      </div>
    `;
    const btn = el.querySelector(".pray-btn");
    btn.addEventListener("click", async () => {
      if (prayedIds().includes(p.id)) return;
      btn.disabled = true;
      try {
        const { prayCount } = await window.AfimApi.prayFor(p.id);
        btn.textContent = `🙏 Orei por isso (${prayCount})`;
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
        list.innerHTML = `<div class="empty-state">Nenhum pedido público no momento. Seja o primeiro a compartilhar! 🕊️</div>`;
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

  loadPrayers();
})();
