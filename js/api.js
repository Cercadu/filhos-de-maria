window.AfimApi = (function () {
  function adminHeaders() {
    const token = sessionStorage.getItem("afim_admin_token");
    return token ? { authorization: `Bearer ${token}` } : {};
  }

  async function hasAdminUsers() {
    const res = await fetch("/api/users?check=1");
    if (!res.ok) throw new Error("Falha ao verificar contas");
    const data = await res.json();
    return data.hasUsers;
  }

  async function login(username, password) {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function createFirstUser(username, password) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao criar conta");
    return res.json();
  }

  async function getUsers() {
    const res = await fetch("/api/users", { headers: adminHeaders() });
    if (!res.ok) throw new Error("Falha ao carregar usuários");
    return res.json();
  }

  async function createUser(username, password) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao criar usuário");
    return res.json();
  }

  async function changePassword(username, password) {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...adminHeaders() },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao trocar senha");
    return res.json();
  }

  async function deleteUser(username) {
    const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Falha ao excluir usuário");
    return res.json();
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

  async function getCandles() {
    const res = await fetch("/api/candles");
    if (!res.ok) throw new Error("Falha ao carregar velas");
    return res.json();
  }

  async function lightCandle(name) {
    const res = await fetch("/api/candles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Falha ao acender vela");
    return res.json();
  }

  async function deleteCandle(id) {
    const res = await fetch(`/api/candles?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    if (!res.ok) throw new Error("Falha ao excluir vela");
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

  return {
    adminHeaders,
    hasAdminUsers,
    login,
    createFirstUser,
    getUsers,
    createUser,
    changePassword,
    deleteUser,
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
    getCandles,
    lightCandle,
    deleteCandle,
    getForms,
    createForm,
    updateForm,
    deleteForm,
    uploadFile,
  };
})();
