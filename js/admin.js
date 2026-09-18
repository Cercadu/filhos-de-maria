(function () {
  const loginScreen = document.getElementById("login-screen");
  const adminApp = document.getElementById("admin-app");
  const loginBtn = document.getElementById("login-btn");
  const loginPass = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
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

  // ---------- Login ----------
  async function tryStoredLogin() {
    const stored = sessionStorage.getItem("afim_admin_pass");
    if (!stored) return showLogin();
    const ok = await window.AfimApi.verifyPassword(stored);
    if (ok) showApp();
    else { sessionStorage.removeItem("afim_admin_pass"); showLogin(); }
  }

  function showLogin() {
    loginScreen.style.display = "block";
    adminApp.style.display = "none";
  }
  function showApp() {
    loginScreen.style.display = "none";
    adminApp.style.display = "block";
    loadPosts();
    loadPrayers();
  }

  loginBtn.addEventListener("click", async () => {
    const pass = loginPass.value.trim();
    if (!pass) return;
    loginBtn.disabled = true;
    loginBtn.textContent = "Entrando...";
    const ok = await window.AfimApi.verifyPassword(pass);
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
    if (ok) {
      sessionStorage.setItem("afim_admin_pass", pass);
      loginError.style.display = "none";
      showApp();
    } else {
      loginError.style.display = "block";
    }
  });
  loginPass.addEventListener("keydown", (e) => { if (e.key === "Enter") loginBtn.click(); });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("afim_admin_pass");
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
    document.getElementById("tab-prayers").style.display = tab === "prayers" ? "block" : "none";
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

  function openModal(post) {
    postIdInput.value = post ? post.id : "";
    modalTitle.textContent = post ? "Editar publicação" : "Nova publicação";
    postTitleInput.value = post ? post.title : "";
    postExcerptInput.value = post ? post.excerpt : "";
    postBody.innerHTML = post ? post.body : "";
    postStatusInput.value = post ? post.status : "published";
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
    const payload = {
      title,
      excerpt: postExcerptInput.value.trim(),
      body: bodyHtml,
      coverImage: pendingCover,
      attachments: pendingAttachments,
      status: postStatusInput.value,
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
        row.innerHTML = `
          <div class="info">
            <strong>${escapeHtml(post.title)}</strong>
            <span class="small-muted">${formatDate(post.createdAt)} · <span class="tag ${post.status === "published" ? "published" : ""}">${post.status === "published" ? "Publicado" : "Rascunho"}</span></span>
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

  tryStoredLogin();
})();
