/* =========================================================
   events.js — Event listing, event details, registration
   ========================================================= */

/* Can this user register for this event? Returns { ok, reason } */
function checkRegistration(ev, user) {
  const status = getEventStatus(ev);
  if (status === "cancelled") return { ok: false, reason: "This event has been cancelled." };
  if (status === "completed") return { ok: false, reason: "This event has already taken place." };
  if (!user) return { ok: false, reason: "login" };
  if (user.role !== "member") return { ok: false, reason: "Only student members can register for events." };
  if (isRegistered(user.id, ev.id)) return { ok: false, reason: "registered" };
  if (seatsLeft(ev) <= 0) return { ok: false, reason: "This event is full." };
  if (!ev.openToAll && !getUserClubIds(user.id).includes(ev.clubId)) {
    return { ok: false, reason: "This event is for club members only. Join the club first." };
  }
  return { ok: true };
}

async function registerForEvent(eventId) {
  const ev = getEvent(eventId);
  const user = getCurrentUser();
  const check = checkRegistration(ev, user);
  if (check.reason === "login") {
    setFlash("Please log in to register for events.", "warning");
    const target = new URL(ROOT + "event-details.html?id=" + ev.id, window.location.href);
    window.location.href = ROOT + "login.html?redirect=" + encodeURIComponent(target.pathname + target.search);
    return false;
  }
  if (!check.ok) { showToast(check.reason === "registered" ? "You are already registered." : check.reason, "warning"); return false; }

  const ok = await confirmDialog("Confirm registration",
    `Register for "${ev.title}" on ${formatDate(ev.date)} at ${formatTime(ev.time)}, ${ev.venue}?`, "Register", "primary");
  if (!ok) return false;
  DB.add("registrations", { id: uid("r"), eventId: ev.id, userId: user.id, registeredOn: todayStr() });
  logActivity(user.id, `Registered for ${ev.title}`);
  showToast(`You're registered for ${ev.title}!`);
  return true;
}

async function cancelRegistration(eventId) {
  const ev = getEvent(eventId);
  const user = getCurrentUser();
  const ok = await confirmDialog("Cancel registration?", `Your seat for "${ev.title}" will be released for other students.`, "Cancel registration");
  if (!ok) return false;
  DB.removeWhere("registrations", r => r.eventId === eventId && r.userId === user.id);
  logActivity(user.id, `Cancelled registration for ${ev.title}`);
  showToast("Registration cancelled.", "info");
  return true;
}

/* Button shown on cards + details page */
function eventActionButton(ev, user, size = "sm") {
  const check = checkRegistration(ev, user);
  if (check.reason === "registered") {
    return `<button class="btn btn-${size} btn-outline-danger" data-cancel-event="${ev.id}"><i class="bi bi-x-circle me-1"></i>Cancel registration</button>`;
  }
  if (check.ok || check.reason === "login") {
    return `<button class="btn btn-${size} btn-primary" data-register-event="${ev.id}"><i class="bi bi-check2-square me-1"></i>Register</button>`;
  }
  return `<button class="btn btn-${size} btn-secondary" disabled title="${escapeHtml(check.reason)}">${getEventStatus(ev) === "upcoming" ? "Unavailable" : capitalize(getEventStatus(ev))}</button>`;
}

/* Wire up register/cancel buttons inside a container, then call onChange */
function bindEventButtons(container, onChange) {
  container.addEventListener("click", async e => {
    const reg = e.target.closest("[data-register-event]");
    const cancel = e.target.closest("[data-cancel-event]");
    if (reg && await registerForEvent(reg.dataset.registerEvent)) onChange();
    if (cancel && await cancelRegistration(cancel.dataset.cancelEvent)) onChange();
  });
}

function eventCard(ev, user) {
  const club = getClub(ev.clubId);
  const dm = dayAndMonth(ev.date);
  const taken = getEventRegistrations(ev.id).length;
  const pct = Math.min(100, Math.round((taken / ev.capacity) * 100));
  const status = getEventStatus(ev);
  return `
    <div class="col-md-6 col-xl-4">
      <article class="card event-card h-100 ${status !== "upcoming" ? "event-past" : ""}">
        <div class="card-body d-flex flex-column">
          <div class="d-flex gap-3 mb-3">
            <span class="date-chip"><strong>${dm.day}</strong><small>${dm.month}</small></span>
            <div class="min-w-0">
              <div class="d-flex flex-wrap gap-1 mb-1">
                <span class="badge text-bg-light">${escapeHtml(ev.category)}</span>
                ${status !== "upcoming" ? statusBadge(status) : ""}
                ${!ev.openToAll ? `<span class="badge text-bg-warning"><i class="bi bi-lock-fill"></i> Members only</span>` : ""}
                ${user && isRegistered(user.id, ev.id) ? `<span class="badge text-bg-success"><i class="bi bi-check2"></i> Registered</span>` : ""}
              </div>
              <h3 class="h6 mb-0"><a class="text-reset text-decoration-none" href="${ROOT}event-details.html?id=${ev.id}">${escapeHtml(ev.title)}</a></h3>
              <small class="text-muted">${escapeHtml(club ? club.name : "")}</small>
            </div>
          </div>
          <ul class="list-unstyled small text-muted mb-3">
            <li><i class="bi bi-clock me-2"></i>${formatDate(ev.date)}, ${formatTime(ev.time)}</li>
            <li><i class="bi bi-geo-alt me-2"></i>${escapeHtml(ev.venue)}</li>
          </ul>
          <div class="mt-auto">
            <div class="d-flex justify-content-between small mb-1"><span>${taken}/${ev.capacity} registered</span><span class="text-muted">${seatsLeft(ev)} seats left</span></div>
            <div class="progress mb-3" style="height:6px" role="progressbar" aria-label="Seats taken" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${pct >= 90 ? "bg-danger" : ""}" style="width:${pct}%"></div></div>
            <div class="d-flex gap-2 flex-wrap">
              <a class="btn btn-sm btn-outline-secondary" href="${ROOT}event-details.html?id=${ev.id}">Details</a>
              ${status === "upcoming" ? eventActionButton(ev, user) : ""}
            </div>
          </div>
        </div>
      </article>
    </div>`;
}

/* ---------------- Events listing page ---------------- */
registerPage("events", () => {
  const user = getCurrentUser();
  const search = document.getElementById("eventSearch");
  const club = document.getElementById("eventClub");
  const category = document.getElementById("eventCategory");
  const status = document.getElementById("eventStatus");
  const sort = document.getElementById("eventSort");
  const grid = document.getElementById("eventGrid");
  const count = document.getElementById("eventCount");

  club.innerHTML += db.clubs.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  category.innerHTML += EVENT_CATEGORIES.map(c => `<option>${c}</option>`).join("");
  if (getParam("club")) club.value = getParam("club");

  function render() {
    const q = search.value.trim().toLowerCase();
    const list = db.events
      .filter(e => !q || (e.title + " " + e.description + " " + e.venue).toLowerCase().includes(q))
      .filter(e => !club.value || e.clubId === club.value)
      .filter(e => !category.value || e.category === category.value)
      .filter(e => {
        if (status.value === "all") return true;
        if (status.value === "registered") return user && isRegistered(user.id, e.id);
        return getEventStatus(e) === status.value;
      })
      .sort((a, b) => {
        if (sort.value === "date-desc") return b.date.localeCompare(a.date);
        if (sort.value === "title") return a.title.localeCompare(b.title);
        if (sort.value === "seats") return seatsLeft(b) - seatsLeft(a);
        return a.date.localeCompare(b.date);
      });

    count.textContent = `${list.length} event${list.length === 1 ? "" : "s"}`;
    grid.innerHTML = list.length ? list.map(e => eventCard(e, user)).join("")
      : `<div class="col-12">${emptyState("calendar-x", "No events found", "Try changing the filters or check back later.")}</div>`;
  }

  // "My registrations" filter only makes sense for logged-in students
  if (user && user.role === "member") status.innerHTML += `<option value="registered">My registrations</option>`;
  if (getParam("status") && status.querySelector(`option[value="${getParam("status")}"]`)) status.value = getParam("status");

  [search, club, category, status, sort].forEach(el => el.addEventListener("input", render));
  bindEventButtons(grid, render);
  render();
});

/* ---------------- Event details page ---------------- */
registerPage("event-details", () => {
  const ev = getEvent(getParam("id"));
  const container = document.getElementById("eventDetails");
  if (!ev) {
    container.innerHTML = emptyState("question-circle", "Event not found", "This event does not exist or was removed.", `<a class="btn btn-primary btn-sm" href="events.html">Back to events</a>`);
    return;
  }
  document.title = ev.title + " | JNEC Clubs";

  function render() {
    const user = getCurrentUser();
    const club = getClub(ev.clubId);
    const status = getEventStatus(ev);
    const taken = getEventRegistrations(ev.id).length;
    const pct = Math.min(100, Math.round((taken / ev.capacity) * 100));
    const check = checkRegistration(ev, user);
    const more = db.events.filter(e => e.clubId === ev.clubId && e.id !== ev.id && getEventStatus(e) === "upcoming").slice(0, 3);

    let regMessage = "";
    if (check.reason === "registered") regMessage = `<div class="alert alert-success small"><i class="bi bi-check-circle-fill me-1"></i>You are registered for this event.</div>`;
    else if (check.reason === "login") regMessage = `<p class="small text-muted">Log in as a student to register.</p>`;
    else if (!check.ok) regMessage = `<div class="alert alert-warning small mb-3">${escapeHtml(check.reason)}</div>`;

    container.innerHTML = `
      <nav aria-label="breadcrumb"><ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.html">Home</a></li>
        <li class="breadcrumb-item"><a href="events.html">Events</a></li>
        <li class="breadcrumb-item active" aria-current="page">${escapeHtml(ev.title)}</li>
      </ol></nav>
      <div class="row g-4">
        <div class="col-lg-8">
          <article class="card">
            <div class="event-banner" style="--club-color:${club ? club.color : "#16325c"}">
              ${clubLogoSrc(club) ? `<img class="event-banner-logo" src="${escapeHtml(clubLogoSrc(club))}" alt="">` : `<i class="bi bi-${club ? DEFAULT_CLUB_ICON : "calendar-event"}"></i>`}
            </div>
            <div class="card-body p-4">
              <div class="d-flex flex-wrap gap-2 mb-2">
                <span class="badge text-bg-light">${escapeHtml(ev.category)}</span>${statusBadge(status)}
                ${ev.openToAll ? `<span class="badge text-bg-info">Open to all students</span>` : `<span class="badge text-bg-warning">Club members only</span>`}
              </div>
              <h1 class="h3 fw-bold">${escapeHtml(ev.title)}</h1>
              <p class="text-muted">Organised by <a href="club-details.html?id=${ev.clubId}">${escapeHtml(club ? club.name : "Unknown club")}</a></p>
              <div class="row g-3 my-2">
                <div class="col-sm-4"><div class="info-tile"><i class="bi bi-calendar3"></i><small>Date</small><strong>${formatDate(ev.date)}</strong></div></div>
                <div class="col-sm-4"><div class="info-tile"><i class="bi bi-clock"></i><small>Time</small><strong>${formatTime(ev.time)}</strong></div></div>
                <div class="col-sm-4"><div class="info-tile"><i class="bi bi-geo-alt"></i><small>Venue</small><strong>${escapeHtml(ev.venue)}</strong></div></div>
              </div>
              <h2 class="h5 mt-4">About this event</h2>
              <p class="mb-0" style="white-space:pre-line">${escapeHtml(ev.description)}</p>
            </div>
          </article>
        </div>
        <div class="col-lg-4">
          <section class="card mb-4 sticky-lg-top" style="top:90px"><div class="card-body">
            <h2 class="h6 section-title">Registration</h2>
            <div class="d-flex justify-content-between small mb-1"><span>${taken} of ${ev.capacity} seats taken</span><strong>${pct}%</strong></div>
            <div class="progress mb-3" role="progressbar" aria-label="Seats taken" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${pct >= 90 ? "bg-danger" : ""}" style="width:${pct}%"></div></div>
            ${regMessage}
            <div class="d-grid">${status === "upcoming" ? eventActionButton(ev, user, "md") : `<button class="btn btn-secondary" disabled>Registration closed</button>`}</div>
            ${!ev.openToAll && user && user.role === "member" && !getUserClubIds(user.id).includes(ev.clubId)
              ? `<button class="btn btn-link btn-sm w-100 mt-2" data-join="${ev.clubId}">Apply to join ${escapeHtml(club.name)}</button>` : ""}
          </div></section>
          <section class="card"><div class="card-body">
            <h2 class="h6 section-title">More from this club</h2>
            ${more.length ? more.map(e => `<a class="d-block mb-2 small" href="event-details.html?id=${e.id}"><i class="bi bi-calendar-event me-1"></i>${escapeHtml(e.title)} <span class="text-muted">· ${formatDate(e.date)}</span></a>`).join("")
              : `<p class="small text-muted mb-0">No other upcoming events.</p>`}
          </div></section>
        </div>
      </div>`;
  }

  bindEventButtons(container, render);
  render();
});