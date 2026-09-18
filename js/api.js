window.AfimApi = (function () {
  function adminHeaders() {
    const pass = sessionStorage.getItem("afim_admin_pass");
    return pass ? { "x-admin-password": pass } : {};
  }

  async function getPosts() {
    const res = await fetch("/api/posts", { headers: adminHeaders() });
    if (!res.ok) throw new Error("Falha ao carregar publicações");
    return res.json();
  }

  async function createPost(payload) {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao salvar");
    return res.json();
  }

  async function updatePost(payload) {
    const res = await fetch("/api/posts", {
      method: "PUT",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao atualizar");
    return res.json();
  }

  async function deletePost(id) {
    const res = await fetch(`/api/posts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    if (!res.ok) throw new Error("Falha ao excluir");
    return res.json();
  }

  async function getPrayers() {
    const res = await fetch("/api/prayers", { headers: adminHeaders() });
    if (!res.ok) throw new Error("Falha ao carregar pedidos");
    return res.json();
  }

  async function submitPrayer(payload) {
    const res = await fetch("/api/prayers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao enviar pedido");
    return res.json();
  }

  async function prayFor(id) {
    const res = await fetch("/api/prayers?action=pray", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Falha ao registrar oração");
    return res.json();
  }

  async function moderatePrayer(id, status) {
    const res = await fetch("/api/prayers", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) throw new Error("Falha ao atualizar pedido");
    return res.json();
  }

  async function deletePrayer(id) {
    const res = await fetch(`/api/prayers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    if (!res.ok) throw new Error("Falha ao excluir pedido");
    return res.json();
  }

  async function cleanupOldPrayers() {
    const res = await fetch("/api/prayers?cleanup=1", {
      method: "DELETE",
      headers: adminHeaders(),
    });
    if (!res.ok) throw new Error("Falha ao limpar pedidos antigos");
    return res.json();
  }

  async function getTestimonials() {
    const res = await fetch("/api/testimonials", { headers: adminHeaders() });
    if (!res.ok) throw new Error("Falha ao carregar testemunhos");
    return res.json();
  }

  async function submitTestimonial(payload) {
    const res = await fetch("/api/testimonials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao enviar testemunho");
    return res.json();
  }

  async function moderateTestimonial(id, status) {
    const res = await fetch("/api/testimonials", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) throw new Error("Falha ao atualizar testemunho");
    return res.json();
  }

  async function deleteTestimonial(id) {
    const res = await fetch(`/api/testimonials?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    if (!res.ok) throw new Error("Falha ao excluir testemunho");
    return res.json();
  }

  async function getForms() {
    const res = await fetch("/api/forms", { headers: adminHeaders() });
    if (!res.ok) throw new Error("Falha ao carregar formulários");
    return res.json();
  }

  async function createForm(payload) {
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao salvar formulário");
    return res.json();
  }

  async function updateForm(payload) {
    const res = await fetch("/api/forms", {
      method: "PUT",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao atualizar formulário");
    return res.json();
  }

  async function deleteForm(id) {
    const res = await fetch(`/api/forms?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    if (!res.ok) throw new Error("Falha ao excluir formulário");
    return res.json();
  }

  async function uploadFile(file) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: adminHeaders(),
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao enviar arquivo");
    }
    return res.json();
  }

  async function verifyPassword(pass) {
    const res = await fetch("/api/posts?verify=1", { headers: { "x-admin-password": pass } });
    return res.ok;
  }

  return {
    adminHeaders,
    getPosts,
    createPost,
    updatePost,
    deletePost,
    getPrayers,
    submitPrayer,
    prayFor,
    moderatePrayer,
    deletePrayer,
    cleanupOldPrayers,
    getTestimonials,
    submitTestimonial,
    moderateTestimonial,
    deleteTestimonial,
    getForms,
    createForm,
    updateForm,
    deleteForm,
    uploadFile,
    verifyPassword,
  };
})();
