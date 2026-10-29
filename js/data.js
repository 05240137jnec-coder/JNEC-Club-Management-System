/* =========================================================
   data.js — Starting data + localStorage "database"
   ---------------------------------------------------------
   All records are saved in this browser's localStorage.
   Note: localStorage belongs to ONE browser on ONE computer
   and is not encrypted. To share data between computers,
   connect the system to a server database (e.g. PHP + MySQL,
   as proposed in the project report). Use "Backup data" on
   the admin dashboard to keep copies of your records.
   ========================================================= */

const STORAGE_KEY = "jnec_cms_data";
const SESSION_KEY = "jnec_cms_session";

/* ---------- Fixed lists used in forms and filters ---------- */
const CLUB_CATEGORIES = ["Technical", "Literary", "Cultural", "Sports", "Social Service", "Arts & Media"];
const EVENT_CATEGORIES = ["Workshop", "Competition", "Meeting", "Cultural", "Sports", "Debate", "Literary", "Social Service", "Other"];
const DEPARTMENTS = ["Civil Engineering & Surveying", "Electrical & Electronics Engineering", "Information Technology", "Mechanical Engineering", "Humanities & Management"];

/* ---------- Date helpers ---------- */
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function todayStr() {
  return toDateStr(new Date());
}
// Returns a date string N days from today (negative = past)
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/* ---------- Unique id generator ---------- */
function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------- Starting data ----------
   The system starts with the college clubs and ONE administrator
   account. Students register themselves; the administrator creates
   club secretaries and assigns them to clubs. Everything else
   (events, announcements, attendance…) is added through the system.
*/
const DEFAULT_ADMIN_EMAIL = "admin@jnec.edu.bt";
const DEFAULT_ADMIN_PASSWORD = "Admin@123"; // default admin login (can be changed later in My Profile)

function getInitialData() {
  return {
    users: [
      { id: "u1", name: "System Administrator", email: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD, mustChangePassword: false, role: "admin", studentId: "ADMIN-001", department: "Administration", year: "", phone: "", clubId: null, status: "active", bio: "", joined: todayStr() }
    ],

    clubs: [
      { id: "c1", name: "Robotics & Innovation Club", category: "Technical", logo: "", color: "#1d4e89", description: "Design, build and program robots. We take part in national robotics competitions and run hands-on workshops on Arduino, sensors and automation.", objectives: "Promote innovation and practical engineering skills; prepare teams for national competitions; share knowledge through peer workshops.", meeting: "Every Wednesday, 5:00 PM", venue: "Electronics Lab", advisor: "Not assigned", secretaryId: null, status: "active", activities: [] },
      { id: "c2", name: "Coding & Cyber Club", category: "Technical", logo: "", color: "#0b7a75", description: "A community for programmers. We practise problem solving, web development and basic cyber security through weekly challenges and hackathons.", objectives: "Improve coding skills; encourage open-source projects; raise cyber security awareness on campus.", meeting: "Every Friday, 4:30 PM", venue: "IT Lab 2", advisor: "Not assigned", secretaryId: null, status: "active", activities: [] },
      { id: "c3", name: "Literary & Debate Club", category: "Literary", logo: "", color: "#7a3e9d", description: "Sharpen your public speaking, writing and critical thinking through debates, poetry evenings, quiz contests and the annual college magazine.", objectives: "Build confidence in public speaking; promote reading culture; publish the college magazine.", meeting: "Every Tuesday, 5:30 PM", venue: "Library Hall", advisor: "Not assigned", secretaryId: null, status: "active", activities: [] },
      { id: "c4", name: "Cultural Club", category: "Cultural", logo: "", color: "#b5452c", description: "Preserve and celebrate Bhutanese culture through traditional songs (zhungdra and boedra), mask dances and cultural programmes during college events.", objectives: "Promote Bhutanese tradition and Driglam Namzha; perform at college and national events.", meeting: "Every Monday & Thursday, 6:00 PM", venue: "Multipurpose Hall", advisor: "Not assigned", secretaryId: null, status: "active", activities: [] },
      { id: "c5", name: "Sports & Archery Club", category: "Sports", logo: "", color: "#2f7d32", description: "Football, basketball, volleyball and our national sport — archery. We organise inter-department tournaments and represent JNEC at RUB games.", objectives: "Encourage a healthy lifestyle; build team spirit; train teams for inter-college tournaments.", meeting: "Daily, 4:00 PM", venue: "College Football Ground", advisor: "Not assigned", secretaryId: null, status: "active", activities: [] },
      { id: "c6", name: "Nature & Environment Club", category: "Social Service", logo: "", color: "#4c7a1f", description: "Protect the environment of Dewathang and our campus through clean-up campaigns, tree plantation and awareness on waste management.", objectives: "Keep the campus green and clean; promote waste segregation; support national environment days.", meeting: "Every Saturday, 9:00 AM", venue: "Lecture Theatre 1", advisor: "Not assigned", secretaryId: null, status: "active", activities: [] },
      { id: "c7", name: "Photography & Media Club", category: "Arts & Media", logo: "", color: "#c27c0e", description: "Capture campus life! Learn photography, video editing and social media content creation. We cover all major college events.", objectives: "Document college events; teach photography and editing skills; manage the college media page.", meeting: "Every Thursday, 5:00 PM", venue: "Media Room", advisor: "Not assigned", secretaryId: null, status: "active", activities: [] },
      { id: "c8", name: "Y-Peer & Health Club", category: "Social Service", logo: "", color: "#c0392b", description: "Peer educators promoting mental health, healthy habits and first aid. We run blood donation drives and awareness sessions.", objectives: "Promote physical and mental well-being; train students in basic first aid; organise blood donation.", meeting: "Every 2nd Sunday, 10:00 AM", venue: "Counselling Centre", advisor: "Not assigned", secretaryId: null, status: "active", activities: [] }
    ],

    memberships: [],
    events: [],
    registrations: [],
    attendance: [],
    announcements: [],
    feedback: [],
    reads: {},          // { userId: [announcementId, ...] } — which announcements a user has read
    resetRequests: [],  // forgotten-password requests shown to the administrator
    loginAttempts: {},  // failed logins: { key: { count, lockedUntil } }
    logs: []
  };
}

/* ---------- Load / save the whole database ---------- */
let db = loadData();
fillMissingLists();

function fillMissingLists() {
  if (!db.resetRequests) db.resetRequests = [];
  if (!db.loginAttempts) db.loginAttempts = {};
  // The default admin logs in straight to the dashboard (no forced password change)
  const defaultAdmin = db.users.find(u => u.id === "u1" && u.password === DEFAULT_ADMIN_PASSWORD);
  if (defaultAdmin && defaultAdmin.mustChangePassword) {
    defaultAdmin.mustChangePassword = false;
    saveData();
  }
}

/* Keep this page's copy of the data up to date.
   Without this, a page that was opened earlier (for example the login page)
   would not see an account created in another tab, and saving its old copy
   would erase that account. */
function reloadData() {
  db = loadData();
  fillMissingLists();
}
// another tab saved changes → use them here too
window.addEventListener("storage", event => {
  if (event.key === STORAGE_KEY && event.newValue) reloadData();
});
// page shown again with the browser's Back/Forward buttons → reload saved data
window.addEventListener("pageshow", event => {
  if (event.persisted) reloadData();
});

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.warn("Could not read saved data, starting with the initial data.", err);
  }
  const fresh = getInitialData();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch (e) { /* storage blocked */ }
  return fresh;
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error("Saving failed", err);
    if (typeof showToast === "function") showToast("Could not save: browser storage is full. Remove some club logos or old records.", "danger");
  }
}

// Replace all records with a backup file's contents (admin "Restore backup")
function restoreData(backup) {
  db = { ...getInitialData(), ...backup };
  saveData();
}

/* ---------- Simple CRUD helpers ----------
   Example: DB.add("clubs", {...}); DB.update("clubs", "c1", { name: "New" });
*/
const DB = {
  all(collection) { return db[collection]; },
  find(collection, id) { return db[collection].find(item => item.id === id) || null; },
  add(collection, item) { db[collection].push(item); saveData(); return item; },
  update(collection, id, changes) {
    const item = this.find(collection, id);
    if (item) { Object.assign(item, changes); saveData(); }
    return item;
  },
  remove(collection, id) {
    db[collection] = db[collection].filter(item => item.id !== id);
    saveData();
  },
  removeWhere(collection, testFn) {
    db[collection] = db[collection].filter(item => !testFn(item));
    saveData();
  }
};

/* ---------- Query helpers used by every page ---------- */
function getUser(id) { return DB.find("users", id); }
function getClub(id) { return DB.find("clubs", id); }
function getEvent(id) { return DB.find("events", id); }

// Latest membership record of a user in a club (or null)
function getMembership(userId, clubId) {
  const list = db.memberships.filter(m => m.userId === userId && m.clubId === clubId);
  return list.length ? list[list.length - 1] : null;
}
function getApprovedMembers(clubId) {
  return db.memberships.filter(m => m.clubId === clubId && m.status === "approved");
}
function getUserClubIds(userId) {
  return db.memberships.filter(m => m.userId === userId && m.status === "approved").map(m => m.clubId);
}

// Event status is calculated from the date so it is always up to date
function getEventStatus(ev) {
  if (ev.cancelled) return "cancelled";
  return ev.date < todayStr() ? "completed" : "upcoming";
}
function getEventRegistrations(eventId) {
  return db.registrations.filter(r => r.eventId === eventId);
}
function isRegistered(userId, eventId) {
  return db.registrations.some(r => r.userId === userId && r.eventId === eventId);
}
function seatsLeft(ev) {
  return Math.max(0, Number(ev.capacity) - getEventRegistrations(ev.id).length);
}

// Announcements a user can see: college-wide + clubs they belong to.
// Secretaries/admins also see their managed clubs.
function getVisibleAnnouncements(user) {
  let clubIds = getUserClubIds(user.id);
  if (user.role === "secretary" && user.clubId) clubIds.push(user.clubId);
  return db.announcements
    .filter(a => user.role === "admin" || !a.clubId || clubIds.includes(a.clubId))
    .sort((a, b) => b.date.localeCompare(a.date));
}
function getReadIds(userId) { return db.reads[userId] || []; }
function getUnreadAnnouncements(user) {
  const read = getReadIds(user.id);
  return getVisibleAnnouncements(user).filter(a => !read.includes(a.id));
}
function markAnnouncementsRead(userId, ids) {
  const read = new Set(getReadIds(userId));
  ids.forEach(id => read.add(id));
  db.reads[userId] = [...read];
  saveData();
}

function getUserAttendance(userId) {
  return db.attendance.filter(a => a.userId === userId);
}
// Attendance rate in % from a list of attendance records (late counts as attended)
function attendanceRate(records) {
  if (!records.length) return 0;
  const attended = records.filter(r => r.status === "present" || r.status === "late").length;
  return Math.round((attended / records.length) * 100);
}

function logActivity(userId, action) {
  db.logs.unshift({ id: uid("l"), date: todayStr(), userId, action });
  db.logs = db.logs.slice(0, 100); // keep the log small
  saveData();
}