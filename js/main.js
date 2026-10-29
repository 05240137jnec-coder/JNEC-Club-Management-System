/* =========================================================
   main.js — Shared helpers used on every page
   - text/date formatting
   - navbar, sidebar, topbar and footer (built once here,
     so every page looks the same)
   - toast messages, confirmation dialog, empty states
   - simple CSS charts
   - page start-up ("router")
   ========================================================= */

// Path from the current page back to the project root.
// Pages inside member/, secretary/ and admin/ set data-root="../"
const ROOT = document.body.dataset.root || "";

/* ---------------- Text & date helpers ---------------- */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function dayAndMonth(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return { day: d.getDate(), month: d.toLocaleDateString("en-GB", { month: "short" }) };
}
function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}
function initials(name) {
  return (name || "?").split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}
function avatar(user, size = "") {
  return `<span class="avatar ${size}" title="${escapeHtml(user ? user.name : "")}">${escapeHtml(initials(user ? user.name : "?"))}</span>`;
}
function roleLabel(role) {
  return { member: "Student Member", secretary: "Club Secretary", admin: "System Administrator" }[role] || role;
}

/* ---------------- Badges ---------------- */
function statusBadge(status) {
  const map = {
    approved: "success", active: "success", present: "success", upcoming: "primary",
    pending: "warning", late: "warning",
    rejected: "danger", cancelled: "danger", absent: "danger", inactive: "secondary",
    completed: "secondary", important: "danger", normal: "info"
  };
  return `<span class="badge rounded-pill text-bg-${map[status] || "secondary"} badge-status">${escapeHtml(capitalize(status))}</span>`;
}
function stars(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) html += `<i class="bi bi-star${i <= rating ? "-fill" : ""} text-warning"></i>`;
  return `<span aria-label="${rating} out of 5 stars">${html}</span>`;
}

/* ---------------- Club logo ----------------
   Shows the club's uploaded logo, or a general club icon when there is none. */
const DEFAULT_CLUB_ICON = "people-fill";
function clubLogoSrc(club) {
  // only accept images made by the logo upload (data:image/...)
  return club && typeof club.logo === "string" && club.logo.startsWith("data:image/") ? club.logo : "";
}
function clubLogo(club, size = "") {
  const src = clubLogoSrc(club);
  if (src) return `<span class="club-icon club-logo ${size}"><img src="${escapeHtml(src)}" alt=""></span>`;
  return `<span class="club-icon ${size}" style="--club-color:${escapeHtml(club && club.color ? club.color : "#16325c")}"><i class="bi bi-${DEFAULT_CLUB_ICON}"></i></span>`;
}

/* ---------------- Empty state ---------------- */
function emptyState(icon, title, text, actionHtml = "") {
  return `<div class="empty-state">
      <i class="bi bi-${icon}"></i>
      <h3 class="h6">${escapeHtml(title)}</h3>
      <p class="text-muted small mb-3">${escapeHtml(text)}</p>
      ${actionHtml}
    </div>`;
}

/* ---------------- Toast notifications ---------------- */
function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(container);
  }
  const icons = { success: "check-circle-fill", danger: "x-circle-fill", warning: "exclamation-triangle-fill", info: "info-circle-fill" };
  const el = document.createElement("div");
  el.className = `toast align-items-center text-bg-${type} border-0`;
  el.setAttribute("role", "alert");
  el.setAttribute("aria-live", "assertive");
  el.innerHTML = `<div class="d-flex">
      <div class="toast-body"><i class="bi bi-${icons[type] || icons.info} me-2"></i>${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  container.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay: 3500 });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

// A message that survives a page redirect (shown on the next page)
function setFlash(message, type = "success") {
  sessionStorage.setItem("cms_flash", JSON.stringify({ message, type }));
}
function showFlash() {
  const raw = sessionStorage.getItem("cms_flash");
  if (!raw) return;
  sessionStorage.removeItem("cms_flash");
  const { message, type } = JSON.parse(raw);
  showToast(message, type);
}

/* ---------------- Confirmation dialog ----------------
   Usage: if (await confirmDialog("Delete?", "This cannot be undone.")) { ... }
*/
function confirmDialog(title, message, confirmText = "Confirm", variant = "danger") {
  return new Promise(resolve => {
    let modalEl = document.getElementById("confirmModal");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "confirmModal";
      modalEl.className = "modal fade";
      modalEl.tabIndex = -1;
      modalEl.setAttribute("aria-labelledby", "confirmModalTitle");
      modalEl.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
          <div class="modal-header border-0 pb-0">
            <h2 class="modal-title h5" id="confirmModalTitle"></h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body"><p class="mb-0" id="confirmModalText"></p></div>
          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn" id="confirmModalOk"></button>
          </div>
        </div></div>`;
      document.body.appendChild(modalEl);
    }
    modalEl.querySelector("#confirmModalTitle").textContent = title;
    modalEl.querySelector("#confirmModalText").textContent = message;
    const okBtn = modalEl.querySelector("#confirmModalOk");
    okBtn.textContent = confirmText;
    okBtn.className = `btn btn-${variant}`;

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    let confirmed = false;
    okBtn.onclick = () => { confirmed = true; modal.hide(); };
    modalEl.addEventListener("hidden.bs.modal", () => resolve(confirmed), { once: true });
    modal.show();
  });
}

/* ---------------- Form validation helper ----------------
   Uses the browser's built-in rules (required, minlength,
   pattern, type="email") + Bootstrap's validation styles.
   onValid receives an object with all form values.
*/
function setupForm(form, onValid) {
  form.setAttribute("novalidate", "");
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      const firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) firstInvalid.focus();
      showToast("Please correct the highlighted fields.", "danger");
      return;
    }
    const values = Object.fromEntries(new FormData(form).entries());
    // unchecked checkboxes are missing from FormData — add them as false
    form.querySelectorAll('input[type="checkbox"][name]').forEach(cb => { values[cb.name] = cb.checked; });
    onValid(values);
  });
}
function resetForm(form) {
  form.reset();
  form.classList.remove("was-validated");
}
// Fill a form's fields from an object: fillForm(form, { name: "x" })
function fillForm(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (field.type === "checkbox") field.checked = !!value;
    else field.value = value ?? "";
  });
}

/* ---------------- Simple charts (pure CSS) ---------------- */
// items: [{ label, value }]
function renderBarChart(container, items, suffix = "") {
  if (!items.length) { container.innerHTML = emptyState("bar-chart", "No data yet", "Data will appear here once available."); return; }
  const max = Math.max(...items.map(i => i.value), 1);
  container.innerHTML = items.map(i => `
      <div class="bar-row">
        <div class="bar-label" title="${escapeHtml(i.label)}">${escapeHtml(i.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(i.value / max) * 100}%;${i.color ? "background:" + i.color : ""}"></div></div>
        <div class="bar-value">${i.value}${suffix}</div>
      </div>`).join("");
}
// items: [{ label, value, color }]
function renderDonut(container, items) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (!total) { container.innerHTML = emptyState("pie-chart", "No data yet", "Data will appear here once available."); return; }
  let start = 0;
  const stops = items.map(i => {
    const end = start + (i.value / total) * 360;
    const stop = `${i.color} ${start}deg ${end}deg`;
    start = end;
    return stop;
  }).join(", ");
  container.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background: conic-gradient(${stops})"><span>${total}</span></div>
      <ul class="donut-legend list-unstyled mb-0">
        ${items.map(i => `<li><span class="legend-dot" style="background:${i.color}"></span>${escapeHtml(i.label)} <strong>${i.value}</strong></li>`).join("")}
      </ul>
    </div>`;
}

/* ---------------- CSV export ---------------- */
function downloadCSV(filename, rows) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Report downloaded as " + filename);
}

/* =========================================================
   LAYOUT — navbar / sidebar / footer
   ========================================================= */
const SIDEBAR_MENUS = {
  member: [
    { section: "Overview" },
    { label: "Dashboard", icon: "speedometer2", href: "member/dashboard.html" },
    { label: "Browse Clubs", icon: "grid-3x3-gap", href: "clubs.html" },
    { label: "Events", icon: "calendar-event", href: "events.html" },
    { section: "My Activity" },
    { label: "My Clubs", icon: "people", href: "member/my-clubs.html" },
    { label: "Join a Club", icon: "person-plus", href: "member/join-club.html" },
    { label: "Announcements", icon: "megaphone", href: "member/announcements.html", badge: "unread" },
    { label: "Attendance", icon: "clipboard-check", href: "member/attendance.html" },
    { label: "Feedback", icon: "chat-square-heart", href: "member/feedback.html" },
    { label: "My Profile", icon: "person-circle", href: "account/profile.html" }
  ],
  secretary: [
    { section: "Overview" },
    { label: "Dashboard", icon: "speedometer2", href: "secretary/dashboard.html" },
    { section: "Manage Club" },
    { label: "Club Profile", icon: "building", href: "secretary/club.html" },
    { label: "Members", icon: "people", href: "secretary/members.html", badge: "pending" },
    { label: "Events", icon: "calendar2-week", href: "secretary/events.html" },
    { label: "Attendance", icon: "clipboard-check", href: "secretary/attendance.html" },
    { label: "Announcements", icon: "megaphone", href: "secretary/announcements.html" },
    { label: "Reports", icon: "bar-chart-line", href: "secretary/reports.html" },
    { section: "Account" },
    { label: "My Profile", icon: "person-circle", href: "account/profile.html" },
    { label: "View Public Site", icon: "globe2", href: "index.html" }
  ],
  admin: [
    { section: "Overview" },
    { label: "Dashboard", icon: "speedometer2", href: "admin/dashboard.html" },
    { section: "Administration" },
    { label: "Users & Roles", icon: "person-gear", href: "admin/users.html" },
    { label: "All Clubs", icon: "buildings", href: "admin/clubs.html" },
    { section: "Monitoring" },
    { label: "Memberships", icon: "people", href: "secretary/members.html", badge: "pending" },
    { label: "Events", icon: "calendar2-week", href: "secretary/events.html" },
    { label: "Attendance", icon: "clipboard-check", href: "secretary/attendance.html" },
    { label: "Announcements", icon: "megaphone", href: "secretary/announcements.html" },
    { label: "Reports", icon: "bar-chart-line", href: "secretary/reports.html" },
    { section: "Account" },
    { label: "My Profile", icon: "person-circle", href: "account/profile.html" },
    { label: "View Public Site", icon: "globe2", href: "index.html" }
  ]
};

// Dashboard path (relative to the project root) for each role
function dashboardPath(role) {
  return { member: "member/dashboard.html", secretary: "secretary/dashboard.html", admin: "admin/dashboard.html" }[role];
}
function dashboardUrl(role) {
  return ROOT + dashboardPath(role);
}
function isCurrentPage(href) {
  return new URL(ROOT + href, window.location.href).pathname === window.location.pathname;
}

// Pending membership requests for clubs the user manages
function pendingRequestCount(user) {
  const clubIds = getManagedClubIds(user);
  return db.memberships.filter(m => m.status === "pending" && clubIds.includes(m.clubId)).length;
}
// Which clubs can this user manage? (secretary = own club, admin = all)
function getManagedClubIds(user) {
  if (!user) return [];
  if (user.role === "admin") return db.clubs.map(c => c.id);
  if (user.role === "secretary" && user.clubId) return [user.clubId];
  return [];
}

// Items shown in the bell dropdown
function getNotifications(user) {
  if (user.role === "member") {
    return getUnreadAnnouncements(user).slice(0, 5).map(a => ({
      icon: a.priority === "important" ? "exclamation-circle text-danger" : "megaphone text-primary",
      text: a.title,
      sub: (a.clubId ? getClub(a.clubId)?.name : "College-wide") + " · " + formatDate(a.date),
      href: ROOT + "member/announcements.html"
    }));
  }
  const clubIds = getManagedClubIds(user);
  return db.memberships.filter(m => m.status === "pending" && clubIds.includes(m.clubId)).slice(0, 5).map(m => ({
    icon: "person-plus text-warning",
    text: `${getUser(m.userId)?.name || "A student"} wants to join`,
    sub: getClub(m.clubId)?.name || "",
    href: ROOT + "secretary/members.html"
  }));
}

function notificationBell(user) {
  const items = getNotifications(user);
  const count = user.role === "member" ? getUnreadAnnouncements(user).length : pendingRequestCount(user);
  const allLink = user.role === "member" ? ROOT + "member/announcements.html" : ROOT + "secretary/members.html";
  return `<div class="dropdown">
      <button class="btn btn-icon position-relative" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Notifications (${count} new)">
        <i class="bi bi-bell"></i>
        ${count ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">${count}</span>` : ""}
      </button>
      <div class="dropdown-menu dropdown-menu-end notif-menu shadow">
        <h6 class="dropdown-header">Notifications</h6>
        ${items.length ? items.map(n => `
          <a class="dropdown-item notif-item" href="${n.href}">
            <i class="bi bi-${n.icon}"></i>
            <span><span class="d-block text-wrap">${escapeHtml(n.text)}</span><small class="text-muted">${escapeHtml(n.sub)}</small></span>
          </a>`).join("") : `<p class="px-3 py-2 small text-muted mb-0">You're all caught up!</p>`}
        <div class="dropdown-divider"></div>
        <a class="dropdown-item text-center small fw-semibold" href="${allLink}">View all</a>
      </div>
    </div>`;
}

function userDropdown(user) {
  return `<div class="dropdown">
      <button class="btn btn-user dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown" aria-expanded="false">
        ${avatar(user, "avatar-sm")}<span class="d-none d-md-inline text-truncate" style="max-width:140px">${escapeHtml(user.name)}</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow">
        <li><span class="dropdown-item-text small text-muted">${escapeHtml(roleLabel(user.role))}</span></li>
        <li><a class="dropdown-item" href="${dashboardUrl(user.role)}"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a></li>
        <li><a class="dropdown-item" href="${ROOT}account/profile.html"><i class="bi bi-person-circle me-2"></i>My Profile</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item text-danger" data-action="logout"><i class="bi bi-box-arrow-right me-2"></i>Log out</button></li>
      </ul>
    </div>`;
}

// College logo shown beside "JNEC Clubs" (navbar, sidebar and footer).
// Put the logo file at this path. If the file is missing, the cap icon is shown instead.
const COLLEGE_LOGO = "image/logo.jpg";

function brandHtml() {
  return `<span class="brand-logo" aria-hidden="true">
      <img src="${ROOT + COLLEGE_LOGO}" alt="" onerror="this.remove()">
      <i class="bi bi-mortarboard-fill"></i>
    </span>
    <span class="brand-text"><strong>JNEC Clubs</strong><small>Jigme Namgyel Engineering College</small></span>`;
}

/* Top navigation bar for public pages */
function renderNavbar() {
  const holder = document.getElementById("navbar");
  if (!holder) return;
  const user = getCurrentUser();
  const links = [
    { label: "Home", href: "index.html" },
    { label: "Clubs", href: "clubs.html" },
    { label: "Events", href: "events.html" }
  ];
  if (user) links.push({ label: "Dashboard", href: dashboardPath(user.role) });

  holder.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark main-navbar sticky-top">
      <div class="container-fluid nav-inner">
        <a class="navbar-brand d-flex align-items-center gap-2" href="${ROOT}index.html">${brandHtml()}</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav ms-auto me-lg-4">
            ${links.map(l => `<li class="nav-item"><a class="nav-link ${isCurrentPage(l.href) ? "active" : ""}" ${isCurrentPage(l.href) ? 'aria-current="page"' : ""} href="${ROOT + l.href}">${l.label}</a></li>`).join("")}
          </ul>
          <div class="d-flex align-items-center gap-3 py-2 py-lg-0">
            ${user ? notificationBell(user) + userDropdown(user) : `
              <a class="btn btn-outline-light btn-nav" href="${ROOT}login.html">Log in</a>
              <a class="btn btn-accent btn-nav" href="${ROOT}register.html">Register</a>`}
          </div>
        </div>
      </div>
    </nav>`;
}

/* Sidebar + topbar for dashboard pages */
function renderSidebar() {
  const sidebar = document.getElementById("sidebar");
  const topbar = document.getElementById("topbar");
  const user = getCurrentUser();
  if (!sidebar || !user) return;

  const menu = SIDEBAR_MENUS[user.role] || [];
  const badgeValue = { unread: getUnreadAnnouncements(user).length, pending: pendingRequestCount(user) };

  sidebar.innerHTML = `
    <div class="sidebar-brand"><a href="${ROOT}index.html" class="d-flex align-items-center gap-2 text-decoration-none">${brandHtml()}</a></div>
    <div class="sidebar-user">
      ${avatar(user)}
      <div class="min-w-0"><div class="fw-semibold text-truncate">${escapeHtml(user.name)}</div><small>${escapeHtml(roleLabel(user.role))}</small></div>
    </div>
    <nav class="sidebar-nav" aria-label="Dashboard navigation">
      ${menu.map(item => {
        if (item.section) return `<div class="sidebar-section">${item.section}</div>`;
        const active = isCurrentPage(item.href);
        const badge = item.badge && badgeValue[item.badge] ? `<span class="badge rounded-pill bg-danger ms-auto">${badgeValue[item.badge]}</span>` : "";
        return `<a class="sidebar-link ${active ? "active" : ""}" ${active ? 'aria-current="page"' : ""} href="${ROOT + item.href}"><i class="bi bi-${item.icon}"></i><span>${item.label}</span>${badge}</a>`;
      }).join("")}
      <button class="sidebar-link w-100 border-0 bg-transparent text-start mt-2" data-action="logout"><i class="bi bi-box-arrow-right"></i><span>Log out</span></button>
    </nav>`;

  if (topbar) {
    topbar.className = "topbar";
    topbar.innerHTML = `
      <button class="btn btn-icon" id="sidebarToggle" aria-label="Toggle sidebar" aria-controls="sidebar"><i class="bi bi-list fs-4"></i></button>
      <div class="me-auto min-w-0">
        <h1 class="h5 mb-0 text-truncate">${escapeHtml(document.body.dataset.title || "Dashboard")}</h1>
        <small class="text-muted d-none d-sm-block">${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</small>
      </div>
      ${notificationBell(user)}
      ${userDropdown(user)}`;
  }
}

/* Sidebar toggle + backdrop (set up once per page) */
function setupSidebarToggle() {
  if (document.body.dataset.layout !== "dashboard") return;
  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
  if (localStorage.getItem("cms_sidebar_collapsed") === "true") document.body.classList.add("sidebar-collapsed");

  // event delegation, so it still works after the topbar is re-rendered
  document.addEventListener("click", event => {
    const btn = event.target.closest("#sidebarToggle");
    if (!btn) return;
    if (window.innerWidth < 992) {
      document.body.classList.toggle("sidebar-open");
    } else {
      document.body.classList.toggle("sidebar-collapsed");
      localStorage.setItem("cms_sidebar_collapsed", document.body.classList.contains("sidebar-collapsed"));
    }
  });
}

/* Re-draw navbar/sidebar (e.g. after reading announcements or editing the profile) */
function refreshLayout() {
  renderNavbar();
  renderSidebar();
}

function renderFooter() {
  const footer = document.getElementById("footer");
  if (!footer) return;
  const year = new Date().getFullYear();
  if (document.body.dataset.layout === "dashboard") {
    footer.className = "dashboard-footer";
    footer.innerHTML = `<span>&copy; ${year} JNEC Club Management System</span>
      <span class="text-muted">Jigme Namgyel Engineering College, Dewathang</span>`;
    return;
  }
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-5">
          <div class="d-flex align-items-center gap-2 mb-3">${brandHtml()}</div>
          <p class="small opacity-75 mb-0">A centralised platform for JNEC students to explore clubs, join activities, register for events and stay connected with campus life.</p>
        </div>
        <div class="col-6 col-lg-3">
          <h2 class="h6 text-uppercase small fw-bold">Quick links</h2>
          <ul class="list-unstyled small">
            <li><a href="${ROOT}clubs.html">Browse clubs</a></li>
            <li><a href="${ROOT}events.html">Upcoming events</a></li>
            <li><a href="${ROOT}register.html">Create an account</a></li>
            <li><a href="${ROOT}login.html">Log in</a></li>
          </ul>
        </div>
        <div class="col-6 col-lg-4">
          <h2 class="h6 text-uppercase small fw-bold">Contact</h2>
          <ul class="list-unstyled small opacity-75">
            <li><i class="bi bi-geo-alt me-2"></i>Dewathang, Samdrup Jongkhar, Bhutan</li>
            <li><i class="bi bi-building me-2"></i>Royal University of Bhutan</li>
            <li><i class="bi bi-envelope me-2"></i>clubs@jnec.edu.bt</li>
          </ul>
        </div>
      </div>
      <hr class="border-light opacity-25">
      <p class="small opacity-75 mb-0 text-center">&copy; ${year} Jigme Namgyel Engineering College · Club Management System</p>
    </div>`;
}

/* Show a one-time toast when a member has new announcements */
function notifyNewAnnouncements() {
  const user = getCurrentUser();
  if (!user || user.role !== "member") return;
  const unread = getUnreadAnnouncements(user);
  const alreadyShown = sessionStorage.getItem("cms_announce_toast") === String(unread.length);
  if (unread.length && !alreadyShown) {
    showToast(`You have ${unread.length} unread announcement${unread.length > 1 ? "s" : ""}.`, "info");
    sessionStorage.setItem("cms_announce_toast", String(unread.length));
  }
}

/* =========================================================
   PAGE START-UP
   Each JS file registers its page functions with
   registerPage("page-name", fn). The <body data-page="...">
   attribute decides which one runs.
   ========================================================= */
const PAGE_INIT = {};
function registerPage(name, fn) { PAGE_INIT[name] = fn; }

document.addEventListener("DOMContentLoaded", () => {
  if (!guardPage()) return;          // auth.js — stop if redirecting
  renderNavbar();
  renderSidebar();
  renderFooter();
  setupSidebarToggle();

  // logout buttons (navbar, sidebar, dropdowns)
  document.addEventListener("click", event => {
    if (event.target.closest('[data-action="logout"]')) logout();
  });

  showFlash();
  const init = PAGE_INIT[document.body.dataset.page];
  if (init) init();
  notifyNewAnnouncements();
});