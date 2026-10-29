# JNEC Clubs – Backend

Node.js + Express + SQLite (better-sqlite3) + JWT.

## Run
    cd jnec-backend
    npm install
    cp .env.example .env      # set JWT_SECRET and FRONTEND_DIR
    npm start                 # http://localhost:3000

On first start the DB is created and seeded:
- admin@jnec.edu.bt / Admin@123
- robotics.sec@jnec.edu.bt / Secret@123 (secretary)
- karma@jnec.edu.bt or 05240123 / Student@123 (student)

Set FRONTEND_DIR to your frontend folder; the server then serves the site and API from one origin.
Add `<script src="js/api.js"></script>` (file `api.js` here) before data.js in each page.
