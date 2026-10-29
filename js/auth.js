/* =========================================================
   auth.js — Login, registration, logout and page guards
   ---------------------------------------------------------
   The "session" is the logged-in user's id saved in
   localStorage. For a multi-computer deployment, move login
   to a server (e.g. PHP sessions + hashed passwords).
   ========================================================= */

function getCurrentUser() {
  const id = localStorage.getItem(SESSION_KEY);
  const user = id ? getUser(id) : null;
  return user && user.status === "active" ? user : null;
}

/* ---------------- Too many wrong passwords → lock ----------------
   After MAX_LOGIN_ATTEMPTS wrong passwords the account is locked for
   LOCK_MINUTES. The administrator can unlock it earlier (Users & Roles). */
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Attempts are counted per account; unknown emails/IDs are counted too,
// so the messages don't reveal which accounts exist.
function attemptKey(user, identifier) { return user ? user.id : "unknown:" + identifier; }
function getLock(key) {
  const a = db.loginAttempts[key];
  return a && a.lockedUntil && a.lockedUntil > Date.now() ? a : null;
}
function isUserLocked(userId) { return !!getLock(userId); }
function unlockUser(userId) { delete db.loginAttempts[userId]; saveData(); }
function lockMessage(until) {
  const mins = Math.max(1, Math.ceil((until - Date.now()) / 60000));
  return `Too many wrong passwords. For your security this account is locked. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask the system administrator to unlock it.`;
}

function login(identifier, password) {
  reloadData(); // always check against the latest saved accounts
  const key = identifier.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === key || u.studentId.toLowerCase() === key);
  const k = attemptKey(user, key);

  const lock = getLock(k);
  if (lock) return { ok: false, locked: true, message: lockMessage(lock.lockedUntil) };

  if (!user || user.password !== password) {
    let a = db.loginAttempts[k];
    if (!a || (a.lockedUntil && a.lockedUntil <= Date.now())) a = { count: 0 }; // old lock has expired: start again
    a.count += 1;
    if (a.count >= MAX_LOGIN_ATTEMPTS) {
      a.lockedUntil = Date.now() + LOCK_MINUTES * 60000;
      if (user) logActivity(user.id, `Account locked after ${MAX_LOGIN_ATTEMPTS} wrong password attempts`);
    }
    db.loginAttempts[k] = a;
    saveData();
    if (a.lockedUntil) return { ok: false, locked: true, message: lockMessage(a.lockedUntil) };
    const left = MAX_LOGIN_ATTEMPTS - a.count;
    return { ok: false, message: `Incorrect email/student ID or password. ${left} attempt${left === 1 ? "" : "s"} left before the account is locked.` };
  }
  if (user.status !== "active") return { ok: false, message: "Your account is inactive. Please contact the system administrator." };

  delete db.loginAttempts[k]; // correct password: forget earlier mistakes
  saveData();
  startSession(user);
  return { ok: true, user };
}

// Which folders each role may open (matches the data-role on each page)
function roleCanOpen(path, role) {
  if (path.includes("/admin/")) return role === "admin";
  if (path.includes("/secretary/")) return role === "secretary" || role === "admin";
  if (path.includes("/member/")) return role === "member";
  return true; // public pages and account/profile.html
}

function startSession(user) {
  localStorage.setItem(SESSION_KEY, user.id);
  sessionStorage.removeItem("cms_announce_toast");
}

/* ---------------- Log in with Google ----------------
   Uses Google Identity Services (official Google sign-in button).
   SETUP: create a free "OAuth client ID" (type: Web application) in
   Google Cloud Console and paste it below. Steps are in README.md.
   Google sign-in works for EXISTING accounts: the Google email must be
   the same email the person registered with.
   Note: without a server the Google token is only checked in the browser
   (expiry, audience, issuer, verified email), not cryptographically verified. */
const GOOGLE_CLIENT_ID = ""; // e.g. "1234567890-abc123.apps.googleusercontent.com"

function decodeJwt(token) {
  const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(atob(part).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
  return JSON.parse(json);
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  setFlash("You have been logged out.", "info");
  window.location.href = ROOT + "login.html";
}

/* Page guard. A page declares who may open it:
   <body data-role="member">  or  data-role="secretary admin"
   Returns false when the page is redirecting. */
function guardPage() {
  const allowed = (document.body.dataset.role || "").split(" ").filter(Boolean);
  const user = getCurrentUser();

  // Logged-in users don't need the login/register pages
  if (document.body.dataset.guest === "only" && user) {
    window.location.replace(dashboardUrl(user.role));
    return false;
  }
  if (!allowed.length) return true; // public page

  // Users with a temporary password must change it first
  if (user && user.mustChangePassword && document.body.dataset.page !== "profile") {
    setFlash("Please change your temporary password before continuing.", "warning");
    window.location.replace(ROOT + "account/profile.html");
    return false;
  }

  if (!user) {
    setFlash("Please log in to continue.", "warning");
    const back = window.location.pathname + window.location.search;
    window.location.replace(ROOT + "login.html?redirect=" + encodeURIComponent(back));
    return false;
  }
  if (!allowed.includes(user.role)) {
    setFlash("You don't have permission to open that page.", "danger");
    window.location.replace(dashboardUrl(user.role));
    return false;
  }
  return true;
}

/* Toggle password visibility buttons: <button data-toggle-password="#fieldId"> */
function setupPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.querySelector(btn.dataset.togglePassword);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = `<i class="bi bi-eye${show ? "-slash" : ""}"></i>`;
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
}

/* ---------------- Login page ---------------- */
registerPage("login", () => {
  const form = document.getElementById("loginForm");
  const alertBox = document.getElementById("loginAlert");
  setupPasswordToggles();

  function showError(message, locked = false) {
    alertBox.innerHTML = `<div class="alert alert-${locked ? "warning" : "danger"} d-flex gap-2 align-items-start" role="alert"><i class="bi bi-${locked ? "lock-fill" : "exclamation-octagon"}"></i><span>${escapeHtml(message)}</span></div>`;
  }

  // Where to go after a successful login (password or Google)
  function afterLogin(user, how) {
    logActivity(user.id, how === "google" ? "Logged in with Google" : "Logged in");
    setFlash(`Welcome back, ${user.name.split(" ")[0]}!`);
    if (user.mustChangePassword) {
      setFlash("You are using a temporary password. Please set a new password now.", "warning");
      window.location.href = ROOT + "account/profile.html";
      return;
    }
    const redirect = getParam("redirect");
    // only follow redirects to pages on this same site that this role is allowed to open
    const safe = redirect && redirect.startsWith("/") && !redirect.startsWith("//") && roleCanOpen(redirect, user.role);
    window.location.href = safe ? redirect : dashboardUrl(user.role);
  }

  setupForm(form, values => {
    const result = login(values.identifier, values.password);
    if (!result.ok) {
      showError(result.message, result.locked);
      form.password.value = "";
      form.password.focus();
      return;
    }
    afterLogin(result.user, "password");
  });

  /* ---- Google sign-in ---- */
  const googleBox = document.getElementById("googleLogin");
  function handleGoogleCredential(response) {
    reloadData();
    let info;
    try { info = decodeJwt(response.credential); } catch (e) { showError("Google sign-in failed. Please try again."); return; }
    const validIssuer = info.iss === "accounts.google.com" || info.iss === "https://accounts.google.com";
    if (info.aud !== GOOGLE_CLIENT_ID || !validIssuer || info.exp * 1000 < Date.now() || !info.email_verified) {
      showError("Google sign-in could not be verified. Please try again.");
      return;
    }
    const user = db.users.find(u => u.email.toLowerCase() === String(info.email).toLowerCase());
    if (!user) {
      showError(`No account uses the Google email ${info.email}. Students: register first with this email. Club secretaries: ask the system administrator.`);
      return;
    }
    if (user.status !== "active") { showError("Your account is inactive. Please contact the system administrator."); return; }
    unlockUser(user.id); // signing in with Google proves who they are
    startSession(user);
    afterLogin(user, "google");
  }

  if (!GOOGLE_CLIENT_ID) {
    // Not set up yet: show the button, explain when clicked
    googleBox.innerHTML = `<button type="button" class="btn btn-light border w-100 py-2 d-flex align-items-center justify-content-center gap-2" id="googleNotReady">
        <i class="bi bi-google"></i>Continue with Google</button>`;
    document.getElementById("googleNotReady").addEventListener("click", () =>
      showToast("Google sign-in is not set up yet. The administrator must add a Google Client ID in js/auth.js (see README).", "info"));
  } else {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (window.google && google.accounts && google.accounts.id) {
        clearInterval(timer);
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
        google.accounts.id.renderButton(document.getElementById("googleBtn"), {
          theme: "outline", size: "large", text: "continue_with", shape: "rectangular",
          width: Math.min(400, Math.max(200, googleBox.clientWidth))
        });
      } else if (tries > 50) {
        clearInterval(timer);
        googleBox.innerHTML = `<p class="small text-muted text-center mb-0">Google sign-in could not load. Check your internet connection.</p>`;
      }
    }, 200);
  }

  // "Forgot password" modal — the request is shown to the administrator,
  // who then sets a temporary password for the user.
  const forgotForm = document.getElementById("forgotForm");
  setupForm(forgotForm, values => {
    const user = db.users.find(u => u.email.toLowerCase() === values.email.trim().toLowerCase());
    if (user && !db.resetRequests.some(r => r.userId === user.id)) {
      db.resetRequests.push({ id: uid("pr"), userId: user.id, date: todayStr() });
      saveData();
    }
    bootstrap.Modal.getInstance(document.getElementById("forgotModal")).hide();
    resetForm(forgotForm);
    // Same message either way, so the form can't be used to find out which emails are registered
    showToast("If this email is registered, the system administrator will contact you with a temporary password.", "info");
  });
});

/* ---------------- Registration page ---------------- */
registerPage("register", () => {
  const form = document.getElementById("registerForm");
  setupPasswordToggles();

  // Extra checks the browser can't do on its own
  const checkConfirm = () => {
    form.confirmPassword.setCustomValidity(form.confirmPassword.value === form.password.value ? "" : "Passwords do not match");
  };
  const checkEmail = () => {
    const taken = db.users.some(u => u.email.toLowerCase() === form.email.value.trim().toLowerCase());
    form.email.setCustomValidity(taken ? "Email already registered" : "");
    document.getElementById("emailFeedback").textContent = taken ? "This email is already registered." : "Enter a valid email address.";
  };
  const checkStudentId = () => {
    const taken = db.users.some(u => u.studentId === form.studentId.value.trim());
    form.studentId.setCustomValidity(taken ? "Student ID already registered" : "");
    document.getElementById("studentIdFeedback").textContent = taken ? "This student ID is already registered." : "Student ID must be exactly 8 digits.";
  };
  form.password.addEventListener("input", () => { checkConfirm(); updateStrength(form.password.value); });
  form.confirmPassword.addEventListener("input", checkConfirm);
  form.email.addEventListener("input", checkEmail);
  form.studentId.addEventListener("input", checkStudentId);

  function updateStrength(pw) {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    const bar = document.getElementById("strengthBar");
    const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
    const colors = ["danger", "danger", "warning", "info", "success"];
    bar.style.width = (score / 4) * 100 + "%";
    bar.className = "progress-bar bg-" + colors[score];
    document.getElementById("strengthText").textContent = pw ? labels[score] : "";
  }

  setupForm(form, values => {
    reloadData(); // include accounts created in other tabs
    checkEmail(); checkStudentId(); checkConfirm();
    if (!form.checkValidity()) { form.classList.add("was-validated"); return; }

    const user = DB.add("users", {
      id: uid("u"),
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      role: "member",
      studentId: values.studentId.trim(),
      department: values.department,
      year: values.year,
      phone: values.phone.trim(),
      clubId: null,
      status: "active",
      bio: "",
      joined: todayStr()
    });
    logActivity(user.id, "Registered a new student account");
    localStorage.setItem(SESSION_KEY, user.id);
    setFlash("Account created successfully. Welcome to JNEC Clubs!");
    window.location.href = dashboardUrl("member");
  });
});
