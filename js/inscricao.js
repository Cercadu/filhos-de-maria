(function () {
  const list = document.getElementById("forms-list");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function renderForm(form) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="card-body">
        <h3>📝 ${escapeHtml(form.title)}</h3>
        ${form.description ? `<p class="excerpt">${escapeHtml(form.description)}</p>` : ""}
        <a class="btn btn-gold" href="${form.url}" target="_blank" rel="noopener">Preencher formulário ↗</a>
      </div>
    `;
    return el;
  }

  async function loadForms() {
    try {
      const { forms } = await window.AfimApi.getForms();
      list.innerHTML = "";
      if (!forms.length) {
        list.innerHTML = `<div class="empty-state">Nenhum formulário disponível no momento.<br /><span class="small-muted">Entre em contato com a equipe da AFIM para se inscrever.</span></div>`;
        return;
      }
      forms.forEach((form) => list.appendChild(renderForm(form)));
    } catch {
      list.innerHTML = `<div class="empty-state">Não foi possível carregar os formulários agora.</div>`;
    }
  }

  loadForms();
})();
