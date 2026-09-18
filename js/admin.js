(function () {
  const loginScreen = document.getElementById("login-screen");
  const adminApp = document.getElementById("admin-app");
  const loginModeBox = document.getElementById("login-mode");
  const setupModeBox = document.getElementById("setup-mode");
  const loginBtn = document.getElementById("login-btn");
  const loginUser = document.getElementById("login-username");
  const loginPass = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
  const setupBtn = document.getElementById("setup-btn");
  const setupUser = document.getElementById("setup-username");
  const setupPass = document.getElementById("setup-password");
  const setupError = document.getElementById("setup-error");
  const logoutBtn = document.getElementById("logout-btn");

  const MAX_ATTACHMENTS = 4;
  const IMAGE_MAX = 3 * 1024 * 1024;
  const DOC_MAX = 5 * 1024 * 1024;
  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const DOC_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  // ---------- Login / criação da primeira conta ----------
  async function tryStoredLogin() {
    const token = sessionStorage.getItem("afim_admin_token");
    if (token) return showApp();

    let hasUsers = true;
    try {
      hasUsers = await window.AfimApi.hasAdminUsers();
    } catch {
      hasUsers = true; // em dúvida, mostra login normal em vez de expor criação de conta
    }
    showLogin(!hasUsers);
  }

  function showLogin(showSetup) {
    loginScreen.style.display = "block";
    adminApp.style.display = "none";
    document.getElementById("login-check-spinner").style.display = "none";
    loginModeBox.style.display = showSetup ? "none" : "block";
    setupModeBox.style.display = showSetup ? "block" : "none";
  }
  function showApp() {
    loginScreen.style.display = "none";
    adminApp.style.display = "block";
    loadPosts();
    loadCandles();
    loadPrayers();
    loadTestimonials();
    loadUsers();
  }

  loginBtn.addEventListener("click", async () => {
    const username = loginUser.value.trim();
    const password = loginPass.value;
    if (!username || !password) return;
    loginBtn.disabled = true;
    loginBtn.textContent = "Entrando...";
    const result = await window.AfimApi.login(username, password);
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
    if (result) {
      sessionStorage.setItem("afim_admin_token", result.token);
      sessionStorage.setItem("afim_admin_username", result.username);
      loginError.style.display = "none";
      showApp();
    } else {
      loginError.style.display = "block";
    }
  });
  loginPass.addEventListener("keydown", (e) => { if (e.key === "Enter") loginBtn.click(); });

  setupBtn.addEventListener("click", async () => {
    const username = setupUser.value.trim();
    const password = setupPass.value;
    setupError.style.display = "none";
    if (username.length < 3 || password.length < 6) {
      setupError.textContent = "Usuário precisa de 3+ caracteres e senha de 6+ caracteres.";
      setupError.style.display = "block";
      return;
    }
    setupBtn.disabled = true;
    setupBtn.textContent = "Criando...";
    try {
      await window.AfimApi.createFirstUser(username, password);
      const result = await window.AfimApi.login(username, password);
      if (!result) throw new Error("Conta criada, mas o login automático falhou. Tente entrar manualmente.");
      sessionStorage.setItem("afim_admin_token", result.token);
      sessionStorage.setItem("afim_admin_username", result.username);
      showApp();
    } catch (err) {
      setupError.textContent = err.message;
      setupError.style.display = "block";
    } finally {
      setupBtn.disabled = false;
      setupBtn.textContent = "Criar conta e entrar";
    }
  });
  setupPass.addEventListener("keydown", (e) => { if (e.key === "Enter") setupBtn.click(); });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("afim_admin_token");
    sessionStorage.removeItem("afim_admin_username");
    location.reload();
  });

  // ---------- Tabs ----------
  document.querySelectorAll(".admin-tabs")[0].addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-tab");
    if (!btn) return;
    document.querySelectorAll(".admin-tabs")[0].querySelectorAll(".admin-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.getElementById("tab-posts").style.display = tab === "posts" ? "block" : "none";
    document.getElementById("tab-candles").style.display = tab === "candles" ? "block" : "none";
    document.getElementById("tab-prayers").style.display = tab === "prayers" ? "block" : "none";
    document.getElementById("tab-testimonials").style.display = tab === "testimonials" ? "block" : "none";
    document.getElementById("tab-users").style.display = tab === "users" ? "block" : "none";
  });

  // ---------- Utils ----------
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Sanitização do conteúdo colado (Word, sites, etc.) mantendo só formatação básica
  const ALLOWED_TAGS = new Set(["P", "BR", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "A", "H2", "H3", "H4", "BLOCKQUOTE", "IMG", "SPAN", "DIV"]);
  const UNWRAP_TAGS = new Set(["SPAN", "DIV", "FONT", "O:P"]);

  function sanitizeNode(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) { child.remove(); return; }

      const tag = child.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "META" || tag === "LINK") { child.remove(); return; }

      sanitizeNode(child);

      if (UNWRAP_TAGS.has(tag)) {
        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
        child.remove();
        return;
      }

      if (!ALLOWED_TAGS.has(tag)) {
        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
        child.remove();
        return;
      }

      [...child.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (tag === "A" && name === "href") {
          if (/^\s*javascript:/i.test(attr.value)) child.setAttribute("href", "#");
          else child.setAttribute("target", "_blank");
          return;
        }
        if (tag === "IMG" && (name === "src" || name === "alt")) return;
        child.removeAttribute(attr.name);
      });
    });
  }

  function sanitizeHtmlString(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    sanitizeNode(wrapper);
    return wrapper.innerHTML;
  }

  // ---------- Editor toolbar ----------
  const postBody = document.getElementById("post-body");
  document.querySelectorAll(".editor-toolbar [data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      postBody.focus();
      const cmd = btn.dataset.cmd;
      if (cmd === "createLink") {
        const url = prompt("Cole o link (https://...)");
        if (!url) return;
        document.execCommand(cmd, false, url);
      } else if (cmd === "formatBlock") {
        document.execCommand(cmd, false, btn.dataset.value);
      } else {
        document.execCommand(cmd, false, null);
      }
    });
  });

  postBody.addEventListener("paste", (e) => {
    e.preventDefault();
    const html = (e.clipboardData || window.clipboardData).getData("text/html");
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    if (html) {
      const clean = sanitizeHtmlString(html);
      document.execCommand("insertHTML", false, clean);
    } else {
      document.execCommand("insertText", false, text);
    }
  });

  const inlineImageInput = document.getElementById("inline-image-input");
  document.getElementById("insert-image-btn").addEventListener("click", () => inlineImageInput.click());
  inlineImageInput.addEventListener("change", async () => {
    const file = inlineImageInput.files[0];
    inlineImageInput.value = "";
    if (!file) return;
    if (!validateFile(file, true)) return;
    window.afimToast("Enviando imagem...");
    try {
      const res = await window.AfimApi.uploadFile(file);
      postBody.focus();
      document.execCommand("insertHTML", false, `<img src="${res.url}" alt="${escapeHtml(file.name)}" />`);
    } catch (err) {
      window.afimToast("Falha ao enviar imagem: " + err.message);
    }
  });

  function validateFile(file, isImageOnly) {
    const isImage = IMAGE_TYPES.includes(file.type);
    const isDoc = DOC_TYPES.includes(file.type);
    if (isImageOnly && !isImage) { window.afimToast("Selecione um arquivo de imagem válido."); return false; }
    if (!isImageOnly && !isImage && !isDoc) { window.afimToast("Tipo de arquivo não suportado."); return false; }
    const max = isImage ? IMAGE_MAX : DOC_MAX;
    if (file.size > max) { window.afimToast(`Arquivo muito grande (máx. ${formatBytes(max)}).`); return false; }
    return true;
  }

  // ---------- Cover image ----------
  const coverInput = document.getElementById("cover-input");
  const coverPreview = document.getElementById("cover-preview");
  let pendingCover = null;

  document.getElementById("cover-drop").addEventListener("click", () => coverInput.click());
  coverInput.addEventListener("change", async () => {
    const file = coverInput.files[0];
    coverInput.value = "";
    if (!file || !validateFile(file, true)) return;
    window.afimToast("Enviando capa...");
    try {
      const res = await window.AfimApi.uploadFile(file);
      pendingCover = { id: res.id, url: res.url, name: res.name };
      renderCoverPreview();
    } catch (err) {
      window.afimToast("Falha ao enviar capa: " + err.message);
    }
  });

  function renderCoverPreview() {
    coverPreview.innerHTML = "";
    if (!pendingCover) return;
    const chip = document.createElement("div");
    chip.className = "pending-file";
    chip.innerHTML = `🖼️ ${escapeHtml(pendingCover.name)} <button type="button">&times;</button>`;
    chip.querySelector("button").addEventListener("click", () => { pendingCover = null; renderCoverPreview(); });
    coverPreview.appendChild(chip);
  }

  // ---------- Attachments ----------
  const attachInput = document.getElementById("attach-input");
  const attachPreview = document.getElementById("attach-preview");
  let pendingAttachments = [];

  document.getElementById("attach-drop").addEventListener("click", () => attachInput.click());
  attachInput.addEventListener("change", async () => {
    const files = [...attachInput.files];
    attachInput.value = "";
    for (const file of files) {
      if (pendingAttachments.length >= MAX_ATTACHMENTS) {
        window.afimToast(`Máximo de ${MAX_ATTACHMENTS} anexos por publicação.`);
        break;
      }
      if (!validateFile(file, false)) continue;
      window.afimToast(`Enviando ${file.name}...`);
      try {
        const res = await window.AfimApi.uploadFile(file);
        pendingAttachments.push({ id: res.id, url: res.url, name: res.name, kind: res.kind, size: res.size });
        renderAttachPreview();
      } catch (err) {
        window.afimToast(`Falha ao enviar ${file.name}: ` + err.message);
      }
    }
  });

  function renderAttachPreview() {
    attachPreview.innerHTML = "";
    pendingAttachments.forEach((a, idx) => {
      const chip = document.createElement("div");
      chip.className = "pending-file";
      chip.innerHTML = `${a.kind === "image" ? "🖼️" : "📄"} ${escapeHtml(a.name)} <button type="button">&times;</button>`;
      chip.querySelector("button").addEventListener("click", () => { pendingAttachments.splice(idx, 1); renderAttachPreview(); });
      attachPreview.appendChild(chip);
    });
  }

  // ---------- Post modal ----------
  const postModal = document.getElementById("post-modal");
  const modalTitle = document.getElementById("modal-title");
  const postIdInput = document.getElementById("post-id");
  const postTitleInput = document.getElementById("post-title");
  const postExcerptInput = document.getElementById("post-excerpt");
  const postStatusInput = document.getElementById("post-status");
  const postPublishAtInput = document.getElementById("post-publish-at");
  const postUnpublishAtInput = document.getElementById("post-unpublish-at");

  function openModal(post) {
    postIdInput.value = post ? post.id : "";
    modalTitle.textContent = post ? "Editar publicação" : "Nova publicação";
    postTitleInput.value = post ? post.title : "";
    postExcerptInput.value = post ? post.excerpt : "";
    postBody.innerHTML = post ? post.body : "";
    postStatusInput.value = post ? post.status : "published";
    postPublishAtInput.value = (post && post.publishAt) || "";
    postUnpublishAtInput.value = (post && post.unpublishAt) || "";
    pendingCover = post && post.coverImage ? { ...post.coverImage } : null;
    pendingAttachments = post && post.attachments ? post.attachments.map((a) => ({ ...a })) : [];
    renderCoverPreview();
    renderAttachPreview();
    postModal.classList.add("show");
  }
  function closeModal() { postModal.classList.remove("show"); }

  document.getElementById("new-post-btn").addEventListener("click", () => openModal(null));
  document.getElementById("cancel-post-btn").addEventListener("click", closeModal);
  postModal.addEventListener("click", (e) => { if (e.target === postModal) closeModal(); });

  document.getElementById("save-post-btn").addEventListener("click", async () => {
    const title = postTitleInput.value.trim();
    const bodyHtml = sanitizeHtmlString(postBody.innerHTML).trim();
    if (!title || !bodyHtml || bodyHtml === "<br>") {
      window.afimToast("Preencha o título e o texto da publicação.");
      return;
    }
    if (postPublishAtInput.value && postUnpublishAtInput.value && postUnpublishAtInput.value < postPublishAtInput.value) {
      window.afimToast('"Publicar até" não pode ser antes de "Publicar a partir de".');
      return;
    }
    const payload = {
      title,
      excerpt: postExcerptInput.value.trim(),
      body: bodyHtml,
      coverImage: pendingCover,
      attachments: pendingAttachments,
      status: postStatusInput.value,
      publishAt: postPublishAtInput.value || null,
      unpublishAt: postUnpublishAtInput.value || null,
    };

    const saveBtn = document.getElementById("save-post-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";
    try {
      if (postIdInput.value) {
        await window.AfimApi.updatePost({ id: postIdInput.value, ...payload });
      } else {
        await window.AfimApi.createPost(payload);
      }
      closeModal();
      window.afimToast("Publicação salva com sucesso!");
      loadPosts();
    } catch (err) {
      window.afimToast("Erro ao salvar: " + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Salvar publicação";
    }
  });

  // ---------- Posts list ----------
  async function loadPosts() {
    const list = document.getElementById("admin-posts-list");
    try {
      const { posts } = await window.AfimApi.getPosts();
      list.innerHTML = "";
      if (!posts.length) {
        list.innerHTML = `<div class="empty-state">Nenhuma publicação ainda. Clique em "Nova publicação" para começar.</div>`;
        return;
      }
      posts.forEach((post) => {
        const row = document.createElement("div");
        row.className = "post-row";
        const schedule = post.publishAt || post.unpublishAt
          ? ` · <span class="small-muted">📅 ${post.publishAt ? "de " + formatDate(post.publishAt) : ""}${post.unpublishAt ? " até " + formatDate(post.unpublishAt) : ""}</span>`
          : "";
        row.innerHTML = `
          <div class="info">
            <strong>${escapeHtml(post.title)}</strong>
            <span class="small-muted">${formatDate(post.createdAt)} · <span class="tag ${post.status === "published" ? "published" : ""}">${post.status === "published" ? "Publicado" : "Rascunho"}</span>${schedule}</span>
          </div>
          <div class="actions">
            <button class="btn btn-sm btn-outline" data-action="edit">Editar</button>
            <button class="btn btn-sm btn-danger" data-action="delete">Excluir</button>
          </div>
        `;
        row.querySelector('[data-action="edit"]').addEventListener("click", () => openModal(post));
        row.querySelector('[data-action="delete"]').addEventListener("click", async () => {
          if (!confirm(`Excluir a publicação "${post.title}"? Esta ação não pode ser desfeita.`)) return;
          await window.AfimApi.deletePost(post.id);
          window.afimToast("Publicação excluída.");
          loadPosts();
        });
        list.appendChild(row);
      });
    } catch (err) {
      list.innerHTML = `<div class="empty-state">Erro ao carregar publicações.</div>`;
    }
  }

  // ---------- Candles (Velas) ----------
  function timeAgo(iso) {
    const hours = Math.floor((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000));
    if (hours < 1) return "há poucos minutos";
    if (hours === 1) return "há 1 hora";
    return `há ${hours} horas`;
  }

  async function loadCandles() {
    const list = document.getElementById("admin-candles-list");
    try {
      const { candles } = await window.AfimApi.getCandles();
      list.innerHTML = "";
      if (!candles.length) {
        list.innerHTML = `<div class="empty-state">Nenhuma vela acesa nas últimas 24 horas.</div>`;
        return;
      }
      candles.forEach((c) => {
        const row = document.createElement("div");
        row.className = "post-row";
        row.innerHTML = `
          <div class="info">
            <strong>🕯️ ${escapeHtml(c.name || "Anônimo")}</strong>
            <span class="small-muted">${timeAgo(c.createdAt)}</span>
          </div>
          <div class="actions">
            <button class="btn btn-sm btn-danger" data-action="delete">Excluir</button>
          </div>
        `;
        row.querySelector('[data-action="delete"]').addEventListener("click", async () => {
          if (!confirm("Excluir esta vela?")) return;
          await window.AfimApi.deleteCandle(c.id);
          window.afimToast("Vela excluída.");
          loadCandles();
        });
        list.appendChild(row);
      });
    } catch {
      list.innerHTML = `<div class="empty-state">Erro ao carregar velas.</div>`;
    }
  }

  // ---------- Prayers ----------
  let currentPrayerFilter = "pending";
  document.querySelectorAll('#tab-prayers .admin-tabs')[0].addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    document.querySelectorAll('#tab-prayers .admin-tabs [data-filter]').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentPrayerFilter = btn.dataset.filter;
    renderPrayersList();
  });

  let allPrayers = [];
  async function loadPrayers() {
    try {
      const { prayers } = await window.AfimApi.getPrayers();
      allPrayers = prayers;
      renderPrayersList();
    } catch {
      document.getElementById("admin-prayers-list").innerHTML = `<div class="empty-state">Erro ao carregar pedidos.</div>`;
    }
  }

  function renderPrayersList() {
    const list = document.getElementById("admin-prayers-list");
    const filtered = currentPrayerFilter === "all" ? allPrayers : allPrayers.filter((p) => p.status === currentPrayerFilter);
    list.innerHTML = "";
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state">Nenhum pedido nessa categoria.</div>`;
      return;
    }
    filtered.forEach((p) => {
      const el = document.createElement("div");
      el.className = "prayer-card";
      el.innerHTML = `
        <div class="name">${escapeHtml(p.name || "Anônimo")} ${p.isPublic ? "" : "<span class=\"small-muted\">(privado)</span>"}</div>
        <div class="msg">${escapeHtml(p.message)}</div>
        ${p.contact ? `<div class="small-muted">📞 Contato: ${escapeHtml(p.contact)}</div>` : ""}
        <div class="meta" style="margin-top:8px;">
          <span class="date">${formatDate(p.createdAt)} · 🙏 ${p.prayCount || 0} orações</span>
          <div class="actions" style="display:flex;gap:6px;">
            ${p.status !== "approved" ? '<button class="btn btn-sm btn-primary" data-action="approve">Aprovar</button>' : ""}
            ${p.status !== "rejected" ? '<button class="btn btn-sm btn-ghost" data-action="reject">Rejeitar</button>' : ""}
            <button class="btn btn-sm btn-danger" data-action="delete">Excluir</button>
          </div>
        </div>
      `;
      const approveBtn = el.querySelector('[data-action="approve"]');
      const rejectBtn = el.querySelector('[data-action="reject"]');
      const deleteBtn = el.querySelector('[data-action="delete"]');
      if (approveBtn) approveBtn.addEventListener("click", async () => { await window.AfimApi.moderatePrayer(p.id, "approved"); window.afimToast("Pedido aprovado."); loadPrayers(); });
      if (rejectBtn) rejectBtn.addEventListener("click", async () => { await window.AfimApi.moderatePrayer(p.id, "rejected"); window.afimToast("Pedido rejeitado."); loadPrayers(); });
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Excluir este pedido de oração permanentemente?")) return;
        await window.AfimApi.deletePrayer(p.id);
        window.afimToast("Pedido excluído.");
        loadPrayers();
      });
      list.appendChild(el);
    });
  }

  document.getElementById("cleanup-prayers-btn").addEventListener("click", async () => {
    if (!confirm("Remover pedidos com mais de 30 dias (exceto os ainda pendentes de revisão)? Essa ação não pode ser desfeita.")) return;
    try {
      const { removed } = await window.AfimApi.cleanupOldPrayers();
      window.afimToast(`${removed} pedido(s) antigo(s) removido(s).`);
      loadPrayers();
    } catch (err) {
      window.afimToast("Erro ao limpar: " + err.message);
    }
  });

  // ---------- Testimonials ----------
  let currentTestimonialFilter = "pending";
  document.querySelectorAll('#tab-testimonials .admin-tabs')[0].addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tfilter]");
    if (!btn) return;
    document.querySelectorAll('#tab-testimonials .admin-tabs [data-tfilter]').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentTestimonialFilter = btn.dataset.tfilter;
    renderTestimonialsList();
  });

  let allTestimonials = [];
  async function loadTestimonials() {
    try {
      const { testimonials } = await window.AfimApi.getTestimonials();
      allTestimonials = testimonials;
      renderTestimonialsList();
    } catch {
      document.getElementById("admin-testimonials-list").innerHTML = `<div class="empty-state">Erro ao carregar testemunhos.</div>`;
    }
  }

  function renderTestimonialsList() {
    const list = document.getElementById("admin-testimonials-list");
    const filtered = currentTestimonialFilter === "all" ? allTestimonials : allTestimonials.filter((t) => t.status === currentTestimonialFilter);
    list.innerHTML = "";
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state">Nenhum testemunho nessa categoria.</div>`;
      return;
    }
    filtered.forEach((t) => {
      const el = document.createElement("div");
      el.className = "prayer-card";
      el.innerHTML = `
        <div class="name">${escapeHtml(t.name || "Anônimo")}</div>
        <div class="msg">${escapeHtml(t.message)}</div>
        <div class="meta" style="margin-top:8px;">
          <span class="date">${formatDate(t.createdAt)}</span>
          <div class="actions" style="display:flex;gap:6px;">
            ${t.status !== "approved" ? '<button class="btn btn-sm btn-primary" data-action="approve">Aprovar</button>' : ""}
            ${t.status !== "rejected" ? '<button class="btn btn-sm btn-ghost" data-action="reject">Rejeitar</button>' : ""}
            <button class="btn btn-sm btn-danger" data-action="delete">Excluir</button>
          </div>
        </div>
      `;
      const approveBtn = el.querySelector('[data-action="approve"]');
      const rejectBtn = el.querySelector('[data-action="reject"]');
      const deleteBtn = el.querySelector('[data-action="delete"]');
      if (approveBtn) approveBtn.addEventListener("click", async () => { await window.AfimApi.moderateTestimonial(t.id, "approved"); window.afimToast("Testemunho aprovado."); loadTestimonials(); });
      if (rejectBtn) rejectBtn.addEventListener("click", async () => { await window.AfimApi.moderateTestimonial(t.id, "rejected"); window.afimToast("Testemunho rejeitado."); loadTestimonials(); });
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Excluir este testemunho permanentemente?")) return;
        await window.AfimApi.deleteTestimonial(t.id);
        window.afimToast("Testemunho excluído.");
        loadTestimonials();
      });
      list.appendChild(el);
    });
  }

  // ---------- Usuários ----------
  const userModal = document.getElementById("user-modal");
  const userUsernameInput = document.getElementById("user-username");
  const userPasswordInput = document.getElementById("user-password");
  const userError = document.getElementById("user-error");

  function openUserModal() {
    userUsernameInput.value = "";
    userPasswordInput.value = "";
    userError.style.display = "none";
    userModal.classList.add("show");
    userUsernameInput.focus();
  }
  function closeUserModal() { userModal.classList.remove("show"); }

  document.getElementById("new-user-btn").addEventListener("click", openUserModal);
  document.getElementById("cancel-user-btn").addEventListener("click", closeUserModal);
  userModal.addEventListener("click", (e) => { if (e.target === userModal) closeUserModal(); });

  document.getElementById("save-user-btn").addEventListener("click", async () => {
    const username = userUsernameInput.value.trim();
    const password = userPasswordInput.value;
    userError.style.display = "none";
    if (username.length < 3 || password.length < 6) {
      userError.textContent = "Usuário precisa de 3+ caracteres e senha de 6+ caracteres.";
      userError.style.display = "block";
      return;
    }
    const saveBtn = document.getElementById("save-user-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Criando...";
    try {
      await window.AfimApi.createUser(username, password);
      closeUserModal();
      window.afimToast("Usuário criado com sucesso!");
      loadUsers();
    } catch (err) {
      userError.textContent = err.message === "username_taken" ? "Esse usuário já existe." : "Erro ao criar: " + err.message;
      userError.style.display = "block";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Criar usuário";
    }
  });

  const passwordModal = document.getElementById("password-modal");
  const passwordUsernameInput = document.getElementById("password-username");
  const passwordUsernameLabel = document.getElementById("password-username-label");
  const newPasswordInput = document.getElementById("new-password-input");
  const passwordError = document.getElementById("password-error");

  function openPasswordModal(username) {
    passwordUsernameInput.value = username;
    passwordUsernameLabel.textContent = username;
    newPasswordInput.value = "";
    passwordError.style.display = "none";
    passwordModal.classList.add("show");
    newPasswordInput.focus();
  }
  function closePasswordModal() { passwordModal.classList.remove("show"); }

  document.getElementById("cancel-password-btn").addEventListener("click", closePasswordModal);
  passwordModal.addEventListener("click", (e) => { if (e.target === passwordModal) closePasswordModal(); });

  document.getElementById("save-password-btn").addEventListener("click", async () => {
    const username = passwordUsernameInput.value;
    const password = newPasswordInput.value;
    passwordError.style.display = "none";
    if (password.length < 6) {
      passwordError.textContent = "A senha precisa ter 6+ caracteres.";
      passwordError.style.display = "block";
      return;
    }
    const saveBtn = document.getElementById("save-password-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";
    try {
      await window.AfimApi.changePassword(username, password);
      closePasswordModal();
      window.afimToast(`Senha de "${username}" atualizada.`);
    } catch (err) {
      passwordError.textContent = "Erro ao salvar: " + err.message;
      passwordError.style.display = "block";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Salvar nova senha";
    }
  });

  async function loadUsers() {
    const list = document.getElementById("admin-users-list");
    try {
      const { users } = await window.AfimApi.getUsers();
      const currentUsername = sessionStorage.getItem("afim_admin_username");
      list.innerHTML = "";
      users.forEach((u) => {
        const row = document.createElement("div");
        row.className = "post-row";
        row.innerHTML = `
          <div class="info">
            <strong>${escapeHtml(u.username)} ${u.username === currentUsername ? "<span class=\"small-muted\">(você)</span>" : ""}</strong>
            <span class="small-muted">Criado em ${formatDate(u.createdAt)}</span>
          </div>
          <div class="actions">
            <button class="btn btn-sm btn-outline" data-action="reset">Redefinir senha</button>
            ${users.length > 1 ? '<button class="btn btn-sm btn-danger" data-action="delete">Excluir</button>' : ""}
          </div>
        `;
        row.querySelector('[data-action="reset"]').addEventListener("click", () => openPasswordModal(u.username));
        const deleteBtn = row.querySelector('[data-action="delete"]');
        if (deleteBtn) {
          deleteBtn.addEventListener("click", async () => {
            if (!confirm(`Excluir o usuário "${u.username}"?`)) return;
            try {
              await window.AfimApi.deleteUser(u.username);
              window.afimToast("Usuário excluído.");
              loadUsers();
            } catch (err) {
              window.afimToast("Erro ao excluir: " + err.message);
            }
          });
        }
        list.appendChild(row);
      });
    } catch {
      list.innerHTML = `<div class="empty-state">Erro ao carregar usuários.</div>`;
    }
  }

  tryStoredLogin();
})();
