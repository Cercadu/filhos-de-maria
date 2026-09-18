(function () {
  const content = document.getElementById("liturgy-content");
  const weekdayEl = document.getElementById("date-weekday");
  const fullDateEl = document.getElementById("date-full");
  const prevBtn = document.getElementById("prev-day");
  const nextBtn = document.getElementById("next-day");
  const openCalendarBtn = document.getElementById("open-calendar-btn");
  const dateLabelBtn = document.getElementById("date-label-btn");
  const calendarPopover = document.getElementById("calendar-popover");
  const calMonthLabel = document.getElementById("cal-month-label");
  const calDaysEl = document.getElementById("calendar-days");
  const calPrevMonthBtn = document.getElementById("cal-prev-month");
  const calNextMonthBtn = document.getElementById("cal-next-month");
  const calTodayBtn = document.getElementById("cal-today-btn");

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

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  // ---------- Calendário próprio (popover) ----------
  let calendarViewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  function renderCalendar() {
    const monthLabel = calendarViewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    calMonthLabel.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let html = "";
    for (let i = 0; i < firstWeekday; i++) {
      html += `<span class="calendar-day empty"></span>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const classes = ["calendar-day"];
      if (sameDay(cellDate, today)) classes.push("today");
      if (sameDay(cellDate, currentDate)) classes.push("selected");
      html += `<button type="button" class="${classes.join(" ")}" data-day="${day}">${day}</button>`;
    }
    calDaysEl.innerHTML = html;

    calDaysEl.querySelectorAll(".calendar-day[data-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentDate = new Date(year, month, Number(btn.dataset.day));
        closeCalendar();
        loadLiturgy(currentDate);
      });
    });
  }

  function openCalendar() {
    calendarViewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    renderCalendar();
    calendarPopover.classList.add("show");
  }
  function closeCalendar() {
    calendarPopover.classList.remove("show");
  }
  function toggleCalendar() {
    if (calendarPopover.classList.contains("show")) closeCalendar();
    else openCalendar();
  }

  dateLabelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCalendar();
  });
  openCalendarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCalendar();
  });
  calendarPopover.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", closeCalendar);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCalendar(); });

  calPrevMonthBtn.addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderCalendar();
  });
  calNextMonthBtn.addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderCalendar();
  });
  calTodayBtn.addEventListener("click", () => {
    currentDate = new Date();
    closeCalendar();
    loadLiturgy(currentDate);
  });

  prevBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 1);
    loadLiturgy(currentDate);
  });
  nextBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 1);
    loadLiturgy(currentDate);
  });

  loadLiturgy(currentDate);
})();
