// FILE LOCATION: jnec-backend/logic.js
// All business rules live here (no Express code), so they are easy to read and test.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DEPARTMENTS = ['Civil Engineering & Surveying', 'Electrical & Electronics Engineering', 'Information Technology', 'Mechanical Engineering', 'Humanities & Management'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_ID = /^[a-z][a-z0-9]{5,40}$/;
const PREFIX = { users: 'u', clubs: 'c', memberships: 'm', events: 'e', registrations: 'r', attendance: 'at', announcements: 'a', feedback: 'f' };

class HttpError extends Error { constructor(code, message, fields) { super(message); this.code = code; this.fields = fields || {}; } }
const need = (cond, code, msg) => { if (!cond) throw new HttpError(code, msg); };

const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const str = (v) => String(v ?? '').trim();
const isAdmin = (u) => u.role === 'admin';
const manages = (u, clubId) => isAdmin(u) || (u.role === 'secretary' && !!u.clubId && u.clubId === clubId);
const stripSecret = (u) => { const { passwordHash, ...rest } = u; return rest; };
const publicUser = (u) => ({ id: u.id, name: u.name, role: u.role, clubId: u.clubId, status: u.status, department: u.department, year: u.year, bio: u.bio, joined: u.joined });
const emailTaken = (email, exceptId) => store.all('users').some((u) => u.id !== exceptId && u.email.toLowerCase() === email.toLowerCase());
const idTaken = (sid, exceptId) => store.all('users').some((u) => u.id !== exceptId && u.studentId && u.studentId.toLowerCase() === sid.toLowerCase());
const eventStatus = (ev) => (ev.cancelled ? 'cancelled' : ev.date < today() ? 'completed' : 'upcoming');

/* ---------------- Authentication ---------------- */
const sign = (u) => jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' });
function userFromToken(token) {
  if (!token) return null;
  try {
    const u = store.get('users', jwt.verify(token, SECRET).id);
    return u && u.status === 'active' ? u : null;
  } catch { return null; }
}

function login(identifier, password) {
  const key = str(identifier).toLowerCase();
  const u = store.all('users').find((x) => x.email.toLowerCase() === key || (x.studentId || '').toLowerCase() === key);
  if (!u || !bcrypt.compareSync(String(password || ''), u.passwordHash)) throw new HttpError(401, 'Incorrect email/student ID or password.');
  if (u.status !== 'active') throw new HttpError(403, 'Your account is inactive. Please contact the system administrator.');
  return { token: sign(u), user: stripSecret(u) };
}

function register(b) {
  const f = {};
  if (!/^[A-Za-z .'\-]{3,60}$/.test(str(b.name))) f.name = 'Enter your full name (letters only, at least 3 characters).';
  if (!/^[0-9]{8}$/.test(str(b.studentId))) f.studentId = 'Student ID must be exactly 8 digits.';
  if (!EMAIL.test(str(b.email))) f.email = 'Enter a valid email address.';
  if (!/^(17|77)[0-9]{6}$/.test(str(b.phone))) f.phone = 'Enter an 8-digit Bhutanese mobile number starting with 17 or 77.';
  if (!DEPARTMENTS.includes(b.department)) f.department = 'Please choose your department.';
  if (!['1', '2', '3', '4'].includes(String(b.year))) f.year = 'Please choose your year.';
  if (!/^(?=.*[A-Za-z])(?=.*[0-9]).{6,}$/.test(String(b.password || ''))) f.password = 'At least 6 characters with letters and numbers.';
  if (b.password !== b.confirmPassword) f.confirmPassword = 'Passwords do not match.';
  if (!f.email && emailTaken(str(b.email))) f.email = 'This email is already registered.';
  if (!f.studentId && idTaken(str(b.studentId))) f.studentId = 'This student ID is already registered.';
  if (Object.keys(f).length) throw new HttpError(400, 'Please fix the highlighted fields.', f);
  const u = store.put('users', {
    id: store.newId('u'), name: str(b.name), email: str(b.email).toLowerCase(), role: 'member', studentId: str(b.studentId),
    department: b.department, year: String(b.year), phone: str(b.phone), clubId: null, status: 'active', bio: '', joined: today(),
    passwordHash: bcrypt.hashSync(b.password, 10),
  });
  return { token: sign(u), user: stripSecret(u) };
}

const available = (email, studentId) => ({
  emailTaken: !!email && emailTaken(str(email)),
  studentIdTaken: !!studentId && idTaken(str(studentId)),
});

function forgot(email) {
  const u = store.all('users').find((x) => x.email.toLowerCase() === str(email).toLowerCase());
  if (u && !store.all('resetRequests').some((r) => r.userId === u.id)) store.put('resetRequests', { id: store.newId('pr'), userId: u.id, date: today() });
}

function changePassword(u, current, next) {
  need(bcrypt.compareSync(String(current || ''), u.passwordHash), 400, 'Your current password is incorrect.');
  need(/^(?=.*[A-Za-z])(?=.*[0-9]).{6,}$/.test(String(next || '')), 400, 'New password needs at least 6 characters with letters and numbers.');
  store.put('users', { ...u, passwordHash: bcrypt.hashSync(next, 10), mustChangePassword: false });
}

/* ---------------- What each visitor is allowed to see ---------------- */
function buildState(v) {
  const users = store.all('users'), memberships = store.all('memberships'), events = store.all('events');
  const regs = store.all('registrations'), att = store.all('attendance');
  const admin = !!v && isAdmin(v);
  const myClub = v && v.role === 'secretary' ? v.clubId : null;
  const myEvents = new Set(events.filter((e) => myClub && e.clubId === myClub).map((e) => e.id));

  // people whose full details (email, phone, student ID) this visitor may see
  const full = new Set(v ? [v.id] : []);
  if (myClub) {
    memberships.filter((m) => m.clubId === myClub).forEach((m) => full.add(m.userId));
    regs.filter((r) => myEvents.has(r.eventId)).forEach((r) => full.add(r.userId));
    att.filter((a) => myEvents.has(a.eventId)).forEach((a) => full.add(a.userId));
  }
  const data = {
    users: users.map((u) => (admin || full.has(u.id) ? stripSecret(u) : publicUser(u))),
    clubs: store.all('clubs'),
    events,
    memberships: memberships.map((m) => {
      if (admin || (v && m.userId === v.id) || (myClub && m.clubId === myClub)) return m;
      const { reason, interests, availability, ...rest } = m; return rest;
    }),
    // Others' registrations only count towards seats; names are hidden unless you manage that event
    registrations: regs.map((r) => (admin || myEvents.has(r.eventId) || (v && r.userId === v.id) ? r : { id: r.id, eventId: r.eventId, userId: '_' })),
    attendance: att.filter((a) => admin || myEvents.has(a.eventId) || (v && a.userId === v.id)),
    announcements: store.all('announcements'),
    feedback: store.all('feedback'),
    resetRequests: admin ? store.all('resetRequests') : [],
    logs: admin ? store.all('logs').reverse().slice(0, 100) : [],
    reads: {},
  };
  if (v) { const r = store.get('reads', v.id); data.reads[v.id] = r ? r.ids : []; }
  return { me: v ? v.id : null, data };
}

/* ---------------- Rules for creating / editing / deleting records ---------------- */
const USER_ADMIN_FIELDS = ['name', 'email', 'studentId', 'role', 'clubId', 'department', 'phone', 'status', 'year', 'bio', 'mustChangePassword', 'password'];
const EVENT_FIELDS = ['title', 'description', 'category', 'date', 'time', 'venue', 'capacity', 'openToAll', 'cancelled'];
const pick = (o, keys) => keys.reduce((r, k) => (k in o ? { ...r, [k]: o[k] } : r), {});

const RULES = {
  users: {
    create(u, b) {
      need(isAdmin(u), 403, 'Only the administrator can create accounts.');
      const email = str(b.email).toLowerCase();
      need(str(b.name).length >= 3, 400, 'Name is required.');
      need(EMAIL.test(email), 400, 'Enter a valid email address.');
      need(['member', 'secretary', 'admin'].includes(b.role), 400, 'Invalid role.');
      need(!emailTaken(email), 409, 'This email is already registered.');
      const sid = str(b.studentId);
      need(!sid || !idTaken(sid), 409, 'This ID is already used by another account.');
      need(typeof b.password === 'string' && b.password.length >= 6, 400, 'Password must be at least 6 characters.');
      const clubId = b.role === 'secretary' ? b.clubId || null : null;
      need(!clubId || store.get('clubs', clubId), 400, 'Club not found.');
      return { name: str(b.name), email, studentId: sid, role: b.role, clubId, department: str(b.department), year: b.year || '', phone: str(b.phone), status: b.status === 'inactive' ? 'inactive' : 'active', bio: str(b.bio), joined: today(), mustChangePassword: true, passwordHash: bcrypt.hashSync(b.password, 10) };
    },
    update(u, item, ch) {
      const self = item.id === u.id;
      need(isAdmin(u) || self, 403, 'You can only edit your own profile.');
      const out = pick(ch, isAdmin(u) ? USER_ADMIN_FIELDS : ['name', 'phone', 'department', 'year', 'bio']);
      if (self && isAdmin(u)) need((!out.role || out.role === 'admin') && (!out.status || out.status === 'active'), 400, "You can't change your own role or deactivate yourself.");
      if ('email' in out) { out.email = str(out.email).toLowerCase(); need(EMAIL.test(out.email), 400, 'Enter a valid email address.'); need(!emailTaken(out.email, item.id), 409, 'This email is already used by another account.'); }
      if ('studentId' in out) { out.studentId = str(out.studentId); need(!out.studentId || !idTaken(out.studentId, item.id), 409, 'This ID is already used by another account.'); }
      if ('role' in out) need(['member', 'secretary', 'admin'].includes(out.role), 400, 'Invalid role.');
      if ('status' in out) need(['active', 'inactive'].includes(out.status), 400, 'Invalid status.');
      if (out.clubId) need(store.get('clubs', out.clubId), 400, 'Club not found.');
      if ('password' in out) { need(String(out.password).length >= 6, 400, 'Password must be at least 6 characters.'); out.passwordHash = bcrypt.hashSync(out.password, 10); delete out.password; }
      return out;
    },
    remove(u, item) { need(isAdmin(u), 403, 'Only the administrator can delete users.'); need(item.id !== u.id, 400, "You can't delete your own account."); },
  },
  clubs: {
    create(u, b) {
      need(isAdmin(u), 403, 'Only the administrator can create clubs.');
      need(str(b.name), 400, 'Club name is required.');
      need(!store.all('clubs').some((c) => c.name.toLowerCase() === str(b.name).toLowerCase()), 409, 'Another club already uses this name.');
      return { ...b, name: str(b.name), activities: [], status: b.status || 'active' };
    },
    update(u, item, ch) {
      need(manages(u, item.id), 403, 'You can only edit your own club.');
      const { id, ...out } = ch;
      if (!isAdmin(u)) { delete out.secretaryId; delete out.status; }
      if ('name' in out) need(!store.all('clubs').some((c) => c.id !== item.id && c.name.toLowerCase() === str(out.name).toLowerCase()), 409, 'Another club already uses this name.');
      return out;
    },
    remove(u) { need(isAdmin(u), 403, 'Only the administrator can delete clubs.'); },
  },
  memberships: {
    create(u, b) {
      need(u.role === 'member', 403, 'Only student members can apply to join clubs.');
      const club = store.get('clubs', b.clubId);
      need(club && club.status === 'active', 400, 'This club is not accepting applications.');
      need(!store.all('memberships').some((m) => m.userId === u.id && m.clubId === club.id && m.status !== 'rejected'), 409, 'You already have an application or membership for this club.');
      return { userId: u.id, clubId: club.id, status: 'pending', reason: str(b.reason).slice(0, 500), interests: str(b.interests).slice(0, 300), availability: str(b.availability), appliedOn: today(), decidedOn: null };
    },
    update(u, item, ch) {
      need(manages(u, item.clubId), 403, 'Only the club secretary can review applications.');
      need(['pending', 'approved', 'rejected'].includes(ch.status), 400, 'Invalid status.');
      return { status: ch.status, decidedOn: ch.decidedOn || today() };
    },
    remove(u, item) { need(item.userId === u.id || manages(u, item.clubId), 403, 'You cannot remove this membership.'); },
  },
  events: {
    create(u, b) {
      need(manages(u, b.clubId) && store.get('clubs', b.clubId), 403, 'You can only create events for your own club.');
      const out = pick(b, EVENT_FIELDS);
      need(str(out.title), 400, 'Event title is required.');
      need(/^\d{4}-\d{2}-\d{2}$/.test(str(out.date)), 400, 'A valid date is required.');
      need(Number(out.capacity) >= 1, 400, 'Capacity must be at least 1.');
      return { ...out, clubId: b.clubId, capacity: Number(out.capacity) };
    },
    update(u, item, ch) {
      need(manages(u, item.clubId), 403, 'You can only edit events of your own club.');
      const out = pick(ch, EVENT_FIELDS);
      if ('capacity' in out) {
        out.capacity = Number(out.capacity);
        const taken = store.all('registrations').filter((r) => r.eventId === item.id).length;
        need(out.capacity >= Math.max(1, taken), 400, `Capacity can't be lower than the ${taken} students already registered.`);
      }
      if ('date' in out) need(/^\d{4}-\d{2}-\d{2}$/.test(str(out.date)), 400, 'A valid date is required.');
      return out;
    },
    remove(u, item) { need(manages(u, item.clubId), 403, 'You can only delete events of your own club.'); },
  },
  registrations: {
    create(u, b) {
      need(u.role === 'member', 403, 'Only student members can register for events.');
      const ev = store.get('events', b.eventId);
      need(ev, 404, 'Event not found.');
      const st = eventStatus(ev);
      need(st !== 'cancelled', 400, 'This event has been cancelled.');
      need(st !== 'completed', 400, 'This event has already taken place.');
      const regs = store.all('registrations').filter((r) => r.eventId === ev.id);
      need(!regs.some((r) => r.userId === u.id), 409, 'You are already registered.');
      need(regs.length < Number(ev.capacity), 409, 'This event is full.');
      const isMember = store.all('memberships').some((m) => m.userId === u.id && m.clubId === ev.clubId && m.status === 'approved');
      need(ev.openToAll || isMember, 403, 'This event is for club members only. Join the club first.');
      return { eventId: ev.id, userId: u.id, registeredOn: today() };
    },
    remove(u, item) {
      const ev = store.get('events', item.eventId);
      need(item.userId === u.id || (ev && manages(u, ev.clubId)), 403, 'You cannot cancel this registration.');
    },
  },
  attendance: {
    create(u, b) {
      const ev = store.get('events', b.eventId);
      need(ev && manages(u, ev.clubId), 403, 'You can only mark attendance for your own club events.');
      need(['present', 'late', 'absent'].includes(b.status), 400, 'Invalid attendance status.');
      need(store.get('users', b.userId), 400, 'Student not found.');
      need(!store.all('attendance').some((a) => a.eventId === ev.id && a.userId === b.userId), 409, 'Attendance already recorded.');
      return { eventId: ev.id, userId: b.userId, status: b.status };
    },
    update(u, item, ch) {
      const ev = store.get('events', item.eventId);
      need(ev && manages(u, ev.clubId), 403, 'You can only mark attendance for your own club events.');
      need(['present', 'late', 'absent'].includes(ch.status), 400, 'Invalid attendance status.');
      return { status: ch.status };
    },
    remove(u, item) { const ev = store.get('events', item.eventId); need(ev && manages(u, ev.clubId), 403, 'Not allowed.'); },
  },
  announcements: {
    create(u, b) {
      const clubId = b.clubId || null;
      need(isAdmin(u) || (u.role === 'secretary' && clubId && clubId === u.clubId), 403, 'You can only post announcements for your own club.');
      need(!clubId || store.get('clubs', clubId), 400, 'Club not found.');
      const { id, authorId, date, ...rest } = b;
      need(str(rest.title), 400, 'Title is required.');
      return { ...rest, clubId, authorId: u.id, date: today() };
    },
    update(u, item, ch) {
      need(manages(u, item.clubId) || (isAdmin(u) && !item.clubId), 403, 'You cannot edit this announcement.');
      const { id, authorId, date, clubId, ...rest } = ch;
      return rest;
    },
    remove(u, item) { need(isAdmin(u) || manages(u, item.clubId), 403, 'You cannot delete this announcement.'); },
  },
  feedback: {
    create(u, b) {
      need(u.role === 'member', 403, 'Only student members can give feedback.');
      const { id, userId, date, ...rest } = b;
      return { ...rest, userId: u.id, date: today() };
    },
    update(u, item, ch) { need(item.userId === u.id, 403, 'You can only edit your own feedback.'); const { id, userId, ...rest } = ch; return rest; },
    remove(u, item) { need(item.userId === u.id || manages(u, item.clubId), 403, 'You cannot delete this feedback.'); },
  },
  resetRequests: { remove(u) { need(isAdmin(u), 403, 'Only the administrator can do this.'); } },
};

// Remove records that depend on something that was just deleted
function cascade(coll, item) {
  const R = (c, fn) => store.removeWhere(c, fn);
  if (coll === 'users') {
    ['memberships', 'registrations', 'attendance', 'feedback', 'resetRequests'].forEach((c) => R(c, (x) => x.userId === item.id));
    store.remove('reads', item.id);
    store.all('clubs').filter((c) => c.secretaryId === item.id).forEach((c) => store.put('clubs', { ...c, secretaryId: null }));
  } else if (coll === 'clubs') {
    store.all('events').filter((e) => e.clubId === item.id).forEach((e) => cascade('events', e) || store.remove('events', e.id));
    ['memberships', 'announcements', 'feedback'].forEach((c) => R(c, (x) => x.clubId === item.id));
    store.all('users').filter((x) => x.clubId === item.id).forEach((x) => store.put('users', { ...x, clubId: null }));
  } else if (coll === 'events') {
    ['registrations', 'attendance', 'feedback'].forEach((c) => R(c, (x) => x.eventId === item.id));
  }
}

const view = (coll, item) => (coll === 'users' ? stripSecret(item) : item);
const ruleFor = (coll, op) => { const r = RULES[coll]; need(r && r[op], 404, 'This action is not available.'); return r[op]; };

function createItem(u, coll, body) {
  need(body && typeof body === 'object' && !Array.isArray(body), 400, 'Invalid data.');
  const out = ruleFor(coll, 'create')(u, { ...body });
  const id = SAFE_ID.test(String(body.id || '')) && !store.get(coll, body.id) ? body.id : store.newId(PREFIX[coll]);
  return view(coll, store.put(coll, { ...out, id }));
}
function updateItem(u, coll, id, changes) {
  const item = store.get(coll, id);
  need(item, 404, 'Record not found.');
  need(changes && typeof changes === 'object', 400, 'Invalid data.');
  const out = ruleFor(coll, 'update')(u, item, { ...changes });
  return view(coll, store.put(coll, { ...item, ...out, id: item.id }));
}
function deleteItems(u, coll, ids) {
  const rule = ruleFor(coll, 'remove');
  const items = (ids || []).slice(0, 1000).map((id) => store.get(coll, id)).filter(Boolean);
  items.forEach((it) => rule(u, it)); // check everything first, then delete
  store.tx(() => items.forEach((it) => { store.remove(coll, it.id); cascade(coll, it); }));
  return items.length;
}

function markRead(u, ids) {
  const cur = store.get('reads', u.id);
  const set = new Set([...(cur ? cur.ids : []), ...(Array.isArray(ids) ? ids.map(String) : [])]);
  store.put('reads', { id: u.id, ids: [...set] });
}
function addLog(u, action) {
  store.put('logs', { id: store.newId('l'), date: today(), userId: u.id, action: str(action).slice(0, 200) });
  const logs = store.all('logs');
  if (logs.length > 500) logs.slice(0, logs.length - 500).forEach((l) => store.remove('logs', l.id));
}

/* ---------------- Admin backup / restore ---------------- */
function backup() {
  const out = {};
  ['users', 'clubs', 'memberships', 'events', 'registrations', 'attendance', 'announcements', 'feedback', 'resetRequests', 'logs'].forEach((c) => { out[c] = store.all(c); });
  out.reads = {}; store.all('reads').forEach((r) => { out.reads[r.id] = r.ids; });
  return out;
}
function restore(b) {
  need(b && Array.isArray(b.users) && Array.isArray(b.clubs) && b.users.some((x) => x.role === 'admin'), 400, 'This file is not a valid backup (it needs users, clubs and an administrator).');
  const needHash = b.users.every((x) => x.passwordHash || x.password);
  need(needHash, 400, 'Backup users must have passwords.');
  store.tx(() => { store.clearAll(); store.load(b); });
}

module.exports = { HttpError, userFromToken, login, register, available, forgot, changePassword, buildState, createItem, updateItem, deleteItems, markRead, addLog, backup, restore };