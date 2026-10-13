// Shared script for the JobTrack pages.
// Works with the JobTrack backend (JWT login, roles, openings, applications).
// If nobody is logged in, My Applications still works in this browser only, as before.

const API_URL = "https://job-tracker-backend-rp5j.onrender.com/api";

const STORE_KEY = "jobtrack_applications"; // guest applications (this browser only)
const AUTH_KEY = "jobtrack_auth";          // { token, user } after login
const STATUSES = ["Applied", "Interview Scheduled", "Offer", "Rejected"];

// Sample listings, used only if the backend cannot be reached
const openings = [
  { type: "Job", title: "Frontend Developer", company: "Nimbus Labs", location: "Chennai", mode: "Hybrid", pay: "6-9 LPA", about: "Build responsive interfaces with React and Tailwind." },
  { type: "Job", title: "Node.js Developer", company: "Kora Softworks", location: "Remote", mode: "Remote", pay: "7-10 LPA", about: "Design REST APIs with Express and MongoDB." },
  { type: "Job", title: "Full Stack Engineer", company: "Orchid Systems", location: "Bengaluru", mode: "On-site", pay: "9-14 LPA", about: "Work across the MERN stack on a booking platform." },
  { type: "Job", title: "QA Analyst", company: "Brightwave Tech", location: "Hyderabad", mode: "Hybrid", pay: "4-6 LPA", about: "Write test cases and automate regression checks." },
  { type: "Job", title: "UI Developer", company: "Pixelforge", location: "Coimbatore", mode: "On-site", pay: "5-8 LPA", about: "Turn designs into clean, accessible web pages." },
  { type: "Job", title: "Data Analyst", company: "Greenfield Analytics", location: "Pune", mode: "Hybrid", pay: "6-8 LPA", about: "Clean datasets and build dashboards for clients." },
  { type: "Internship", title: "React Intern", company: "Nimbus Labs", location: "Chennai", mode: "Hybrid", pay: "Rs 12,000/mo", about: "Support the frontend team on real product features." },
  { type: "Internship", title: "Backend Intern", company: "Kora Softworks", location: "Remote", mode: "Remote", pay: "Rs 15,000/mo", about: "Learn Node.js and Mongoose while building endpoints." },
  { type: "Internship", title: "Web Development Intern", company: "Pixelforge", location: "Coimbatore", mode: "On-site", pay: "Rs 8,000/mo", about: "HTML, CSS and JavaScript on live client sites." },
  { type: "Internship", title: "QA Intern", company: "Brightwave Tech", location: "Hyderabad", mode: "Hybrid", pay: "Rs 10,000/mo", about: "Learn manual testing and bug reporting." },
  { type: "Internship", title: "Data Intern", company: "Greenfield Analytics", location: "Pune", mode: "Remote", pay: "Rs 10,000/mo", about: "Help prepare data and charts for weekly reports." },
  { type: "Internship", title: "UI/UX Intern", company: "Orchid Systems", location: "Bengaluru", mode: "On-site", pay: "Rs 12,000/mo", about: "Create wireframes and test them with real users." },
];

const seedApps = [
  { company: "Nimbus Labs", role: "Frontend Developer", location: "Chennai", status: "Applied", applicationDate: "2026-10-05" },
  { company: "Kora Softworks", role: "Backend Intern", location: "Remote", status: "Interview Scheduled", applicationDate: "2026-10-02" },
  { company: "Orchid Systems", role: "Full Stack Engineer", location: "Bengaluru", status: "Offer", applicationDate: "2026-09-28" },
];

// ---------- Small helpers ----------
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const slug = (s) => s.toLowerCase().replace(/\s+/g, "-");
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);

// ---------- Login session (token + user) ----------
function getAuth() {
  try {
    const a = JSON.parse(localStorage.getItem(AUTH_KEY));
    return a && a.token && a.user ? a : null;
  } catch (e) { return null; }
}
function setAuth(auth) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } catch (e) {}
}
function clearAuth() {
  try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
}
const isAdmin = () => { const a = getAuth(); return !!a && a.user.role === "admin"; };

// Talks to the backend. Adds the token when logged in. Throws an Error with .status on failure.
async function api(path, options = {}) {
  const auth = getAuth();
  const headers = {};
  if (options.body) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = "Bearer " + auth.token;
  let res;
  try {
    res = await fetch(API_URL + path, { ...options, headers });
  } catch (e) {
    throw new Error("Could not reach the server. Make sure the backend is running.");
  }
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    if (res.status === 401 && auth) clearAuth(); // saved login expired or is invalid
    const err = new Error((data && data.message) || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Applications storage: guest (browser) or server (logged in) ----------
function loadApps() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  return seedApps.map((a) => ({ ...a, id: newId() }));
}
function saveApps(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) {}
}

const guestStore = {
  async list() { return loadApps(); },
  async add(a) {
    const apps = loadApps();
    const item = { id: newId(), ...a };
    apps.push(item);
    saveApps(apps);
    return item;
  },
  async update(id, patch) { saveApps(loadApps().map((x) => (x.id === id ? { ...x, ...patch } : x))); },
  async remove(id) { saveApps(loadApps().filter((x) => x.id !== id)); },
};

const fromServer = (j) => ({
  id: j._id,
  company: j.company,
  role: j.role,
  location: j.location || "",
  status: j.status,
  applicationDate: String(j.applicationDate).slice(0, 10),
});

const serverStore = {
  async list() { return (await api("/jobs")).map(fromServer); },
  async add(a) { return fromServer((await api("/jobs", { method: "POST", body: JSON.stringify(a) })).job); },
  async update(id, patch) { await api("/jobs/" + id, { method: "PUT", body: JSON.stringify(patch) }); },
  async remove(id) { await api("/jobs/" + id, { method: "DELETE" }); },
};

const appStore = () => (getAuth() ? serverStore : guestStore);

// ---------- Navigation: Logout when logged in, Admin link for admins ----------
function initNav() {
  const auth = getAuth();
  if (!auth) return;

  document.querySelectorAll('a[href="login.html"]').forEach((a) => {
    a.textContent = "Logout";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      clearAuth();
      window.location.href = "index.html";
    });
  });

  if (auth.user.role === "admin") {
    const loginItem = document.querySelector('header nav a[href="login.html"]');
    if (loginItem && loginItem.parentElement) {
      const li = el("li");
      const link = el("a", "", "Admin");
      link.href = "admin.html";
      if (document.body.dataset.page === "admin") {
        link.className = "active";
        link.setAttribute("aria-current", "page");
      }
      li.appendChild(link);
      loginItem.parentElement.before(li);
    }
  }
}

// ---------- Jobs / Internships ----------
function card(o) {
  const c = el("article", "listing-card");
  const tags = el("div", "tags");
  [o.location, o.mode, o.pay].forEach((t) => { if (t) tags.appendChild(el("span", "tag", t)); });
  const btn = el("button", "btn", "Track application");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await appStore().add({ company: o.company, role: o.title, location: o.location || "", status: "Applied", applicationDate: today() });
      btn.textContent = "Added to My Applications";
    } catch (e) {
      btn.disabled = false;
      btn.textContent = e.status === 401 ? "Session expired, log in again" : "Could not add, try again";
    }
  });
  c.append(el("h3", "", o.title), el("p", "company", o.company), tags, el("p", "about", o.about || ""), btn);
  return c;
}

async function loadOpenings(type) {
  try {
    return await api("/openings?type=" + encodeURIComponent(type));
  } catch (e) {
    return openings.filter((o) => o.type === type); // backend not reachable: show the samples
  }
}

async function initListings(type) {
  const grid = document.getElementById("grid");
  const search = document.getElementById("search");
  const loc = document.getElementById("location");
  const count = document.getElementById("count");
  const items = await loadOpenings(type);

  [...new Set(items.map((o) => o.location).filter(Boolean))].sort().forEach((l) => {
    const opt = el("option", "", l);
    opt.value = l;
    loc.appendChild(opt);
  });

  function render() {
    const q = search.value.trim().toLowerCase();
    const list = items.filter((o) => (o.title + " " + o.company).toLowerCase().includes(q) && (!loc.value || o.location === loc.value));
    grid.replaceChildren(...list.map(card));
    if (!list.length) grid.appendChild(el("p", "empty", "Nothing matches your search."));
    count.textContent = list.length + " " + type.toLowerCase() + (list.length === 1 ? "" : "s") + " found";
  }
  search.addEventListener("input", render);
  loc.addEventListener("change", render);
  render();
}

// ---------- My Applications ----------
async function initApplications() {
  const rows = document.getElementById("rows");
  const stats = document.getElementById("stats");
  const empty = document.getElementById("empty");
  const form = document.getElementById("appForm");
  const statusSelect = document.getElementById("statusSelect");
  const emptyText = empty.textContent;
  let apps = [];

  STATUSES.forEach((s) => { const o = el("option", "", s); o.value = s; statusSelect.appendChild(o); });
  form.elements.applicationDate.value = today();

  const showMessage = (text) => { empty.textContent = text; empty.hidden = false; };

  function render() {
    rows.replaceChildren();
    apps.forEach((a) => {
      const tr = el("tr");
      [a.company, a.role, a.location || "-", a.applicationDate].forEach((v) => tr.appendChild(el("td", "", v)));

      const sel = el("select", "status badge-" + slug(a.status));
      sel.setAttribute("aria-label", "Status for " + a.company);
      STATUSES.forEach((s) => { const o = el("option", "", s); o.value = s; o.selected = s === a.status; sel.appendChild(o); });
      sel.addEventListener("change", async () => {
        try {
          await appStore().update(a.id, { status: sel.value });
          a.status = sel.value;
        } catch (e) { showMessage(e.message); }
        render();
      });

      const del = el("button", "btn-link", "Delete");
      del.addEventListener("click", async () => {
        try {
          await appStore().remove(a.id);
          apps = apps.filter((x) => x.id !== a.id);
        } catch (e) { showMessage(e.message); }
        render();
      });

      const tdS = el("td"); tdS.appendChild(sel);
      const tdD = el("td"); tdD.appendChild(del);
      tr.append(tdS, tdD);
      rows.appendChild(tr);
    });
    if (apps.length > 0) empty.hidden = true;
    else showMessage(emptyText);

    const count = (s) => apps.filter((a) => a.status === s).length;
    stats.replaceChildren(...[["Total", apps.length], ["Interviews", count("Interview Scheduled")], ["Offers", count("Offer")]].map(([label, n]) => {
      const s = el("article", "stat");
      s.append(el("h3", "", String(n)), el("p", "", label));
      return s;
    }));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = form.elements;
    try {
      const item = await appStore().add({
        company: f.company.value.trim(),
        role: f.role.value.trim(),
        location: f.location.value.trim(),
        status: f.status.value,
        applicationDate: f.applicationDate.value,
      });
      apps.push(item);
      form.reset();
      f.applicationDate.value = today();
    } catch (err) { showMessage(err.message); return; }
    render();
  });

  try {
    apps = await appStore().list();
  } catch (e) {
    apps = [];
    render();
    showMessage(e.status === 401 ? "Your session expired. Please log in again." : e.message);
    return;
  }
  render();
}

// ---------- Login / Sign up ----------
function initLogin() {
  const tabs = document.querySelectorAll(".tab");
  const forms = document.querySelectorAll(".auth-form");
  const msg = document.getElementById("authMsg");
  const okColor = msg.style.color;

  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.toggle("active", x === t));
    forms.forEach((f) => { f.hidden = f.id !== t.dataset.target; });
    msg.textContent = "";
  }));

  forms.forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inputs = f.querySelectorAll("input");
    const isSignup = f.id === "signupForm";
    const body = isSignup
      ? { name: inputs[0].value.trim(), email: inputs[1].value.trim(), password: inputs[2].value }
      : { email: inputs[0].value.trim(), password: inputs[1].value };

    msg.style.color = okColor;
    msg.textContent = "Please wait...";
    try {
      const data = await api(isSignup ? "/auth/register" : "/auth/login", { method: "POST", body: JSON.stringify(body) });
      setAuth({ token: data.token, user: data.user });
      msg.textContent = "Welcome, " + data.user.name + "!";
      setTimeout(() => { window.location.href = data.user.role === "admin" ? "admin.html" : "applications.html"; }, 600);
    } catch (err) {
      msg.style.color = "#b91c1c";
      msg.textContent = err.message;
    }
  }));
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  initNav();
  if (page === "jobs") initListings("Job");
  if (page === "internships") initListings("Internship");
  if (page === "applications") initApplications();
  if (page === "login") initLogin();
});
