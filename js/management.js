/* =========================================================
   management.js — Club Secretary pages
   (members, events, attendance, announcements and reports
   are also used by the System Administrator, who sees ALL
   clubs instead of just one)
   ========================================================= */

/* Club logo upload (admin "All Clubs" and secretary "Club Profile").
   The picture is shrunk to fit 200×200 px and saved with the club. */
function setupLogoInput(form, onChange = () => {}) {
  const fileInput = document.getElementById("cLogoFile");
  const preview = document.getElementById("logoPreview");
  const removeBtn = document.getElementById("removeLogo");

  function refresh() {
    preview.innerHTML = clubLogo({ logo: form.logo.value, color: form.color.value }, "club-icon-lg");
    removeBtn.classList.toggle("d-none", !form.logo.value);
    onChange();
  }
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = ""; // allow choosing the same file again
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("Please choose an image file (PNG or JPG).", "danger"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("The image is too large. The maximum size is 5 MB.", "danger"); return; }
    try {
      form.logo.value = await resizeImage(file, 200);
      refresh();
      showToast("Logo added. Remember to save.", "info");
    } catch (err) {
      showToast("This image could not be read. Please try another file.", "danger");
    }
  });
  removeBtn.addEventListener("click", () => { form.logo.value = ""; refresh(); });
  form.color.addEventListener("input", refresh);
  return { refresh };
}

// Shrink an image to fit inside size × size pixels (keeps browser storage small)
function resizeImage(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(size / img.width, size / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unreadable image")); };
    img.src = url;
  });
}

/* Fill a <select> with the clubs the current user manages.
   If there is only one club (secretary), the filter is hidden. */
function fillClubScope(select, user, allLabel = "All my clubs") {
  const ids = getManagedClubIds(user);
  select.innerHTML = (ids.length > 1 ? `<option value="">${allLabel}</option>` : "") +
    ids.map(id => `<option value="${id}">${escapeHtml(getClub(id)?.name || "")}</option>`).join("");
  if (ids.length <= 1) select.closest(".scope-filter")?.classList.add("d-none");
  return ids;
}
// Club ids selected in a scope filter (empty value = all managed clubs)
function scopeIds(select, user) {
  return select.value ? [select.value] : getManagedClubIds(user);
}

/* Secretaries without an assigned club can't manage anything */
function ensureManagedClub(user) {
  if (getManagedClubIds(user).length) return true;
  document.querySelector("main").innerHTML = emptyState("exclamation-diamond", "No club assigned",
    "Your account is not linked to a club yet. Please ask the system administrator to assign you to a club.");
  return false;
}

/* Approve or reject a membership request */
function decideMembership(membershipId, status) {
  const user = getCurrentUser();
  const m = DB.update("memberships", membershipId, { status, decidedOn: todayStr() });
  const student = getUser(m.userId);
  const club = getClub(m.clubId);
  logActivity(user.id, `${status === "approved" ? "Approved" : "Rejected"} membership of ${student?.name} (${club?.name})`);
  showToast(`${student?.name}'s request ${status}.`, status === "approved" ? "success" : "info");
}

/* =========================================================
   SECRETARY DASHBOARD
   ========================================================= */
registerPage("sec-dashboard", () => {
  const user = getCurrentUser();
  if (!ensureManagedClub(user)) return;
  const club = getClub(user.clubId);

  function render() {
    const members = getApprovedMembers(club.id);
    const pending = db.memberships.filter(m => m.clubId === club.id && m.status === "pending");
    const clubEvents = db.events.filter(e => e.clubId === club.id);
    const upcoming = clubEvents.filter(e => getEventStatus(e) === "upcoming").sort((a, b) => a.date.localeCompare(b.date));
    const records = db.attendance.filter(a => clubEvents.some(e => e.id === a.eventId));

    document.getElementById("clubBanner").innerHTML = `
      <div class="d-flex flex-column flex-sm-row gap-3 align-items-sm-center">
        ${clubLogo(club, "club-icon-lg")}
        <div class="flex-grow-1">
          <p class="text-uppercase small fw-semibold mb-1 opacity-75">You manage</p>
          <h2 class="h4 mb-1">${escapeHtml(club.name)}</h2>
          <p class="mb-0 small opacity-75"><i class="bi bi-clock me-1"></i>${escapeHtml(club.meeting)} · <i class="bi bi-geo-alt me-1"></i>${escapeHtml(club.venue)}</p>
        </div>
        <a class="btn btn-light btn-sm" href="club.html"><i class="bi bi-pencil me-1"></i>Edit club profile</a>
      </div>`;

    document.getElementById("statMembers").textContent = members.length;
    document.getElementById("statPending").textContent = pending.length;
    document.getElementById("statUpcoming").textContent = upcoming.length;
    document.getElementById("statAttendance").textContent = attendanceRate(records) + "%";

    document.getElementById("pendingList").innerHTML = pending.length ? pending.map(m => {
      const s = getUser(m.userId);
      return `<li class="list-group-item">
        <div class="d-flex gap-2 align-items-start">
          ${avatar(s, "avatar-sm")}
          <div class="flex-grow-1 min-w-0">
            <div class="fw-semibold small">${escapeHtml(s?.name)}</div>
            <small class="text-muted d-block">${escapeHtml(s?.department)} · Applied ${formatDate(m.appliedOn)}</small>
            <small class="d-block text-truncate" title="${escapeHtml(m.reason)}">"${escapeHtml(m.reason)}"</small>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-success" data-approve="${m.id}" aria-label="Approve ${escapeHtml(s?.name)}"><i class="bi bi-check-lg"></i></button>
            <button class="btn btn-outline-danger" data-reject="${m.id}" aria-label="Reject ${escapeHtml(s?.name)}"><i class="bi bi-x-lg"></i></button>
          </div>
        </div></li>`;
    }).join("") : `<li class="list-group-item">${emptyState("inbox", "No pending requests", "New membership applications will appear here.")}</li>`;

    document.getElementById("upcomingList").innerHTML = upcoming.length ? upcoming.slice(0, 5).map(e => {
      const dm = dayAndMonth(e.date);
      const reg = getEventRegistrations(e.id).length;
      return `<li class="list-group-item d-flex gap-3 align-items-center">
        <span class="date-chip"><strong>${dm.day}</strong><small>${dm.month}</small></span>
        <div class="flex-grow-1 min-w-0"><div class="fw-semibold small text-truncate">${escapeHtml(e.title)}</div>
        <small class="text-muted">${formatTime(e.time)} · ${escapeHtml(e.venue)}</small></div>
        <span class="badge text-bg-light">${reg}/${e.capacity}</span></li>`;
    }).join("") : `<li class="list-group-item">${emptyState("calendar-plus", "No upcoming events", "Plan your next club event.", '<a class="btn btn-sm btn-primary" href="events.html?new=1">Create event</a>')}</li>`;

    const fb = db.feedback.filter(f => f.clubId === club.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    document.getElementById("recentFeedback").innerHTML = fb.length ? fb.map(f => `
      <div class="mb-3">
        <div class="d-flex justify-content-between"><span class="small fw-semibold">${escapeHtml(getUser(f.userId)?.name || "Member")}</span>${stars(f.rating)}</div>
        <p class="small text-muted mb-0">${escapeHtml(f.message)}</p>
      </div>`).join("") : `<p class="small text-muted mb-0">No feedback yet.</p>`;
  }

  document.getElementById("pendingList").addEventListener("click", async e => {
    const approve = e.target.closest("[data-approve]");
    const reject = e.target.closest("[data-reject]");
    if (approve) decideMembership(approve.dataset.approve, "approved");
    if (reject) {
      if (!(await confirmDialog("Reject request?", "The student will see that their application was rejected.", "Reject"))) return;
      decideMembership(reject.dataset.reject, "rejected");
    }
    if (approve || reject) { render(); refreshLayout(); }
  });
  render();
});

/* =========================================================
   CLUB PROFILE (secretary edits own club + activities)
   ========================================================= */
registerPage("club-profile", () => {
  const user = getCurrentUser();
  if (!ensureManagedClub(user)) return;
  const club = getClub(user.clubId);
  const form = document.getElementById("clubForm");

  form.category.innerHTML = CLUB_CATEGORIES.map(c => `<option>${c}</option>`).join("");
  fillForm(form, club);
  form.logo.value = clubLogoSrc(club);

  function renderPreview() {
    const v = Object.fromEntries(new FormData(form).entries());
    document.getElementById("clubPreview").innerHTML = `
      <div class="club-card-top rounded-top" style="--club-color:${escapeHtml(v.color)}">
        ${clubLogo({ logo: v.logo, color: v.color })}
        <span class="badge bg-light text-dark">${escapeHtml(v.category)}</span>
      </div>
      <div class="card-body">
        <h3 class="h6">${escapeHtml(v.name || "Club name")}</h3>
        <p class="small text-muted mb-0">${escapeHtml(v.description || "Club description")}</p>
      </div>`;
  }
  form.addEventListener("input", renderPreview);
  setupLogoInput(form, renderPreview).refresh();

  setupForm(form, values => {
    const duplicate = db.clubs.some(c => c.id !== club.id && c.name.toLowerCase() === values.name.trim().toLowerCase());
    if (duplicate) { showToast("Another club already uses this name.", "danger"); return; }
    DB.update("clubs", club.id, cleanClubValues(values));
    logActivity(user.id, `Updated club profile of ${values.name}`);
    showToast("Club profile saved.");
  });

  /* ---- Activities (add / edit / delete) ---- */
  const actModal = new bootstrap.Modal(document.getElementById("activityModal"));
  const actForm = document.getElementById("activityForm");
  let editingId = null;

  function renderActivities() {
    const list = (getClub(club.id).activities || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById("activityList").innerHTML = list.length ? list.map(a => `
      <li class="list-group-item d-flex gap-3 align-items-start">
        <i class="bi bi-journal-check text-primary fs-5"></i>
        <div class="flex-grow-1"><div class="fw-semibold">${escapeHtml(a.title)}</div>
          <small class="text-muted">${formatDate(a.date)}</small>
          <p class="small mb-0">${escapeHtml(a.description)}</p></div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" data-edit-act="${a.id}" aria-label="Edit activity"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-danger" data-delete-act="${a.id}" aria-label="Delete activity"><i class="bi bi-trash"></i></button>
        </div>
      </li>`).join("") : `<li class="list-group-item">${emptyState("journal-plus", "No activities yet", "Record your club's activities so students can see what you do.")}</li>`;
  }

  document.getElementById("addActivityBtn").addEventListener("click", () => {
    editingId = null;
    resetForm(actForm);
    actForm.date.value = todayStr();
    document.getElementById("activityModalTitle").textContent = "Add activity";
    actModal.show();
  });

  document.getElementById("activityList").addEventListener("click", async e => {
    const edit = e.target.closest("[data-edit-act]");
    const del = e.target.closest("[data-delete-act]");
    const activities = getClub(club.id).activities || [];
    if (edit) {
      editingId = edit.dataset.editAct;
      resetForm(actForm);
      fillForm(actForm, activities.find(a => a.id === editingId));
      document.getElementById("activityModalTitle").textContent = "Edit activity";
      actModal.show();
    }
    if (del) {
      if (!(await confirmDialog("Delete activity?", "This activity will be removed from the club page.", "Delete"))) return;
      DB.update("clubs", club.id, { activities: activities.filter(a => a.id !== del.dataset.deleteAct) });
      showToast("Activity deleted.", "info");
      renderActivities();
    }
  });

  setupForm(actForm, values => {
    const activities = (getClub(club.id).activities || []).slice();
    const data = { title: values.title.trim(), date: values.date, description: values.description.trim() };
    if (editingId) {
      Object.assign(activities.find(a => a.id === editingId), data);
    } else {
      activities.push({ id: uid("act"), ...data });
    }
    DB.update("clubs", club.id, { activities });
    logActivity(user.id, `${editingId ? "Updated" : "Added"} activity "${data.title}"`);
    actModal.hide();
    showToast(editingId ? "Activity updated." : "Activity added.");
    renderActivities();
  });
  renderActivities();
});

// Tidy up club form values before saving (used by secretary and admin)
function cleanClubValues(values) {
  return {
    name: values.name.trim(), category: values.category, logo: values.logo || "", color: values.color,
    description: values.description.trim(), objectives: values.objectives.trim(),
    meeting: values.meeting.trim(), venue: values.venue.trim(), advisor: values.advisor.trim()
  };
}

/* =========================================================
   MEMBERS & MEMBERSHIP REQUESTS (secretary + admin)
   ========================================================= */
registerPage("manage-members", () => {
  const user = getCurrentUser();
  if (!ensureManagedClub(user)) return;
  const scope = document.getElementById("memberClub");
  const search = document.getElementById("memberSearch");
  const sort = document.getElementById("memberSort");
  fillClubScope(scope, user, "All clubs");
  const showClubCol = getManagedClubIds(user).length > 1;
  document.querySelectorAll(".club-col").forEach(el => el.classList.toggle("d-none", !showClubCol));

  function rowsFor(status) {
    const ids = scopeIds(scope, user);
    const q = search.value.trim().toLowerCase();
    return db.memberships
      .filter(m => ids.includes(m.clubId) && (status === "history" ? m.status !== "pending" : m.status === status))
      .map(m => ({ m, s: getUser(m.userId), club: getClub(m.clubId) }))
      .filter(r => r.s && (!q || (r.s.name + " " + r.s.studentId + " " + r.s.email + " " + r.s.department).toLowerCase().includes(q)));
  }

  function render() {
    // Pending requests
    const pending = rowsFor("pending");
    document.getElementById("pendingCount").textContent = pending.length;
    document.getElementById("requestsBody").innerHTML = pending.length ? pending.map(({ m, s, club }) => `
      <tr>
        <td><div class="d-flex align-items-center gap-2">${avatar(s, "avatar-sm")}<div><div class="fw-semibold">${escapeHtml(s.name)}</div><small class="text-muted">${escapeHtml(s.studentId)}</small></div></div></td>
        <td class="club-col ${showClubCol ? "" : "d-none"}">${escapeHtml(club?.name)}</td>
        <td>${escapeHtml(s.department)}</td>
        <td class="small" style="max-width:260px">${escapeHtml(m.reason)}${m.interests ? `<br><span class="text-muted">Interests: ${escapeHtml(m.interests)}</span>` : ""}</td>
        <td class="text-nowrap">${formatDate(m.appliedOn)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-success" data-approve="${m.id}"><i class="bi bi-check-lg me-1"></i>Approve</button>
          <button class="btn btn-sm btn-outline-danger" data-reject="${m.id}"><i class="bi bi-x-lg me-1"></i>Reject</button>
        </td>
      </tr>`).join("") : `<tr><td colspan="6">${emptyState("inbox", "No pending requests", "All membership applications have been handled.")}</td></tr>`;

    // Approved members
    const members = rowsFor("approved").sort((a, b) => {
      if (sort.value === "recent") return (b.m.decidedOn || "").localeCompare(a.m.decidedOn || "");
      if (sort.value === "attendance") return memberRate(b) - memberRate(a);
      return a.s.name.localeCompare(b.s.name);
    });
    document.getElementById("memberCount").textContent = members.length;
    document.getElementById("membersBody").innerHTML = members.length ? members.map(r => `
      <tr>
        <td><div class="d-flex align-items-center gap-2">${avatar(r.s, "avatar-sm")}<div><div class="fw-semibold">${escapeHtml(r.s.name)}</div><small class="text-muted">${escapeHtml(r.s.email)}</small></div></div></td>
        <td class="club-col ${showClubCol ? "" : "d-none"}">${escapeHtml(r.club?.name)}</td>
        <td>${escapeHtml(r.s.studentId)}</td>
        <td>${escapeHtml(r.s.department)}${r.s.year ? `, Year ${escapeHtml(r.s.year)}` : ""}</td>
        <td class="text-nowrap">${formatDate(r.m.decidedOn || r.m.appliedOn)}</td>
        <td>${memberRate(r)}%</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-remove="${r.m.id}" aria-label="Remove ${escapeHtml(r.s.name)}"><i class="bi bi-person-dash"></i></button></td>
      </tr>`).join("") : `<tr><td colspan="7">${emptyState("people", "No members found", "Approved members will be listed here.")}</td></tr>`;

    // History (approved + rejected decisions)
    const history = rowsFor("history").sort((a, b) => (b.m.decidedOn || "").localeCompare(a.m.decidedOn || ""));
    document.getElementById("historyBody").innerHTML = history.length ? history.map(({ m, s, club }) => `
      <tr><td>${escapeHtml(s.name)}</td><td class="club-col ${showClubCol ? "" : "d-none"}">${escapeHtml(club?.name)}</td>
      <td>${formatDate(m.appliedOn)}</td><td>${formatDate(m.decidedOn)}</td><td>${statusBadge(m.status)}</td></tr>`).join("")
      : `<tr><td colspan="5">${emptyState("clock-history", "No history yet", "Decisions on applications will be listed here.")}</td></tr>`;
  }

  // attendance rate of a member for events of that club
  function memberRate(r) {
    const eventIds = db.events.filter(e => e.clubId === r.m.clubId).map(e => e.id);
    return attendanceRate(db.attendance.filter(a => a.userId === r.s.id && eventIds.includes(a.eventId)));
  }

  document.querySelector("main").addEventListener("click", async e => {
    const approve = e.target.closest("[data-approve]");
    const reject = e.target.closest("[data-reject]");
    const remove = e.target.closest("[data-remove]");
    if (approve) decideMembership(approve.dataset.approve, "approved");
    if (reject) {
      if (!(await confirmDialog("Reject request?", "The student will see that their application was rejected.", "Reject"))) return;
      decideMembership(reject.dataset.reject, "rejected");
    }
    if (remove) {
      const m = DB.find("memberships", remove.dataset.remove);
      const s = getUser(m.userId);
      if (!(await confirmDialog("Remove member?", `${s.name} will be removed from ${getClub(m.clubId).name}.`, "Remove member"))) return;
      DB.remove("memberships", m.id);
      logActivity(user.id, `Removed ${s.name} from ${getClub(m.clubId).name}`);
      showToast(`${s.name} removed from the club.`, "info");
    }
    if (approve || reject || remove) { render(); refreshLayout(); }
  });

  document.getElementById("approveAll").addEventListener("click", async () => {
    const pending = rowsFor("pending");
    if (!pending.length) { showToast("There are no pending requests.", "info"); return; }
    if (!(await confirmDialog("Approve all?", `Approve all ${pending.length} pending request(s)?`, "Approve all", "success"))) return;
    pending.forEach(r => DB.update("memberships", r.m.id, { status: "approved", decidedOn: todayStr() }));
    logActivity(user.id, `Approved ${pending.length} membership requests`);
    showToast(`${pending.length} request(s) approved.`);
    render(); refreshLayout();
  });

  document.getElementById("exportMembers").addEventListener("click", () => {
    const rows = rowsFor("approved");
    if (!rows.length) { showToast("No members to export.", "warning"); return; }
    downloadCSV("club-members.csv", [["Name", "Student ID", "Email", "Department", "Year", "Club", "Member since"],
      ...rows.map(r => [r.s.name, r.s.studentId, r.s.email, r.s.department, r.s.year, r.club?.name, r.m.decidedOn])]);
  });

  [scope, search, sort].forEach(el => el.addEventListener("input", render));
  render();
});

/* =========================================================
   EVENT MANAGEMENT (secretary + admin)
   ========================================================= */
registerPage("manage-events", () => {
  const user = getCurrentUser();
  if (!ensureManagedClub(user)) return;
  const scope = document.getElementById("eventScope");
  const search = document.getElementById("eventSearch");
  const statusFilter = document.getElementById("eventStatusFilter");
  const form = document.getElementById("eventForm");
  const modal = new bootstrap.Modal(document.getElementById("eventModal"));
  let editingId = null;

  fillClubScope(scope, user, "All clubs");
  form.clubId.innerHTML = getManagedClubIds(user).map(id => `<option value="${id}">${escapeHtml(getClub(id).name)}</option>`).join("");
  form.category.innerHTML = EVENT_CATEGORIES.map(c => `<option>${c}</option>`).join("");

  function render() {
    const ids = scopeIds(scope, user);
    const q = search.value.trim().toLowerCase();
    const list = db.events
      .filter(e => ids.includes(e.clubId))
      .filter(e => !q || (e.title + " " + e.venue + " " + e.category).toLowerCase().includes(q))
      .filter(e => !statusFilter.value || getEventStatus(e) === statusFilter.value)
      .sort((a, b) => b.date.localeCompare(a.date));

    document.getElementById("eventsBody").innerHTML = list.length ? list.map(e => {
      const reg = getEventRegistrations(e.id).length;
      return `<tr>
        <td><a class="fw-semibold text-decoration-none" href="${ROOT}event-details.html?id=${e.id}">${escapeHtml(e.title)}</a>
          <small class="d-block text-muted">${escapeHtml(e.category)}${!e.openToAll ? " · Members only" : ""}</small></td>
        <td class="${getManagedClubIds(user).length > 1 ? "" : "d-none"}">${escapeHtml(getClub(e.clubId)?.name)}</td>
        <td class="text-nowrap">${formatDate(e.date)}<small class="d-block text-muted">${formatTime(e.time)}</small></td>
        <td>${escapeHtml(e.venue)}</td>
        <td><button class="btn btn-link btn-sm p-0" data-regs="${e.id}">${reg}/${e.capacity}</button></td>
        <td>${statusBadge(getEventStatus(e))}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" data-edit="${e.id}" aria-label="Edit ${escapeHtml(e.title)}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-delete="${e.id}" aria-label="Delete ${escapeHtml(e.title)}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    }).join("") : `<tr><td colspan="7">${emptyState("calendar-x", "No events found", "Create an event to get started.")}</td></tr>`;
    document.querySelectorAll(".club-col").forEach(el => el.classList.toggle("d-none", getManagedClubIds(user).length <= 1));
  }

  function openForm(ev) {
    editingId = ev ? ev.id : null;
    resetForm(form);
    document.getElementById("eventModalTitle").textContent = ev ? "Edit event" : "Create new event";
    document.getElementById("cancelledGroup").classList.toggle("d-none", !ev);
    if (ev) fillForm(form, ev);
    else { form.openToAll.checked = true; form.capacity.value = 50; if (scope.value) form.clubId.value = scope.value; }
    // new events can't be in the past
    form.date.min = ev ? "" : todayStr();
    modal.show();
  }

  document.getElementById("newEventBtn").addEventListener("click", () => openForm(null));
  if (getParam("new")) openForm(null);

  // capacity can't be lower than people already registered
  form.capacity.addEventListener("input", () => {
    const reg = editingId ? getEventRegistrations(editingId).length : 0;
    form.capacity.setCustomValidity(Number(form.capacity.value) < reg ? `At least ${reg}` : "");
    document.getElementById("capacityFeedback").textContent = reg ? `Capacity must be at least ${reg} (already registered).` : "Enter a capacity between 1 and 1000.";
  });

  setupForm(form, values => {
    const data = {
      clubId: values.clubId, title: values.title.trim(), category: values.category, date: values.date, time: values.time,
      venue: values.venue.trim(), capacity: Number(values.capacity), openToAll: values.openToAll,
      cancelled: editingId ? values.cancelled : false, description: values.description.trim()
    };
    if (editingId) {
      DB.update("events", editingId, data);
      logActivity(user.id, `Updated event "${data.title}"`);
      showToast("Event updated.");
    } else {
      DB.add("events", { id: uid("e"), ...data });
      logActivity(user.id, `Created event "${data.title}"`);
      showToast("Event created and published.");
    }
    modal.hide();
    render();
  });

  document.getElementById("eventsBody").addEventListener("click", async e => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-delete]");
    const regs = e.target.closest("[data-regs]");
    if (edit) openForm(getEvent(edit.dataset.edit));
    if (del) {
      const ev = getEvent(del.dataset.delete);
      const count = getEventRegistrations(ev.id).length;
      if (!(await confirmDialog("Delete event?", `"${ev.title}" will be deleted${count ? ` along with ${count} registration(s) and its attendance records` : ""}. This cannot be undone.`, "Delete event"))) return;
      DB.remove("events", ev.id);
      DB.removeWhere("registrations", r => r.eventId === ev.id);
      DB.removeWhere("attendance", a => a.eventId === ev.id);
      logActivity(user.id, `Deleted event "${ev.title}"`);
      showToast("Event deleted.", "info");
      render();
    }
    if (regs) showRegistrations(getEvent(regs.dataset.regs));
  });

  function showRegistrations(ev) {
    const list = getEventRegistrations(ev.id).map(r => ({ r, s: getUser(r.userId) })).filter(x => x.s);
    document.getElementById("regsTitle").textContent = ev.title;
    document.getElementById("regsBody").innerHTML = list.length ? `<ul class="list-group list-group-flush">${list.map(({ r, s }) => `
      <li class="list-group-item d-flex gap-2 align-items-center">${avatar(s, "avatar-sm")}
        <div class="flex-grow-1"><div class="small fw-semibold">${escapeHtml(s.name)}</div><small class="text-muted">${escapeHtml(s.studentId)} · ${escapeHtml(s.department)}</small></div>
        <small class="text-muted">${formatDate(r.registeredOn)}</small></li>`).join("")}</ul>`
      : emptyState("person-x", "No registrations yet", "Students who register will appear here.");
    bootstrap.Modal.getOrCreateInstance(document.getElementById("regsModal")).show();
  }

  [scope, search, statusFilter].forEach(el => el.addEventListener("input", render));
  render();
});

/* =========================================================
   ATTENDANCE MANAGEMENT (secretary + admin)
   ========================================================= */
registerPage("manage-attendance", () => {
  const user = getCurrentUser();
  if (!ensureManagedClub(user)) return;
  const eventSelect = document.getElementById("attEvent");
  const search = document.getElementById("attSearch");
  const body = document.getElementById("attBody");
  const saveBtn = document.getElementById("saveAttendance");
  let draft = {}; // { userId: "present" | "late" | "absent" } — unsaved changes
  let extraIds = []; // walk-in attendees added manually

  const events = db.events
    .filter(e => getManagedClubIds(user).includes(e.clubId) && !e.cancelled)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!events.length) {
    document.getElementById("attendanceArea").innerHTML = emptyState("calendar-x", "No events yet", "Create an event first, then mark attendance here.", '<a class="btn btn-sm btn-primary" href="events.html?new=1">Create event</a>');
    return;
  }
  eventSelect.innerHTML = events.map(e => `<option value="${e.id}">${escapeHtml(e.title)} — ${formatDate(e.date)}${getManagedClubIds(user).length > 1 ? " (" + escapeHtml(getClub(e.clubId).name) + ")" : ""}</option>`).join("");
  // default: the most recent event that already happened
  const lastPast = events.find(e => e.date <= todayStr());
  eventSelect.value = getParam("event") || (lastPast ? lastPast.id : events[0].id);

  function attendeeIds(ev) {
    const ids = new Set(getEventRegistrations(ev.id).map(r => r.userId));
    db.attendance.filter(a => a.eventId === ev.id).forEach(a => ids.add(a.userId));
    extraIds.forEach(id => ids.add(id));
    return [...ids].filter(id => getUser(id));
  }
  function savedStatus(eventId, userId) {
    return db.attendance.find(a => a.eventId === eventId && a.userId === userId)?.status || "";
  }

  function load() {
    draft = {};
    extraIds = [];
    render();
  }

  function render() {
    const ev = getEvent(eventSelect.value);
    const future = ev.date > todayStr();
    const ids = attendeeIds(ev);
    const q = search.value.trim().toLowerCase();

    document.getElementById("attEventInfo").innerHTML = `
      <span><i class="bi bi-calendar3 me-1"></i>${formatDate(ev.date)}, ${formatTime(ev.time)}</span>
      <span><i class="bi bi-geo-alt me-1"></i>${escapeHtml(ev.venue)}</span>
      <span><i class="bi bi-people me-1"></i>${getEventRegistrations(ev.id).length} registered</span>`;
    document.getElementById("futureWarning").classList.toggle("d-none", !future);
    saveBtn.disabled = future;
    document.getElementById("markAllPresent").disabled = future;

    const statusOf = id => draft[id] ?? savedStatus(ev.id, id);
    const counts = { present: 0, late: 0, absent: 0, unmarked: 0 };
    ids.forEach(id => counts[statusOf(id) || "unmarked"]++);
    Object.entries(counts).forEach(([k, v]) => { document.getElementById("count-" + k).textContent = v; });

    const rows = ids.map(id => getUser(id)).filter(s => !q || (s.name + " " + s.studentId).toLowerCase().includes(q));
    body.innerHTML = rows.length ? rows.map(s => {
      const st = statusOf(s.id);
      const changed = draft[s.id] !== undefined && draft[s.id] !== savedStatus(ev.id, s.id);
      return `<tr class="${changed ? "table-warning" : ""}">
        <td><div class="d-flex align-items-center gap-2">${avatar(s, "avatar-sm")}<div><div class="fw-semibold">${escapeHtml(s.name)}</div><small class="text-muted">${escapeHtml(s.studentId)}</small></div></div></td>
        <td>${escapeHtml(s.department)}</td>
        <td>${isRegistered(s.id, ev.id) ? '<span class="badge text-bg-light">Registered</span>' : '<span class="badge text-bg-info">Walk-in</span>'}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm" role="group" aria-label="Attendance for ${escapeHtml(s.name)}">
            ${["present", "late", "absent"].map(opt => `
              <input type="radio" class="btn-check" name="att-${s.id}" id="att-${s.id}-${opt}" value="${opt}" data-user="${s.id}" ${st === opt ? "checked" : ""} ${future ? "disabled" : ""}>
              <label class="btn btn-outline-${{ present: "success", late: "warning", absent: "danger" }[opt]}" for="att-${s.id}-${opt}">${capitalize(opt)}</label>`).join("")}
          </div>
        </td>
      </tr>`;
    }).join("") : `<tr><td colspan="4">${emptyState("person-x", "No attendees", "No students registered for this event yet. You can add walk-in members below.")}</td></tr>`;

    // walk-in dropdown: club members not in the list yet
    const walkIn = getApprovedMembers(ev.clubId).map(m => getUser(m.userId)).filter(s => s && !ids.includes(s.id));
    document.getElementById("walkInSelect").innerHTML = `<option value="">Add a club member who attended…</option>` +
      walkIn.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.studentId)})</option>`).join("");
    document.getElementById("walkInGroup").classList.toggle("d-none", future || !walkIn.length);
  }

  body.addEventListener("change", e => {
    if (e.target.matches("input[data-user]")) { draft[e.target.dataset.user] = e.target.value; render(); }
  });
  document.getElementById("markAllPresent").addEventListener("click", () => {
    attendeeIds(getEvent(eventSelect.value)).forEach(id => { draft[id] = "present"; });
    render();
  });
  document.getElementById("addWalkIn").addEventListener("click", () => {
    const id = document.getElementById("walkInSelect").value;
    if (!id) { showToast("Choose a member to add.", "warning"); return; }
    extraIds.push(id);
    draft[id] = "present";
    render();
  });
  saveBtn.addEventListener("click", () => {
    const ev = getEvent(eventSelect.value);
    const changes = Object.entries(draft);
    if (!changes.length) { showToast("No changes to save.", "info"); return; }
    changes.forEach(([userId, status]) => {
      const existing = db.attendance.find(a => a.eventId === ev.id && a.userId === userId);
      if (existing) existing.status = status;
      else db.attendance.push({ id: uid("at"), eventId: ev.id, userId, status });
    });
    saveData();
    logActivity(user.id, `Updated attendance for "${ev.title}" (${changes.length} student(s))`);
    showToast(`Attendance saved for ${changes.length} student(s).`);
    load();
  });

  eventSelect.addEventListener("change", load);
  search.addEventListener("input", render);
  load();
});

/* =========================================================
   ANNOUNCEMENTS (secretary + admin)
   ========================================================= */
registerPage("manage-announcements", () => {
  const user = getCurrentUser();
  if (!ensureManagedClub(user)) return;
  const form = document.getElementById("announceForm");
  const modal = new bootstrap.Modal(document.getElementById("announceModal"));
  const search = document.getElementById("annSearch");
  const scope = document.getElementById("annScope");
  let editingId = null;

  const ids = getManagedClubIds(user);
  // Only admins can post college-wide announcements
  form.clubId.innerHTML = (user.role === "admin" ? `<option value="">College-wide (all students)</option>` : "") +
    ids.map(id => `<option value="${id}">${escapeHtml(getClub(id).name)} members</option>`).join("");
  scope.innerHTML = `<option value="">All announcements</option>` + (user.role === "admin" ? `<option value="college">College-wide</option>` : "") +
    ids.map(id => `<option value="${id}">${escapeHtml(getClub(id).name)}</option>`).join("");

  const canManage = a => user.role === "admin" || ids.includes(a.clubId);
  const msg = form.message;
  msg.addEventListener("input", () => { document.getElementById("annMsgCount").textContent = `${msg.value.length}/600`; });

  function render() {
    const q = search.value.trim().toLowerCase();
    const list = db.announcements
      .filter(canManage)
      .filter(a => !scope.value || (scope.value === "college" ? !a.clubId : a.clubId === scope.value))
      .filter(a => !q || (a.title + " " + a.message).toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));

    document.getElementById("annList").innerHTML = list.length ? list.map(a => {
      const club = a.clubId ? getClub(a.clubId) : null;
      const audience = club ? getApprovedMembers(club.id).length : db.users.filter(u => u.role === "member").length;
      const readers = Object.values(db.reads).filter(r => r.includes(a.id)).length;
      return `<article class="card announcement-card mb-3 ${a.priority === "important" ? "important" : ""}"><div class="card-body">
        <div class="d-flex flex-wrap justify-content-between gap-2">
          <div><span class="badge text-bg-light mb-1">${escapeHtml(club ? club.name : "College-wide")}</span> ${a.priority === "important" ? statusBadge("important") : ""}
            <h2 class="h6 mb-1 mt-1">${escapeHtml(a.title)}</h2></div>
          <div class="btn-group btn-group-sm align-self-start">
            <button class="btn btn-outline-secondary" data-edit="${a.id}" aria-label="Edit announcement"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger" data-delete="${a.id}" aria-label="Delete announcement"><i class="bi bi-trash"></i></button>
          </div>
        </div>
        <p class="small text-body-secondary mb-2">${escapeHtml(a.message)}</p>
        <small class="text-muted"><i class="bi bi-calendar3 me-1"></i>${formatDate(a.date)} · by ${escapeHtml(getUser(a.authorId)?.name || "Unknown")} · <i class="bi bi-eye me-1"></i>read by ${readers} of ${audience}</small>
      </div></article>`;
    }).join("") : emptyState("megaphone", "No announcements yet", "Publish your first announcement to notify members.");
  }

  function openForm(a) {
    editingId = a ? a.id : null;
    resetForm(form);
    document.getElementById("announceModalTitle").textContent = a ? "Edit announcement" : "Publish announcement";
    if (a) fillForm(form, { ...a, clubId: a.clubId || "" });
    document.getElementById("annMsgCount").textContent = `${msg.value.length}/600`;
    modal.show();
  }
  document.getElementById("newAnnouncement").addEventListener("click", () => openForm(null));
  if (getParam("new")) openForm(null);

  setupForm(form, values => {
    const data = { clubId: values.clubId || null, title: values.title.trim(), message: values.message.trim(), priority: values.priority };
    if (editingId) {
      DB.update("announcements", editingId, data);
      showToast("Announcement updated.");
    } else {
      DB.add("announcements", { id: uid("a"), ...data, date: todayStr(), authorId: user.id });
      showToast("Announcement published. Members will be notified.");
    }
    logActivity(user.id, `${editingId ? "Edited" : "Published"} announcement "${data.title}"`);
    modal.hide();
    render();
  });

  document.getElementById("annList").addEventListener("click", async e => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-delete]");
    if (edit) openForm(DB.find("announcements", edit.dataset.edit));
    if (del) {
      const a = DB.find("announcements", del.dataset.delete);
      if (!(await confirmDialog("Delete announcement?", `"${a.title}" will be removed for all members.`, "Delete"))) return;
      DB.remove("announcements", a.id);
      logActivity(user.id, `Deleted announcement "${a.title}"`);
      showToast("Announcement deleted.", "info");
      render();
    }
  });
  [search, scope].forEach(el => el.addEventListener("input", render));
  render();
});

/* =========================================================
   REPORTS (secretary + admin)
   ========================================================= */
registerPage("reports", () => {
  const user = getCurrentUser();
  if (!ensureManagedClub(user)) return;
  const scope = document.getElementById("reportClub");
  const period = document.getElementById("reportPeriod");
  fillClubScope(scope, user, "All clubs");

  function getData() {
    const ids = scopeIds(scope, user);
    const from = period.value === "all" ? "0000-00-00" : daysFromToday(-Number(period.value));
    const events = db.events.filter(e => ids.includes(e.clubId) && e.date >= from);
    const held = events.filter(e => getEventStatus(e) === "completed");
    const records = db.attendance.filter(a => held.some(e => e.id === a.eventId));
    const feedback = db.feedback.filter(f => ids.includes(f.clubId) && f.date >= from);
    const memberships = db.memberships.filter(m => ids.includes(m.clubId));
    return { ids, events, held, records, feedback, memberships };
  }

  function render() {
    const d = getData();
    const club = scope.value ? getClub(scope.value) : null;
    document.getElementById("reportHeading").textContent =
      (club ? club.name : d.ids.length === 1 ? getClub(d.ids[0]).name : "All clubs") + " — " + period.options[period.selectedIndex].text;
    document.getElementById("reportDate").textContent = "Generated on " + formatDate(todayStr()) + " by " + user.name;

    const approved = d.memberships.filter(m => m.status === "approved").length;
    const avgRating = d.feedback.length ? (d.feedback.reduce((s, f) => s + f.rating, 0) / d.feedback.length).toFixed(1) : "–";
    document.getElementById("rMembers").textContent = approved;
    document.getElementById("rEvents").textContent = d.held.length;
    document.getElementById("rUpcoming").textContent = d.events.filter(e => getEventStatus(e) === "upcoming").length + " upcoming";
    document.getElementById("rAttendance").textContent = attendanceRate(d.records) + "%";
    document.getElementById("rRating").textContent = avgRating;
    document.getElementById("rFeedbackCount").textContent = d.feedback.length + " responses";

    // Chart 1: members per club (many clubs) or membership status (one club)
    if (d.ids.length > 1) {
      document.getElementById("chart1Title").textContent = "Members per club";
      renderBarChart(document.getElementById("chart1"), d.ids.map(id => {
        const c = getClub(id);
        return { label: c.name, value: getApprovedMembers(id).length, color: c.color };
      }).sort((a, b) => b.value - a.value));
    } else {
      document.getElementById("chart1Title").textContent = "Membership applications";
      renderDonut(document.getElementById("chart1"), [
        { label: "Approved", value: d.memberships.filter(m => m.status === "approved").length, color: "#2e7d32" },
        { label: "Pending", value: d.memberships.filter(m => m.status === "pending").length, color: "#e8a317" },
        { label: "Rejected", value: d.memberships.filter(m => m.status === "rejected").length, color: "#c62828" }
      ]);
    }

    // Chart 2: attendance status split
    renderDonut(document.getElementById("chart2"), [
      { label: "Present", value: d.records.filter(r => r.status === "present").length, color: "#2e7d32" },
      { label: "Late", value: d.records.filter(r => r.status === "late").length, color: "#e8a317" },
      { label: "Absent", value: d.records.filter(r => r.status === "absent").length, color: "#c62828" }
    ]);

    // Chart 3: attendance rate per completed event
    renderBarChart(document.getElementById("chart3"), d.held.slice().sort((a, b) => a.date.localeCompare(b.date)).map(e => ({
      label: e.title, value: attendanceRate(db.attendance.filter(a => a.eventId === e.id))
    })), "%");

    // Event summary table
    document.getElementById("eventSummaryBody").innerHTML = d.events.length ? d.events.slice().sort((a, b) => b.date.localeCompare(a.date)).map(e => {
      const recs = db.attendance.filter(a => a.eventId === e.id);
      return `<tr><td>${escapeHtml(e.title)}</td><td>${escapeHtml(getClub(e.clubId)?.name)}</td><td class="text-nowrap">${formatDate(e.date)}</td>
        <td>${getEventRegistrations(e.id).length}/${e.capacity}</td>
        <td>${recs.filter(r => r.status !== "absent").length}</td>
        <td>${recs.length ? attendanceRate(recs) + "%" : "-"}</td><td>${statusBadge(getEventStatus(e))}</td></tr>`;
    }).join("") : `<tr><td colspan="7">${emptyState("calendar-x", "No events in this period", "Try a longer time period.")}</td></tr>`;

    // Most active members (by events attended)
    const tally = {};
    d.records.forEach(r => { if (r.status !== "absent") tally[r.userId] = (tally[r.userId] || 0) + 1; });
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5);
    document.getElementById("topMembers").innerHTML = top.length ? top.map(([id, n], i) => {
      const s = getUser(id);
      return `<li class="list-group-item d-flex align-items-center gap-2"><span class="rank">${i + 1}</span>${avatar(s, "avatar-sm")}
        <span class="flex-grow-1 small fw-semibold">${escapeHtml(s?.name || "Former member")}</span><span class="badge text-bg-primary">${n} event${n > 1 ? "s" : ""}</span></li>`;
    }).join("") : `<li class="list-group-item small text-muted">No attendance recorded yet.</li>`;

    // Feedback
    document.getElementById("reportFeedback").innerHTML = d.feedback.length ? d.feedback.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map(f => `
      <div class="feedback-item"><div class="d-flex justify-content-between"><span class="small fw-semibold">${escapeHtml(getUser(f.userId)?.name || "Member")} · <span class="text-muted">${escapeHtml(getClub(f.clubId)?.name)}</span></span>${stars(f.rating)}</div>
      <p class="small mb-0">${escapeHtml(f.message)}</p></div>`).join("")
      : emptyState("chat-square", "No feedback in this period", "Feedback from members will appear here.");
  }

  document.getElementById("printReport").addEventListener("click", () => window.print());
  document.getElementById("exportReport").addEventListener("click", () => {
    const d = getData();
    downloadCSV("club-activity-report.csv", [["Event", "Club", "Date", "Registered", "Capacity", "Attended", "Attendance rate", "Status"],
      ...d.events.map(e => {
        const recs = db.attendance.filter(a => a.eventId === e.id);
        return [e.title, getClub(e.clubId)?.name, e.date, getEventRegistrations(e.id).length, e.capacity,
          recs.filter(r => r.status !== "absent").length, recs.length ? attendanceRate(recs) + "%" : "", getEventStatus(e)];
      })]);
  });
  [scope, period].forEach(el => el.addEventListener("input", render));
  render();
});