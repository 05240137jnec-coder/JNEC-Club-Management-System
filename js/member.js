/* =========================================================
   member.js — Student/member pages
   dashboard, announcements, attendance history, feedback,
   profile (profile is shared by all roles)
   ========================================================= */

/* ---------------- Student dashboard ---------------- */
registerPage("member-dashboard", () => {
  const user = getCurrentUser();
  const myClubIds = getUserClubIds(user.id);
  const myEvents = db.registrations
    .filter(r => r.userId === user.id)
    .map(r => getEvent(r.eventId))
    .filter(e => e && getEventStatus(e) === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  const records = getUserAttendance(user.id);
  const unread = getUnreadAnnouncements(user);
  const pending = db.memberships.filter(m => m.userId === user.id && m.status === "pending").length;

  document.getElementById("welcomeName").textContent = user.name.split(" ")[0];
  document.getElementById("statClubs").textContent = myClubIds.length;
  document.getElementById("statPending").textContent = `${pending} pending application${pending === 1 ? "" : "s"}`;
  document.getElementById("statEvents").textContent = myEvents.length;
  document.getElementById("statAttendance").textContent = attendanceRate(records) + "%";
  document.getElementById("statAttendanceSub").textContent = `${records.length} event${records.length === 1 ? "" : "s"} recorded`;
  document.getElementById("statUnread").textContent = unread.length;

  // Upcoming registered events
  const eventsBox = document.getElementById("dashEvents");
  eventsBox.innerHTML = myEvents.length ? `<div class="list-group list-group-flush">${myEvents.slice(0, 4).map(e => {
    const dm = dayAndMonth(e.date);
    return `<a class="list-group-item list-group-item-action d-flex gap-3 align-items-center" href="${ROOT}event-details.html?id=${e.id}">
      <span class="date-chip"><strong>${dm.day}</strong><small>${dm.month}</small></span>
      <span class="flex-grow-1 min-w-0"><span class="fw-semibold d-block text-truncate">${escapeHtml(e.title)}</span>
      <small class="text-muted">${formatTime(e.time)} · ${escapeHtml(e.venue)}</small></span></a>`;
  }).join("")}</div>`
    : emptyState("calendar-plus", "No upcoming registrations", "Find an event that interests you.", `<a class="btn btn-sm btn-primary" href="${ROOT}events.html">Browse events</a>`);

  // Latest announcements
  const annBox = document.getElementById("dashAnnouncements");
  const latest = getVisibleAnnouncements(user).slice(0, 4);
  const readIds = getReadIds(user.id);
  annBox.innerHTML = latest.length ? latest.map(a => `
    <div class="announce-mini ${a.priority === "important" ? "important" : ""}">
      <div class="d-flex justify-content-between gap-2">
        <span class="fw-semibold small">${!readIds.includes(a.id) ? '<span class="unread-dot" title="Unread"></span>' : ""}${escapeHtml(a.title)}</span>
        <small class="text-muted text-nowrap">${formatDate(a.date)}</small>
      </div>
      <small class="text-muted">${escapeHtml(a.clubId ? getClub(a.clubId)?.name : "College-wide")}</small>
    </div>`).join("") : emptyState("megaphone", "No announcements", "Announcements from your clubs will appear here.");

  // Membership status list
  const memBox = document.getElementById("dashMemberships");
  const memberships = db.memberships.filter(m => m.userId === user.id);
  memBox.innerHTML = memberships.length ? memberships.map(m => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <a class="text-reset text-decoration-none" href="${ROOT}club-details.html?id=${m.clubId}">${escapeHtml(getClub(m.clubId)?.name || "Deleted club")}</a>${statusBadge(m.status)}
    </li>`).join("") : `<li class="list-group-item">${emptyState("people", "No memberships yet", "Join a club to get started.", `<a class="btn btn-sm btn-primary" href="${ROOT}clubs.html">Explore clubs</a>`)}</li>`;

  // Suggested clubs (not joined/applied)
  const suggest = db.clubs.filter(c => !getMembership(user.id, c.id)).slice(0, 3);
  document.getElementById("dashSuggestions").innerHTML = suggest.length ? suggest.map(c => `
    <div class="d-flex align-items-center gap-3 mb-3">
      ${clubLogo(c, "club-icon-sm")}
      <div class="flex-grow-1 min-w-0"><div class="fw-semibold small text-truncate">${escapeHtml(c.name)}</div><small class="text-muted">${escapeHtml(c.category)}</small></div>
      <a class="btn btn-sm btn-outline-primary" href="${ROOT}club-details.html?id=${c.id}">View</a>
    </div>`).join("") : `<p class="small text-muted mb-0">You have explored every club. Great job!</p>`;
});

/* ---------------- Announcements & notifications ---------------- */
registerPage("announcements", () => {
  const user = getCurrentUser();
  const list = document.getElementById("announcementList");
  const search = document.getElementById("annSearch");
  const clubFilter = document.getElementById("annClub");
  const priority = document.getElementById("annPriority");
  const unreadOnly = document.getElementById("annUnread");

  const clubIds = [...new Set(getVisibleAnnouncements(user).map(a => a.clubId).filter(Boolean))];
  clubFilter.innerHTML += `<option value="college">College-wide</option>` +
    clubIds.map(id => `<option value="${id}">${escapeHtml(getClub(id)?.name || "")}</option>`).join("");

  function render() {
    const read = getReadIds(user.id);
    const q = search.value.trim().toLowerCase();
    const items = getVisibleAnnouncements(user)
      .filter(a => !q || (a.title + " " + a.message).toLowerCase().includes(q))
      .filter(a => !clubFilter.value || (clubFilter.value === "college" ? !a.clubId : a.clubId === clubFilter.value))
      .filter(a => !priority.value || a.priority === priority.value)
      .filter(a => !unreadOnly.checked || !read.includes(a.id));

    document.getElementById("unreadCount").textContent = getUnreadAnnouncements(user).length;
    list.innerHTML = items.length ? items.map(a => {
      const club = a.clubId ? getClub(a.clubId) : null;
      const author = getUser(a.authorId);
      const isUnread = !read.includes(a.id);
      return `<article class="card announcement-card mb-3 ${isUnread ? "unread" : ""} ${a.priority === "important" ? "important" : ""}">
        <div class="card-body">
          <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
            <div class="d-flex align-items-center gap-2">
              ${club ? clubLogo(club, "club-icon-sm") : '<span class="club-icon club-icon-sm" style="--club-color:#16325c"><i class="bi bi-megaphone"></i></span>'}
              <div><div class="fw-semibold small">${escapeHtml(club ? club.name : "College-wide")}</div>
              <small class="text-muted">${formatDate(a.date)} · by ${escapeHtml(author ? author.name : "Admin")}</small></div>
            </div>
            <div class="d-flex gap-1 align-items-start">${a.priority === "important" ? statusBadge("important") : ""}${isUnread ? '<span class="badge text-bg-primary">New</span>' : ""}</div>
          </div>
          <h2 class="h6">${escapeHtml(a.title)}</h2>
          <p class="mb-2 text-body-secondary">${escapeHtml(a.message)}</p>
          ${isUnread ? `<button class="btn btn-sm btn-link px-0" data-read="${a.id}"><i class="bi bi-check2 me-1"></i>Mark as read</button>` : `<small class="text-muted"><i class="bi bi-check2-all me-1"></i>Read</small>`}
        </div></article>`;
    }).join("") : emptyState("bell-slash", "No announcements to show", unreadOnly.checked ? "You've read everything — nice!" : "Nothing matches your filters.");
  }

  list.addEventListener("click", e => {
    const btn = e.target.closest("[data-read]");
    if (!btn) return;
    markAnnouncementsRead(user.id, [btn.dataset.read]);
    render();
    refreshLayout();
  });
  document.getElementById("markAllRead").addEventListener("click", () => {
    const ids = getUnreadAnnouncements(user).map(a => a.id);
    if (!ids.length) { showToast("You have no unread announcements.", "info"); return; }
    markAnnouncementsRead(user.id, ids);
    showToast(`${ids.length} announcement${ids.length > 1 ? "s" : ""} marked as read.`);
    render();
    refreshLayout();
  });
  [search, clubFilter, priority, unreadOnly].forEach(el => el.addEventListener("input", render));
  render();
});

/* ---------------- Attendance history ---------------- */
registerPage("attendance-history", () => {
  const user = getCurrentUser();
  const body = document.getElementById("attendanceBody");
  const clubFilter = document.getElementById("attClub");
  const statusFilter = document.getElementById("attStatus");

  const records = getUserAttendance(user.id).map(r => ({ ...r, event: getEvent(r.eventId) })).filter(r => r.event);
  const clubIds = [...new Set(records.map(r => r.event.clubId))];
  clubFilter.innerHTML += clubIds.map(id => `<option value="${id}">${escapeHtml(getClub(id)?.name || "")}</option>`).join("");

  // summary cards
  const count = s => records.filter(r => r.status === s).length;
  document.getElementById("attRate").textContent = attendanceRate(records) + "%";
  document.getElementById("attPresent").textContent = count("present");
  document.getElementById("attLate").textContent = count("late");
  document.getElementById("attAbsent").textContent = count("absent");

  function render() {
    const rows = records
      .filter(r => !clubFilter.value || r.event.clubId === clubFilter.value)
      .filter(r => !statusFilter.value || r.status === statusFilter.value)
      .sort((a, b) => b.event.date.localeCompare(a.event.date));
    body.innerHTML = rows.length ? rows.map(r => `<tr>
        <td><a href="${ROOT}event-details.html?id=${r.event.id}">${escapeHtml(r.event.title)}</a></td>
        <td>${escapeHtml(getClub(r.event.clubId)?.name || "")}</td>
        <td class="text-nowrap">${formatDate(r.event.date)}</td>
        <td>${escapeHtml(r.event.venue)}</td>
        <td>${statusBadge(r.status)}</td>
      </tr>`).join("")
      : `<tr><td colspan="5">${emptyState("clipboard-x", "No attendance records", "Records appear after the club secretary marks attendance for events you registered for.")}</td></tr>`;
  }
  [clubFilter, statusFilter].forEach(el => el.addEventListener("input", render));
  render();
});

/* ---------------- Feedback page ---------------- */
registerPage("feedback", () => {
  const user = getCurrentUser();
  const form = document.getElementById("feedbackForm");
  const clubSelect = form.clubId;
  const eventSelect = form.eventId;
  const message = form.message;

  clubSelect.innerHTML = `<option value="">Choose a club…</option>` + db.clubs.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  clubSelect.addEventListener("change", () => {
    const events = db.events.filter(e => e.clubId === clubSelect.value).sort((a, b) => b.date.localeCompare(a.date));
    eventSelect.innerHTML = `<option value="">General (not about a specific event)</option>` +
      events.map(e => `<option value="${e.id}">${escapeHtml(e.title)} (${formatDate(e.date)})</option>`).join("");
  });
  message.addEventListener("input", () => { document.getElementById("msgCount").textContent = `${message.value.length}/500`; });

  setupForm(form, values => {
    DB.add("feedback", {
      id: uid("f"), userId: user.id, clubId: values.clubId, eventId: values.eventId,
      rating: Number(values.rating), category: values.category, message: values.message.trim(), date: todayStr()
    });
    logActivity(user.id, `Submitted feedback for ${getClub(values.clubId).name}`);
    showToast("Thank you! Your feedback has been submitted.");
    resetForm(form);
    document.getElementById("msgCount").textContent = "0/500";
    eventSelect.innerHTML = `<option value="">General (not about a specific event)</option>`;
    render();
  });

  const listFilter = document.getElementById("fbFilter");
  function feedbackItem(f, own) {
    const author = getUser(f.userId);
    const ev = f.eventId ? getEvent(f.eventId) : null;
    return `<article class="feedback-item">
      <div class="d-flex justify-content-between gap-2">
        <div class="d-flex gap-2 align-items-center">${avatar(author, "avatar-sm")}
          <div><div class="fw-semibold small">${escapeHtml(author ? author.name : "Former member")}</div>
          <small class="text-muted">${escapeHtml(getClub(f.clubId)?.name || "")}${ev ? " · " + escapeHtml(ev.title) : ""}</small></div></div>
        <div class="text-end">${stars(f.rating)}<small class="d-block text-muted">${formatDate(f.date)}</small></div>
      </div>
      <p class="small mb-1 mt-2">${escapeHtml(f.message)}</p>
      <div class="d-flex justify-content-between align-items-center">
        <span class="badge text-bg-light">${escapeHtml(f.category)}</span>
        ${own ? `<button class="btn btn-sm btn-link text-danger p-0" data-delete-fb="${f.id}"><i class="bi bi-trash me-1"></i>Delete</button>` : ""}
      </div>
    </article>`;
  }
  function render() {
    const all = db.feedback.slice().sort((a, b) => b.date.localeCompare(a.date));
    const mine = all.filter(f => f.userId === user.id);
    document.getElementById("myFeedback").innerHTML = mine.length ? mine.map(f => feedbackItem(f, true)).join("")
      : emptyState("chat-square", "No feedback yet", "Your submitted feedback will appear here.");
    const community = all.filter(f => !listFilter.value || f.clubId === listFilter.value);
    document.getElementById("communityFeedback").innerHTML = community.length ? community.map(f => feedbackItem(f, f.userId === user.id)).join("")
      : emptyState("chat-square", "No feedback for this club", "Be the first to share your thoughts.");
  }
  listFilter.innerHTML += db.clubs.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  listFilter.addEventListener("input", render);

  document.querySelector(".feedback-lists").addEventListener("click", async e => {
    const btn = e.target.closest("[data-delete-fb]");
    if (!btn) return;
    if (!(await confirmDialog("Delete feedback?", "This feedback will be removed permanently.", "Delete"))) return;
    DB.remove("feedback", btn.dataset.deleteFb);
    showToast("Feedback deleted.", "info");
    render();
  });
  render();
});

/* ---------------- Profile page (all roles) ---------------- */
registerPage("profile", () => {
  const user = getCurrentUser();
  const form = document.getElementById("profileForm");
  const pwForm = document.getElementById("passwordForm");

  function renderSummary() {
    const u = getCurrentUser();
    document.getElementById("profileCard").innerHTML = `
      ${avatar(u, "avatar-xl")}
      <h2 class="h5 mt-3 mb-0">${escapeHtml(u.name)}</h2>
      <p class="text-muted small mb-2">${escapeHtml(roleLabel(u.role))}</p>
      ${statusBadge(u.status)}
      <hr>
      <ul class="list-unstyled text-start small mb-0 info-list">
        <li><i class="bi bi-envelope"></i><span><small>Email</small>${escapeHtml(u.email)}</span></li>
        <li><i class="bi bi-person-vcard"></i><span><small>Student / Staff ID</small>${escapeHtml(u.studentId)}</span></li>
        <li><i class="bi bi-building"></i><span><small>Department</small>${escapeHtml(u.department || "-")}</span></li>
        <li><i class="bi bi-calendar-check"></i><span><small>Joined</small>${formatDate(u.joined)}</span></li>
        ${u.role === "secretary" ? `<li><i class="bi bi-diagram-3"></i><span><small>Manages</small>${escapeHtml(getClub(u.clubId)?.name || "No club assigned")}</span></li>` : ""}
      </ul>`;
    const clubs = getUserClubIds(u.id);
    document.getElementById("profileStats").innerHTML = `
      <div class="col-4"><strong class="d-block fs-5">${clubs.length}</strong><small class="text-muted">Clubs</small></div>
      <div class="col-4"><strong class="d-block fs-5">${db.registrations.filter(r => r.userId === u.id).length}</strong><small class="text-muted">Events</small></div>
      <div class="col-4"><strong class="d-block fs-5">${db.feedback.filter(f => f.userId === u.id).length}</strong><small class="text-muted">Feedback</small></div>`;
  }

  fillForm(form, user);
  if (user.mustChangePassword) {
    document.getElementById("tempPasswordAlert").classList.remove("d-none");
    pwForm.scrollIntoView({ block: "center" });
  }
  if (user.role !== "member") form.querySelector("#yearGroup").classList.add("d-none");
  renderSummary();

  // Only the administrator can change their own email here
  const canEditEmail = user.role === "admin";
  if (canEditEmail) {
    form.email.readOnly = false;
    form.email.addEventListener("input", () => {
      const taken = db.users.some(u => u.id !== user.id && u.email.toLowerCase() === form.email.value.trim().toLowerCase());
      form.email.setCustomValidity(taken ? "taken" : "");
      document.getElementById("pEmailFeedback").textContent = taken ? "This email is already used by another account." : "Enter a valid email address.";
    });
  }

  setupForm(form, values => {
    const changes = {
      name: values.name.trim(), phone: values.phone.trim(), department: values.department,
      year: values.year || "", bio: values.bio.trim()
    };
    if (canEditEmail) changes.email = values.email.trim().toLowerCase();
    DB.update("users", user.id, changes);
    logActivity(user.id, "Updated profile");
    showToast("Profile updated successfully.");
    renderSummary();
    refreshLayout();
  });

  const checkMatch = () => pwForm.confirmPassword.setCustomValidity(pwForm.confirmPassword.value === pwForm.newPassword.value ? "" : "Passwords do not match");
  pwForm.newPassword.addEventListener("input", checkMatch);
  pwForm.confirmPassword.addEventListener("input", checkMatch);
  pwForm.currentPassword.addEventListener("input", () => pwForm.currentPassword.setCustomValidity(""));
  setupPasswordToggles();

  setupForm(pwForm, values => {
    if (values.currentPassword !== getCurrentUser().password) {
      pwForm.currentPassword.setCustomValidity("Wrong password");
      pwForm.classList.add("was-validated");
      showToast("Your current password is incorrect.", "danger");
      return;
    }
    if (values.newPassword === values.currentPassword) {
      pwForm.newPassword.setCustomValidity("Same as current");
      pwForm.classList.add("was-validated");
      showToast("Your new password must be different from the current one.", "danger");
      pwForm.newPassword.addEventListener("input", () => pwForm.newPassword.setCustomValidity(""), { once: true });
      return;
    }
    const wasTemporary = getCurrentUser().mustChangePassword;
    DB.update("users", user.id, { password: values.newPassword, mustChangePassword: false });
    logActivity(user.id, "Changed password");
    if (wasTemporary) {
      // first login is finished: go to this person's own dashboard (admin, secretary or member)
      setFlash("Password changed. Welcome to your dashboard!");
      window.location.href = dashboardUrl(user.role);
      return;
    }
    resetForm(pwForm);
    document.getElementById("tempPasswordAlert").classList.add("d-none");
    refreshLayout();
    showToast("Password changed successfully.");
  });
});
