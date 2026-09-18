(function () {
  const API_BASE = "https://diocesedeipameri.com.br/wp-json/wp/v2/posts";
  const PER_PAGE = 6;

  const list = document.getElementById("diocese-list");
  const loadMoreBtn = document.getElementById("diocese-load-more");
  let page = 1;
  let totalPages = 1;

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  }

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || "").trim();
  }

  function featuredImageUrl(post) {
    const media = post._embedded && post._embedded["wp:featuredmedia"] && post._embedded["wp:featuredmedia"][0];
    return media && media.source_url ? media.source_url : null;
  }

  function renderPost(post) {
    const image = featuredImageUrl(post);
    const cover = image ? `<img class="card-cover" src="${image}" alt="" loading="lazy" />` : "";
    const excerpt = stripHtml(post.excerpt && post.excerpt.rendered);

    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      ${cover}
      <div class="card-body">
        <span class="card-date">📅 ${formatDate(post.date)}</span>
        <h3>${stripHtml(post.title && post.title.rendered)}</h3>
        <p class="excerpt">${excerpt}</p>
        <a class="btn btn-outline btn-sm" href="${post.link}" target="_blank" rel="noopener">Ler no site da Diocese</a>
      </div>
    `;
    return el;
  }

  async function loadPage() {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Carregando...";
    try {
      const res = await fetch(`${API_BASE}?_embed&per_page=${PER_PAGE}&page=${page}`);
      if (!res.ok) throw new Error("Falha ao carregar notícias da diocese");
      totalPages = Number(res.headers.get("X-WP-TotalPages")) || 1;
      const posts = await res.json();

      if (page === 1) list.innerHTML = "";
      if (!posts.length && page === 1) {
        list.innerHTML = `<div class="empty-state">Nenhuma notícia encontrada no momento.</div>`;
      } else {
        posts.forEach((post) => list.appendChild(renderPost(post)));
      }

      loadMoreBtn.style.display = page < totalPages ? "" : "none";
      loadMoreBtn.textContent = "Carregar mais notícias";
      loadMoreBtn.disabled = false;
    } catch (err) {
      if (page === 1) {
        list.innerHTML = `<div class="empty-state">Não foi possível carregar as notícias da diocese agora. Verifique sua conexão.</div>`;
      }
      loadMoreBtn.style.display = "none";
    }
  }

  loadMoreBtn.addEventListener("click", () => {
    page += 1;
    loadPage();
  });

  loadPage();
})();
