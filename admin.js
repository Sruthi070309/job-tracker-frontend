// Admin dashboard for internships. The server also checks the admin role on every request,
// so hiding things here is only for a tidy screen, not for security.

async function initAdmin() {
  const gate = document.getElementById("gate");
  const panel = document.getElementById("panel");
  const statsBox = document.getElementById("adminStats");
  const rows = document.getElementById("internRows");
  const emptyMsg = document.getElementById("internEmpty");
  const form = document.getElementById("internForm");
  const msg = document.getElementById("adminMsg");
  const formTitle = document.getElementById("formTitle");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  let internships = [];
  let editingId = null;

  const showGate = (text, withLink) => {
    panel.hidden = true;
    gate.hidden = false;
    gate.textContent = text + " ";
    if (withLink) {
      const a = el("a", "", "Go to login");
      a.href = "login.html";
      a.style.color = "#E23744";
      a.style.fontWeight = "700";
      gate.appendChild(a);
    }
  };
  const say = (text, kind) => { msg.textContent = text; msg.className = kind || ""; };

  const auth = getAuth();
  if (!auth) return showGate("Please log in as an admin to see this page.", true);
  if (auth.user.role !== "admin") return showGate("This page is only for admins.", false);
  panel.hidden = false;

  const handleAuthError = (e) => {
    if (e.status === 401) { showGate("Your session expired. Please log in again.", true); return true; }
    if (e.status === 403) { showGate("This page is only for admins.", false); return true; }
    return false;
  };

  async function loadStats() {
    const s = await api("/admin/stats");
    statsBox.replaceChildren(...[["Internships", s.internships], ["Jobs", s.jobs], ["Students", s.users], ["Applications", s.applications]].map(([label, n]) => {
      const card = el("article", "stat");
      card.append(el("h3", "", String(n)), el("p", "", label));
      return card;
    }));
  }

  function renderRows() {
    rows.replaceChildren();
    internships.forEach((o) => {
      const tr = el("tr");
      [o.title, o.company, o.location || "-", o.mode || "-", o.pay || "-"].forEach((v) => tr.appendChild(el("td", "", v)));

      const edit = el("button", "btn-edit", "Edit");
      edit.addEventListener("click", () => startEdit(o));
      const del = el("button", "btn-link", "Delete");
      del.addEventListener("click", () => removeOne(o));
      const actions = el("div", "row-actions");
      actions.append(edit, del);
      const td = el("td");
      td.appendChild(actions);
      tr.appendChild(td);
      rows.appendChild(tr);
    });
    emptyMsg.hidden = internships.length > 0;
  }

  async function refresh() {
    try {
      internships = await api("/openings?type=Internship");
      renderRows();
      await loadStats();
    } catch (e) {
      if (!handleAuthError(e)) say(e.message, "error");
    }
  }

  function resetForm() {
    editingId = null;
    form.reset();
    formTitle.textContent = "Add an internship";
    saveBtn.textContent = "Add internship";
    cancelBtn.hidden = true;
  }

  function startEdit(o) {
    editingId = o._id;
    const f = form.elements;
    f.title.value = o.title || "";
    f.company.value = o.company || "";
    f.location.value = o.location || "";
    f.mode.value = o.mode || "On-site";
    f.pay.value = o.pay || "";
    f.about.value = o.about || "";
    formTitle.textContent = "Edit internship";
    saveBtn.textContent = "Save changes";
    cancelBtn.hidden = false;
    say("");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function removeOne(o) {
    if (!window.confirm("Delete \"" + o.title + "\" at " + o.company + "?")) return;
    try {
      await api("/openings/" + o._id, { method: "DELETE" });
      if (editingId === o._id) resetForm();
      say("Internship deleted.", "ok");
      await refresh();
    } catch (e) {
      if (!handleAuthError(e)) say(e.message, "error");
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = form.elements;
    const body = {
      type: "Internship",
      title: f.title.value.trim(),
      company: f.company.value.trim(),
      location: f.location.value.trim(),
      mode: f.mode.value,
      pay: f.pay.value.trim(),
      about: f.about.value.trim(),
    };
    saveBtn.disabled = true;
    try {
      if (editingId) {
        await api("/openings/" + editingId, { method: "PUT", body: JSON.stringify(body) });
        say("Internship updated.", "ok");
      } else {
        await api("/openings", { method: "POST", body: JSON.stringify(body) });
        say("Internship added.", "ok");
      }
      resetForm();
      await refresh();
    } catch (err) {
      if (!handleAuthError(err)) say(err.message, "error");
    } finally {
      saveBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener("click", () => { resetForm(); say(""); });

  refresh();
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "admin") initAdmin();
});
