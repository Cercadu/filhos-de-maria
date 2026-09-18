(function () {
  const content = document.getElementById("liturgy-content");
  const weekdayEl = document.getElementById("date-weekday");
  const fullDateEl = document.getElementById("date-full");
  const prevBtn = document.getElementById("prev-day");
  const nextBtn = document.getElementById("next-day");
  const todayBtn = document.getElementById("today-btn");
  const dateLabelBtn = document.getElementById("date-label-btn");
  const datePicker = document.getElementById("date-picker");

  const COLOR_MAP = {
    Verde: "#2f7a4f",
    Roxo: "#5c3a8e",
    Branco: "#f4f1e8",
    Vermelho: "#b3432b",
    Rosa: "#e0a3b8",
    Dourado: "#c99c51",
  };

  let currentDate = new Date();

  function pad(n) { return String(n).padStart(2, "0"); }
  function apiKey(date) { return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}`; }
  function cacheKey(date) { return `afim_liturgia_${date.getFullYear()}-${apiKey(date)}`; }

  function updateDateLabels(date) {
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
    const full = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    weekdayEl.textContent = weekday;
    fullDateEl.textContent = full;
  }

  function readingBlock(cls, refIcon, title, ref, bodyHtml, openByDefault) {
    return `
      <details class="reading ${cls}" ${openByDefault ? "open" : ""}>
        <summary>
          <span>${refIcon} ${title}</span>
          <span class="ref">${ref || ""}</span>
        </summary>
        <div class="reading-body">${bodyHtml}</div>
      </details>
    `;
  }

  function sectionLabel(text) {
    return `<div class="reading-section-label">${text}</div>`;
  }

  function renderLiturgy(data) {
    const color = data.cor || "Verde";
    const colorHex = COLOR_MAP[color] || "#c99c51";

    let html = `
      <div class="liturgy-badge">
        <span class="color-dot" style="background:${colorHex}"></span>
        Cor litúrgica: ${color}
      </div>
      <h3 class="liturgy-title">${escapeHtml(data.liturgia || "")}</h3>
    `;

    const antifonas = data.antifonas || {};
    if (antifonas.entrada || antifonas.comunhao) {
      html += `<div class="antiphons-box">`;
      if (antifonas.entrada) {
        html += `<p><span class="antiphon-label">Antífona de Entrada</span>${escapeHtml(antifonas.entrada)}</p>`;
      }
      if (antifonas.comunhao) {
        html += `<p><span class="antiphon-label">Antífona da Comunhão</span>${escapeHtml(antifonas.comunhao)}</p>`;
      }
      html += `</div>`;
    }

    const leituras = data.leituras || {};
    const hasLeituras = (leituras.primeiraLeitura || []).length || (leituras.salmo || []).length ||
      (leituras.segundaLeitura || []).length || (leituras.evangelho || []).length;

    if (hasLeituras) {
      html += sectionLabel("📖 Leituras do Dia");

      (leituras.primeiraLeitura || []).forEach((l) => {
        html += readingBlock("primeira", "📜", "Primeira Leitura", l.referencia, escapeHtml(l.texto));
      });

      (leituras.salmo || []).forEach((s) => {
        const refrao = s.refrao ? `<div class="reading-refrao">${escapeHtml(s.refrao)}</div>` : "";
        html += readingBlock("salmo", "🎵", "Salmo Responsorial", s.referencia, refrao + escapeHtml(s.texto));
      });

      (leituras.segundaLeitura || []).forEach((l) => {
        html += readingBlock("segunda", "📜", "Segunda Leitura", l.referencia, escapeHtml(l.texto));
      });

      (leituras.evangelho || []).forEach((e) => {
        html += readingBlock("evangelho", "✝️", "Evangelho", e.referencia, escapeHtml(e.texto), true);
      });
    }

    const oracoes = data.oracoes || {};
    if (oracoes.coleta || oracoes.oferendas || oracoes.comunhao) {
      html += sectionLabel("🙏 Orações da Missa");
      html += `<div class="prayer-texts">`;
      if (oracoes.coleta) html += readingBlock("oracao", "🙏", "Oração da Coleta", "", escapeHtml(oracoes.coleta));
      if (oracoes.oferendas) html += readingBlock("oracao", "🙏", "Oração sobre as Oferendas", "", escapeHtml(oracoes.oferendas));
      if (oracoes.comunhao) html += readingBlock("oracao", "🙏", "Oração após a Comunhão", "", escapeHtml(oracoes.comunhao));
      html += `</div>`;
    }

    content.innerHTML = html;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  async function loadLiturgy(date) {
    content.innerHTML = `<div class="spinner"></div>`;
    updateDateLabels(date);

    const ck = cacheKey(date);
    const cached = localStorage.getItem(ck);

    try {
      const res = await fetch(`https://liturgia.up.railway.app/v2/${apiKey(date)}`);
      if (!res.ok) throw new Error("erro api");
      const data = await res.json();
      localStorage.setItem(ck, JSON.stringify(data));
      renderLiturgy(data);
    } catch (err) {
      if (cached) {
        renderLiturgy(JSON.parse(cached));
        window.afimToast && window.afimToast("Mostrando última liturgia salva (sem conexão)");
      } else {
        content.innerHTML = `<div class="empty-state">Não foi possível carregar a liturgia agora. Verifique sua conexão e tente novamente.</div>`;
      }
    }
  }

  function isoDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  prevBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 1);
    loadLiturgy(currentDate);
  });
  nextBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 1);
    loadLiturgy(currentDate);
  });
  todayBtn.addEventListener("click", () => {
    currentDate = new Date();
    loadLiturgy(currentDate);
  });
  dateLabelBtn.addEventListener("click", () => {
    datePicker.value = isoDate(currentDate);
    if (typeof datePicker.showPicker === "function") {
      datePicker.showPicker();
    } else {
      datePicker.focus();
      datePicker.click();
    }
  });
  datePicker.addEventListener("change", () => {
    if (!datePicker.value) return;
    const [y, m, d] = datePicker.value.split("-").map(Number);
    currentDate = new Date(y, m - 1, d);
    loadLiturgy(currentDate);
  });

  loadLiturgy(currentDate);
})();
