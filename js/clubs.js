/* =========================================================
   clubs.js — Club listing, club details, join club, my clubs
   ========================================================= */

function clubUpcomingEvents(clubId) {
  return db.events
    .filter(e => e.clubId === clubId && getEventStatus(e) === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* Membership button/badge shown on club cards and the details page */
function membershipAction(club, user, size = "sm") {
  const btn = `btn btn-${size}`;
  // Secretaries/admins don't join clubs — show a shortcut to manage it instead
  if (user && user.role !== "member") {
    return getManagedClubIds(user).includes(club.id)
      ? `<a class="${btn} btn-outline-primary" href="${ROOT}secretary/members.html"><i class="bi bi-gear me-1"></i>Manage</a>`
      : "";
  }
  const m = user ? getMembership(user.id, club.id) : null;
  if (m && m.status === "approved") return `<span class="${btn} btn-success disabled" aria-disabled="true"><i class="bi bi-check2-circle me-1"></i>Member</span>`;
  if (m && m.status === "pending") return `<span class="${btn} btn-warning disabled" aria-disabled="true"><i class="bi bi-hourglass-split me-1"></i>Pending</span>`;
  return `<button class="${btn} btn-primary" data-join="${club.id}"><i class="bi bi-person-plus me-1"></i>${m && m.status === "rejected" ? "Apply again" : "Join club"}</button>`;
}

/* Called when any "Join club" button is clicked */
function handleJoinClick(clubId) {
  const user = getCurrentUser();
  const joinPage = ROOT + "member/join-club.html?club=" + clubId;
  if (!user) {
    setFlash("Please log in or register to join a club.", "warning");
    const target = new URL(joinPage, window.location.href);
    window.location.href = ROOT + "login.html?redirect=" + encodeURIComponent(target.pathname + target.search);
    return;
  }
  if (user.role !== "member") {
    showToast("Only student members can apply to join clubs.", "warning");
    return;
  }
  window.location.href = joinPage;
}
document.addEventListener("click", event => {
  const btn = event.target.closest("[data-join]");
  if (btn) handleJoinClick(btn.dataset.join);
});

function clubCard(club, user) {
  const members = getApprovedMembers(club.id).length;
  const upcoming = clubUpcomingEvents(club.id).length;
  return `
    <div class="col-sm-6 col-lg-4 col-xl-3">
      <article class="card club-card h-100">
        <div class="club-card-top" style="--club-color:${club.color}">
          ${clubLogo(club)}
          <span class="badge bg-light text-dark">${escapeHtml(club.category)}</span>
        </div>
        <div class="card-body d-flex flex-column">
          <h3 class="h6 card-title mb-1"><a class="text-reset text-decoration-none" href="${ROOT}club-details.html?id=${club.id}">${escapeHtml(club.name)}</a></h3>
          <p class="small text-muted club-desc">${escapeHtml(club.description)}</p>
          <div class="d-flex gap-3 small text-muted mt-auto mb-3">
            <span><i class="bi bi-people me-1"></i>${members} member${members === 1 ? "" : "s"}</span>
            <span><i class="bi bi-calendar-event me-1"></i>${upcoming} upcoming</span>
          </div>
          <div class="d-flex gap-2">
            <a class="btn btn-sm btn-outline-secondary" href="${ROOT}club-details.html?id=${club.id}">Details</a>
            ${membershipAction(club, user)}
          </div>
        </div>
      </article>
    </div>`;
}

/* ---------------- Club listing page ---------------- */
registerPage("clubs", () => {
  const user = getCurrentUser();
  const search = document.getElementById("clubSearch");
  const category = document.getElementById("clubCategory");
  const sort = document.getElementById("clubSort");
  const grid = document.getElementById("clubGrid");
  const count = document.getElementById("clubCount");

  category.innerHTML += CLUB_CATEGORIES.map(c => `<option>${c}</option>`).join("");
  if (getParam("category")) category.value = getParam("category");
  if (getParam("q")) search.value = getParam("q");

  function render() {
    const q = search.value.trim().toLowerCase();
    let clubs = db.clubs.filter(c => c.status === "active")
      .filter(c => !category.value || c.category === category.value)
      .filter(c => !q || (c.name + " " + c.description + " " + c.category).toLowerCase().includes(q));

    const sorters = {
      "name-asc": (a, b) => a.name.localeCompare(b.name),
      "name-desc": (a, b) => b.name.localeCompare(a.name),
      "members": (a, b) => getApprovedMembers(b.id).length - getApprovedMembers(a.id).length,
      "events": (a, b) => clubUpcomingEvents(b.id).length - clubUpcomingEvents(a.id).length
    };
    clubs.sort(sorters[sort.value]);

    count.textContent = `${clubs.length} club${clubs.length === 1 ? "" : "s"} found`;
    grid.innerHTML = clubs.length
      ? clubs.map(c => clubCard(c, user)).join("")
      : `<div class="col-12">${emptyState("search", "No clubs match your search", "Try a different keyword or category.", '<button class="btn btn-sm btn-primary" id="resetClubFilters">Clear filters</button>')}</div>`;
  }

  [search, category, sort].forEach(el => el.addEventListener("input", render));
  grid.addEventListener("click", e => {
    if (e.target.id === "resetClubFilters") { search.value = ""; category.value = ""; render(); }
  });
  render();
});

/* ---------------- Club details page ---------------- */
registerPage("club-details", () => {
  const club = getClub(getParam("id"));
  const main = document.getElementById("clubDetails");
  if (!club) {
    main.innerHTML = emptyState("question-circle", "Club not found", "The club you are looking for does not exist or was removed.", `<a class="btn btn-primary btn-sm" href="clubs.html">Back to clubs</a>`);
    return;
  }
  document.title = club.name + " | JNEC Clubs";
  const user = getCurrentUser();
  const secretary = club.secretaryId ? getUser(club.secretaryId) : null;
  const members = getApprovedMembers(club.id);
  const upcoming = clubUpcomingEvents(club.id);
  const membership = user ? getMembership(user.id, club.id) : null;
  const isMember = membership && membership.status === "approved";
  const canSeeNews = isMember || (user && getManagedClubIds(user).includes(club.id));
  const news = db.announcements.filter(a => a.clubId === club.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const activities = (club.activities || []).slice().sort((a, b) => b.date.localeCompare(a.date));

  document.getElementById("clubHero").innerHTML = `
    <div class="club-hero" style="--club-color:${club.color}">
      <div class="container">
        <nav aria-label="breadcrumb"><ol class="breadcrumb breadcrumb-light mb-3">
          <li class="breadcrumb-item"><a href="index.html">Home</a></li>
          <li class="breadcrumb-item"><a href="clubs.html">Clubs</a></li>
          <li class="breadcrumb-item active" aria-current="page">${escapeHtml(club.name)}</li>
        </ol></nav>
        <div class="d-flex flex-column flex-md-row gap-3 align-items-md-center">
          ${clubLogo(club, "club-icon-lg")}
          <div class="flex-grow-1">
            <span class="badge bg-light text-dark mb-2">${escapeHtml(club.category)}</span>
            <h1 class="h2 fw-bold mb-1">${escapeHtml(club.name)}</h1>
            <p class="mb-0 opacity-75"><i class="bi bi-people me-1"></i>${members.length} members</p>
          </div>
          <div>${membershipAction(club, user, "lg")}</div>
        </div>
      </div>
    </div>`;

  main.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-8">
        <section class="card mb-4"><div class="card-body">
          <h2 class="h5 section-title">About the club</h2>
          <p>${escapeHtml(club.description)}</p>
          <h3 class="h6 mt-4"><i class="bi bi-bullseye text-primary me-2"></i>Objectives</h3>
          <p class="text-muted mb-0">${escapeHtml(club.objectives)}</p>
        </div></section>

        <section class="card mb-4"><div class="card-body">
          <h2 class="h5 section-title">Upcoming events</h2>
          ${upcoming.length ? `<div class="list-group list-group-flush">${upcoming.map(e => {
            const dm = dayAndMonth(e.date);
            return `<a href="event-details.html?id=${e.id}" class="list-group-item list-group-item-action d-flex gap-3 align-items-center px-0">
              <span class="date-chip"><strong>${dm.day}</strong><small>${dm.month}</small></span>
              <span class="flex-grow-1"><span class="fw-semibold d-block">${escapeHtml(e.title)}</span>
              <small class="text-muted"><i class="bi bi-clock me-1"></i>${formatTime(e.time)} · <i class="bi bi-geo-alt me-1"></i>${escapeHtml(e.venue)}</small></span>
              <i class="bi bi-chevron-right text-muted"></i></a>`;
          }).join("")}</div>` : emptyState("calendar-x", "No upcoming events", "Check back soon for new activities.")}
        </div></section>

        <section class="card mb-4"><div class="card-body">
          <h2 class="h5 section-title">Recent activities</h2>
          ${activities.length ? `<ul class="timeline list-unstyled mb-0">${activities.map(a => `
            <li><span class="small text-muted">${formatDate(a.date)}</span>
              <div class="fw-semibold">${escapeHtml(a.title)}</div>
              <p class="small text-muted mb-0">${escapeHtml(a.description)}</p></li>`).join("")}</ul>`
            : emptyState("journal", "No activities recorded yet", "The club secretary will post activities here.")}
        </div></section>
      </div>

      <div class="col-lg-4">
        <section class="card mb-4"><div class="card-body">
          <h2 class="h6 section-title">Club information</h2>
          <ul class="list-unstyled info-list mb-0">
            <li><i class="bi bi-calendar-week"></i><span><small>Meetings</small>${escapeHtml(club.meeting)}</span></li>
            <li><i class="bi bi-geo-alt"></i><span><small>Venue</small>${escapeHtml(club.venue)}</span></li>
            <li><i class="bi bi-person-badge"></i><span><small>Faculty advisor</small>${escapeHtml(club.advisor)}</span></li>
            <li><i class="bi bi-person-workspace"></i><span><small>Club secretary</small>${secretary ? escapeHtml(secretary.name) : "Not assigned"}</span></li>
          </ul>
        </div></section>

        <section class="card mb-4"><div class="card-body">
          <h2 class="h6 section-title">Your membership</h2>
          ${!user ? `<p class="small text-muted">Log in as a student to apply for membership.</p><a class="btn btn-primary btn-sm" href="login.html">Log in</a>`
            : membership ? `<p class="mb-2">Status: ${statusBadge(membership.status)}</p><p class="small text-muted mb-0">Applied on ${formatDate(membership.appliedOn)}</p>`
            : user.role === "member" ? `<p class="small text-muted">You are not a member of this club yet.</p>${membershipAction(club, user)}`
            : `<p class="small text-muted mb-0">You are logged in as ${escapeHtml(roleLabel(user.role))}.</p>`}
        </div></section>

        <section class="card mb-4"><div class="card-body">
          <h2 class="h6 section-title">Club announcements</h2>
          ${!canSeeNews ? `<p class="small text-muted mb-0"><i class="bi bi-lock me-1"></i>Announcements are visible to club members only.</p>`
            : news.length ? news.map(a => `<div class="border-start border-3 ps-3 mb-3 ${a.priority === "important" ? "border-danger" : "border-primary"}">
                <div class="fw-semibold small">${escapeHtml(a.title)}</div>
                <small class="text-muted">${formatDate(a.date)}</small></div>`).join("")
            : `<p class="small text-muted mb-0">No announcements yet.</p>`}
        </div></section>
      </div>
    </div>`;
});

/* ---------------- Join club page (member) ---------------- */
registerPage("join-club", () => {
  const user = getCurrentUser();
  const form = document.getElementById("joinForm");
  const select = form.clubId;
  const preview = document.getElementById("clubPreview");
  const reason = form.reason;
  const counter = document.getElementById("reasonCount");

  function fillClubOptions() {
    // only clubs the student hasn't joined and isn't waiting for
    const available = db.clubs.filter(c => {
      const m = getMembership(user.id, c.id);
      return c.status === "active" && (!m || m.status === "rejected");
    });
    select.innerHTML = `<option value="">Choose a club…</option>` +
      available.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    return available;
  }

  function showPreview() {
    const club = getClub(select.value);
    preview.innerHTML = club ? `
      <div class="d-flex gap-3 align-items-start">
        ${clubLogo(club)}
        <div><h2 class="h6 mb-1">${escapeHtml(club.name)}</h2>
          <p class="small text-muted mb-2">${escapeHtml(club.description)}</p>
          <p class="small mb-0"><strong>Objectives:</strong> ${escapeHtml(club.objectives)}</p></div>
      </div>` : `<p class="text-muted small mb-0"><i class="bi bi-info-circle me-1"></i>Select a club to see its description and objectives.</p>`;
  }

  function renderApplications() {
    const list = db.memberships.filter(m => m.userId === user.id).sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));
    const body = document.getElementById("applicationsBody");
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="5">${emptyState("inbox", "No applications yet", "Your membership applications will appear here.")}</td></tr>`;
      return;
    }
    body.innerHTML = list.map(m => {
      const club = getClub(m.clubId);
      return `<tr>
        <td><a href="${ROOT}club-details.html?id=${m.clubId}">${escapeHtml(club ? club.name : "Deleted club")}</a></td>
        <td>${formatDate(m.appliedOn)}</td>
        <td>${statusBadge(m.status)}</td>
        <td>${m.decidedOn ? formatDate(m.decidedOn) : "-"}</td>
        <td class="text-end">${m.status === "pending" ? `<button class="btn btn-sm btn-outline-danger" data-withdraw="${m.id}"><i class="bi bi-x-lg me-1"></i>Withdraw</button>` : ""}</td>
      </tr>`;
    }).join("");
  }

  const available = fillClubOptions();
  const requested = getParam("club");
  if (requested) {
    const m = getMembership(user.id, requested);
    if (m && m.status !== "rejected") showToast(`You already have a ${m.status} membership for ${getClub(requested)?.name}.`, "info");
    else if (available.some(c => c.id === requested)) select.value = requested;
  }
  showPreview();
  renderApplications();

  select.addEventListener("change", showPreview);
  reason.addEventListener("input", () => { counter.textContent = `${reason.value.length}/500`; });

  setupForm(form, values => {
    const club = getClub(values.clubId);
    DB.add("memberships", {
      id: uid("m"), userId: user.id, clubId: club.id, status: "pending",
      reason: values.reason.trim(), interests: values.interests.trim(), availability: values.availability,
      appliedOn: todayStr(), decidedOn: null
    });
    logActivity(user.id, `Applied to join ${club.name}`);
    showToast(`Application sent to ${club.name}. The club secretary will review it.`);
    resetForm(form);
    counter.textContent = "0/500";
    fillClubOptions();
    showPreview();
    renderApplications();
  });

  document.getElementById("applicationsBody").addEventListener("click", async e => {
    const btn = e.target.closest("[data-withdraw]");
    if (!btn) return;
    if (!(await confirmDialog("Withdraw application?", "Your membership request will be cancelled. You can apply again later.", "Withdraw"))) return;
    DB.remove("memberships", btn.dataset.withdraw);
    showToast("Application withdrawn.", "info");
    fillClubOptions(); showPreview(); renderApplications();
  });
});

/* ---------------- My clubs page (member) ---------------- */
registerPage("my-clubs", () => {
  const user = getCurrentUser();
  const grid = document.getElementById("myClubGrid");
  const others = document.getElementById("otherApplications");

  function render() {
    const approved = db.memberships.filter(m => m.userId === user.id && m.status === "approved");
    grid.innerHTML = approved.length ? approved.map(m => {
      const club = getClub(m.clubId);
      if (!club) return "";
      const next = clubUpcomingEvents(club.id)[0];
      const clubEventIds = db.events.filter(e => e.clubId === club.id).map(e => e.id);
      const rate = attendanceRate(getUserAttendance(user.id).filter(a => clubEventIds.includes(a.eventId)));
      return `<div class="col-md-6 col-xl-4">
        <article class="card h-100 club-card">
          <div class="club-card-top" style="--club-color:${club.color}">
            ${clubLogo(club)}${statusBadge("approved")}
          </div>
          <div class="card-body">
            <h2 class="h6">${escapeHtml(club.name)}</h2>
            <ul class="list-unstyled small text-muted mb-3">
              <li><i class="bi bi-calendar-check me-2"></i>Member since ${formatDate(m.decidedOn || m.appliedOn)}</li>
              <li><i class="bi bi-clock me-2"></i>${escapeHtml(club.meeting)}</li>
              <li><i class="bi bi-calendar-event me-2"></i>Next: ${next ? `<a href="${ROOT}event-details.html?id=${next.id}">${escapeHtml(next.title)}</a> (${formatDate(next.date)})` : "No upcoming events"}</li>
            </ul>
            <div class="small mb-1 d-flex justify-content-between"><span>Attendance</span><strong>${rate}%</strong></div>
            <div class="progress mb-3" role="progressbar" aria-label="Attendance rate" aria-valuenow="${rate}" aria-valuemin="0" aria-valuemax="100" style="height:6px"><div class="progress-bar" style="width:${rate}%"></div></div>
            <div class="d-flex gap-2">
              <a class="btn btn-sm btn-outline-primary" href="${ROOT}club-details.html?id=${club.id}">Open club</a>
              <button class="btn btn-sm btn-outline-danger" data-leave="${m.id}">Leave</button>
            </div>
          </div>
        </article></div>`;
    }).join("") : `<div class="col-12">${emptyState("people", "You haven't joined any clubs yet", "Explore JNEC clubs and apply to the ones you like.", `<a class="btn btn-primary btn-sm" href="${ROOT}clubs.html">Browse clubs</a>`)}</div>`;

    const rest = db.memberships.filter(m => m.userId === user.id && m.status !== "approved");
    others.innerHTML = rest.length ? rest.map(m => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${escapeHtml(getClub(m.clubId)?.name || "Deleted club")}<small class="d-block text-muted">Applied ${formatDate(m.appliedOn)}</small></span>
        ${statusBadge(m.status)}
      </li>`).join("") : `<li class="list-group-item small text-muted">No pending or rejected applications.</li>`;
  }

  grid.addEventListener("click", async e => {
    const btn = e.target.closest("[data-leave]");
    if (!btn) return;
    const m = DB.find("memberships", btn.dataset.leave);
    const club = getClub(m.clubId);
    if (!(await confirmDialog("Leave club?", `Are you sure you want to leave ${club.name}? You will stop receiving its announcements.`, "Leave club"))) return;
    DB.remove("memberships", m.id);
    logActivity(user.id, `Left ${club.name}`);
    showToast(`You left ${club.name}.`, "info");
    render();
  });
  render();
});

/* ---------------- Home / landing page ---------------- */
registerPage("home", () => {
  const user = getCurrentUser();
  const activeClubs = db.clubs.filter(c => c.status === "active");
  const upcoming = db.events.filter(e => getEventStatus(e) === "upcoming").sort((a, b) => a.date.localeCompare(b.date));

  document.getElementById("homeStatClubs").textContent = activeClubs.length;
  document.getElementById("homeStatMembers").textContent = db.memberships.filter(m => m.status === "approved").length;
  document.getElementById("homeStatEvents").textContent = upcoming.length;
  document.getElementById("homeStatStudents").textContent = db.users.filter(u => u.role === "member").length;

  // Hero buttons change when someone is logged in
  if (user) {
    document.getElementById("heroActions").innerHTML = `
      <a class="btn btn-accent btn-lg" href="${dashboardUrl(user.role)}"><i class="bi bi-speedometer2 me-2"></i>Go to my dashboard</a>
      <a class="btn btn-outline-light btn-lg" href="clubs.html">Explore clubs</a>`;
  }

  // Category chips
  document.getElementById("categoryChips").innerHTML = CLUB_CATEGORIES.map(c =>
    `<a class="category-chip" href="clubs.html?category=${encodeURIComponent(c)}">${escapeHtml(c)}</a>`).join("");

  // Popular clubs = most members
  const popular = activeClubs.slice().sort((a, b) => getApprovedMembers(b.id).length - getApprovedMembers(a.id).length).slice(0, 4);
  document.getElementById("featuredClubs").innerHTML = popular.map(c => clubCard(c, user)).join("");

  // Upcoming events (uses eventCard from events.js)
  const eventsBox = document.getElementById("homeEvents");
  eventsBox.innerHTML = upcoming.length ? upcoming.slice(0, 3).map(e => eventCard(e, user)).join("")
    : `<div class="col-12">${emptyState("calendar-x", "No upcoming events", "New events will be announced soon.")}</div>`;
  bindEventButtons(eventsBox, () => window.location.reload());

  // College-wide announcements are public
  const news = db.announcements.filter(a => !a.clubId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  document.getElementById("homeAnnouncements").innerHTML = news.length ? news.map(a => `
    <div class="col-md-4">
      <article class="card h-100 announcement-card ${a.priority === "important" ? "important" : ""}"><div class="card-body">
        <div class="d-flex justify-content-between mb-2"><small class="text-muted"><i class="bi bi-calendar3 me-1"></i>${formatDate(a.date)}</small>${a.priority === "important" ? statusBadge("important") : ""}</div>
        <h3 class="h6">${escapeHtml(a.title)}</h3>
        <p class="small text-muted mb-0">${escapeHtml(a.message)}</p>
      </div></article>
    </div>`).join("") : `<div class="col-12">${emptyState("megaphone", "No announcements", "College-wide notices will appear here.")}</div>`;

  // Hero search sends the keyword to the clubs page
  document.getElementById("heroSearch").addEventListener("submit", e => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    window.location.href = "clubs.html" + (q ? "?q=" + encodeURIComponent(q) : "");
  });
});