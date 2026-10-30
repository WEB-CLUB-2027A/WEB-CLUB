# WEB-CLUB

A student-focused web development club project with a static frontend and an Express backend API.

## Project structure

```text
WEB-CLUB/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── .env
│   ├── package.json
│   └── server.js
├── database/
│   └── migrations/
│       └── 20261020_add_member_position.sql
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   ├── index.html
│   └── pages/
├── admin/
│   ├── index.html
│   ├── public/
│   │   ├── login.html
│   │   └── register.html
│   ├── pages/
│   ├── css/
│   └── js/
├── .gitignore
├── README.md
└── package-lock.json
```

## Frontend

The public website uses `frontend/index.html`, with the other public pages in `frontend/pages/`. Public pages share responsive navigation and Boxicons; event, member, and project listings render API data as text and validate external URLs before linking.

The admin area starts at `admin/index.html`. Admin management pages for messages, members, projects, and events live in `admin/pages/`; the dashboard and each page share the same responsive admin layout. Admins can add and edit events, projects, member profiles for existing accounts, and inbox message records.

## Backend

The backend uses Express.js and MySQL connection pooling. Start it with:

```bash
cd backend
npm install
npm run dev
```

## Environment setup

Create or update the `backend/.env` file with your database configuration:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=web_club
DB_PORT=3306
PORT=5000
```

## Database migrations

Run `database/migrations/20261020_add_member_position.sql` once against the configured `web_club` database before using admin member roles. It adds the optional club role/position field shown on public and admin member cards.

## Notes

- Keep frontend pages in the `frontend/` folder.
- Keep the admin dashboard and admin pages in the `admin/` folder.
- Keep API logic in the `backend/` folder.
- Use `frontend/css/` and `frontend/js/` for styling and scripts.
- Add new pages with matching navigation links so the project stays clean and consistent.
