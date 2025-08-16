# Viva / Invigilator Questions and Answers

This document lists likely questions an invigilator might ask about the project and concise answers grounded in the codebase.

## 1) Project Overview
- Q: What does this project do?
  - A: A Flask-based museum platform where visitors can search museums, book tours (QR ticket generated), chat with an AI assistant, and admins can manage analytics and passkeys.
- Q: Where is the main application logic?
  - A: `app.py` defines all routes/APIs; templates in `templates/`; static assets in `static/`.

## 2) Tech Stack
- Q: Which backend framework?
  - A: Flask (`app.py`).
- Q: Databases used?
  - A: Primary: MongoDB via `pymongo` (`db_utils.py`, various routes). CSV files as sources/fallbacks: `final_museums.csv`, `foreign.csv`, `bookingDB`.
- Q: Any ML/AI components?
  - A: ML: TF‑IDF + cosine similarity in `ml_recommendations.py`. AI chatbot via Google Gemini (`chatbot.py`).

## 3) Data Sources & Files
- Q: Which CSVs are required?
  - A: `final_museums.csv` (museums master data), `foreign.csv` (analytics), `bookingDB` (bookings CSV store created by app).
- Q: Where are QR codes stored?
  - A: `static/qrcodes/` (created as PNG per ticket ID).

## 4) Key Features (User)
- Q: What can a visitor do?
  - A: Register/login, search museums, view recommendations, book visits (QR ticket), view map, chat with chatbot.
- Q: Where’s the booking API?
  - A: `POST /api/book` in `app.py` creates booking, QR, and writes to `bookingDB`.
- Q: How to cancel a booking?
  - A: `POST /api/cancel` with `ticket_id`; marks status as `Cancelled` in `bookingDB`.

## 5) Admin Features
- Q: How do admins authenticate?
  - A: `/admin/login` expects JSON credentials; passwords hashed via `werkzeug.security` in MongoDB collection `admins`.
- Q: What are passkeys for?
  - A: Admin passkeys stored in `passkeys` collection; endpoints under `/api/admin/passkeys` for CRUD; default fallback `ansarimohammed` if none exist.
- Q: Admin analytics endpoints?
  - A: `/api/admin/analytics`, `/api/admin/bookings`, `/api/foreign-visitors`, `/api/foreign-visitors-by-district` (guards with `admin_id` in session).

## 6) API Endpoints (Selected)
- Q: Visitor data APIs?
  - A: `/api/exhibitions`, `/api/museum-filters`, `/api/museum-locations`.
- Q: Chatbot APIs?
  - A: `/api/chat` (generate response), `/api/chat/reset`.
- Q: Pages (GET routes)?
  - A: `/`, `/gallery`, `/visitor/home`, `/visitor/register`, `/visitor/login`, `/visitor/museum-recommend`, `/museum-map`, admin pages under `/admin/*`.

## 7) Recommendation System
- Q: How are recommendations generated?
  - A: `ml_recommendations.py` reads MongoDB `museums` into a DataFrame. Personalized suggestions use TF‑IDF of `Category`, `Type`, `City`, `State` vs user interests. Popular exhibits: sort by `Visitors` if exists, else shuffle. Nearby museums: haversine distance.
- Q: What if MongoDB is unavailable?
  - A: Many routes fall back to preloaded `museum_df` from `final_museums.csv` (see try/except blocks in `app.py`).

## 8) Chatbot (Gemini)
- Q: Which model and how configured?
  - A: Google Gemini via `google.generativeai`. Configured in `MuseumChatbot` with `genai.configure(api_key=...)` and `GenerativeModel('gemini-1.5-flash')`.
- Q: What data does the chatbot use?
  - A: Context derived summaries from `final_museums.csv`. It also provides museum-specific retrieval functions before LLM generation.

## 9) Authentication & Security
- Q: How are passwords stored?
  - A: Hashed using `generate_password_hash`; verification with `check_password_hash` (`db_utils.py`, `app.py`).
- Q: How are sessions managed?
  - A: Flask session cookie; `app.secret_key` set in `app.py` (should be replaced in production with a secure env var).
- Q: Any admin route protection?
  - A: Yes, most admin pages check `admin_id` in session before rendering.

## 10) Booking & QR Flow
- Q: What happens when a booking is made?
  - A: A ticket ID is generated (`uuid`), QR content prepared, QR image saved to `static/qrcodes/<id>.png`, booking saved to `bookingDB` CSV. Best-effort mirror to MongoDB `bookings` collection where applicable.
- Q: Which fields are stored?
  - A: TicketID, Museum, Date, Time, People, TourType, VisitorName, VisitorEmail, VisitorPhone, VisitorAge, SpecialRequests, EmergencyContact, MuseumType, Attended, Rating, Review (headers ensured on file creation).

## 11) Email/Contact
- Q: How does the contact form send email?
  - A: `/api/contact` uses Gmail SMTP via `smtplib.SMTP_SSL`; env vars `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CONTACT_TO_EMAIL` (optional) required.

## 12) Data Validation & Error Handling
- Q: How are CSV issues handled?
  - A: Use `on_bad_lines='skip'`, `dropna` for essential columns, numeric coercion for coordinates; try/except fallbacks to handle empty/failed loads.
- Q: What if coordinates are missing?
  - A: `/api/museum-locations` drops rows with missing/invalid Latitude/Longitude and coerces to float.

## 13) Performance Considerations
- Q: Any optimization for large datasets?
  - A: Minimal. Uses pandas filtering and MongoDB queries; pagination supported in `/api/exhibitions` via query params `page` and `per_page`.

## 14) Environment & Configuration
- Q: Required environment variables?
  - A: `GMAIL_USER`, `GMAIL_APP_PASSWORD` (email), `GENAI_API_KEY` (Gemini), optionally `MONGO_URI`, `CONTACT_TO_EMAIL`.
- Q: How to run locally?
  - A: `pip install -r requirements.txt`, set env vars, start MongoDB, then `python app.py` and open `http://localhost:5000`.

## 15) Frontend Structure
- Q: Where are pages and assets?
  - A: Templates in `templates/` like `index.html`, `VisitersHomePage.html`, `analytics.html`, etc. Assets in `static/` (CSS/JS/images). Booking page logic in `static/VisitersHomePage.js` and styles in `static/VisitersHomePage.css`.

## 16) Database Details
- Q: Which collections are used?
  - A: `museums`, `admins`, `passkeys`, and optionally `bookings` (mirror). See `db_utils.get_db()` usage in `app.py`.
- Q: How are IDs handled?
  - A: With `bson.objectid.ObjectId` for MongoDB documents.

## 17) Security & Privacy
- Q: How are secrets managed?
  - A: Should be via environment variables (README updated). In code, some hardcoded keys exist for demo; replace for production.
- Q: Any rate limiting or CSRF protection?
  - A: Not implemented in current code; could be added using Flask extensions.

## 18) Testing & Quality
- Q: Are there tests?
  - A: Some test scripts exist (e.g., `test_flask_integration.py`), though not wired to a CI here; primarily for local validation.

## 19) Edge Cases
- Q: What if MongoDB is down?
  - A: Many endpoints fall back to CSV DataFrame (`museum_df`) where possible; otherwise return empty datasets or errors with messages.
- Q: What if admin deletes all passkeys?
  - A: Default passkey `ansarimohammed` is allowed only when DB has zero passkeys (bootstrapping logic).

## 20) Possible Improvements
- Q: What would you improve next?
  - A: Replace CSV source-of-truth with DB for bookings, secure config via envs, add ORM/validation, implement role-based auth, add pagination and caching, sanitize chatbot prompts, and CI tests.

## 21) Deployment
- Q: How would you deploy?
  - A: Containerize with a WSGI server (gunicorn/uwsgi), configure env vars and MongoDB in managed service, serve static assets via CDN, and set proper secret management.

---

References to code:
- Routes and APIs: `app.py`
- ML logic: `ml_recommendations.py`
- Chatbot: `chatbot.py`
- DB utils: `db_utils.py`
- Templates: `templates/`
- Static assets: `static/`
- Datasets: `final_museums.csv`, `foreign.csv`, `bookingDB`
