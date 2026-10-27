# Create the JNEC Club Management System design in Figma

`code.js` draws the whole design inside Figma as normal, editable layers:

| Figma page | Frames |
|---|---|
| 0 · Style Guide | Colours, text styles, buttons, badges, form fields, cards, logos |
| 1 · Public | Home, Login, Register, Clubs, Club Details, Events, Event Details |
| 2 · Member (Student) | Dashboard, Join a Club, My Clubs, Announcements, Attendance, Feedback, My Profile |
| 3 · Club Secretary | Dashboard, Club Profile, Members, Events, Attendance, Announcements, Reports |
| 4 · Admin | Dashboard, Users & Roles, All Clubs |

It also saves colour styles and text styles named **JNEC/…** in your file.

---

## Method A: Figma desktop app (recommended)

1. Install the free **Figma desktop app** (figma.com/downloads) and sign in.
2. Open a **new design file**.
3. Menu → **Plugins → Development → Import plugin from manifest…**
4. Choose `D:\club_Management_System\figma\manifest.json`.
5. Menu → **Plugins → Development → JNEC Club Screens**.
6. Wait a few seconds. A message says **"style guide + 24 screens created"**.

To run it again later, use **Plugins → Development → JNEC Club Screens**. Running it again replaces the pages it made before.

## Method B: Paste the code (works in the browser too)

1. In any Figma design file, open **Plugins → Find more plugins**, search for **"Scripter"** and run it.
2. Delete the example code in Scripter.
3. Open `figma/code.js` in VS Code, press **Ctrl + A**, then **Ctrl + C**.
4. Paste it into Scripter (**Ctrl + V**) and press **Run ▶**.

---

## After it is created

- **College logo:** each "JNEC" circle is a placeholder. Select it, then in the right panel go to **Fill → Image** and choose `image/logo.jpg`.
- **Club logos:** the coloured squares with a people icon are the *general club icon*. Replace any of them with a club's logo the same way.
- **Prototype:** in the **Prototype** tab, drag links between frames. For example, connect Login → Student Dashboard → Clubs → Club Details → Join a Club. Then press **Play ▶** to present it.
- Everything uses **auto layout**, so text and cards resize when you edit them.
- The names and numbers on the screens are sample content for the design only.
