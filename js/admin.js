/* =========================================================
   admin.js — System Administrator pages
   dashboard, users & roles, all clubs
   ========================================================= */

/* ---------------- Admin dashboard ---------------- */
registerPage("admin-dashboard", () => {
  const byRole = role => db.users.filter(u => u.role === role).length;
  const upcoming = db.events.filter(e => getEventStatus(e) === "upcoming").length;
  const pending = db.memberships.filter(m => m.status === "pending").length;

  document.getElementById("aUsers").textContent = db.users.length;
  document.getElementById("aUsersSub").textContent = `${byRole("member")} students · ${byRole("secretary")} secretaries`;
  document.getElementById("aClubs").textContent = db.clubs.length;
  document.getElementById("aClubsSub").textContent = `${db.clubs.filter(c => c.status === "active").length} active`;
  document.getElementById("aEvents").textContent = db.events.length;
  document.getElementById("aEventsSub").textContent = `${upcoming} upcoming`;
  document.getElementById("aMemberships").textContent = db.memberships.filter(m => m.status === "approved").length;
  document.getElementById("aMembershipsSub").textContent = `${pending} pending request${pending === 1 ? "" : "s"}`;

  renderDonut(document.getElementById("chartRoles"), [
    { label: "Students", value: byRole("member"), color: "#1d4e89" },
    { label: "Secretaries", value: byRole("secretary"), color: "#e8a317" },
    { label: "Administrators", value: byRole("admin"), color: "#b5452c" }
  ]);
  renderBarChart(document.getElementById("chartClubs"), db.clubs.map(c => ({
    label: c.name, value: getApprovedMembers(c.id).length, color: c.color
  })).sort((a, b) => b.value - a.value));

  // Events per month for the last 3 and next 2 months
  const months = [];
  for (let i = -3; i <= 2; i++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i);
    const key = toDateStr(d).slice(0, 7);
    months.push({ label: d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }), value: db.events.filter(e => e.date.startsWith(key)).length });
  }
  renderBarChart(document.getElementById("chartMonths"), months);

  // Recent activity log
  document.getElementById("activityLog").innerHTML = db.logs.length ? db.logs.slice(0, 8).map(l => {
    const u = getUser(l.userId);
    return `<li class="list-group-item d-flex gap-2 align-items-start">${avatar(u, "avatar-sm")}
      <div class="flex-grow-1 min-w-0"><div class="small"><strong>${escapeHtml(u ? u.name : "Deleted user")}</strong> ${escapeHtml(l.action)}</div>
      <small class="text-muted">${formatDate(l.date)}</small></div></li>`;
  }).join("") : `<li class="list-group-item">${emptyState("activity", "No activity yet", "User actions will be logged here.")}</li>`;

  // Clubs needing attention
  const noSecretary = db.clubs.filter(c => !c.secretaryId);
  const pendingByClub = db.clubs.map(c => ({ c, n: db.memberships.filter(m => m.clubId === c.id && m.status === "pending").length })).filter(x => x.n);
  const resets = db.resetRequests.map(r => ({ r, u: getUser(r.userId) })).filter(x => x.u);
  const lockedUsers = db.users.filter(u => isUserLocked(u.id));
  document.getElementById("attentionList").innerHTML = (lockedUsers.length || resets.length || noSecretary.length || pendingByClub.length) ? [
    ...lockedUsers.map(u => `<li class="list-group-item d-flex justify-content-between align-items-center small"><span><i class="bi bi-lock-fill text-danger me-2"></i>${escapeHtml(u.name)} is locked (too many wrong passwords)</span><a class="btn btn-sm btn-outline-primary" href="users.html">Unlock</a></li>`),
    ...resets.map(x => `<li class="list-group-item d-flex justify-content-between align-items-center small"><span><i class="bi bi-key text-danger me-2"></i>${escapeHtml(x.u.name)} requested a password reset</span><a class="btn btn-sm btn-outline-primary" href="users.html?edit=${x.u.id}">Reset</a></li>`),
    ...noSecretary.map(c => `<li class="list-group-item d-flex justify-content-between align-items-center small"><span><i class="bi bi-person-exclamation text-warning me-2"></i>${escapeHtml(c.name)} has no secretary</span><a class="btn btn-sm btn-outline-primary" href="users.html">Assign</a></li>`),
    ...pendingByClub.map(x => `<li class="list-group-item d-flex justify-content-between align-items-center small"><span><i class="bi bi-hourglass-split text-info me-2"></i>${escapeHtml(x.c.name)}: ${x.n} pending request(s)</span><a class="btn btn-sm btn-outline-primary" href="../secretary/members.html">Review</a></li>`)
  ].join("") : `<li class="list-group-item small text-muted">Everything looks good!</li>`;

  // System information
  const bytes = new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size;
  document.getElementById("systemInfo").innerHTML = `
    <li><span>Version</span><strong>1.0</strong></li>
    <li><span>Data storage</span><strong>Browser localStorage</strong></li>
    <li><span>Storage used</span><strong>${(bytes / 1024).toFixed(1)} KB</strong></li>
    <li><span>Announcements</span><strong>${db.announcements.length}</strong></li>
    <li><span>Attendance records</span><strong>${db.attendance.length}</strong></li>
    <li><span>Feedback entries</span><strong>${db.feedback.length}</strong></li>`;

  document.getElementById("exportData").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "jnec-cms-backup-" + todayStr() + ".json";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Backup downloaded.");
  });
  // Restore all records from a backup file made with "Backup data"
  document.getElementById("restoreFile").addEventListener("change", async e => {
    const file = e.target.files[0];
    e.target.value = ""; // allow choosing the same file again later
    if (!file) return;
    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch (err) {
      showToast("This file is not a valid backup.", "danger");
      return;
    }
    if (!Array.isArray(backup.users) || !Array.isArray(backup.clubs) || !backup.users.some(u => u.role === "admin")) {
      showToast("This file is not a valid backup (it must contain users, clubs and an administrator).", "danger");
      return;
    }
    if (!(await confirmDialog("Restore backup?", `All current records will be replaced with "${file.name}" (${backup.users.length} users, ${backup.clubs.length} clubs). You will be logged out.`, "Restore"))) return;
    restoreData(backup);
    localStorage.removeItem(SESSION_KEY);
    setFlash("Backup restored. Please log in again.", "success");
    window.location.href = ROOT + "login.html";
  });
});

/* ---------------- Users & roles ---------------- */
registerPage("admin-users", () => {
  const me = getCurrentUser();
  const search = document.getElementById("userSearch");
  const roleFilter = document.getElementById("userRole");
  const statusFilter = document.getElementById("userStatus");
  const form = document.getElementById("userForm");
  const modal = new bootstrap.Modal(document.getElementById("userModal"));
  let editingId = null;

  form.department.innerHTML = `<option value="">Choose…</option>` + DEPARTMENTS.concat("Administration").map(d => `<option>${d}</option>`).join("");
  form.clubId.innerHTML = `<option value="">Choose club…</option>` + db.clubs.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  // The club field only matters for secretaries
  function toggleClubField() {
    const isSec = form.role.value === "secretary";
    document.getElementById("clubGroup").classList.toggle("d-none", !isSec);
    form.clubId.required = isSec;
  }
  form.role.addEventListener("change", toggleClubField);

  function render() {
    const q = search.value.trim().toLowerCase();
    const users = db.users
      .filter(u => !q || (u.name + " " + u.email + " " + u.studentId).toLowerCase().includes(q))
      .filter(u => !roleFilter.value || u.role === roleFilter.value)
      .filter(u => !statusFilter.value || u.status === statusFilter.value)
      .sort((a, b) => a.name.localeCompare(b.name));

    document.getElementById("userCount").textContent = `${users.length} user${users.length === 1 ? "" : "s"}`;
    ["member", "secretary", "admin"].forEach(r => { document.getElementById("count-" + r).textContent = db.users.filter(u => u.role === r).length; });

    document.getElementById("usersBody").innerHTML = users.length ? users.map(u => `
      <tr>
        <td><div class="d-flex align-items-center gap-2">${avatar(u, "avatar-sm")}<div class="min-w-0"><div class="fw-semibold">${escapeHtml(u.name)}${u.id === me.id ? ' <span class="badge text-bg-light">You</span>' : ""}</div><small class="text-muted">${escapeHtml(u.email)}</small></div></div></td>
        <td>${escapeHtml(u.studentId)}</td>
        <td><span class="badge role-badge role-${u.role}">${escapeHtml(roleLabel(u.role))}</span>
          ${u.role === "secretary" ? `<small class="d-block text-muted">${escapeHtml(getClub(u.clubId)?.name || "No club assigned")}</small>` : ""}</td>
        <td>${escapeHtml(u.department || "-")}</td>
        <td>${statusBadge(u.status)}${isUserLocked(u.id) ? ' <span class="badge text-bg-danger"><i class="bi bi-lock-fill"></i> Locked</span>' : ""}${db.resetRequests.some(r => r.userId === u.id) ? ' <span class="badge text-bg-danger"><i class="bi bi-key"></i> Reset requested</span>' : ""}</td>
        <td class="text-end text-nowrap">
          ${isUserLocked(u.id) ? `<button class="btn btn-sm btn-outline-success" data-unlock="${u.id}" title="Unlock account" aria-label="Unlock ${escapeHtml(u.name)}"><i class="bi bi-unlock"></i></button>` : ""}
          <button class="btn btn-sm btn-outline-secondary" data-edit="${u.id}" aria-label="Edit ${escapeHtml(u.name)}"><i class="bi bi-pencil"></i></button>
          ${u.id !== me.id ? `
          <button class="btn btn-sm btn-outline-${u.status === "active" ? "warning" : "success"}" data-toggle="${u.id}" aria-label="${u.status === "active" ? "Deactivate" : "Activate"} ${escapeHtml(u.name)}" title="${u.status === "active" ? "Deactivate" : "Activate"}"><i class="bi bi-${u.status === "active" ? "pause-circle" : "play-circle"}"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-delete="${u.id}" aria-label="Delete ${escapeHtml(u.name)}"><i class="bi bi-trash"></i></button>` : ""}
        </td>
      </tr>`).join("") : `<tr><td colspan="6">${emptyState("person-x", "No users found", "Try a different search or filter.")}</td></tr>`;
  }

  function openForm(u) {
    editingId = u ? u.id : null;
    resetForm(form);
    document.getElementById("userModalTitle").textContent = u ? "Edit user" : "Add new user";
    form.password.required = !u;
    document.getElementById("passwordHelp").textContent = u
      ? "Leave blank to keep the current password, or enter a temporary password (the user must change it at next login)."
      : "Temporary password — the user must change it at first login.";
    if (u) fillForm(form, { ...u, password: "" });
    else { form.role.value = "member"; form.status.value = "active"; }
    // admins can't remove their own admin access
    const self = u && u.id === me.id;
    form.role.disabled = self;
    form.status.disabled = self;
    toggleClubField();
    modal.show();
  }

  // live duplicate checks
  form.email.addEventListener("input", () => {
    const taken = db.users.some(u => u.id !== editingId && u.email.toLowerCase() === form.email.value.trim().toLowerCase());
    form.email.setCustomValidity(taken ? "taken" : "");
    document.getElementById("userEmailFeedback").textContent = taken ? "This email is already used." : "Enter a valid email address.";
  });
  form.studentId.addEventListener("input", () => {
    const taken = db.users.some(u => u.id !== editingId && u.studentId === form.studentId.value.trim());
    form.studentId.setCustomValidity(taken ? "taken" : "");
    document.getElementById("userIdFeedback").textContent = taken ? "This ID is already used." : "Student/staff ID is required.";
  });

  document.getElementById("addUserBtn").addEventListener("click", () => openForm(null));

  setupForm(form, async values => {
    const role = editingId === me.id ? "admin" : values.role;
    const clubId = role === "secretary" ? values.clubId : null;

    // One secretary per club: ask before replacing someone
    if (clubId) {
      const club = getClub(clubId);
      const current = club.secretaryId && club.secretaryId !== editingId ? getUser(club.secretaryId) : null;
      if (current && !(await confirmDialog("Replace club secretary?", `${current.name} is currently the secretary of ${club.name}. Replace them?`, "Replace", "warning"))) return;
      if (current) DB.update("users", current.id, { clubId: null });
    }

    const data = {
      name: values.name.trim(), email: values.email.trim().toLowerCase(), studentId: values.studentId.trim(),
      role, clubId, department: values.department, phone: values.phone.trim(),
      status: editingId === me.id ? "active" : values.status
    };
    // A password set by the admin is temporary: the user must change it at next login
    if (values.password) {
      data.password = values.password;
      if (editingId !== me.id) data.mustChangePassword = true;
    }

    let user;
    if (editingId) {
      const before = getUser(editingId);
      // if this person was secretary of another club, free that club
      if (before.clubId && before.clubId !== clubId) DB.update("clubs", before.clubId, { secretaryId: null });
      user = DB.update("users", editingId, data);
      showToast("User updated.");
    } else {
      user = DB.add("users", { id: uid("u"), year: "", bio: "", joined: todayStr(), ...data });
      showToast("User account created.");
    }
    if (clubId) DB.update("clubs", clubId, { secretaryId: user.id });
    if (values.password) { DB.removeWhere("resetRequests", r => r.userId === user.id); unlockUser(user.id); } // request handled
    logActivity(me.id, `${editingId ? "Updated" : "Created"} user ${user.name} (${roleLabel(user.role)})`);
    modal.hide();
    render();
  });

  document.getElementById("usersBody").addEventListener("click", async e => {
    const edit = e.target.closest("[data-edit]");
    const toggle = e.target.closest("[data-toggle]");
    const del = e.target.closest("[data-delete]");
    const unlock = e.target.closest("[data-unlock]");
    if (unlock) {
      const u = getUser(unlock.dataset.unlock);
      unlockUser(u.id);
      logActivity(me.id, `Unlocked ${u.name}'s account`);
      showToast(`${u.name} can log in again.`);
      render();
      return;
    }
    if (edit) openForm(getUser(edit.dataset.edit));
    if (toggle) {
      const u = getUser(toggle.dataset.toggle);
      const next = u.status === "active" ? "inactive" : "active";
      if (next === "inactive" && !(await confirmDialog("Deactivate account?", `${u.name} will not be able to log in until reactivated.`, "Deactivate", "warning"))) return;
      DB.update("users", u.id, { status: next });
      logActivity(me.id, `${next === "active" ? "Activated" : "Deactivated"} ${u.name}`);
      showToast(`${u.name} is now ${next}.`, "info");
      render();
    }
    if (del) {
      const u = getUser(del.dataset.delete);
      if (!(await confirmDialog("Delete user?", `${u.name}'s account, memberships and event registrations will be deleted. This cannot be undone.`, "Delete user"))) return;
      DB.remove("users", u.id);
      DB.removeWhere("memberships", m => m.userId === u.id);
      DB.removeWhere("registrations", r => r.userId === u.id);
      DB.removeWhere("resetRequests", r => r.userId === u.id);
      db.clubs.filter(c => c.secretaryId === u.id).forEach(c => DB.update("clubs", c.id, { secretaryId: null }));
      logActivity(me.id, `Deleted user ${u.name}`);
      showToast("User deleted.", "info");
      render();
    }
  });

  [search, roleFilter, statusFilter].forEach(el => el.addEventListener("input", render));
  render();
  if (getParam("edit") && getUser(getParam("edit"))) openForm(getUser(getParam("edit")));
});

/* ---------------- All clubs (admin) ---------------- */
registerPage("admin-clubs", () => {
  const me = getCurrentUser();
  const search = document.getElementById("clubSearch");
  const categoryFilter = document.getElementById("clubCategoryFilter");
  const form = document.getElementById("clubForm");
  const modal = new bootstrap.Modal(document.getElementById("clubModal"));
  let editingId = null;

  categoryFilter.innerHTML += CLUB_CATEGORIES.map(c => `<option>${c}</option>`).join("");
  form.category.innerHTML = CLUB_CATEGORIES.map(c => `<option>${c}</option>`).join("");
  const logoInput = setupLogoInput(form);

  function fillSecretaryOptions() {
    const secretaries = db.users.filter(u => u.role === "secretary");
    form.secretaryId.innerHTML = `<option value="">Not assigned</option>` +
      secretaries.map(u => `<option value="${u.id}">${escapeHtml(u.name)}${u.clubId && u.clubId !== editingId ? " (currently " + escapeHtml(getClub(u.clubId)?.name || "") + ")" : ""}</option>`).join("");
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const clubs = db.clubs
      .filter(c => !q || (c.name + " " + c.description + " " + c.advisor).toLowerCase().includes(q))
      .filter(c => !categoryFilter.value || c.category === categoryFilter.value)
      .sort((a, b) => a.name.localeCompare(b.name));

    document.getElementById("clubsBody").innerHTML = clubs.length ? clubs.map(c => `
      <tr>
        <td><div class="d-flex align-items-center gap-2">${clubLogo(c, "club-icon-sm")}
          <div><a class="fw-semibold text-decoration-none" href="${ROOT}club-details.html?id=${c.id}">${escapeHtml(c.name)}</a><small class="d-block text-muted">Advisor: ${escapeHtml(c.advisor)}</small></div></div></td>
        <td>${escapeHtml(c.category)}</td>
        <td>${c.secretaryId ? escapeHtml(getUser(c.secretaryId)?.name) : '<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>None</span>'}</td>
        <td>${getApprovedMembers(c.id).length}</td>
        <td>${db.events.filter(e => e.clubId === c.id).length}</td>
        <td>${statusBadge(c.status)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" data-edit="${c.id}" aria-label="Edit ${escapeHtml(c.name)}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-delete="${c.id}" aria-label="Delete ${escapeHtml(c.name)}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join("") : `<tr><td colspan="7">${emptyState("buildings", "No clubs found", "Add a new club or change the filters.")}</td></tr>`;
  }

  function openForm(club) {
    editingId = club ? club.id : null;
    resetForm(form);
    fillSecretaryOptions();
    document.getElementById("clubModalTitle").textContent = club ? "Edit club" : "Add new club";
    if (club) fillForm(form, { ...club, secretaryId: club.secretaryId || "" });
    else { form.color.value = "#1d4e89"; form.status.value = "active"; }
    form.logo.value = clubLogoSrc(club); // hidden fields are not cleared by form.reset()
    logoInput.refresh();
    modal.show();
  }
  document.getElementById("addClubBtn").addEventListener("click", () => openForm(null));

  form.name.addEventListener("input", () => {
    const taken = db.clubs.some(c => c.id !== editingId && c.name.toLowerCase() === form.name.value.trim().toLowerCase());
    form.name.setCustomValidity(taken ? "taken" : "");
    document.getElementById("clubNameFeedback").textContent = taken ? "A club with this name already exists." : "Club name is required (3–60 characters).";
  });

  setupForm(form, values => {
    const data = { ...cleanClubValues(values), status: values.status, secretaryId: values.secretaryId || null };
    let club;
    if (editingId) {
      const before = getClub(editingId);
      if (before.secretaryId && before.secretaryId !== data.secretaryId) DB.update("users", before.secretaryId, { clubId: null });
      club = DB.update("clubs", editingId, data);
    } else {
      club = DB.add("clubs", { id: uid("c"), activities: [], ...data });
    }
    // link the secretary to this club (and unlink them from any other club)
    if (data.secretaryId) {
      db.clubs.filter(c => c.id !== club.id && c.secretaryId === data.secretaryId).forEach(c => DB.update("clubs", c.id, { secretaryId: null }));
      DB.update("users", data.secretaryId, { clubId: club.id });
    }
    logActivity(me.id, `${editingId ? "Updated" : "Created"} club ${club.name}`);
    showToast(editingId ? "Club updated." : "Club created.");
    modal.hide();
    render();
  });

  document.getElementById("clubsBody").addEventListener("click", async e => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-delete]");
    if (edit) openForm(getClub(edit.dataset.edit));
    if (del) {
      const c = getClub(del.dataset.delete);
      const eventIds = db.events.filter(ev => ev.clubId === c.id).map(ev => ev.id);
      if (!(await confirmDialog("Delete club?", `${c.name} and all its memberships, ${eventIds.length} event(s), attendance records and announcements will be deleted. This cannot be undone.`, "Delete club"))) return;
      DB.remove("clubs", c.id);
      DB.removeWhere("memberships", m => m.clubId === c.id);
      DB.removeWhere("events", ev => ev.clubId === c.id);
      DB.removeWhere("registrations", r => eventIds.includes(r.eventId));
      DB.removeWhere("attendance", a => eventIds.includes(a.eventId));
      DB.removeWhere("announcements", a => a.clubId === c.id);
      DB.removeWhere("feedback", f => f.clubId === c.id);
      if (c.secretaryId) DB.update("users", c.secretaryId, { clubId: null });
      logActivity(me.id, `Deleted club ${c.name}`);
      showToast("Club deleted.", "info");
      render();
    }
  });

  [search, categoryFilter].forEach(el => el.addEventListener("input", render));
  render();
});