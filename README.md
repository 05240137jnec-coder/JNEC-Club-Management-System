# JNEC Club Management System

College Club Management System mini-project developed by a team of three JNEC students.

Club Management System for **Jigme Namgyel Engineering College, Dewathang**.
Built with HTML5, CSS3, JavaScript, Bootstrap 5 and Bootstrap Icons.

## How to run

1. Open this folder in **Visual Studio Code**.
2. Right-click `index.html` → **Open with Live Server**.

## First login (administrator)

The system starts with the college clubs and one administrator account:

| Email | Temporary password |
|-------|--------------------|
| admin@jnec.edu.bt | Admin@123 |

At first login you are taken to **My Profile** and must set a new password before using the system.
You can change the default email/password in `js/data.js` (`DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`) before the first run.

## Setting up the system

1. **Admin → All Clubs:** check each club's details, add the faculty advisor and year founded, add or delete clubs.
2. **Admin → Users & Roles → Add user:** create an account for each club secretary, choose the role
   *Club Secretary* and assign their club. The password you set is temporary — they must change it at first login.
3. **Students** create their own accounts on the **Register** page.

## Forgotten passwords

A user clicks **Forgot password?** on the login page. The request appears on the admin dashboard
under **Needs attention**. Click **Reset**, enter a temporary password, and give it to the user.
They must change it at their next login.

## Locked accounts (too many wrong passwords)

After **5 wrong passwords**, the account is locked for **15 minutes**. The login page shows how many
tries are left. The admin sees locked accounts under **Needs attention** and can unlock one early
with the **unlock** button on **Users & Roles**. Setting a new password also unlocks the account.
To change the limits, edit `MAX_LOGIN_ATTEMPTS` and `LOCK_MINUTES` in `js/auth.js`.

## Log in with Google (one-time setup)

The login page has a **Continue with Google** button. It works after you add a free Google Client ID:

1. Go to **console.cloud.google.com** and sign in with the Google account that will manage the system.
2. Create a project (for example *JNEC Club Management*).
3. Open **APIs & Services → OAuth consent screen**: choose **External**, enter the app name and your email, then save.
4. Open **APIs & Services → Credentials → Create credentials → OAuth client ID**.
5. Application type: **Web application**. Under **Authorized JavaScript origins** add:
   - `http://localhost:5501`
   - `http://127.0.0.1:5501`

   (5501 is your Live Server port. Later, add your real website address as well.)
6. Click **Create** and copy the **Client ID** (it ends with `.apps.googleusercontent.com`).
7. In `js/auth.js`, paste it here:
   ```javascript
   const GOOGLE_CLIENT_ID = "paste-your-client-id.apps.googleusercontent.com";
   ```
8. Open the site at **http://localhost:5501/login.html**. The Google button appears.

**Who can use it:** Google sign-in works for **existing accounts only**. The Google email must be the same
email the person registered with (students register first; the admin creates secretary accounts).
While the Google app is in *Testing* mode, add the people who will use it under **OAuth consent screen → Test users**.

## Where data is stored

All records are saved in the browser's **localStorage**:

- Data stays in the browser and computer where it was entered. Other computers do not see it.
- Clearing the browser's site data deletes all records.
  Use **Admin Dashboard → Backup data** regularly, and **Restore backup** to load a saved file.
- To share one database between many computers, the system needs a server database
  (for example PHP + MySQL, as proposed in the project report).

## Folder structure

```
index.html, login.html, register.html, clubs.html, club-details.html, events.html, event-details.html
member/      student pages (dashboard, join club, my clubs, announcements, attendance, feedback, profile)
secretary/   club secretary pages (also used by the admin for monitoring)
admin/       administrator pages (dashboard, users & roles, all clubs)
css/styles.css
js/          data.js, main.js, auth.js, clubs.js, events.js, member.js, management.js, admin.js
assets/images/logo.svg   (replace with the official JNEC logo)
```
