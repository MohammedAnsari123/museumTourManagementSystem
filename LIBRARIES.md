# Project Libraries Overview

This document describes the libraries used by this project, why they are needed, and key APIs you may interact with.

## Flask (2.3.3)
- Purpose: A lightweight web framework to build the server-side application.
- Where used: `app.py` defines routes (e.g., `@app.route`), serves templates, JSON APIs, sessions, and redirects.
- Key features/APIs used:
  - `Flask`, `app.route`, `request`, `jsonify`, `render_template`, `session`, `redirect`, `url_for`, `flash`.
- Why needed: Powers all HTTP endpoints for visitor pages, admin panel, and REST APIs consumed by the frontend.

## pandas (2.1.1)
- Purpose: Data analysis/manipulation for CSV-backed datasets.
- Where used: `app.py` (loading `final_museums.csv`, `foreign.csv`, booking CSV), `chatbot.py` (museum data), helper analytics.
- Key features/APIs used:
  - `pd.read_csv()`, `DataFrame.dropna()`, `to_dict(orient='records')`, filtering, grouping, `value_counts`, `astype`, `to_numeric`.
- Why needed: Efficient parsing/cleaning of CSV data and simple analytics for admin views and chatbot context.

## numpy
- Purpose: Numerical utilities underlying pandas and scikit-learn.
- Where used: Implicitly by pandas/sklearn; numeric conversions and computations in analytics.
- Key features/APIs used: Primarily through pandas/sklearn; no direct imports in app code.
- Why needed: Dependency for pandas/sklearn; ensures robust numeric operations.

## scikit-learn (1.3.0)
- Purpose: Machine learning utilities.
- Where used: `app.py` (Label encoding of categorical columns), `ml_recommendations.py` (similarity-based retrieval), may support future ML additions.
- Key features/APIs used:
  - `sklearn.preprocessing.LabelEncoder` for encoding `City` and `Type`.
  - `sklearn.feature_extraction.text.TfidfVectorizer` to vectorize museum text into TF‑IDF features.
  - `sklearn.metrics.pairwise.cosine_similarity` to score museums against interest queries.
- Why needed: Feature engineering and text similarity for recommendations.

## qrcode (7.4.2)
- Purpose: Generate QR codes for bookings.
- Where used: `app.py` creates PNG QR codes in `static/qrcodes/` for each ticket.
- Key features/APIs used:
  - `qrcode.make(data)` returns an image that is saved via Pillow.
- Why needed: Provides scannable tickets for visitor bookings.

## Pillow (10.0.1)
- Purpose: Imaging library used under the hood by `qrcode` to create/save PNGs.
- Where used: Implicitly when saving QR code images; not directly imported in the app.
- Key features/APIs used: Image creation/saving via `qrcode` integration.
- Why needed: Backend image engine for QR generation.

## PyMongo
- Purpose: MongoDB client to persist and query data for museums, bookings, admins, and passkeys.
- Where used: `db_utils.py` (connection helper `get_db()`), `app.py` (admin auth, analytics, bookings APIs), `ml_recommendations.py` (reads `museums`), possibly others.
- Key features/APIs used:
  - `MongoClient`, collection operations: `find`, `find_one`, `insert_one`, `update_one`, `count_documents`, `aggregate`, `distinct`.
- Why needed: Primary database for dynamic data; CSVs act as fallbacks or sources for some endpoints.

## Werkzeug (security)
- Purpose: Password hashing and verification utilities.
- Where used: `app.py` (admin auth), `db_utils.py` (user auth).
- Key features/APIs used:
  - `werkzeug.security.generate_password_hash`, `werkzeug.security.check_password_hash`.
- Why needed: Securely store and validate user/admin passwords.

## bson (from PyMongo)
- Purpose: Work with MongoDB `ObjectId` values.
- Where used: `app.py` (admin session), `db_utils.py` (`get_user_by_id`).
- Key features/APIs used:
  - `bson.objectid.ObjectId` for querying documents by ID.
- Why needed: Translate string IDs to MongoDB `ObjectId` when reading/writing documents.

## google-generativeai
- Purpose: Access Google Gemini models for the chatbot.
- Where used: `chatbot.py` (configured via `genai.configure(api_key=...)`, using `GenerativeModel('gemini-1.5-flash')`), `list_models.py` (utility script).
- Key features/APIs used:
  - `genai.configure`, `genai.GenerativeModel`, `model.generate_content(prompt)`.
- Why needed: Powers AI responses in the museum chatbot, combining structured museum context with generated answers.

---

# Additional Standard Libraries
The project also uses Python standard libraries (no installation required) in several places:
- `os`, `csv`, `uuid`, `datetime`, `ssl`, `smtplib`, `email.message.EmailMessage`, `random`, `collections.Counter`, `re`, `typing`, `math` (radians, sin, cos, sqrt, atan2).
- Purpose: File I/O, CSV handling, ID generation, email sending (contact form), randomness, type hints, regex, etc.

---

# Notes and Best Practices
- API Keys: `google-generativeai` requires a valid API key. Do not hardcode keys in source for production. Use environment variables instead (e.g., `GENAI_API_KEY`).
- Email: Contact endpoint uses Gmail SMTP; set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in environment variables.
- Data files:
  - `final_museums.csv` and `foreign.csv` should be present for data endpoints and chatbot context.
  - `static/qrcodes/` will be generated/filled at runtime; cleaning old PNGs is safe.
- MongoDB: Ensure a running MongoDB instance and correct connection string in `db_utils.py`.

---

# Quick Mapping (Library → Code references)
- Flask → `app.py` routes/templates/sessions.
- pandas → `app.py`, `chatbot.py` data loading and processing.
- numpy → via pandas/sklearn.
- scikit-learn → `app.py` label encoding in data preload.
- qrcode/Pillow → `app.py` ticket QR generation to `static/qrcodes/`.
- PyMongo → `db_utils.py`, `app.py` (admin/bookings/museums), `ml_recommendations.py`.
- google-generativeai → `chatbot.py` chatbot responses.
