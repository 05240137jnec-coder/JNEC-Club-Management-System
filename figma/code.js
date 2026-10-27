/* =========================================================
   JNEC Club Management System — Figma screen generator
   ---------------------------------------------------------
   Run this inside Figma (see figma/HOW-TO-USE.md). It creates:
     • Style Guide page  – colours, text styles, buttons, badges, inputs
     • Public, Member, Secretary and Admin pages – 24 screens (1440 px wide)
   Everything is made of normal Figma layers (auto layout frames,
   text and vectors), so you can edit it freely afterwards.
   ========================================================= */

(async () => {
  const FONT = "Inter";
  await Promise.all(["Regular", "Medium", "Semi Bold", "Bold"].map(style => figma.loadFontAsync({ family: FONT, style })));

  /* ---------------- Colours ---------------- */
  const C = {
    navy: "#16325C", blue: "#1D4E89", gold: "#E8A317", bg: "#F4F6FA", border: "#E3E8F0",
    text: "#1F2A37", muted: "#5F6B7A", white: "#FFFFFF", success: "#2E7D32", danger: "#C62828",
    lightBlue: "#E8EEF7", lightGold: "#FFF4DB", lightGreen: "#E8F5E9", lightRed: "#FDECEA", lightGrey: "#EEF0F3"
  };
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
  }
  function solid(hex, opacity = 1) { return [{ type: "SOLID", color: rgb(hex), opacity }]; }
  function gradient(from, to) {
    return [{
      type: "GRADIENT_LINEAR", gradientTransform: [[1, 0, 0], [0, 1, 0]],
      gradientStops: [{ position: 0, color: { ...rgb(from), a: 1 } }, { position: 1, color: { ...rgb(to), a: 1 } }]
    }];
  }
  const SHADOW = [{ type: "DROP_SHADOW", color: { r: 0.09, g: 0.2, b: 0.36, a: 0.08 }, offset: { x: 0, y: 4 }, radius: 16, spread: 0, visible: true, blendMode: "NORMAL" }];

  /* ---------------- Basic building blocks ---------------- */
  function text(str, { size = 14, weight = "Regular", color = C.text, width = null, align = "LEFT", lh = null, name = null } = {}) {
    const t = figma.createText();
    t.fontName = { family: FONT, style: weight };
    t.characters = String(str);
    t.fontSize = size;
    t.fills = solid(color);
    t.textAlignHorizontal = align;
    if (lh) t.lineHeight = { value: lh, unit: "PIXELS" };
    if (name) t.name = name;
    if (width) { t.textAutoResize = "HEIGHT"; t.resize(width, t.height); }
    return t;
  }

  // Auto layout frame. dir: "VERTICAL" | "HORIZONTAL"
  function box({ name = "Frame", dir = "VERTICAL", gap = 0, pad = 0, fill = null, fills = null, radius = 0, stroke = null,
                 w = null, h = null, align = "MIN", cross = "MIN", shadow = false, wrap = false, opacity = 1 } = {}) {
    const f = figma.createFrame();
    f.name = name;
    f.layoutMode = dir;
    f.resize(w || 100, h || 100);
    const isV = dir === "VERTICAL";
    f.primaryAxisSizingMode = (isV ? h : w) ? "FIXED" : "AUTO";
    f.counterAxisSizingMode = (isV ? w : h) ? "FIXED" : "AUTO";
    f.itemSpacing = gap;
    const p = Array.isArray(pad) ? (pad.length === 2 ? [pad[0], pad[1], pad[0], pad[1]] : pad) : [pad, pad, pad, pad];
    [f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft] = p;
    f.fills = fills || (fill ? solid(fill, opacity) : []);
    f.cornerRadius = radius;
    if (stroke) { f.strokes = solid(stroke); f.strokeWeight = 1; }
    if (shadow) f.effects = SHADOW;
    f.primaryAxisAlignItems = align;   // MIN | CENTER | MAX | SPACE_BETWEEN
    f.counterAxisAlignItems = cross;   // MIN | CENTER | MAX
    if (wrap) { f.layoutWrap = "WRAP"; f.counterAxisSpacing = gap; }
    f.clipsContent = false;
    return f;
  }

  // Append child; optionally make it fill the parent (stretch) or take remaining space (grow)
  function add(parent, child, { stretch = false, grow = false } = {}) {
    parent.appendChild(child);
    if (stretch) {
      child.layoutAlign = "STRETCH";
      if (child.type === "TEXT") child.textAutoResize = "HEIGHT";
    }
    if (grow) child.layoutGrow = 1;
    return child;
  }
  function addAll(parent, children) { children.forEach(c => add(parent, c)); return parent; }

  /* ---------------- Icons (simple line icons) ---------------- */
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c3 .2 5.5 2.3 5.5 5.8"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    megaphone: '<path d="M3 10v4h4l9 5V5l-9 5z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 13l2 2 4-4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    userPlus: '<circle cx="10" cy="8" r="4"/><path d="M2 21c0-4.4 3.6-7 8-7 2 0 3.8.5 5.2 1.5M19 14v6M16 17h6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>',
    logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    star: '<path d="M12 3l2.8 5.9 6.2.9-4.5 4.4 1 6.3L12 17.6l-5.5 2.9 1-6.3L3 9.8l6.2-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    grid: '<rect x="4" y="4" width="4" height="4"/><rect x="10" y="4" width="4" height="4"/><rect x="16" y="4" width="4" height="4"/><rect x="4" y="10" width="4" height="4"/><rect x="10" y="10" width="4" height="4"/><rect x="16" y="10" width="4" height="4"/><rect x="4" y="16" width="4" height="4"/><rect x="10" y="16" width="4" height="4"/><rect x="16" y="16" width="4" height="4"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>'
  };
  function icon(name, color = C.text, size = 20) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
    const n = figma.createNodeFromSvg(svg);
    n.name = "Icon / " + name;
    n.fills = [];
    n.rescale(size / 24);
    return n;
  }

  /* ---------------- Components ---------------- */
  function button(label, variant = "primary", { iconName = null, small = false, full = false } = {}) {
    const styles = {
      primary: { fill: C.blue, color: C.white, stroke: null },
      accent: { fill: C.gold, color: "#1B1B1B", stroke: null },
      outline: { fill: C.white, color: C.blue, stroke: C.blue },
      light: { fill: C.white, color: C.text, stroke: C.border },
      success: { fill: C.success, color: C.white, stroke: null },
      danger: { fill: C.white, color: C.danger, stroke: C.danger },
      ghostLight: { fill: null, color: C.white, stroke: C.white }
    }[variant];
    const b = box({ name: "Button / " + label, dir: "HORIZONTAL", gap: 6, pad: small ? [6, 12] : [10, 18], fill: styles.fill, stroke: styles.stroke, radius: 10, cross: "CENTER", align: "CENTER" });
    if (iconName) add(b, icon(iconName, styles.color, small ? 14 : 16));
    add(b, text(label, { size: small ? 12 : 14, weight: "Semi Bold", color: styles.color }));
    if (full) b.name += " (full width)";
    return b;
  }
  function iconButton(iconName, color = C.muted) {
    const b = box({ name: "Icon button", dir: "HORIZONTAL", pad: 6, radius: 8, stroke: C.border, fill: C.white, cross: "CENTER", align: "CENTER" });
    add(b, icon(iconName, color, 16));
    return b;
  }
  function badge(label, kind = "primary") {
    const k = {
      primary: [C.lightBlue, C.blue], success: [C.lightGreen, C.success], warning: [C.lightGold, "#8A5A00"],
      danger: [C.lightRed, C.danger], grey: [C.lightGrey, C.muted], gold: [C.gold, "#1B1B1B"]
    }[kind];
    const b = box({ name: "Badge / " + label, dir: "HORIZONTAL", pad: [4, 10], fill: k[0], radius: 999, cross: "CENTER" });
    add(b, text(label, { size: 12, weight: "Semi Bold", color: k[1] }));
    return b;
  }
  function avatar(initials, size = 36, fill = C.blue, color = C.white) {
    const a = box({ name: "Avatar", dir: "HORIZONTAL", w: size, h: size, radius: size / 2, fill, align: "CENTER", cross: "CENTER" });
    add(a, text(initials, { size: Math.round(size * 0.36), weight: "Semi Bold", color }));
    return a;
  }
  // Club logo placeholder (general club icon). Replace with an uploaded logo image in Figma if you like.
  function clubLogo(color = C.blue, size = 48) {
    const l = box({ name: "Club logo", dir: "HORIZONTAL", w: size, h: size, radius: size * 0.28, fill: color, align: "CENTER", cross: "CENTER" });
    add(l, icon("users", C.white, size * 0.5));
    return l;
  }
  // College logo placeholder: drag the real JNEC logo image onto this circle in Figma (Fill → Image).
  function collegeLogo(size = 44) {
    const l = box({ name: "College logo (replace with JNEC logo image)", dir: "HORIZONTAL", w: size, h: size, radius: size / 2, fill: C.white, stroke: C.gold, align: "CENTER", cross: "CENTER" });
    add(l, text("JNEC", { size: size * 0.24, weight: "Bold", color: C.navy }));
    return l;
  }
  function brand(dark = true) {
    const b = box({ name: "Brand", dir: "HORIZONTAL", gap: 10, cross: "CENTER" });
    add(b, collegeLogo(44));
    const t = box({ name: "Brand text", gap: 2 });
    add(t, text("JNEC Clubs", { size: 17, weight: "Bold", color: dark ? C.white : C.navy }));
    add(t, text("Jigme Namgyel Engineering College", { size: 11, color: dark ? "#C9D3E3" : C.muted }));
    add(b, t);
    return b;
  }
  function input(label, placeholder = "", { w = 320, kind = "text", value = "", help = null } = {}) {
    const g = box({ name: "Field / " + label, gap: 6, w });
    add(g, text(label, { size: 13, weight: "Medium" }), { stretch: true });
    const field = box({ name: "Input", dir: "HORIZONTAL", pad: [10, 12], fill: C.white, stroke: "#CED4DA", radius: 8,
                        h: kind === "textarea" ? 88 : null, cross: kind === "textarea" ? "MIN" : "CENTER", align: "SPACE_BETWEEN" });
    add(g, field, { stretch: true });
    const tv = add(field, text(value || placeholder, { size: 14, color: value ? C.text : "#9AA4B2" }), { grow: true });
    tv.textAutoResize = "HEIGHT";
    if (kind === "select") add(field, icon("chevron", C.muted, 14));
    if (kind === "password") add(field, icon("eye", C.muted, 16));
    if (help) add(g, text(help, { size: 12, color: C.muted }), { stretch: true });
    return g;
  }
  function checkbox(label, checked = false) {
    const r = box({ name: "Checkbox", dir: "HORIZONTAL", gap: 8, cross: "CENTER" });
    const sq = box({ name: "Box", dir: "HORIZONTAL", w: 16, h: 16, radius: 4, fill: checked ? C.blue : C.white, stroke: checked ? C.blue : "#ADB5BD", align: "CENTER", cross: "CENTER" });
    if (checked) add(sq, icon("check", C.white, 12));
    add(r, sq);
    add(r, text(label, { size: 13 }));
    return r;
  }
  function card(title = null, { w = null, pad = 20, gap = 14, action = null } = {}) {
    const c = box({ name: "Card" + (title ? " / " + title : ""), gap, pad, fill: C.white, stroke: C.border, radius: 14, w });
    if (title) {
      const h = box({ name: "Card header", dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "CENTER" });
      add(h, text(title, { size: 16, weight: "Bold", color: C.navy }));
      if (action) add(h, typeof action === "string" ? text(action, { size: 13, weight: "Medium", color: C.blue }) : action);
      add(c, h, { stretch: true });
    }
    return c;
  }
  function statCard(value, label, iconName, tone, sub = null, w = 268) {
    const tones = { blue: [C.lightBlue, C.blue], gold: [C.lightGold, "#A66D00"], green: [C.lightGreen, C.success], red: [C.lightRed, C.danger] }[tone];
    const c = box({ name: "Stat card / " + label, dir: "HORIZONTAL", gap: 14, pad: 18, fill: C.white, radius: 14, w, cross: "CENTER", shadow: true });
    const ic = box({ name: "Stat icon", dir: "HORIZONTAL", w: 52, h: 52, radius: 14, fill: tones[0], align: "CENTER", cross: "CENTER" });
    add(ic, icon(iconName, tones[1], 24));
    add(c, ic);
    const t = box({ name: "Stat text", gap: 2 });
    add(t, text(value, { size: 26, weight: "Bold", color: C.navy }));
    add(t, text(label, { size: 13, color: C.muted }));
    if (sub) add(t, text(sub, { size: 12, color: C.muted }));
    add(c, t);
    return c;
  }
  // columns: [{ title, w }]; rows: array of arrays (string or node)
  function table(columns, rows, { w = null } = {}) {
    const t = box({ name: "Table", fill: C.white, stroke: C.border, radius: 14, w });
    t.clipsContent = true;
    const makeRow = (cells, header) => {
      const r = box({ name: header ? "Table header" : "Table row", dir: "HORIZONTAL", pad: [12, 16], fill: header ? "#F8FAFC" : C.white, cross: "CENTER" });
      cells.forEach((cell, i) => {
        const cellBox = box({ name: "Cell", dir: "HORIZONTAL", gap: 6, w: columns[i].w, cross: "CENTER", align: columns[i].right ? "MAX" : "MIN" });
        if (typeof cell === "string") add(cellBox, text(cell, header ? { size: 12, weight: "Semi Bold", color: C.muted } : { size: 14, width: columns[i].w - 8 }));
        else add(cellBox, cell);
        add(r, cellBox);
      });
      return r;
    };
    add(t, makeRow(columns.map(c => c.title.toUpperCase()), true), { stretch: true });
    rows.forEach(cells => {
      const line = figma.createRectangle(); line.name = "Divider"; line.resize(10, 1); line.fills = solid(C.border);
      add(t, line, { stretch: true });
      add(t, makeRow(cells, false), { stretch: true });
    });
    return t;
  }
  function personCell(initials, name, sub) {
    const p = box({ name: "Person", dir: "HORIZONTAL", gap: 10, cross: "CENTER" });
    add(p, avatar(initials, 32));
    const t = box({ gap: 1 });
    add(t, text(name, { size: 14, weight: "Semi Bold" }));
    if (sub) add(t, text(sub, { size: 12, color: C.muted }));
    add(p, t);
    return p;
  }
  function actions(...names) {
    const a = box({ name: "Actions", dir: "HORIZONTAL", gap: 6 });
    names.forEach(n => add(a, iconButton(n, n === "trash" || n === "x" ? C.danger : C.muted)));
    return a;
  }
  function dateChip(day, month) {
    const d = box({ name: "Date chip", w: 54, h: 58, radius: 12, fill: C.lightBlue, align: "CENTER", cross: "CENTER", gap: 0 });
    add(d, text(day, { size: 20, weight: "Bold", color: C.navy }));
    add(d, text(month.toUpperCase(), { size: 11, weight: "Semi Bold", color: C.navy }));
    return d;
  }
  function progress(pct, w = 240, color = C.blue) {
    const track = box({ name: "Progress", dir: "HORIZONTAL", w, h: 6, radius: 3, fill: "#E9EEF5" });
    const bar = figma.createRectangle(); bar.name = "Bar"; bar.resize(Math.max(2, w * pct / 100), 6); bar.cornerRadius = 3; bar.fills = solid(color);
    add(track, bar);
    return track;
  }
  function iconLine(iconName, str, color = C.muted) {
    const l = box({ name: "Info line", dir: "HORIZONTAL", gap: 8, cross: "CENTER" });
    add(l, icon(iconName, color, 15));
    add(l, text(str, { size: 13, color }));
    return l;
  }
  function filterBar(fields, w) {
    const f = box({ name: "Filter bar", dir: "HORIZONTAL", gap: 12, pad: 16, fill: C.white, stroke: C.border, radius: 14, w, cross: "MAX" });
    fields.forEach(x => add(f, x));
    return f;
  }
  function barChart(items, w = 500) {
    const max = Math.max(...items.map(i => i[1]), 1);
    const g = box({ name: "Bar chart", gap: 10, w });
    items.forEach(([label, value, color]) => {
      const r = box({ name: "Bar row", dir: "HORIZONTAL", gap: 12, cross: "CENTER" });
      add(r, text(label, { size: 13, width: 170 }));
      add(r, progress(Math.round(value / max * 100), w - 240, color || C.blue));
      add(r, text(String(value), { size: 13, weight: "Semi Bold" }));
      add(g, r, { stretch: true });
    });
    return g;
  }
  function donut(items) {
    // simple donut: coloured arcs drawn with ellipse arcData
    const g = box({ name: "Donut chart", dir: "HORIZONTAL", gap: 24, cross: "CENTER" });
    const holder = figma.createFrame(); holder.name = "Donut"; holder.resize(150, 150); holder.fills = [];
    const total = items.reduce((s, i) => s + i[1], 0) || 1;
    let start = -Math.PI / 2;
    items.forEach(([label, value, color]) => {
      const e = figma.createEllipse(); e.resize(150, 150); e.fills = solid(color);
      const end = start + (value / total) * Math.PI * 2;
      e.arcData = { startingAngle: start, endingAngle: end, innerRadius: 0.7 };
      e.name = label;
      holder.appendChild(e);
      start = end;
    });
    const label = text(String(total), { size: 26, weight: "Bold", color: C.navy, align: "CENTER" });
    holder.appendChild(label); label.x = 75 - label.width / 2; label.y = 75 - label.height / 2;
    add(g, holder);
    const legend = box({ name: "Legend", gap: 8 });
    items.forEach(([l, v, c]) => {
      const r = box({ dir: "HORIZONTAL", gap: 8, cross: "CENTER" });
      const dot = figma.createRectangle(); dot.resize(12, 12); dot.cornerRadius = 3; dot.fills = solid(c);
      add(r, dot); add(r, text(`${l}  ${v}`, { size: 13 }));
      add(legend, r);
    });
    add(g, legend);
    return g;
  }

  /* ---------------- Layout pieces ---------------- */
  const SCREEN_W = 1440;
  const SIDEBAR_W = 260;
  const CW = SCREEN_W - SIDEBAR_W - 48; // dashboard content width = 1132
  const PW = 1200;                      // public page container width

  const MENUS = {
    member: [["Overview"], ["Dashboard", "dashboard"], ["Browse Clubs", "grid"], ["Events", "calendar"], ["My Activity"],
      ["My Clubs", "users"], ["Join a Club", "userPlus"], ["Announcements", "megaphone", "3"], ["Attendance", "clipboard"], ["Feedback", "chat"], ["My Profile", "user"]],
    secretary: [["Overview"], ["Dashboard", "dashboard"], ["Manage Club"], ["Club Profile", "building"], ["Members", "users", "2"], ["Events", "calendar"],
      ["Attendance", "clipboard"], ["Announcements", "megaphone"], ["Reports", "chart"], ["Account"], ["My Profile", "user"], ["View Public Site", "globe"]],
    admin: [["Overview"], ["Dashboard", "dashboard"], ["Administration"], ["Users & Roles", "users"], ["All Clubs", "building"], ["Monitoring"],
      ["Memberships", "userPlus", "4"], ["Events", "calendar"], ["Attendance", "clipboard"], ["Announcements", "megaphone"], ["Reports", "chart"], ["Account"], ["My Profile", "user"]]
  };
  const PEOPLE = { member: ["TD", "Tashi Dema", "Student Member"], secretary: ["PY", "Pema Yangzom", "Club Secretary"], admin: ["SA", "System Administrator", "System Administrator"] };

  function sidebar(role, active) {
    const s = box({ name: "Sidebar", w: SIDEBAR_W, fill: C.navy, gap: 0 });
    const top = box({ name: "Sidebar brand", pad: [18, 20] });
    add(top, brand(true));
    add(s, top, { stretch: true });
    const [ini, name, roleName] = PEOPLE[role];
    const u = box({ name: "Sidebar user", dir: "HORIZONTAL", gap: 12, pad: [14, 20], fill: C.white, opacity: 0.05, cross: "CENTER" });
    add(u, avatar(ini, 40, C.gold, C.navy));
    const ut = box({ gap: 2 });
    add(ut, text(name, { size: 14, weight: "Semi Bold", color: C.white }));
    add(ut, text(roleName, { size: 12, color: "#AEBBD0" }));
    add(u, ut);
    add(s, u, { stretch: true });
    const nav = box({ name: "Sidebar nav", gap: 2, pad: [10, 12, 24, 12] });
    MENUS[role].forEach(([label, ic, count]) => {
      if (!ic) { const sec = text(label.toUpperCase(), { size: 11, weight: "Semi Bold", color: "#8494AE" }); const w = box({ pad: [14, 12, 6, 12] }); add(w, sec); add(nav, w, { stretch: true }); return; }
      const isActive = label === active;
      const l = box({ name: "Nav / " + label, dir: "HORIZONTAL", gap: 12, pad: [10, 12], radius: 10, fill: isActive ? C.gold : null, cross: "CENTER" });
      add(l, icon(ic, isActive ? C.navy : "#D3DBE8", 18));
      add(l, text(label, { size: 14, weight: isActive ? "Semi Bold" : "Regular", color: isActive ? C.navy : "#D3DBE8" }), { grow: true });
      if (count) add(l, badge(count, "danger"));
      add(nav, l, { stretch: true });
    });
    const out = box({ name: "Nav / Log out", dir: "HORIZONTAL", gap: 12, pad: [10, 12], cross: "CENTER" });
    add(out, icon("logout", "#D3DBE8", 18)); add(out, text("Log out", { size: 14, color: "#D3DBE8" }));
    add(nav, out, { stretch: true });
    add(s, nav, { stretch: true });
    return s;
  }
  function topbar(role, title) {
    const t = box({ name: "Topbar", dir: "HORIZONTAL", pad: [12, 24], gap: 16, fill: C.white, stroke: C.border, cross: "CENTER" });
    add(t, icon("menu", C.text, 22));
    const tt = box({ name: "Title", gap: 2 });
    add(tt, text(title, { size: 20, weight: "Bold" }));
    add(tt, text("Friday, 23 October 2026", { size: 12, color: C.muted }));
    add(t, tt, { grow: true });
    add(t, icon("bell", C.text, 22));
    const [ini, name] = PEOPLE[role];
    const u = box({ dir: "HORIZONTAL", gap: 8, cross: "CENTER" });
    add(u, avatar(ini, 32)); add(u, text(name, { size: 14, weight: "Medium" }));
    add(t, u);
    return t;
  }
  function dashScreen(role, title, active, build) {
    const s = box({ name: `${title}`, dir: "HORIZONTAL", w: SCREEN_W, fill: C.bg });
    add(s, sidebar(role, active), { stretch: true });
    const main = box({ name: "Main", gap: 0 });
    add(s, main, { grow: true });
    add(main, topbar(role, title), { stretch: true });
    const content = box({ name: "Content", gap: 20, pad: 24 });
    add(main, content, { stretch: true });
    build(content);
    const foot = box({ name: "Footer", dir: "HORIZONTAL", pad: [14, 24], fill: C.white, stroke: C.border, align: "SPACE_BETWEEN" });
    add(foot, text("© 2026 JNEC Club Management System", { size: 12, color: C.muted }));
    add(foot, text("Jigme Namgyel Engineering College, Dewathang", { size: 12, color: C.muted }));
    add(main, foot, { stretch: true });
    return s;
  }
  function navbar(loggedIn = false) {
    const n = box({ name: "Navbar", dir: "HORIZONTAL", pad: [14, 120], fill: C.navy, cross: "CENTER", gap: 28 });
    add(n, brand(true), { grow: true });
    ["Home", "Clubs", "Events"].concat(loggedIn ? ["Dashboard"] : []).forEach((l, i) => add(n, text(l, { size: 15, weight: "Medium", color: i === 0 ? C.gold : "#E3E9F2" })));
    if (loggedIn) { add(n, icon("bell", C.white, 20)); add(n, avatar("TD", 32, C.blue)); }
    else { add(n, button("Log in", "ghostLight", { small: true })); add(n, button("Register", "accent", { small: true })); }
    return n;
  }
  function publicFooter() {
    const f = box({ name: "Footer", dir: "HORIZONTAL", pad: [40, 120], gap: 60, fill: C.navy });
    const a = box({ gap: 12, w: 460 });
    add(a, brand(true));
    add(a, text("A centralised platform for JNEC students to explore clubs, join activities, register for events and stay connected with campus life.", { size: 13, color: "#C9D3E3", width: 440, lh: 20 }));
    add(f, a);
    const col = (title, lines) => { const c = box({ gap: 8 }); add(c, text(title.toUpperCase(), { size: 12, weight: "Bold", color: C.white })); lines.forEach(l => add(c, text(l, { size: 13, color: "#C9D3E3" }))); return c; };
    add(f, col("Quick links", ["Browse clubs", "Upcoming events", "Create an account", "Log in"]));
    add(f, col("Contact", ["Dewathang, Samdrup Jongkhar, Bhutan", "Royal University of Bhutan", "clubs@jnec.edu.bt"]));
    return f;
  }
  function publicScreen(title, build, { loggedIn = false } = {}) {
    const s = box({ name: title, w: SCREEN_W, fill: C.bg, gap: 0, cross: "CENTER" });
    add(s, navbar(loggedIn), { stretch: true });
    build(s);
    add(s, publicFooter(), { stretch: true });
    return s;
  }
  function pageHeader(title, sub) {
    const h = box({ name: "Page header", pad: [40, 120], gap: 6, fills: gradient(C.navy, C.blue) });
    add(h, text(title, { size: 32, weight: "Bold", color: C.white }));
    add(h, text(sub, { size: 16, color: "#D6DFEC" }));
    return h;
  }
  function container(gap = 20, padY = 32) { return box({ name: "Container", w: PW, gap, pad: [padY, 0] }); }
  function row(gap = 20, { wrap = false, w = null, cross = "MIN" } = {}) { return box({ name: "Row", dir: "HORIZONTAL", gap, wrap, w, cross }); }
  function sectionTitle(eyebrow, title) {
    const t = box({ name: "Section title", gap: 4 });
    add(t, text(eyebrow.toUpperCase(), { size: 12, weight: "Bold", color: "#C7880C" }));
    add(t, text(title, { size: 26, weight: "Bold", color: C.navy }));
    return t;
  }

  /* ---------------- Sample content for the mock-ups ---------------- */
  const CLUBS = [
    ["Robotics & Innovation Club", "Technical", "#1D4E89", "Design, build and program robots. Hands-on workshops on Arduino, sensors and automation.", 6, 2],
    ["Coding & Cyber Club", "Technical", "#0B7A75", "Practise problem solving, web development and basic cyber security through weekly challenges.", 4, 1],
    ["Literary & Debate Club", "Literary", "#7A3E9D", "Debates, poetry evenings, quiz contests and the annual college magazine.", 3, 1],
    ["Cultural Club", "Cultural", "#B5452C", "Traditional songs, mask dances and cultural programmes during college events.", 5, 1],
    ["Sports & Archery Club", "Sports", "#2F7D32", "Football, basketball, volleyball and archery tournaments.", 2, 1],
    ["Nature & Environment Club", "Social Service", "#4C7A1F", "Clean-up campaigns, tree plantation and waste management awareness.", 3, 1],
    ["Photography & Media Club", "Arts & Media", "#C27C0E", "Photography, video editing and content creation for college events.", 1, 1],
    ["Y-Peer & Health Club", "Social Service", "#C0392B", "Peer educators promoting mental health, healthy habits and first aid.", 0, 1]
  ];
  const EVENTS = [
    ["5", "Nov", "Dewathang Clean-Up Campaign", "Nature & Environment Club", "8:00 AM", "Dewathang Town", 22, 80, "Social Service"],
    ["8", "Nov", "Line Follower Robot Workshop", "Robotics & Innovation Club", "2:00 PM", "Electronics Lab", 18, 40, "Workshop"],
    ["13", "Nov", "Debate: AI in Engineering", "Literary & Debate Club", "5:30 PM", "Library Hall", 12, 50, "Debate"],
    ["16", "Nov", "JNEC Hackathon 2026", "Coding & Cyber Club", "9:00 AM", "IT Lab 2", 41, 60, "Competition"],
    ["22", "Nov", "Annual Cultural Night", "Cultural Club", "6:00 PM", "Multipurpose Hall", 120, 300, "Cultural"],
    ["27", "Nov", "Blood Donation Drive", "Y-Peer & Health Club", "10:00 AM", "Multipurpose Hall", 35, 100, "Social Service"]
  ];

  function clubCard([name, cat, color, desc, members, upcoming], state = "join", w = 280) {
    const c = box({ name: "Club card / " + name, w, fill: C.white, stroke: C.border, radius: 14 });
    c.clipsContent = true;
    const top = box({ name: "Club card top", dir: "HORIZONTAL", pad: 18, fills: gradient(color, C.navy), align: "SPACE_BETWEEN", cross: "MIN" });
    const ic = box({ dir: "HORIZONTAL", w: 52, h: 52, radius: 14, fill: C.white, opacity: 0.2, align: "CENTER", cross: "CENTER" });
    add(ic, icon("users", C.white, 26));
    add(top, ic);
    add(top, badge(cat, "grey"));
    add(c, top, { stretch: true });
    const b = box({ name: "Club card body", gap: 10, pad: 18 });
    add(c, b, { stretch: true });
    add(b, text(name, { size: 16, weight: "Bold" }), { stretch: true });
    add(b, text(desc, { size: 13, color: C.muted, lh: 19 }), { stretch: true });
    const meta = row(16);
    add(meta, iconLine("users", `${members} members`)); add(meta, iconLine("calendar", `${upcoming} upcoming`));
    add(b, meta);
    const btns = row(8);
    add(btns, button("Details", "light", { small: true }));
    add(btns, state === "member" ? button("Member", "success", { small: true, iconName: "check" })
      : state === "pending" ? button("Pending", "accent", { small: true, iconName: "clock" })
      : button("Join club", "primary", { small: true, iconName: "userPlus" }));
    add(b, btns);
    return c;
  }
  function eventCard([day, mon, title, club, time, venue, taken, cap, cat], registered = false, w = 386) {
    const c = box({ name: "Event card / " + title, w, gap: 14, pad: 20, fill: C.white, stroke: C.border, radius: 14 });
    const head = row(14);
    add(head, dateChip(day, mon));
    const ht = box({ gap: 4 });
    const tags = row(6); add(tags, badge(cat, "grey")); if (registered) add(tags, badge("Registered", "success"));
    add(ht, tags);
    add(ht, text(title, { size: 16, weight: "Bold", width: w - 120 }));
    add(ht, text(club, { size: 12, color: C.muted }));
    add(head, ht);
    add(c, head);
    add(c, iconLine("clock", `${day} ${mon} 2026, ${time}`));
    add(c, iconLine("pin", venue));
    const seats = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN" });
    add(seats, text(`${taken}/${cap} registered`, { size: 12 })); add(seats, text(`${cap - taken} seats left`, { size: 12, color: C.muted }));
    add(c, seats, { stretch: true });
    add(c, progress(Math.round(taken / cap * 100), w - 40));
    const btns = row(8);
    add(btns, button("Details", "light", { small: true }));
    add(btns, registered ? button("Cancel registration", "danger", { small: true, iconName: "x" }) : button("Register", "primary", { small: true, iconName: "check" }));
    add(c, btns);
    return c;
  }
  function announcement(title, source, date, msg, important = false, unread = false, w = CW, manage = false) {
    const a = box({ name: "Announcement / " + title, dir: "HORIZONTAL", w, fill: unread ? "#F8FBFF" : C.white, stroke: C.border, radius: 14 });
    a.clipsContent = true;
    const stripe = figma.createRectangle(); stripe.name = "Stripe"; stripe.resize(4, 10); stripe.fills = solid(important ? C.danger : C.blue);
    add(a, stripe, { stretch: true });
    const body = box({ gap: 8, pad: 18 });
    add(a, body, { grow: true });
    const head = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "CENTER" });
    const src = row(10, { cross: "CENTER" }); add(src, clubLogo(C.blue, 34)); const st = box({ gap: 1 }); add(st, text(source, { size: 13, weight: "Semi Bold" })); add(st, text(date, { size: 12, color: C.muted })); add(src, st);
    add(head, src);
    const tags = row(6); if (important) add(tags, badge("Important", "danger")); if (unread) add(tags, badge("New", "primary")); if (manage) { add(tags, actions("edit", "trash")); }
    add(head, tags);
    add(body, head, { stretch: true });
    add(body, text(title, { size: 16, weight: "Bold" }), { stretch: true });
    add(body, text(msg, { size: 14, color: C.muted, lh: 20 }), { stretch: true });
    if (!manage) add(body, text(unread ? "Mark as read" : "Read", { size: 13, weight: "Medium", color: unread ? C.blue : C.muted }));
    else add(body, text("Read by 12 of 20 members", { size: 12, color: C.muted }));
    return a;
  }
  const welcome = (title, sub, buttons) => {
    const w = box({ name: "Welcome banner", gap: 10, pad: 24, radius: 14, fills: gradient(C.navy, C.blue), w: CW });
    add(w, text(title, { size: 24, weight: "Bold", color: C.white }));
    add(w, text(sub, { size: 14, color: "#D6DFEC" }));
    if (buttons) { const r = row(8); buttons.forEach(b => add(r, b)); add(w, r); }
    return w;
  };
  const stats4 = (items) => { const r = row(20); items.forEach(i => add(r, statCard(i[0], i[1], i[2], i[3], i[4] || null, (CW - 60) / 4))); return r; };

  /* =========================================================
     PAGES
     ========================================================= */
  async function showPage(page) {
    if (figma.setCurrentPageAsync) await figma.setCurrentPageAsync(page); else figma.currentPage = page;
  }
  function newPage(name) {
    const existing = figma.root.children.find(p => p.name === name);
    if (existing && existing === figma.currentPage) { existing.children.slice().forEach(n => n.remove()); return existing; }
    if (existing) existing.remove();
    const p = figma.createPage(); p.name = name; return p;
  }
  function place(page, frames) {
    let x = 0;
    frames.forEach(f => { page.appendChild(f); f.x = x; f.y = 0; x += f.width + 120; });
  }

  /* ---------------- 0. Style guide ---------------- */
  const guidePage = newPage("0 · Style Guide");
  const paintStyles = [["Navy", C.navy], ["Blue", C.blue], ["Gold", C.gold], ["Background", C.bg], ["Border", C.border], ["Text", C.text], ["Muted text", C.muted], ["Success", C.success], ["Danger", C.danger], ["White", C.white]];
  const oldPaint = figma.getLocalPaintStylesAsync ? await figma.getLocalPaintStylesAsync() : figma.getLocalPaintStyles();
  const oldText = figma.getLocalTextStylesAsync ? await figma.getLocalTextStylesAsync() : figma.getLocalTextStyles();
  paintStyles.forEach(([n, hex]) => {
    const old = oldPaint.find(s => s.name === "JNEC/" + n);
    if (old) old.remove();
    const s = figma.createPaintStyle(); s.name = "JNEC/" + n; s.paints = solid(hex);
  });
  const textStyles = [["Page title", 32, "Bold"], ["Section heading", 20, "Bold"], ["Card title", 16, "Semi Bold"], ["Body", 16, "Regular"], ["Small", 14, "Regular"], ["Label", 13, "Medium"], ["Caption", 12, "Regular"]];
  textStyles.forEach(([n, size, weight]) => {
    const old = oldText.find(s => s.name === "JNEC/" + n);
    if (old) old.remove();
    const s = figma.createTextStyle(); s.name = "JNEC/" + n; s.fontName = { family: FONT, style: weight }; s.fontSize = size;
  });

  const guide = box({ name: "Style Guide", w: SCREEN_W, gap: 32, pad: 48, fill: C.white });
  add(guide, text("JNEC Club Management System — Style Guide", { size: 32, weight: "Bold", color: C.navy }));
  add(guide, text("Colours, typography and components used across all screens. Colour and text styles are also saved as local styles (JNEC/…).", { size: 15, color: C.muted }));
  add(guide, text("Colours", { size: 20, weight: "Bold" }));
  const sw = row(20, { wrap: true, w: SCREEN_W - 96 });
  paintStyles.forEach(([n, hex]) => {
    const s = box({ name: "Swatch / " + n, gap: 8, w: 120 });
    const r = figma.createRectangle(); r.resize(120, 80); r.cornerRadius = 12; r.fills = solid(hex); r.strokes = solid(C.border); r.strokeWeight = 1;
    add(s, r); add(s, text(n, { size: 13, weight: "Semi Bold" })); add(s, text(hex, { size: 12, color: C.muted }));
    add(sw, s);
  });
  add(guide, sw);
  add(guide, text("Typography (Inter)", { size: 20, weight: "Bold" }));
  const ty = box({ gap: 12 });
  textStyles.forEach(([n, size, weight]) => add(ty, text(`${n} — ${size}px ${weight}`, { size, weight })));
  add(guide, ty);
  add(guide, text("Buttons", { size: 20, weight: "Bold" }));
  const bts = row(12, { cross: "CENTER" });
  [["Primary", "primary"], ["Accent", "accent"], ["Outline", "outline"], ["Light", "light"], ["Success", "success"], ["Danger", "danger"]].forEach(([l, v]) => add(bts, button(l, v)));
  add(bts, button("With icon", "primary", { iconName: "plus" })); add(bts, button("Small", "primary", { small: true }));
  add(guide, bts);
  add(guide, text("Status badges", { size: 20, weight: "Bold" }));
  const bds = row(10);
  [["Approved", "success"], ["Pending", "warning"], ["Rejected", "danger"], ["Upcoming", "primary"], ["Completed", "grey"], ["Important", "danger"]].forEach(([l, k]) => add(bds, badge(l, k)));
  add(guide, bds);
  add(guide, text("Form fields", { size: 20, weight: "Bold" }));
  const fl = row(20);
  add(fl, input("Email or Student ID", "you@jnec.edu.bt")); add(fl, input("Department", "Choose your department…", { kind: "select" }));
  add(fl, input("Password", "••••••••", { kind: "password" })); add(fl, checkbox("I agree to the club rules", true));
  add(guide, fl);
  add(guide, text("Cards", { size: 20, weight: "Bold" }));
  const cds = row(20);
  add(cds, statCard("12", "Total users", "users", "blue", "8 students · 3 secretaries"));
  add(cds, clubCard(CLUBS[0])); add(cds, eventCard(EVENTS[1]));
  add(guide, cds);
  add(guide, text("Logos", { size: 20, weight: "Bold" }));
  const lg = row(20, { cross: "CENTER" });
  add(lg, collegeLogo(64)); add(lg, text("College logo placeholder — select it, then Fill → Image → choose image/logo.jpg", { size: 13, color: C.muted }));
  add(lg, clubLogo(C.blue, 64)); add(lg, text("General club icon (used when a club has no uploaded logo)", { size: 13, color: C.muted }));
  add(guide, lg);
  place(guidePage, [guide]);

  /* ---------------- 1. Public pages ---------------- */
  const pubPage = newPage("1 · Public");
  const publicScreens = [];

  publicScreens.push(publicScreen("01 Home", s => {
    const hero = box({ name: "Hero", dir: "HORIZONTAL", pad: [80, 120], gap: 60, fills: gradient(C.navy, C.blue), cross: "CENTER" });
    add(s, hero, { stretch: true });
    const left = box({ gap: 18, w: 680 });
    add(left, text("JIGME NAMGYEL ENGINEERING COLLEGE · DEWATHANG", { size: 13, weight: "Bold", color: C.gold }));
    add(left, text("Discover, join and lead campus clubs in one place", { size: 48, weight: "Bold", color: C.white, width: 680, lh: 56 }));
    add(left, text("Explore JNEC clubs, apply for membership, register for events, get announcements and track your participation — all from a single platform.", { size: 18, color: "#D6DFEC", width: 640, lh: 28 }));
    const search = box({ name: "Hero search", dir: "HORIZONTAL", w: 520, pad: [6, 6, 6, 16], gap: 10, fill: C.white, radius: 12, cross: "CENTER" });
    add(search, icon("search", C.muted, 18)); add(search, text("Search clubs e.g. robotics, debate…", { size: 15, color: "#9AA4B2" }), { grow: true }); add(search, button("Search", "accent"));
    add(left, search);
    const hb = row(10); add(hb, button("Join as a student", "accent", { iconName: "userPlus" })); add(hb, button("Explore clubs", "ghostLight"));
    add(left, hb);
    add(hero, left);
    const art = box({ name: "Hero art", gap: 14, pad: 24, radius: 20, fill: C.white, opacity: 0.08, w: 400 });
    [["Robotics Workshop", "Registration confirmed", badge("Done", "success")], ["Cultural Club", "Membership approved", badge("Approved", "success")], ["New announcement", "Club registration closes soon", badge("New", "danger")]].forEach(([a, b, bd]) => {
      const m = box({ name: "Mini card", dir: "HORIZONTAL", gap: 12, pad: [12, 16], fill: C.white, radius: 12, cross: "CENTER", shadow: true });
      add(m, clubLogo(C.blue, 36)); const t = box({ gap: 2 }); add(t, text(a, { size: 14, weight: "Semi Bold" })); add(t, text(b, { size: 12, color: C.muted })); add(m, t, { grow: true }); add(m, bd);
      add(art, m, { stretch: true });
    });
    add(hero, art);
    const c = container(28, 40); add(s, c);
    const st = row(20); [["8", "Active clubs"], ["32", "Club memberships"], ["6", "Upcoming events"], ["120", "Registered students"]].forEach(([v, l]) => { const p = box({ name: "Stat pill", gap: 4, pad: 20, w: 285, fill: C.white, radius: 14, cross: "CENTER", shadow: true }); add(p, text(v, { size: 30, weight: "Bold", color: C.navy })); add(p, text(l, { size: 13, color: C.muted })); add(st, p); });
    add(c, st);
    const head = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "MAX" }); add(head, sectionTitle("Find your people", "Popular clubs")); add(head, button("View all clubs", "outline", { small: true }));
    add(c, head, { stretch: true });
    const cards = row(20); CLUBS.slice(0, 4).forEach(cl => add(cards, clubCard(cl, "join", 285))); add(c, cards);
    add(c, sectionTitle("Don't miss out", "Upcoming events"));
    const ev = row(20); EVENTS.slice(0, 3).forEach(e => add(ev, eventCard(e, false, 386))); add(c, ev);
    add(c, sectionTitle("Notice board", "College-wide announcements"));
    const an = row(20); [["Club registration closes soon", true], ["Welcome to the Club Management System", false], ["Sports week schedule released", false]].forEach(([t, imp]) => {
      const a = card(null, { w: 386, gap: 8 }); const h = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN" }); add(h, iconLine("calendar", "21 Oct 2026")); if (imp) add(h, badge("Important", "danger")); add(a, h, { stretch: true });
      add(a, text(t, { size: 16, weight: "Bold" }), { stretch: true }); add(a, text("Membership applications for this semester close in two weeks. Apply early so secretaries can review your request.", { size: 13, color: C.muted, lh: 19 }), { stretch: true }); add(an, a);
    });
    add(c, an);
  }));

  function authScreen(title, sideTitle, sideText, formBuild) {
    return publicScreen(title, s => {
      const wrap = box({ name: "Auth wrapper", pad: [60, 0], cross: "CENTER" }); add(s, wrap, { stretch: true });
      const cardEl = box({ name: "Auth card", dir: "HORIZONTAL", w: 1000, fill: C.white, radius: 18, shadow: true }); cardEl.clipsContent = true; add(wrap, cardEl);
      const side = box({ name: "Auth side", gap: 16, pad: 40, w: 380, fills: gradient(C.navy, C.blue) });
      add(side, text(sideTitle, { size: 28, weight: "Bold", color: C.white }));
      add(side, text(sideText, { size: 15, color: "#D6DFEC", width: 300, lh: 22 }));
      ["Track membership status", "Register for club events", "Receive instant announcements", "View your attendance history"].forEach(l => add(side, iconLine("check", l, C.gold)));
      add(cardEl, side, { stretch: true });
      const form = box({ name: "Auth form", gap: 16, pad: 48 }); add(cardEl, form, { grow: true });
      formBuild(form);
    });
  }
  publicScreens.push(authScreen("02 Login", "Welcome back!", "Log in to manage your clubs, events and announcements.", f => {
    add(f, text("Log in to your account", { size: 24, weight: "Bold" }));
    add(f, text("Students, club secretaries and administrators use the same login.", { size: 14, color: C.muted }));
    add(f, input("Email or Student ID", "you@jnec.edu.bt", { w: 520 }));
    const pw = input("Password", "••••••••", { w: 520, kind: "password" }); add(f, pw);
    add(f, text("Forgot password?", { size: 13, weight: "Medium", color: C.blue }));
    const b = button("Log in", "primary", { iconName: "logout" }); add(f, b, { stretch: true });
    add(f, text("New student? Create an account", { size: 13, color: C.blue, align: "CENTER" }), { stretch: true });
    add(f, text("Club secretary accounts are created by the system administrator.", { size: 12, color: C.muted }));
  }));
  publicScreens.push(authScreen("03 Register", "Join JNEC Clubs", "Create your student account to start exploring and joining clubs.", f => {
    add(f, text("Student registration", { size: 24, weight: "Bold" }));
    add(f, text("All fields are required.", { size: 14, color: C.muted }));
    const pairs = [[["Full name", "Sonam Wangmo"], ["Student ID", "e.g. 05240123"]], [["Email address", "you@jnec.edu.bt"], ["Mobile number", "17xxxxxx"]], [["Department", "Choose your department…", "select"], ["Year of study", "Choose…", "select"]], [["Password", "••••••••", "password"], ["Confirm password", "••••••••", "password"]]];
    pairs.forEach(p => { const r = row(16); p.forEach(([l, ph, k]) => add(r, input(l, ph, { w: 252, kind: k || "text" }))); add(f, r); });
    add(f, checkbox("I agree to follow the JNEC club code of conduct.", true));
    add(f, button("Create account", "primary", { iconName: "userPlus" }), { stretch: true });
    add(f, text("Already have an account? Log in", { size: 13, color: C.blue, align: "CENTER" }), { stretch: true });
  }));
  publicScreens.push(publicScreen("04 Clubs", s => {
    add(s, pageHeader("Explore JNEC Clubs", "Find a club that matches your interests and apply to join."), { stretch: true });
    const c = container(20, 28); add(s, c);
    add(c, filterBar([input("Search", "Search by name, description or category", { w: 560 }), input("Category", "All categories", { w: 280, kind: "select" }), input("Sort by", "Name (A–Z)", { w: 280, kind: "select" })], PW));
    add(c, text("8 clubs found", { size: 13, color: C.muted }));
    const g = row(20, { wrap: true, w: PW }); CLUBS.forEach((cl, i) => add(g, clubCard(cl, i === 0 ? "member" : i === 6 ? "pending" : "join", 285))); add(c, g);
  }));
  publicScreens.push(publicScreen("05 Club Details", s => {
    const hero = box({ name: "Club hero", dir: "HORIZONTAL", pad: [40, 120], gap: 20, fills: gradient("#1D4E89", C.navy), cross: "CENTER" });
    add(s, hero, { stretch: true });
    const ic = box({ dir: "HORIZONTAL", w: 76, h: 76, radius: 18, fill: C.white, opacity: 0.2, align: "CENTER", cross: "CENTER" }); add(ic, icon("users", C.white, 36)); add(hero, ic);
    const ht = box({ gap: 6 }); add(ht, text("Home  /  Clubs  /  Robotics & Innovation Club", { size: 13, color: "#C9D3E3" })); add(ht, badge("Technical", "grey")); add(ht, text("Robotics & Innovation Club", { size: 32, weight: "Bold", color: C.white })); add(ht, iconLine("users", "6 members", "#D6DFEC"));
    add(hero, ht, { grow: true }); add(hero, button("Join club", "accent", { iconName: "userPlus" }));
    const c = container(24, 28); add(s, c);
    const r = row(24); add(c, r);
    const left = box({ gap: 24, w: 780 }); add(r, left);
    const about = card("About the club"); add(about, text("Design, build and program robots. We take part in national robotics competitions and run hands-on workshops on Arduino, sensors and automation.", { size: 15, lh: 23 }), { stretch: true });
    add(about, text("Objectives", { size: 15, weight: "Semi Bold" })); add(about, text("Promote innovation and practical engineering skills; prepare teams for national competitions; share knowledge through peer workshops.", { size: 14, color: C.muted, lh: 21 }), { stretch: true });
    add(left, about, { stretch: true });
    const up = card("Upcoming events"); [EVENTS[1], EVENTS[3]].forEach(e => { const l = row(14, { cross: "CENTER" }); add(l, dateChip(e[0], e[1])); const t = box({ gap: 2 }); add(t, text(e[2], { size: 15, weight: "Semi Bold" })); add(t, text(`${e[4]} · ${e[5]}`, { size: 13, color: C.muted })); add(l, t); add(up, l); }); add(left, up, { stretch: true });
    const act = card("Recent activities"); [["30 Sep 2026", "Line follower robot build", "Members built and raced line follower robots in teams of three."], ["10 Sep 2026", "Visit to Thimphu TechPark", "Study tour to learn about start-ups and innovation in Bhutan."]].forEach(([d, t, x]) => { const a = box({ gap: 2 }); add(a, text(d, { size: 12, color: C.muted })); add(a, text(t, { size: 15, weight: "Semi Bold" })); add(a, text(x, { size: 13, color: C.muted })); add(act, a); }); add(left, act, { stretch: true });
    const right = box({ gap: 24, w: 396 }); add(r, right);
    const info = card("Club information"); [["calendar", "Meetings: Every Wednesday, 5:00 PM"], ["pin", "Venue: Electronics Lab"], ["user", "Faculty advisor: Mr. Dorji Wangchuk"], ["building", "Club secretary: Pema Yangzom"]].forEach(([i, t]) => add(info, iconLine(i, t, C.text))); add(right, info, { stretch: true });
    const mem = card("Your membership"); add(mem, text("You are not a member of this club yet.", { size: 13, color: C.muted })); add(mem, button("Join club", "primary", { small: true, iconName: "userPlus" })); add(right, mem, { stretch: true });
    const ann = card("Club announcements"); add(ann, iconLine("lock", "Announcements are visible to club members only.")); add(right, ann, { stretch: true });
  }));
  publicScreens.push(publicScreen("06 Events", s => {
    add(s, pageHeader("Club Events", "Workshops, competitions, cultural nights and more — register to reserve your seat."), { stretch: true });
    const c = container(20, 28); add(s, c);
    add(c, filterBar([input("Search", "Search events or venues", { w: 380 }), input("Club", "All clubs", { w: 190, kind: "select" }), input("Category", "All categories", { w: 190, kind: "select" }), input("Show", "Upcoming", { w: 190, kind: "select" }), input("Sort by", "Date (soonest)", { w: 170, kind: "select" })], PW));
    add(c, text("6 events", { size: 13, color: C.muted }));
    const g = row(20, { wrap: true, w: PW }); EVENTS.forEach((e, i) => add(g, eventCard(e, i === 0, 386))); add(c, g);
  }));
  publicScreens.push(publicScreen("07 Event Details", s => {
    const c = container(20, 28); add(s, c);
    add(c, text("Home  /  Events  /  JNEC Hackathon 2026", { size: 13, color: C.muted }));
    const r = row(24); add(c, r);
    const main = box({ w: 780, fill: C.white, stroke: C.border, radius: 14 }); main.clipsContent = true; add(r, main);
    const banner = box({ name: "Event banner", h: 160, fills: gradient("#0B7A75", C.navy), align: "CENTER", cross: "CENTER" }); add(banner, icon("users", C.white, 64)); add(main, banner, { stretch: true });
    const body = box({ gap: 14, pad: 28 }); add(main, body, { stretch: true });
    const tags = row(8); add(tags, badge("Competition", "grey")); add(tags, badge("Upcoming", "primary")); add(tags, badge("Open to all students", "primary")); add(body, tags);
    add(body, text("JNEC Hackathon 2026", { size: 28, weight: "Bold" }));
    add(body, text("Organised by Coding & Cyber Club", { size: 14, color: C.muted }));
    const tiles = row(16); [["calendar", "Date", "16 Nov 2026"], ["clock", "Time", "9:00 AM"], ["pin", "Venue", "IT Lab 2"]].forEach(([i, l, v]) => { const t = box({ gap: 4, pad: 14, w: 230, radius: 12, fill: C.bg }); add(t, icon(i, C.blue, 20)); add(t, text(l, { size: 12, color: C.muted })); add(t, text(v, { size: 15, weight: "Semi Bold" })); add(tiles, t); }); add(body, tiles);
    add(body, text("About this event", { size: 18, weight: "Bold" }));
    add(body, text("A 24-hour hackathon to build solutions for local problems in Samdrup Jongkhar. Teams of 3–4. Prizes for the top three teams.", { size: 15, lh: 23 }), { stretch: true });
    const side = box({ gap: 24, w: 396 }); add(r, side);
    const reg = card("Registration"); const sr = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN" }); add(sr, text("41 of 60 seats taken", { size: 13 })); add(sr, text("68%", { size: 13, weight: "Bold" })); add(reg, sr, { stretch: true });
    add(reg, progress(68, 356)); add(reg, button("Register", "primary", { iconName: "check" }), { stretch: true }); add(side, reg, { stretch: true });
    const more = card("More from this club"); add(more, iconLine("calendar", "Python Bootcamp – Day 2 · 20 Nov 2026", C.blue)); add(side, more, { stretch: true });
  }));
  place(pubPage, publicScreens);

  /* ---------------- 2. Member pages ---------------- */
  const memPage = newPage("2 · Member (Student)");
  const memberScreens = [];
  memberScreens.push(dashScreen("member", "Student Dashboard", "Dashboard", c => {
    add(c, welcome("Kuzuzangpo, Tashi!", "Here is what's happening in your clubs today.", [button("Find events", "accent", { small: true, iconName: "calendar" }), button("Join a club", "ghostLight", { small: true, iconName: "userPlus" })]));
    add(c, stats4([["2", "My clubs", "users", "blue", "1 pending application"], ["3", "Upcoming registrations", "calendar", "gold"], ["67%", "Attendance rate", "clipboard", "green", "3 events recorded"], ["3", "Unread announcements", "bell", "red"]]));
    const r = row(20); add(c, r);
    const left = box({ gap: 20, w: 740 }); add(r, left);
    const ev = card("My upcoming events", { action: "All events" }); EVENTS.slice(0, 3).forEach(e => { const l = row(14, { cross: "CENTER" }); add(l, dateChip(e[0], e[1])); const t = box({ gap: 2 }); add(t, text(e[2], { size: 15, weight: "Semi Bold" })); add(t, text(`${e[4]} · ${e[5]}`, { size: 13, color: C.muted })); add(l, t); add(ev, l); }); add(left, ev, { stretch: true });
    const an = card("Latest announcements", { action: "View all" }); [["Workshop components ready", "Robotics & Innovation Club"], ["Club registration closes soon", "College-wide"], ["Magazine articles wanted", "Literary & Debate Club"]].forEach(([t, s2]) => { const a = box({ gap: 2, pad: [4, 0, 4, 12], stroke: null }); add(a, text(t, { size: 14, weight: "Semi Bold" })); add(a, text(s2, { size: 12, color: C.muted })); add(an, a); }); add(left, an, { stretch: true });
    const right = box({ gap: 20, w: CW - 760 }); add(r, right);
    const ms = card("Membership status", { action: "My clubs" }); [["Robotics & Innovation Club", "Approved", "success"], ["Literary & Debate Club", "Approved", "success"], ["Photography & Media Club", "Pending", "warning"], ["Sports & Archery Club", "Rejected", "danger"]].forEach(([n, l, k]) => { const x = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "CENTER" }); add(x, text(n, { size: 14 })); add(x, badge(l, k)); add(ms, x, { stretch: true }); }); add(right, ms, { stretch: true });
    const sg = card("Clubs you might like"); CLUBS.slice(3, 6).forEach(cl => { const x = box({ dir: "HORIZONTAL", gap: 12, cross: "CENTER" }); add(x, clubLogo(cl[2], 36)); const t = box({ gap: 1 }); add(t, text(cl[0], { size: 14, weight: "Semi Bold" })); add(t, text(cl[1], { size: 12, color: C.muted })); add(x, t, { grow: true }); add(x, button("View", "outline", { small: true })); add(sg, x, { stretch: true }); }); add(right, sg, { stretch: true });
  }));
  memberScreens.push(dashScreen("member", "Join a Club", "Join a Club", c => {
    const r = row(20); add(c, r);
    const f = card("Membership application", { w: 680 }); add(r, f);
    add(f, input("Club", "Coding & Cyber Club", { w: 640, kind: "select", value: "Coding & Cyber Club" }));
    const pv = box({ dir: "HORIZONTAL", gap: 14, pad: 16, radius: 10, fill: C.bg }); add(pv, clubLogo("#0B7A75", 48)); const pt = box({ gap: 4 }); add(pt, text("Coding & Cyber Club", { size: 15, weight: "Semi Bold" })); add(pt, text("A community for programmers. We practise problem solving, web development and basic cyber security.", { size: 13, color: C.muted, width: 520 })); add(pt, text("Objectives: Improve coding skills; encourage open-source projects.", { size: 13, width: 520 })); add(pv, pt); add(f, pv, { stretch: true });
    add(f, input("Why do you want to join?", "Tell the club secretary about your interest and what you can contribute.", { w: 640, kind: "textarea", help: "0/500" }));
    const fr = row(16); add(fr, input("Skills / interests", "e.g. Arduino, public speaking, dance", { w: 380 })); add(fr, input("Availability", "Choose…", { w: 244, kind: "select" })); add(f, fr);
    add(f, checkbox("I agree to follow the club rules and take part in club activities."));
    add(f, button("Submit application", "primary", { iconName: "check" }));
    const how = card("How membership works", { w: CW - 700 }); add(r, how);
    ["1. Choose a club and read its description and objectives.", "2. Submit your application — its status becomes Pending.", "3. The club secretary approves or rejects it.", "4. Once approved, you receive club announcements and can join members-only events."].forEach(t => add(how, text(t, { size: 14, lh: 21 }), { stretch: true }));
    add(c, table([{ title: "Club", w: 340 }, { title: "Applied on", w: 200 }, { title: "Status", w: 200 }, { title: "Decision date", w: 200 }, { title: "Action", w: 160, right: true }],
      [["Photography & Media Club", "20 Oct 2026", badge("Pending", "warning"), "-", button("Withdraw", "danger", { small: true, iconName: "x" })],
       ["Robotics & Innovation Club", "15 Jul 2026", badge("Approved", "success"), "17 Jul 2026", ""],
       ["Sports & Archery Club", "24 Aug 2026", badge("Rejected", "danger"), "26 Aug 2026", ""]], { w: CW }));
  }));
  memberScreens.push(dashScreen("member", "My Clubs", "My Clubs", c => {
    const h = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "CENTER", w: CW }); add(h, text("Clubs you are an approved member of.", { size: 14, color: C.muted })); add(h, button("Join another club", "primary", { small: true, iconName: "plus" })); add(c, h);
    const g = row(20); [[CLUBS[0], "92%"], [CLUBS[2], "50%"]].forEach(([cl, rate]) => {
      const k = box({ name: "My club card", w: 364, fill: C.white, stroke: C.border, radius: 14 }); k.clipsContent = true;
      const top = box({ dir: "HORIZONTAL", pad: 18, fills: gradient(cl[2], C.navy), align: "SPACE_BETWEEN" }); const ic = box({ dir: "HORIZONTAL", w: 48, h: 48, radius: 14, fill: C.white, opacity: 0.2, align: "CENTER", cross: "CENTER" }); add(ic, icon("users", C.white, 24)); add(top, ic); add(top, badge("Approved", "success")); add(k, top, { stretch: true });
      const b = box({ gap: 10, pad: 18 }); add(k, b, { stretch: true }); add(b, text(cl[0], { size: 16, weight: "Bold" }));
      add(b, iconLine("calendar", "Member since 17 Jul 2026")); add(b, iconLine("clock", "Every Wednesday, 5:00 PM")); add(b, iconLine("calendar", "Next: Line Follower Robot Workshop"));
      const ar = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN" }); add(ar, text("Attendance", { size: 13 })); add(ar, text(rate, { size: 13, weight: "Bold" })); add(b, ar, { stretch: true }); add(b, progress(parseInt(rate), 328));
      const bt = row(8); add(bt, button("Open club", "outline", { small: true })); add(bt, button("Leave", "danger", { small: true })); add(b, bt);
      add(g, k);
    });
    add(c, g);
    const pend = card("Pending & rejected applications", { w: CW }); [["Photography & Media Club", "Applied 20 Oct 2026", "Pending", "warning"], ["Sports & Archery Club", "Applied 24 Aug 2026", "Rejected", "danger"]].forEach(([n, d, l, k]) => { const x = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "CENTER" }); const t = box({ gap: 2 }); add(t, text(n, { size: 14 })); add(t, text(d, { size: 12, color: C.muted })); add(x, t); add(x, badge(l, k)); add(pend, x, { stretch: true }); }); add(c, pend);
  }));
  memberScreens.push(dashScreen("member", "Announcements", "Announcements", c => {
    add(c, filterBar([input("Search", "Search announcements", { w: 380 }), input("Source", "All sources", { w: 240, kind: "select" }), input("Priority", "All", { w: 180, kind: "select" }), checkbox("Unread only"), button("Mark all read", "outline", { small: true, iconName: "check" })], CW));
    add(c, iconLine("bell", "You have 3 unread announcement(s).", C.muted));
    add(c, announcement("Workshop components ready", "Robotics & Innovation Club", "22 Oct 2026 · by Pema Yangzom", "Kits for the Line Follower Robot Workshop are ready. Registered members please bring a laptop with the Arduino IDE installed.", true, true));
    add(c, announcement("Club registration closes soon", "College-wide", "21 Oct 2026 · by System Administrator", "Membership applications for this semester close in two weeks. Apply early so secretaries have time to review your request.", true, true));
    add(c, announcement("Weekly meeting moved", "Robotics & Innovation Club", "17 Oct 2026 · by Pema Yangzom", "This Wednesday's meeting is moved to Thursday 5 PM because of the mid-semester test.", false, false));
  }));
  memberScreens.push(dashScreen("member", "Attendance History", "Attendance", c => {
    add(c, stats4([["67%", "Overall attendance", "chart", "blue"], ["2", "Present", "check", "green"], ["0", "Late", "clock", "gold"], ["1", "Absent", "x", "red"]]));
    const t = card("My attendance records", { w: CW, action: row(8) }); add(c, t);
    add(t, table([{ title: "Event", w: 330 }, { title: "Club", w: 260 }, { title: "Date", w: 160 }, { title: "Venue", w: 180 }, { title: "Status", w: 120 }],
      [["Arduino Basics Session", "Robotics & Innovation Club", "13 Oct 2026", "Electronics Lab", badge("Present", "success")],
       ["Poetry Recitation Evening", "Literary & Debate Club", "8 Oct 2026", "Library Hall", badge("Absent", "danger")],
       ["Robotics Club Orientation", "Robotics & Innovation Club", "28 Sep 2026", "Lecture Theatre 1", badge("Present", "success")]], { w: CW - 40 }), { stretch: true });
  }));
  memberScreens.push(dashScreen("member", "Feedback", "Feedback", c => {
    const r = row(20); add(c, r);
    const f = card("Share your feedback", { w: 460 }); add(r, f);
    add(f, input("Club", "Choose a club…", { w: 420, kind: "select" })); add(f, input("Event (optional)", "General (not about a specific event)", { w: 420, kind: "select" })); add(f, input("Type", "Choose…", { w: 420, kind: "select" }));
    add(f, text("Rating", { size: 13, weight: "Medium" })); const st = row(6); for (let i = 0; i < 5; i++) add(st, icon("star", i < 4 ? C.gold : "#CFD6DF", 28)); add(f, st);
    add(f, input("Your comments", "What went well? What could be improved?", { w: 420, kind: "textarea", help: "0/500" }));
    add(f, button("Submit feedback", "primary", { iconName: "check" }));
    const l = card(null, { w: CW - 480 }); add(r, l);
    const tabs = row(24); add(tabs, text("Community feedback", { size: 14, weight: "Semi Bold", color: C.navy })); add(tabs, text("My feedback", { size: 14, color: C.muted })); add(l, tabs);
    [["TD", "Tashi Dema", "Robotics & Innovation Club · Arduino Basics Session", "The Arduino session was very practical. Please organise an advanced session next month.", 5], ["UT", "Ugyen Tshering", "Robotics & Innovation Club · Orientation", "Good orientation. It would help to share the slides afterwards.", 4], ["PN", "Phuntsho Namgay", "Coding & Cyber Club · Python Bootcamp", "Loved the Python bootcamp! The exercises were well chosen.", 5]].forEach(([ini, n, s2, m, rt]) => {
      const it = box({ gap: 8, pad: [12, 0] }); const h = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN" }); add(h, personCell(ini, n, s2)); const stars = row(2); for (let i = 0; i < 5; i++) add(stars, icon("star", i < rt ? C.gold : "#CFD6DF", 14)); add(h, stars); add(it, h, { stretch: true });
      add(it, text(m, { size: 14, lh: 20 }), { stretch: true }); add(it, badge("Event", "grey")); add(l, it, { stretch: true });
    });
  }));
  memberScreens.push(dashScreen("member", "My Profile", "My Profile", c => {
    const r = row(20); add(c, r);
    const left = box({ gap: 20, w: 360 }); add(r, left);
    const pc = card(null, { gap: 10 }); pc.counterAxisAlignItems = "CENTER"; add(pc, avatar("TD", 96)); add(pc, text("Tashi Dema", { size: 20, weight: "Bold" })); add(pc, text("Student Member", { size: 13, color: C.muted })); add(pc, badge("Active", "success"));
    [["mail", "tashi.dema@jnec.edu.bt"], ["user", "05240101"], ["building", "Information Technology"], ["calendar", "Joined 15 Jun 2026"]].forEach(([i, t]) => add(pc, iconLine(i, t, C.text)));
    add(left, pc, { stretch: true });
    const sts = card(null); const sr = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN" }); [["2", "Clubs"], ["5", "Events"], ["1", "Feedback"]].forEach(([v, l]) => { const s2 = box({ gap: 2, cross: "CENTER", w: 90 }); add(s2, text(v, { size: 20, weight: "Bold" })); add(s2, text(l, { size: 12, color: C.muted })); add(sr, s2); }); add(sts, sr, { stretch: true }); add(left, sts, { stretch: true });
    const right = box({ gap: 20, w: CW - 380 }); add(r, right);
    const pi = card("Personal information"); add(right, pi, { stretch: true });
    [[["Full name", "Tashi Dema"], ["Email", "tashi.dema@jnec.edu.bt"]], [["Mobile number", "17330005"], ["Department", "Information Technology", "select"]], [["Year of study", "Second year", "select"]]].forEach(p => { const x = row(16); p.forEach(([l, v, k]) => add(x, input(l, "", { w: 348, value: v, kind: k || "text" }))); add(pi, x); });
    add(pi, input("About me", "A few words about your interests", { w: 712, kind: "textarea" })); add(pi, button("Save changes", "primary", { iconName: "check" }));
    const pw = card("Change password"); add(right, pw, { stretch: true });
    const x = row(16); ["Current password", "New password", "Confirm new password"].forEach(l => add(x, input(l, "••••••••", { w: 226, kind: "password" }))); add(pw, x); add(pw, button("Update password", "outline", { iconName: "key" }));
  }));
  place(memPage, memberScreens);

  /* ---------------- 3. Secretary pages ---------------- */
  const secPage = newPage("3 · Club Secretary");
  const secScreens = [];
  secScreens.push(dashScreen("secretary", "Secretary Dashboard", "Dashboard", c => {
    const b = box({ name: "Club banner", dir: "HORIZONTAL", gap: 16, pad: 24, radius: 14, fills: gradient(C.navy, C.blue), w: CW, cross: "CENTER" });
    const ic = box({ dir: "HORIZONTAL", w: 76, h: 76, radius: 18, fill: C.white, opacity: 0.2, align: "CENTER", cross: "CENTER" }); add(ic, icon("users", C.white, 36)); add(b, ic);
    const bt = box({ gap: 4 }); add(bt, text("YOU MANAGE", { size: 12, weight: "Semi Bold", color: "#C9D3E3" })); add(bt, text("Robotics & Innovation Club", { size: 24, weight: "Bold", color: C.white })); add(bt, iconLine("clock", "Every Wednesday, 5:00 PM · Electronics Lab", "#D6DFEC")); add(b, bt, { grow: true });
    add(b, button("Edit club profile", "light", { small: true, iconName: "edit" })); add(c, b);
    add(c, stats4([["6", "Club members", "users", "blue"], ["2", "Pending requests", "clock", "gold"], ["2", "Upcoming events", "calendar", "green"], ["83%", "Average attendance", "clipboard", "red"]]));
    const r = row(20); add(c, r);
    const left = box({ gap: 20, w: 640 }); add(r, left);
    const req = card("Membership requests", { action: "Manage members" }); [["JN", "Jigme Norbu", "Electrical & Electronics · Applied 21 Oct", "I want to build a robot for the national competition."], ["PN", "Phuntsho Namgay", "Information Technology · Applied 22 Oct", "I like programming microcontrollers."]].forEach(([i, n, s2, m]) => { const x = box({ dir: "HORIZONTAL", gap: 12, cross: "CENTER" }); const p = box({ gap: 4 }); add(p, personCell(i, n, s2)); add(p, text(`"${m}"`, { size: 13, color: C.muted })); add(x, p, { grow: true }); add(x, button("", "success", { small: true, iconName: "check" })); add(x, button("", "danger", { small: true, iconName: "x" })); add(req, x, { stretch: true }); }); add(left, req, { stretch: true });
    const qa = card("Quick actions"); const q = row(8, { wrap: true, w: 600 }); [["Create event", "primary", "plus"], ["Publish announcement", "outline", "megaphone"], ["Mark attendance", "outline", "clipboard"], ["View reports", "outline", "chart"]].forEach(([l, v, i]) => add(q, button(l, v, { small: true, iconName: i }))); add(qa, q); add(left, qa, { stretch: true });
    const right = box({ gap: 20, w: CW - 660 }); add(r, right);
    const up = card("Upcoming events", { action: "Manage events" }); [EVENTS[1], EVENTS[3]].forEach(e => { const l = row(14, { cross: "CENTER" }); add(l, dateChip(e[0], e[1])); const t = box({ gap: 2 }); add(t, text(e[2], { size: 14, weight: "Semi Bold" })); add(t, text(`${e[4]} · ${e[5]}`, { size: 12, color: C.muted })); add(l, t, { grow: true }); add(l, badge(`${e[6]}/${e[7]}`, "grey")); add(up, l, { stretch: true }); }); add(right, up, { stretch: true });
    const fb = card("Recent feedback"); add(fb, text("Tashi Dema · 5/5", { size: 14, weight: "Semi Bold" })); add(fb, text("The Arduino session was very practical. Please organise an advanced session next month.", { size: 13, color: C.muted, lh: 19 }), { stretch: true }); add(right, fb, { stretch: true });
  }));
  function clubForm(parent, w) {
    const r1 = row(16); add(r1, input("Club name", "", { w: w * 0.65, value: "Robotics & Innovation Club" })); add(r1, input("Category", "", { w: w * 0.35 - 16, kind: "select", value: "Technical" })); add(parent, r1);
    const r2 = row(16, { cross: "CENTER" });
    const lg = box({ name: "Field / Club logo", gap: 8, w: w * 0.65 }); add(lg, text("Club logo (optional)", { size: 13, weight: "Medium" }));
    const lr = row(14, { cross: "CENTER" }); add(lr, clubLogo(C.blue, 64)); const lb = box({ gap: 6 }); const bb = row(8); add(bb, button("Upload logo", "outline", { small: true, iconName: "upload" })); add(bb, button("Remove", "danger", { small: true, iconName: "x" })); add(lb, bb); add(lb, text("PNG or JPG, up to 5 MB. Without a logo, a general club icon is shown.", { size: 12, color: C.muted })); add(lr, lb); add(lg, lr);
    add(r2, lg);
    const col = box({ name: "Field / Theme colour", gap: 6, w: w * 0.35 - 16 }); add(col, text("Theme colour", { size: 13, weight: "Medium" })); const sw = figma.createRectangle(); sw.resize(w * 0.35 - 16, 38); sw.cornerRadius = 8; sw.fills = solid(C.blue); add(col, sw); add(r2, col);
    add(parent, r2);
    const r3 = row(16); [["Faculty advisor", "Mr. Dorji Wangchuk"], ["Meeting schedule", "Every Wednesday, 5:00 PM"], ["Venue", "Electronics Lab"]].forEach(([l, v]) => add(r3, input(l, "", { w: (w - 32) / 3, value: v }))); add(parent, r3);
    add(parent, input("Description", "", { w, kind: "textarea", value: "Design, build and program robots. We take part in national robotics competitions and run hands-on workshops." }));
    add(parent, input("Objectives", "", { w, kind: "textarea", value: "Promote innovation and practical engineering skills; prepare teams for national competitions." }));
  }
  secScreens.push(dashScreen("secretary", "Club Profile", "Club Profile", c => {
    const r = row(20); add(c, r);
    const left = box({ gap: 20, w: 760 }); add(r, left);
    const f = card("Edit club information"); add(left, f, { stretch: true }); clubForm(f, 720); add(f, button("Save club profile", "primary", { iconName: "check" }));
    const act = card("Club activities", { action: button("Add activity", "primary", { small: true, iconName: "plus" }) }); add(left, act, { stretch: true });
    [["Line follower robot build", "30 Sep 2026", "Members built and raced line follower robots in teams of three."], ["Visit to Thimphu TechPark", "10 Sep 2026", "Study tour to learn about start-ups and innovation in Bhutan."]].forEach(([t, d, x]) => { const it = box({ dir: "HORIZONTAL", gap: 12, align: "SPACE_BETWEEN" }); const tt = box({ gap: 2 }); add(tt, text(t, { size: 15, weight: "Semi Bold" })); add(tt, text(d, { size: 12, color: C.muted })); add(tt, text(x, { size: 13 })); add(it, tt); add(it, actions("edit", "trash")); add(act, it, { stretch: true }); });
    const pv = card("Live preview", { w: CW - 780 }); add(r, pv); add(pv, clubCard(CLUBS[0], "join", CW - 820));
  }));
  secScreens.push(dashScreen("secretary", "Member Management", "Members", c => {
    add(c, filterBar([input("Search students", "Name, student ID, email or department", { w: 620 }), input("Sort members", "Name", { w: 200, kind: "select" }), button("Export CSV", "outline", { iconName: "download" })], CW));
    const tabs = row(8, { cross: "CENTER" }); add(tabs, button("Requests  2", "primary", { small: true })); add(tabs, button("Members  6", "light", { small: true })); add(tabs, button("Decision history", "light", { small: true })); add(c, tabs);
    const t = card("Pending membership requests", { w: CW, action: button("Approve all", "success", { small: true, iconName: "check" }) }); add(c, t);
    add(t, table([{ title: "Student", w: 250 }, { title: "Department", w: 210 }, { title: "Reason", w: 290 }, { title: "Applied", w: 120 }, { title: "Decision", w: 180, right: true }],
      [[personCell("JN", "Jigme Norbu", "05240104"), "Electrical & Electronics", "I want to build a robot for the national competition.", "21 Oct 2026", row(6)],
       [personCell("PN", "Phuntsho Namgay", "05240106"), "Information Technology", "I like programming microcontrollers.", "22 Oct 2026", row(6)]].map(rw => { const d = rw[4]; add(d, button("Approve", "success", { small: true, iconName: "check" })); add(d, button("Reject", "danger", { small: true, iconName: "x" })); return rw; }), { w: CW - 40 }), { stretch: true });
    const m = card("Club members", { w: CW }); add(c, m);
    add(m, table([{ title: "Member", w: 300 }, { title: "Student ID", w: 150 }, { title: "Department", w: 240 }, { title: "Member since", w: 160 }, { title: "Attendance", w: 110 }, { title: "Remove", w: 90, right: true }],
      [[personCell("TD", "Tashi Dema", "tashi.dema@jnec.edu.bt"), "05240101", "Information Technology, Year 2", "17 Jul 2026", "100%", actions("x")],
       [personCell("UT", "Ugyen Tshering", "ugyen.tshering@jnec.edu.bt"), "05240102", "Civil Engineering, Year 2", "18 Jul 2026", "83%", actions("x")],
       [personCell("KW", "Kinzang Wangmo", "kinzang.wangmo@jnec.edu.bt"), "05240103", "Mechanical Engineering, Year 1", "5 Aug 2026", "50%", actions("x")]], { w: CW - 40 }), { stretch: true });
  }));
  secScreens.push(dashScreen("secretary", "Event Management", "Events", c => {
    add(c, filterBar([input("Search", "Title, venue or category", { w: 520 }), input("Status", "All", { w: 220, kind: "select" }), button("New event", "primary", { iconName: "plus" })], CW));
    add(c, table([{ title: "Event", w: 330 }, { title: "Date", w: 150 }, { title: "Venue", w: 190 }, { title: "Registered", w: 120 }, { title: "Status", w: 140 }, { title: "Actions", w: 130, right: true }],
      [["Line Follower Robot Workshop", "8 Nov 2026", "Electronics Lab", "18/40", badge("Upcoming", "primary"), actions("edit", "trash")],
       ["Robotics Showcase", "29 Nov 2026", "Multipurpose Hall", "7/100", badge("Upcoming", "primary"), actions("edit", "trash")],
       ["Arduino Basics Session", "13 Oct 2026", "Electronics Lab", "3/30", badge("Completed", "grey"), actions("edit", "trash")],
       ["Robotics Club Orientation", "28 Sep 2026", "Lecture Theatre 1", "3/60", badge("Completed", "grey"), actions("edit", "trash")]], { w: CW }));
    const modal = card("Create new event (modal)", { w: 760 }); add(c, modal);
    const r1 = row(16); add(r1, input("Event title", "", { w: 470, value: "Robotics Showcase" })); add(r1, input("Category", "", { w: 234, kind: "select", value: "Workshop" })); add(modal, r1);
    const r2 = row(16); add(r2, input("Organising club", "", { w: 352, kind: "select", value: "Robotics & Innovation Club" })); add(r2, input("Venue", "", { w: 352, value: "Multipurpose Hall" })); add(modal, r2);
    const r3 = row(16); [["Date", "29/11/2026"], ["Start time", "02:00 PM"], ["Capacity", "100"]].forEach(([l, v]) => add(r3, input(l, "", { w: 229, value: v }))); add(modal, r3);
    add(modal, input("Description", "Describe the event (at least 20 characters).", { w: 720, kind: "textarea" }));
    add(modal, checkbox("Open to all students (off = club members only)", true));
    const mb = box({ dir: "HORIZONTAL", gap: 8, align: "MAX" }); add(mb, button("Cancel", "light")); add(mb, button("Save event", "primary")); add(modal, mb, { stretch: true });
  }));
  secScreens.push(dashScreen("secretary", "Attendance Management", "Attendance", c => {
    add(c, filterBar([input("Event", "", { w: 520, kind: "select", value: "Arduino Basics Session — 13 Oct 2026" }), input("Search attendee", "Name or student ID", { w: 260 }), button("All present", "outline", { iconName: "check" }), button("Save", "primary", { iconName: "check" })], CW));
    const cnt = row(20); [["2", "Present", C.success], ["0", "Late", "#A66D00"], ["1", "Absent", C.danger], ["0", "Not marked", C.muted]].forEach(([v, l, col]) => { const k = box({ gap: 2, pad: 14, w: (CW - 60) / 4, fill: C.white, stroke: C.border, radius: 14, cross: "CENTER" }); add(k, text(v, { size: 26, weight: "Bold", color: col })); add(k, text(l, { size: 12, color: C.muted })); add(cnt, k); }); add(c, cnt);
    const seg = (sel) => { const s2 = row(0); [["Present", C.success], ["Late", C.gold], ["Absent", C.danger]].forEach(([l, col]) => { const b = box({ dir: "HORIZONTAL", pad: [6, 12], fill: l === sel ? col : C.white, stroke: col }); add(b, text(l, { size: 12, weight: "Semi Bold", color: l === sel ? C.white : col })); add(s2, b); }); return s2; };
    const t = card("Attendance sheet — highlighted rows have unsaved changes", { w: CW }); add(c, t);
    add(t, table([{ title: "Student", w: 330 }, { title: "Department", w: 260 }, { title: "Type", w: 180 }, { title: "Attendance", w: 250, right: true }],
      [[personCell("TD", "Tashi Dema", "05240101"), "Information Technology", badge("Registered", "grey"), seg("Present")],
       [personCell("UT", "Ugyen Tshering", "05240102"), "Civil Engineering & Surveying", badge("Registered", "grey"), seg("Present")],
       [personCell("KW", "Kinzang Wangmo", "05240103"), "Mechanical Engineering", badge("Walk-in", "primary"), seg("Absent")]], { w: CW - 40 }), { stretch: true });
    const wi = row(8, { cross: "CENTER" }); add(wi, input("Add walk-in attendee", "Add a club member who attended…", { w: 400, kind: "select" })); add(wi, button("Add walk-in", "outline", { iconName: "userPlus" })); add(t, wi);
  }));
  secScreens.push(dashScreen("secretary", "Announcements", "Announcements", c => {
    add(c, filterBar([input("Search", "Search announcements", { w: 520 }), input("Audience", "All announcements", { w: 300, kind: "select" }), button("New announcement", "primary", { iconName: "megaphone" })], CW));
    add(c, announcement("Workshop components ready", "Robotics & Innovation Club", "22 Oct 2026 · by Pema Yangzom", "Kits for the Line Follower Robot Workshop are ready. Registered members please bring a laptop with the Arduino IDE installed.", true, false, CW, true));
    add(c, announcement("Weekly meeting moved", "Robotics & Innovation Club", "17 Oct 2026 · by Pema Yangzom", "This Wednesday's meeting is moved to Thursday 5 PM because of the mid-semester test.", false, false, CW, true));
  }));
  secScreens.push(dashScreen("secretary", "Reports", "Reports", c => {
    add(c, filterBar([input("Period", "All time", { w: 320, kind: "select" }), button("Print", "outline", { iconName: "printer" }), button("Export CSV", "primary", { iconName: "download" })], CW));
    const h = box({ gap: 2 }); add(h, text("Robotics & Innovation Club — All time", { size: 20, weight: "Bold" })); add(h, text("Generated on 23 Oct 2026 by Pema Yangzom", { size: 12, color: C.muted })); add(c, h);
    add(c, stats4([["6", "Active members", "users", "blue"], ["2", "Events held", "calendar", "green", "2 upcoming"], ["83%", "Attendance rate", "clipboard", "gold"], ["4.5", "Average rating", "star", "red", "2 responses"]]));
    const r = row(20); add(c, r);
    const a = card("Membership applications", { w: (CW - 20) / 2 }); add(a, donut([["Approved", 6, C.success], ["Pending", 2, C.gold], ["Rejected", 1, C.danger]])); add(r, a);
    const b = card("Attendance breakdown", { w: (CW - 20) / 2 }); add(b, donut([["Present", 5, C.success], ["Late", 1, C.gold], ["Absent", 1, C.danger]])); add(r, b);
    const ch = card("Attendance rate per completed event", { w: CW }); add(ch, barChart([["Robotics Club Orientation", 100], ["Arduino Basics Session", 67]], CW - 40)); add(c, ch);
    add(c, table([{ title: "Event", w: 300 }, { title: "Date", w: 160 }, { title: "Registered", w: 140 }, { title: "Attended", w: 140 }, { title: "Rate", w: 120 }, { title: "Status", w: 200 }],
      [["Line Follower Robot Workshop", "8 Nov 2026", "18/40", "0", "-", badge("Upcoming", "primary")], ["Arduino Basics Session", "13 Oct 2026", "3/30", "2", "67%", badge("Completed", "grey")], ["Robotics Club Orientation", "28 Sep 2026", "3/60", "3", "100%", badge("Completed", "grey")]], { w: CW }));
  }));
  place(secPage, secScreens);

  /* ---------------- 4. Admin pages ---------------- */
  const admPage = newPage("4 · Admin");
  const adminScreens = [];
  adminScreens.push(dashScreen("admin", "Admin Dashboard", "Dashboard", c => {
    add(c, stats4([["124", "Total users", "users", "blue", "116 students · 7 secretaries"], ["8", "Clubs", "building", "gold", "8 active"], ["18", "Events", "calendar", "green", "6 upcoming"], ["32", "Active memberships", "userPlus", "red", "4 pending requests"]]));
    const r = row(20); add(c, r);
    const a = card("Users by role", { w: 400 }); add(a, donut([["Students", 116, C.blue], ["Secretaries", 7, C.gold], ["Administrators", 1, "#B5452C"]])); add(r, a);
    const b = card("Members per club", { w: CW - 420 }); add(b, barChart(CLUBS.map(cl => [cl[0], cl[4], cl[2]]), CW - 460)); add(r, b);
    const r2 = row(20); add(c, r2);
    const left = box({ gap: 20, w: 660 }); add(r2, left);
    const log = card("Recent system activity"); [["PY", "Pema Yangzom", "approved membership of Kinzang Wangmo", "22 Oct 2026"], ["SD", "Sonam Dorji", "created event \"JNEC Hackathon 2026\"", "21 Oct 2026"], ["SA", "System Administrator", "created user Deki Choden (Club Secretary)", "20 Oct 2026"]].forEach(([i, n, a2, d]) => { const x = box({ dir: "HORIZONTAL", gap: 10, cross: "CENTER" }); add(x, avatar(i, 32)); const t = box({ gap: 2 }); add(t, text(`${n} ${a2}`, { size: 13, width: 560 })); add(t, text(d, { size: 12, color: C.muted })); add(x, t); add(log, x, { stretch: true }); }); add(left, log, { stretch: true });
    const ev = card("Events per month"); add(ev, barChart([["Jul 2026", 2], ["Aug 2026", 3], ["Sep 2026", 4], ["Oct 2026", 3], ["Nov 2026", 6], ["Dec 2026", 0]], 620)); add(left, ev, { stretch: true });
    const right = box({ gap: 20, w: CW - 680 }); add(r2, right);
    const na = card("Needs attention"); [["key", "Sonam Wangmo requested a password reset", "Reset"], ["user", "Y-Peer & Health Club has no secretary", "Assign"], ["clock", "Robotics & Innovation Club: 2 pending request(s)", "Review"]].forEach(([i, t, b2]) => { const x = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "CENTER" }); add(x, iconLine(i, t, C.text)); add(x, button(b2, "outline", { small: true })); add(na, x, { stretch: true }); }); add(right, na, { stretch: true });
    const ql = card("Quick links"); const q = row(8, { wrap: true, w: CW - 720 }); [["Manage users", "primary", "users"], ["Manage clubs", "outline", "building"], ["College announcement", "outline", "megaphone"], ["Reports", "outline", "chart"]].forEach(([l, v, i]) => add(q, button(l, v, { small: true, iconName: i }))); add(ql, q); add(right, ql, { stretch: true });
    const si = card("System information"); [["Version", "1.0"], ["Data storage", "Browser localStorage"], ["Storage used", "48.2 KB"]].forEach(([k, v]) => { const x = box({ dir: "HORIZONTAL", align: "SPACE_BETWEEN" }); add(x, text(k, { size: 13 })); add(x, text(v, { size: 13, weight: "Semi Bold" })); add(si, x, { stretch: true }); });
    add(si, text("Records are saved in this browser. Download a backup regularly and keep it safe.", { size: 12, color: C.muted }), { stretch: true });
    const sb = row(8); add(sb, button("Backup data (JSON)", "outline", { small: true, iconName: "download" })); add(sb, button("Restore backup", "danger", { small: true, iconName: "upload" })); add(si, sb); add(right, si, { stretch: true });
  }));
  adminScreens.push(dashScreen("admin", "User & Role Management", "Users & Roles", c => {
    const cnt = row(20); [["116", "Students"], ["7", "Secretaries"], ["1", "Admins"]].forEach(([v, l]) => { const k = box({ gap: 2, pad: 14, w: (CW - 40) / 3, fill: C.white, stroke: C.border, radius: 14, cross: "CENTER" }); add(k, text(v, { size: 26, weight: "Bold", color: C.navy })); add(k, text(l, { size: 12, color: C.muted })); add(cnt, k); }); add(c, cnt);
    add(c, filterBar([input("Search", "Name, email or ID", { w: 460 }), input("Role", "All roles", { w: 200, kind: "select" }), input("Status", "All", { w: 180, kind: "select" }), button("Add user", "primary", { iconName: "userPlus" })], CW));
    const roleBadge = (l, k) => badge(l, k);
    add(c, table([{ title: "User", w: 330 }, { title: "ID", w: 130 }, { title: "Role", w: 230 }, { title: "Department", w: 200 }, { title: "Status", w: 110 }, { title: "Actions", w: 100, right: true }],
      [[personCell("SA", "System Administrator", "admin@jnec.edu.bt"), "ADMIN-001", roleBadge("System Administrator", "danger"), "Administration", badge("Active", "success"), actions("edit")],
       [personCell("PY", "Pema Yangzom", "secretary.robotics@jnec.edu.bt"), "05230045", roleBadge("Club Secretary · Robotics", "warning"), "Electrical & Electronics", badge("Active", "success"), actions("edit", "trash")],
       [personCell("TD", "Tashi Dema", "tashi.dema@jnec.edu.bt"), "05240101", roleBadge("Student Member", "primary"), "Information Technology", badge("Active", "success"), actions("edit", "trash")],
       [personCell("CD", "Chimi Dorji", "chimi.dorji@jnec.edu.bt"), "05240107", roleBadge("Student Member", "primary"), "Civil Engineering", badge("Inactive", "grey"), actions("edit", "trash")]], { w: CW }));
    const modal = card("Add new user (modal)", { w: 760 }); add(c, modal);
    [[["Full name", "Deki Choden"], ["Email", "deki.choden@jnec.edu.bt"]], [["Student / staff ID", "05230102"], ["Mobile number", "17220004"]], [["Role", "Club Secretary", "select"], ["Assigned club", "Cultural Club", "select"]], [["Department", "Humanities & Management", "select"], ["Account status", "Active", "select"]]].forEach(p => { const x = row(16); p.forEach(([l, v, k]) => add(x, input(l, "", { w: 352, value: v, kind: k || "text" }))); add(modal, x); });
    add(modal, input("Password", "••••••••", { w: 720, kind: "password", help: "Temporary password — the user must change it at first login." }));
    const mb = box({ dir: "HORIZONTAL", gap: 8, align: "MAX" }); add(mb, button("Cancel", "light")); add(mb, button("Save user", "primary")); add(modal, mb, { stretch: true });
  }));
  adminScreens.push(dashScreen("admin", "Club Management", "All Clubs", c => {
    add(c, filterBar([input("Search", "Club name, description or advisor", { w: 520 }), input("Category", "All categories", { w: 260, kind: "select" }), button("Add club", "primary", { iconName: "plus" })], CW));
    add(c, table([{ title: "Club", w: 330 }, { title: "Category", w: 150 }, { title: "Secretary", w: 190 }, { title: "Members", w: 100 }, { title: "Events", w: 90 }, { title: "Status", w: 120 }, { title: "Actions", w: 100, right: true }],
      CLUBS.slice(0, 5).map((cl, i) => { const n = box({ dir: "HORIZONTAL", gap: 10, cross: "CENTER" }); add(n, clubLogo(cl[2], 36)); add(n, text(cl[0], { size: 14, weight: "Semi Bold" })); return [n, cl[1], i === 4 ? "None" : ["Pema Yangzom", "Sonam Dorji", "Karma Lhamo", "Deki Choden"][i], String(cl[4]), String(cl[5] + 1), badge("Active", "success"), actions("edit", "trash")]; }), { w: CW }));
    const modal = card("Add new club (modal)", { w: 860 }); add(c, modal);
    clubForm(modal, 820);
    const r = row(16); add(r, input("Club secretary", "", { w: 402, kind: "select", value: "Not assigned", help: "Only users with the Secretary role are listed." })); add(r, input("Status", "", { w: 402, kind: "select", value: "Active (visible to students)" })); add(modal, r);
    const mb = box({ dir: "HORIZONTAL", gap: 8, align: "MAX" }); add(mb, button("Cancel", "light")); add(mb, button("Save club", "primary")); add(modal, mb, { stretch: true });
  }));
  place(admPage, adminScreens);

  await showPage(pubPage);
  figma.viewport.scrollAndZoomIntoView(publicScreens);
  figma.notify("✅ JNEC Club Management System: style guide + 24 screens created.", { timeout: 6000 });
  figma.closePlugin();
})().catch(err => {
  console.error(err);
  figma.notify("❌ Error: " + err.message, { error: true, timeout: 10000 });
  figma.closePlugin();
});
