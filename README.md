# Seeker

A triage-first mental-wellness platform. An AI intake conversation routes a
person either to a graduate counselor (peer-level support) or to a licensed
therapist, with crisis detection and escalation alongside.

**Status:** prototype, not ready for real users. See
[docs/MASTER_AUDIT.md](docs/MASTER_AUDIT.md) for what works and what does not,
and [docs/PILOT_ROADMAP.md](docs/PILOT_ROADMAP.md) for the plan toward a closed
pilot.

## Layout

| Path | What it is |
|---|---|
| `config/` | Django project: settings, URLs, ASGI, Celery |
| `accounts/` | Users, roles, OTP registration, JWT auth |
| `core/` | Sessions, chat (WebSocket), triage, crisis detection, escalation, notes, earnings |
| `profiles/` | Availability, bookings, therapist search (Typesense), public profiles |
| `notifications/` | Push (Firebase) and in-app notifications |
| `helpline/`, `feedback/` | Helpline directory, post-session feedback |
| `frontend/` | Expo / React Native app (Android and web) |
| `web/` | Next.js public profile site |
| `research/` | Clinical reference notes; the triage service loads one of them at runtime |
| `docs/` | Audit, roadmap, WebSocket notes; `docs/archive/` holds superseded plans |

## Backend: run locally

Requires Docker Desktop.

```bash
cp .env.local.example .env.local      # then fill in the blanks
docker compose up -d --build
docker compose exec django python manage.py migrate
docker compose exec django python manage.py seed_crisis_keywords
docker compose exec django python manage.py createsuperuser
```

- API: http://localhost:8000
- API docs (Swagger): http://localhost:8000/api/docs/
- Django admin: http://localhost:8000/admin/

Crisis detection matches against the keyword table, so it does nothing until
`seed_crisis_keywords` has been run.

## Tests

Tests need Postgres and Redis. Inside Docker:

```bash
docker compose exec django pytest
```

On the host, with only the databases in Docker:

```bash
docker compose up -d postgres redis
python -m venv .venv && .venv/Scripts/activate      # Windows; use bin/activate elsewhere
pip install -r requirements.txt -c requirements.lock
POSTGRES_HOST=localhost REDIS_HOST=localhost REDIS_URL=redis://localhost:6379/0 pytest
```

CI (`.github/workflows/ci.yml`) runs the system check, a migration check and
the test suite on every push and pull request.

## Dependencies

`requirements.txt` pins direct dependencies; `requirements.lock` pins everything
else and is used as a constraints file. To upgrade, change a pin, reinstall in a
clean virtualenv, run the tests, then `pip freeze > requirements.lock`.

## Mobile and web app (`frontend/`)

```bash
cd frontend
npm install
npx expo start            # Android: press a; web: press w
```

The API address is `expo.extra.API_BASE_URL` in `frontend/app.json`. It is
currently a developer LAN address; change it to where your backend is reachable.

## Public site (`web/`)

```bash
cd web
npm install
npm run dev
```

This app is not functional yet; see the audit.
