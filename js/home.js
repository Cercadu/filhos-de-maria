(async function () {
  const list = document.getElementById("posts-list");

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }

  function attachmentIcon(kind) {
    return kind === "image" ? "🖼️" : "📄";
  }

  function renderPost(post) {
    const cover = post.coverImage
      ? `<img class="card-cover" src="${post.coverImage.url}" alt="${escapeHtml(post.title)}" loading="lazy" />`
      : "";

    const attachments = (post.attachments || [])
      .map(
        (a) =>
          `<a class="attachment-chip" href="${a.url}" target="_blank" rel="noopener">${attachmentIcon(a.kind)} ${escapeHtml(a.name)}</a>`
      )
      .join("");

    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      ${cover}
      <div class="card-body">
        <span class="card-date">📅 ${formatDate(post.createdAt)}</span>
        <h3>${escapeHtml(post.title)}</h3>
        <p class="excerpt">${escapeHtml(post.excerpt || "")}</p>
        <div class="prose">${post.body}</div>
        ${attachments ? `<div class="attachments">${attachments}</div>` : ""}
        <button class="btn btn-outline btn-sm toggle-btn" style="margin-top:10px;">Ler publicação completa</button>
      </div>
    `;

    const excerptEl = el.querySelector(".excerpt");
    const proseEl = el.querySelector(".prose");
    const toggleBtn = el.querySelector(".toggle-btn");
    toggleBtn.addEventListener("click", () => {
      const open = proseEl.classList.toggle("open");
      excerptEl.style.display = open ? "none" : "";
      toggleBtn.textContent = open ? "Recolher" : "Ler publicação completa";
    });

    return el;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  try {
    const { posts } = await window.AfimApi.getPosts();
    list.innerHTML = "";
    if (!posts.length) {
      list.innerHTML = `<div class="empty-state">Nenhuma publicação ainda. Volte em breve! 🌿</div>`;
      return;
    }
    posts.forEach((post) => list.appendChild(renderPost(post)));
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Não foi possível carregar os informativos agora. Verifique sua conexão.</div>`;
  }
})();
