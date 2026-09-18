(function () {
  // Realça o link ativo no menu (topo e inferior)
  const path = location.pathname.replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const target = link.getAttribute("data-nav");
    const norm = target.replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/";
    if (norm === path) link.classList.add("active");
  });

  // Service worker: registra e recarrega a página sozinho quando uma versão
  // nova assume o controle, para nunca ficar preso rodando código antigo
  // (ex: PWA instalado que fica muito tempo sem fechar).
  if ("serviceWorker" in navigator) {
    let refreshed = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        reg.update().catch(() => {});
      }).catch(() => {});
    });
  }

  // Prompt de instalação (PWA)
  let deferredPrompt = null;
  const banner = document.getElementById("install-banner");
  const installBtn = document.getElementById("install-btn");
  const closeBtn = document.getElementById("install-close");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (banner && !localStorage.getItem("afim_install_dismissed")) {
      banner.classList.add("show");
    }
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.classList.remove("show");
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      banner.classList.remove("show");
      localStorage.setItem("afim_install_dismissed", "1");
    });
  }

  // Toast simples
  window.afimToast = function (message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 2800);
  };
})();
