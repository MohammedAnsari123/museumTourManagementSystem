from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for, flash
import pandas as pd
import os
import csv
from collections import Counter
from datetime import datetime
import qrcode
import uuid
from sklearn.preprocessing import LabelEncoder
import random
from flask import request, jsonify, render_template
from ml_recommendations import personalized_suggestions, popular_exhibits, nearby_museums
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
import smtplib
import ssl
from email.message import EmailMessage

# Import chatbot
try:
    from chatbot import MuseumChatbot
    # Initialize chatbot with the provided API key
    chatbot = MuseumChatbot("AIzaSyDRATpNvG_tJgmInd6Iyn8xAtz1i06uQk0")
    CHATBOT_AVAILABLE = True
except Exception as e:
    print(f"Chatbot initialization failed: {e}")
    CHATBOT_AVAILABLE = False

# Import database utilities
from db_utils import create_user, verify_user, get_user_by_id, get_db


app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this in production

# ==================== File paths ====================
BOOKING_FILE = "bookings_DBS.csv"
BOOKING_DB_FILE = "bookingDB"
MUSEUM_FILE = "final_museums.csv"
FOREIGN_FILE = "foreign.csv"
QR_DIR = "static/qrcodes"
os.makedirs(QR_DIR, exist_ok=True)
ADMIN_MUSEUMS_FILE = "admin_museums.json"

# Create bookingDB file with headers if it doesn't exist
if not os.path.exists(BOOKING_DB_FILE):
    with open(BOOKING_DB_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'TicketID', 'Museum', 'Date', 'Time', 'People', 'TourType',
            'VisitorName', 'VisitorEmail', 'VisitorPhone', 'VisitorAge',
            'SpecialRequests', 'EmergencyContact', 'MuseumType', 'Attended', 'Rating', 'Review'
        ])

# ==================== DATA PRELOADING ====================
try:
    museum_df = pd.read_csv(MUSEUM_FILE, on_bad_lines='skip')
    museum_df.columns = museum_df.columns.str.strip()
    
    # Only drop rows with missing essential data (Name, City, State, Type)
    essential_columns = ['Name', 'City', 'State', 'Type']
    museum_df = museum_df.dropna(subset=essential_columns)
    
    if not museum_df.empty:
        museum_df['CityEncoded'] = LabelEncoder().fit_transform(museum_df['City'])
        museum_df['TypeEncoded'] = LabelEncoder().fit_transform(museum_df['Type'])
except Exception as e:
    print(f"Error loading museums: {e}")
    museum_df = pd.DataFrame()

# ==================== RECOMMENDATION LOGIC (MongoDB-backed) ====================

def recommend_museums(query, top_n=5):
    q = (query or '').strip()
    if not q:
        return []
    try:
        db = get_db()
        museums_col = db.museums
        # Case-insensitive partial match on Name/City/Type
        regex = {"$regex": q, "$options": "i"}
        cursor = museums_col.find(
            {"$or": [{"Name": regex}, {"City": regex}, {"Type": regex}]},
            {"_id": 0, "Name": 1, "City": 1, "Type": 1}
        )
        results = list(cursor)
        # Shuffle for variety and limit
        random.shuffle(results)
        return results[:top_n]
    except Exception as e:
        # Fallback to in-memory DataFrame if DB not available
        try:
            query_lower = q.lower()
            matches = museum_df[
                museum_df['Name'].str.lower().str.contains(query_lower) |
                museum_df['City'].str.lower().str.contains(query_lower) |
                museum_df['Type'].str.lower().str.contains(query_lower)
            ]
            if matches.empty:
                return []
            shuffled = matches.sample(frac=1).reset_index(drop=True)
            return shuffled[['Name', 'City', 'Type']].head(top_n).to_dict(orient='records')
        except Exception:
            return []

# ==================== ADMIN FILE FALLBACK HELPERS ====================
def _load_admin_museums_file():
    try:
        if not os.path.exists(ADMIN_MUSEUMS_FILE):
            return []
        import json
        with open(ADMIN_MUSEUMS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # ensure list
            if isinstance(data, list):
                return data
            return []
    except Exception:
        return []

def _save_admin_museums_file(items):
    import json
    with open(ADMIN_MUSEUMS_FILE, 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

# ==================== MAIN ROUTES ====================
@app.route('/')
def home():
    return render_template("index.html")

@app.route('/gallery')
def gallery():
    return render_template("gallery.html")

# ==================== VISITOR ROUTES ====================
@app.route('/visitor/home')
def visitor_home():
    # Check if user is logged in
    if 'user_id' not in session:
        return redirect(url_for('visitor_login'))
    user = get_user_by_id(session['user_id'])
    return render_template("VisitersHomePage.html", user=user)

@app.route('/visitor_pages/<page>')
def visitor_pages(page):
    if page == 'index':
        # Check if user is logged in
        if 'user_id' not in session:
            return redirect(url_for('visitor_login'))
        user = get_user_by_id(session['user_id'])
        return render_template("VisitersHomePage.html", user=user)
    return render_template("index.html")

# ==================== VISITOR AUTHENTICATION ROUTES ====================
@app.route('/visitor/login', methods=['GET', 'POST'])
def visitor_login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        # Verify user credentials
        result = verify_user(username, password)
        
        if result['success']:
            # Store user info in session
            session['user_id'] = result['user']['id']
            session['username'] = result['user']['username']
            flash('Login successful!', 'success')
            return redirect(url_for('visitor_home'))
        else:
            flash('Invalid username or password', 'error')
    
    return render_template("Visiterlogin.html")

@app.route('/visitor/register', methods=['GET', 'POST'])
def visitor_register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        # Create new user
        result = create_user(username, email, password)
        
        if result['success']:
            flash('Registration successful! Please login.', 'success')
            return redirect(url_for('visitor_login'))
        else:
            flash(result['message'], 'error')
    
    return render_template("Visiterregister.html")

@app.route('/visitor/logout')
def visitor_logout():
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('visitor_login'))

@app.route("/recommendations", methods=["POST"])
def recommendations():
    payload = request.get_json(silent=True) or {}
    interests = payload.get("interests", [])          # ["Art","History"]
    lat = payload.get("lat", None)                    # float or None
    lon = payload.get("lon", None)                    # float or None
    radius_km = float(payload.get("radius_km", 25))

    personalized = personalized_suggestions(interests, top_n=8)
    popular = popular_exhibits(top_n=8)
    nearby = nearby_museums(float(lat), float(lon), radius_km=radius_km, top_n=12) if lat is not None and lon is not None else []

    return jsonify({
        "personalized": personalized,
        "popular": popular,
        "nearby": nearby
    })


@app.route('/visitor/museum-recommend')
def visitor_recommend_page():
    return render_template('museum_recommend.html')

# ==================== CHATBOT ROUTES ====================
@app.route('/chatbot')
def chatbot_page():
    """Render the chatbot interface"""
    return render_template('chatbot.html')

@app.route('/api/chat', methods=['POST'])
def chatbot_api():
    """API endpoint for chatbot responses"""
    if not CHATBOT_AVAILABLE:
        return jsonify({"error": "Chatbot service is not available"}), 500
    
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({"error": "Message is required"}), 400
            
        # Get response from chatbot
        response = chatbot.get_chat_response(user_message)
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/chat/reset', methods=['POST'])
def reset_chat():
    """API endpoint to reset chat history"""
    if not CHATBOT_AVAILABLE:
        return jsonify({"error": "Chatbot service is not available"}), 500
    
    try:
        chatbot.reset_conversation()
        return jsonify({"message": "Chat history reset successfully"})
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500



@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    query = data.get('query', '')
    results = recommend_museums(query)
    return jsonify(results)



@app.route('/museum-map')
def museum_map_page():
    return render_template("museum_map.html")

# ==================== CONTACT FORM EMAIL ROUTE ====================
@app.route('/api/contact', methods=['POST'])
def api_contact():
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip()
        subject = (data.get('subject') or '').strip()
        message = (data.get('message') or '').strip()

        # Basic validation
        if not name or not email or not subject or not message:
            return jsonify({"success": False, "error": "All fields are required."}), 400

        # Prepare email
        gmail_user = os.environ.get('GMAIL_USER')
        gmail_app_password = os.environ.get('GMAIL_APP_PASSWORD')
        to_email = os.environ.get('CONTACT_TO_EMAIL', 'maachisaaerica@gmail.com')

        if not gmail_user or not gmail_app_password:
            return jsonify({
                "success": False,
                "error": "Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables."
            }), 500

        msg = EmailMessage()
        msg['From'] = gmail_user
        msg['To'] = to_email
        msg['Subject'] = f"[PixelPast Contact] {subject}"
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        body = (
            f"New contact form submission on {timestamp}\n\n"
            f"Name: {name}\n"
            f"Email: {email}\n"
            f"Subject: {subject}\n\n"
            f"Message:\n{message}\n"
        )
        msg.set_content(body)

        # Send via Gmail SMTP
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as server:
            server.login(gmail_user, gmail_app_password)
            server.send_message(msg)

        return jsonify({"success": True, "message": "Message sent successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/museum-locations')
def museum_locations():
    try:
        # Read CSV with proper error handling
        df = pd.read_csv('final_museums.csv', on_bad_lines='skip')
        
        # Remove rows with missing or invalid coordinates
        df = df.dropna(subset=['Latitude', 'Longitude'])
        
        # Filter out rows where coordinates are empty strings or invalid
        df = df[df['Latitude'].astype(str).str.strip() != '']
        df = df[df['Longitude'].astype(str).str.strip() != '']
        
        # Convert coordinates to float, handling any conversion errors
        df['Latitude'] = pd.to_numeric(df['Latitude'], errors='coerce')
        df['Longitude'] = pd.to_numeric(df['Longitude'], errors='coerce')
        
        # Remove any rows where conversion failed (NaN values)
        df = df.dropna(subset=['Latitude', 'Longitude'])
        
        museums = df.to_dict(orient='records')
        return jsonify(museums)
    except Exception as e:
        print(f"Error loading museum locations: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/cancel', methods=['POST'])
def cancel_booking():
    data = request.get_json()
    ticket_id = data.get('ticket_id', '')
    if not ticket_id:
        return jsonify({"error": "Ticket ID is required"}), 400

    # Update CSV first
    if not os.path.exists(BOOKING_DB_FILE):
        return jsonify({"error": "Booking file not found"}), 404
    try:
        df = pd.read_csv(BOOKING_DB_FILE)
        if ticket_id not in df['TicketID'].values:
            return jsonify({"error": "Booking not found"}), 404
        # Only allow cancellation for non-attended bookings in the future
        # But enforce simply by marking cancelled regardless if present
        df.loc[df['TicketID'] == ticket_id, 'Attended'] = 'Cancelled'
        df.to_csv(BOOKING_DB_FILE, index=False)

        # Best-effort: update MongoDB mirror
        try:
            db = get_db()
            bookings_col = db.bookings
            bookings_col.update_one({"TicketID": ticket_id}, {"$set": {"Attended": "Cancelled"}})
        except Exception as e:
            print(f"Warning: failed to update cancellation in MongoDB: {e}")

        return jsonify({"message": "Booking cancelled"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== ADMIN ROUTES ====================
@app.route('/admin')
def admin_home():
    # Check if admin is logged in
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("admin_dashboard.html")

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username', '')
        password = data.get('password', '')
        
        # Verify admin credentials
        db = get_db()
        admins_collection = db.admins
        
        admin = admins_collection.find_one({"username": username})
        if admin and check_password_hash(admin['password'], password):
            # Store admin info in session
            session['admin_id'] = str(admin['_id'])
            session['admin_username'] = admin['username']
            return jsonify({"success": True, "message": "Login successful"})
        else:
            return jsonify({"success": False, "message": "Invalid username or password"}), 400
    return render_template("admin_auth.html")

# Admin pass key validation
@app.route('/admin/validate_passkey', methods=['POST'])
def validate_passkey():
    data = request.get_json()
    passkey = data.get('passkey', '')
    
    try:
        # Check if pass key exists in database
        db = get_db()
        passkeys_collection = db.passkeys
        
        # Check if pass key exists
        if passkeys_collection.find_one({'passkey': passkey}):
            return jsonify({"success": True, "message": "Pass key validated successfully"})
        
        # If no pass keys exist in database, check against default
        if passkeys_collection.count_documents({}) == 0 and passkey == "ansarimohammed":
            return jsonify({"success": True, "message": "Pass key validated successfully"})
        
        return jsonify({"success": False, "message": "Invalid pass key"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": "An error occurred"}), 500

# Admin registration with pass key validation
@app.route('/admin/register', methods=['POST'])
def admin_register():
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')
    passkey = data.get('passkey', '')
    
    try:
        # Validate pass key first
        db = get_db()
        passkeys_collection = db.passkeys
        
        # Check if pass key exists
        valid_passkey = passkeys_collection.find_one({'passkey': passkey})
        
        # If no pass keys exist in database, check against default
        if not valid_passkey and passkeys_collection.count_documents({}) == 0 and passkey == "ansarimohammed":
            valid_passkey = True
        
        if not valid_passkey:
            return jsonify({"success": False, "message": "Invalid pass key"}), 400
        
        # Check if username already exists
        admins_collection = db.admins
        
        if admins_collection.find_one({"username": username}):
            return jsonify({"success": False, "message": "Username already exists"}), 400
        
        # Hash the password
        hashed_password = generate_password_hash(password)
        
        # Insert new admin
        admin_data = {
            "username": username,
            "password": hashed_password
        }
        
        result = admins_collection.insert_one(admin_data)
        if result.inserted_id:
            return jsonify({"success": True, "message": "Admin registered successfully"})
        else:
            return jsonify({"success": False, "message": "Failed to register admin"}), 500
    except Exception as e:
        return jsonify({"success": False, "message": "An error occurred"}), 500


@app.route('/admin/dashboard')
def admin_dashboard():
    # Check if admin is logged in
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("admin_dashboard.html")

@app.route('/admin/passkey')
def admin_passkey():
    # Check if admin is logged in
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("manage_passkeys.html")

@app.route('/admin/logout')
def admin_logout():
    # Clear admin session
    session.pop('admin_id', None)
    session.pop('admin_username', None)
    return redirect(url_for('admin_login'))

# API route to get all pass keys
@app.route('/api/admin/passkeys', methods=['GET'])
def get_passkeys():
    try:
        db = get_db()
        passkeys_collection = db.passkeys
        
        # Get all pass keys from database
        passkeys = list(passkeys_collection.find({}, {'_id': 0, 'passkey': 1}))
        
        # If no pass keys exist, return the default one
        if not passkeys:
            passkeys = [{'passkey': 'ansarimohammed'}]
        
        return jsonify({'passkeys': passkeys})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API route to create a new pass key
@app.route('/api/admin/passkeys', methods=['POST'])
def create_passkey():
    try:
        data = request.get_json()
        new_passkey = data.get('passkey', '')
        
        if not new_passkey:
            return jsonify({'error': 'Pass key is required'}), 400
        
        db = get_db()
        passkeys_collection = db.passkeys
        
        # Check if pass key already exists
        if passkeys_collection.find_one({'passkey': new_passkey}):
            return jsonify({'error': 'Pass key already exists'}), 400
        
        # Insert new pass key
        result = passkeys_collection.insert_one({'passkey': new_passkey})
        
        if result.inserted_id:
            return jsonify({'message': 'Pass key created successfully'})
        else:
            return jsonify({'error': 'Failed to create pass key'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API route to delete a pass key
@app.route('/api/admin/passkeys/<passkey>', methods=['DELETE'])
def delete_passkey(passkey):
    try:
        # Prevent deletion of the last pass key
        db = get_db()
        passkeys_collection = db.passkeys
        
        # Count total pass keys
        total_passkeys = passkeys_collection.count_documents({})
        
        # If this is the default pass key and it's the only one, don't delete it
        if passkey == 'ansarimohammed' and total_passkeys <= 1:
            return jsonify({'error': 'Cannot delete the last pass key'}), 400
        
        # Delete the pass key
        result = passkeys_collection.delete_one({'passkey': passkey})
        
        if result.deleted_count > 0:
            return jsonify({'message': 'Pass key deleted successfully'})
        else:
            return jsonify({'error': 'Pass key not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/exhibits')
def admin_exhibits():
    # Check if admin is logged in
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("manage_exhibits.html")

@app.route('/admin/tours')
def admin_tours():
    # Check if admin is logged in
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("manage_tours.html")

@app.route('/admin/analytics')
def admin_analytics_page():
    # Check if admin is logged in
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("analytics.html")

@app.route('/admin/feedback')
def admin_feedback():
    # Check if admin is logged in
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("feedback.html")

@app.route('/admin/ml')
def admin_ml():
    # Check if admin is logged in
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("ml_modules.html")

@app.route('/admin_pages/<page>')
def admin_pages(page):
    if page == 'admin_dashboard':
        return render_template("admin_dashboard.html")
    return render_template("index.html")

# ==================== API ROUTES ====================
@app.route('/api/exhibitions')
def exhibitions():
    """Visitor museum list for search/autocomplete - MongoDB-backed."""
    try:
        # Determine if pagination requested
        paginate = ('page' in request.args) or ('per_page' in request.args)
        # Parse pagination params (defaults only used if paginate=True)
        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 9))
        except ValueError:
            page, per_page = 1, 9
        page = max(1, page)
        per_page = max(1, min(per_page, 100))

        db = get_db()
        museums_col = db.museums
        projection = {"Name": 1, "City": 1, "State": 1, "Type": 1, "Established": 1}

        if paginate:
            total = museums_col.count_documents({})
            cursor = museums_col.find({}, projection).skip((page - 1) * per_page).limit(per_page)
            items = list(cursor)
            for it in items:
                it.pop('_id', None)
            total_pages = (total + per_page - 1) // per_page if per_page else 1
            return jsonify({
                "items": items,
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            })
        else:
            # Return full list (backward compatibility)
            cursor = museums_col.find({}, projection)
            items = list(cursor)
            for it in items:
                it.pop('_id', None)
            return jsonify(items)
    except Exception as e:
        # Fallback to CSV dataframe
        try:
            paginate = ('page' in request.args) or ('per_page' in request.args)
            if museum_df.empty:
                if paginate:
                    return jsonify({"items": [], "page": 1, "per_page": 9, "total": 0, "total_pages": 0, "has_next": False, "has_prev": False})
                else:
                    return jsonify([])
            required_columns = ['Name', 'City', 'State', 'Type', 'Established']
            df = museum_df[required_columns].dropna(subset=required_columns)
            if paginate:
                try:
                    page = int(request.args.get('page', 1))
                    per_page = int(request.args.get('per_page', 9))
                except ValueError:
                    page, per_page = 1, 9
                page = max(1, page)
                per_page = max(1, min(per_page, 100))
                total = len(df)
                start = (page - 1) * per_page
                end = start + per_page
                items = df.iloc[start:end].to_dict(orient='records')
                total_pages = (total + per_page - 1) // per_page if per_page else 1
                return jsonify({
                    "items": items,
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1
                })
            else:
                return jsonify(df.to_dict(orient='records'))
        except Exception as e2:
            return jsonify({"error": str(e2)}), 500

@app.route('/api/museum-filters')
def museum_filters():
    """Unique filters for City and Type - MongoDB-backed."""
    try:
        db = get_db()
        museums_col = db.museums
        cities = sorted([c for c in museums_col.distinct('City') if c])
        types = sorted([t for t in museums_col.distinct('Type') if t])
        return jsonify({"cities": cities, "types": types})
    except Exception as e:
        try:
            if museum_df.empty:
                return jsonify({"cities": [], "types": []})
            cities = sorted(museum_df['City'].dropna().unique().tolist())
            types = sorted(museum_df['Type'].dropna().unique().tolist())
            return jsonify({"cities": cities, "types": types})
        except Exception as e2:
            return jsonify({"error": str(e2)}), 500

# ==================== ADMIN ANALYTICS & FEEDBACK APIS ====================
@app.route('/api/admin/analytics')
def api_admin_analytics():
    # Admin guard
    if 'admin_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    # Booking stats from CSV (source of truth) with safe fallbacks
    booking_stats = {
        "total_bookings": 0,
        "attended_bookings": 0,
        "avg_rating": 0.0,
    }
    try:
        if os.path.exists(BOOKING_DB_FILE):
            bdf = pd.read_csv(BOOKING_DB_FILE)
            if not bdf.empty:
                booking_stats["total_bookings"] = int(len(bdf))
                if 'Attended' in bdf.columns:
                    booking_stats["attended_bookings"] = int((bdf['Attended'] == 'Yes').sum())
                # Average rating over numeric ratings only
                if 'Rating' in bdf.columns:
                    ratings = pd.to_numeric(bdf['Rating'], errors='coerce').dropna()
                    if not ratings.empty:
                        booking_stats["avg_rating"] = float(ratings.mean())
    except Exception as e:
        # Keep defaults on error
        pass

    # Museum stats from MongoDB or DataFrame
    museum_stats = {
        "total_museums": 0,
        "museums_by_type": {}
    }
    try:
        try:
            db = get_db()
            museums_col = db.museums
            museum_stats["total_museums"] = museums_col.count_documents({})
            # Build type counts from DB
            pipeline = [
                {"$group": {"_id": "$Type", "count": {"$sum": 1}}}
            ]
            type_counts = {doc.get('_id') or 'Unknown': doc.get('count', 0) for doc in museums_col.aggregate(pipeline)}
            museum_stats["museums_by_type"] = {k: int(v) for k, v in type_counts.items() if k}
        except Exception:
            # Fallback to in-memory DataFrame
            if not museum_df.empty:
                museum_stats["total_museums"] = int(len(museum_df))
                counts = museum_df['Type'].dropna().value_counts().to_dict()
                museum_stats["museums_by_type"] = {str(k): int(v) for k, v in counts.items()}
    except Exception:
        pass

    return jsonify({
        "booking_stats": booking_stats,
        "museum_stats": museum_stats
    })


@app.route('/api/foreign-visitors')
def api_foreign_visitors():
    # Admin guard
    if 'admin_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        if not os.path.exists(FOREIGN_FILE):
            return jsonify({})
        fdf = pd.read_csv(FOREIGN_FILE)
        # Expect columns: District, Month, Visitors, Year
        if {'Year', 'Visitors'}.issubset(set(fdf.columns)):
            grouped = fdf.groupby('Year')['Visitors'].sum().to_dict()
            # Convert numpy types to native
            out = {str(int(k)): int(v) for k, v in grouped.items()}
            return jsonify(out)
        return jsonify({})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/foreign-visitors-by-district')
def api_foreign_visitors_by_district():
    # Admin guard
    if 'admin_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        if not os.path.exists(FOREIGN_FILE):
            return jsonify([])
        fdf = pd.read_csv(FOREIGN_FILE)
        if {'District', 'Visitors'}.issubset(set(fdf.columns)):
            agg = (
                fdf.groupby('District')['Visitors']
                .sum()
                .sort_values(ascending=False)
                .head(10)
                .reset_index()
            )
            agg = agg.rename(columns={'Visitors': 'TotalVisitors'})
            # Ensure proper Python types
            result = [
                {"District": str(row['District']), "TotalVisitors": int(row['TotalVisitors'])}
                for _, row in agg.iterrows()
            ]
            return jsonify(result)
        return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/bookings')
def api_admin_bookings():
    # Admin guard
    if 'admin_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    # Prefer MongoDB, fallback to CSV
    try:
        db = get_db()
        bookings_col = db.bookings
        docs = list(bookings_col.find({}, {"_id": 0}))
        # Normalize None values
        for d in docs:
            for k, v in list(d.items()):
                if v is None:
                    d[k] = ""
        return jsonify(docs)
    except Exception:
        pass

    if not os.path.exists(BOOKING_DB_FILE):
        return jsonify([])
    try:
        df = pd.read_csv(BOOKING_DB_FILE).fillna("")
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/book', methods=['POST'])
def book_visit():
    data = request.get_json()
    
    # Extract all booking details
    date = data.get('date', '')
    time = data.get('time', '')
    people = data.get('people', '')
    museum_name = data.get('museum', '')
    tour_type = data.get('tourType', '')
    visitor_name = data.get('visitorName', '')
    visitor_email = data.get('visitorEmail', '')
    visitor_phone = data.get('visitorPhone', '')
    visitor_age = data.get('visitorAge', '')
    special_requests = data.get('specialRequests', '')
    emergency_contact = data.get('emergencyContact', '')
    museum_type = data.get('type', '')
    
    # Generate ticket ID and QR code
    ticket_id = str(uuid.uuid4())[:8]
    qr_data = f"""Ticket ID: {ticket_id}
Museum: {museum_name}
Date: {date}
Time: {time}
People: {people}
Tour Type: {tour_type}
Visitor: {visitor_name}
Contact: {visitor_email}"""
    
    qr_path = os.path.join(QR_DIR, f"{ticket_id}.png")
    qr = qrcode.make(qr_data)
    qr.save(qr_path)

    # Save to bookingDB file only
    with open(BOOKING_DB_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            ticket_id, museum_name, date, time, people, tour_type,
            visitor_name, visitor_email, visitor_phone, visitor_age,
            special_requests, emergency_contact, museum_type, 'No', '', ''
        ])

    # Also persist booking to MongoDB (database set in db_utils.py)
    try:
        db = get_db()
        bookings_col = db.bookings
        bookings_col.insert_one({
            "TicketID": ticket_id,
            "Museum": museum_name,
            "Date": date,
            "Time": time,
            "People": people,
            "TourType": tour_type,
            "VisitorName": visitor_name,
            "VisitorEmail": visitor_email,
            "VisitorPhone": visitor_phone,
            "VisitorAge": visitor_age,
            "SpecialRequests": special_requests,
            "EmergencyContact": emergency_contact,
            "MuseumType": museum_type,
            "Attended": "No",
            "Rating": "",
            "Review": ""
        })
    except Exception as e:
        # Non-fatal: keep CSV as source of truth if DB unavailable
        print(f"Warning: failed to insert booking into MongoDB: {e}")

    return jsonify({
        "message": "Booking confirmed successfully!",
        "ticket_id": ticket_id,
        "qr_url": f"/{qr_path}",
        "museum": museum_name,
        "date": date,
        "time": time
    })

@app.route('/api/attend', methods=['POST'])
def attend_tour():
    data = request.get_json()
    date = data.get('date', '')
    time = data.get('time', '')
    
    # Update bookingDB file only
    if os.path.exists(BOOKING_DB_FILE):
        df = pd.read_csv(BOOKING_DB_FILE)
        mask = (df['Date'] == date) & (df['Time'] == time)
        if mask.any():
            df.loc[mask, 'Attended'] = 'Yes'
            df.to_csv(BOOKING_DB_FILE, index=False)
            # Try updating MongoDB as well
            try:
                db = get_db()
                bookings_col = db.bookings
                bookings_col.update_many({"Date": date, "Time": time}, {"$set": {"Attended": "Yes"}})
            except Exception as e:
                print(f"Warning: failed to mark attended in MongoDB: {e}")
            return jsonify({"message": "Tour marked as attended!"})
    
    return jsonify({"message": "No matching booking found"})

@app.route('/api/history')
def get_history():
    # First try to read from MongoDB collection 'bookings'
    try:
        db = get_db()
        bookings_col = db.bookings
        # Fetch all documents and map to plain dict without _id
        docs = list(bookings_col.find({}, {"_id": 0}))
        if docs:
            # Ensure no None values that could become NaN client-side
            for d in docs:
                for k, v in list(d.items()):
                    if v is None:
                        d[k] = ""
            return jsonify(docs)
    except Exception as e:
        # If DB not accessible, fall back to CSV
        print(f"MongoDB not available for history, falling back to CSV: {e}")

    # Fallback: Use bookingDB file if it exists, otherwise use original booking file
    booking_file_to_use = BOOKING_DB_FILE if os.path.exists(BOOKING_DB_FILE) else BOOKING_FILE
    if not os.path.exists(booking_file_to_use):
        return jsonify([])
    try:
        df = pd.read_csv(booking_file_to_use)
        # Replace NaN with empty strings to avoid invalid JSON tokens like NaN
        df = df.fillna("")
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)})


@app.route('/api/personalized-recommendations')
def personalized_recommendations():
    try:
        # Read booking history
        booking_df = pd.read_csv(BOOKING_DB_FILE)
        
        # Check if the dataframe is empty or missing required columns
        if booking_df.empty or 'MuseumType' not in booking_df.columns:
            # Return some default recommendations if no booking data exists
            default_recommendations = museum_df.head(10)
            return jsonify(default_recommendations[['Name', 'City', 'Type', 'State']].to_dict(orient='records'))
        
        # Get museum types from booking history
        if booking_df['MuseumType'].isnull().all():
            # Return some default recommendations if no museum types exist
            default_recommendations = museum_df.head(10)
            return jsonify(default_recommendations[['Name', 'City', 'Type', 'State']].to_dict(orient='records'))
        
        # Get top 3 most booked museum types
        top_types = booking_df['MuseumType'].dropna().value_counts().head(3).index.tolist()
        
        # Get museums of those types
        recommendations = museum_df[museum_df['Type'].isin(top_types)].dropna()
        
        # If we don't have enough recommendations, add some popular museums
        if len(recommendations) < 10:
            # Get popular museums based on booking frequency
            if 'Museum' in booking_df.columns:
                popular_museums = booking_df['Museum'].value_counts().head(5).index.tolist()
                popular_museum_data = museum_df[museum_df['Name'].isin(popular_museums)]
                recommendations = pd.concat([recommendations, popular_museum_data]).drop_duplicates()
        
        # Return top 10 recommendations
        recommendations = recommendations.head(10)
        
        return jsonify(recommendations[['Name', 'City', 'Type', 'State']].to_dict(orient='records'))
    except Exception as e:
        # Return some default recommendations if there's an error
        try:
            default_recommendations = museum_df.head(10)
            return jsonify(default_recommendations[['Name', 'City', 'Type', 'State']].to_dict(orient='records'))
        except:
            return jsonify([])


@app.route('/api/review', methods=['POST'])
def submit_review():
  data = request.get_json()
  ticket_id = data.get('ticket_id', '')
  rating = data.get('rating', '')
  review = data.get('review', '')
  
  if not ticket_id or not rating:
    return jsonify({"error": "Ticket ID and rating are required"}), 400
  
  # Update CSV (source of truth) and MongoDB if available
  if not os.path.exists(BOOKING_DB_FILE):
    return jsonify({"error": "Booking file not found"}), 404
  try:
    # Read the CSV file
    df = pd.read_csv(BOOKING_DB_FILE)
    # Check if ticket_id exists
    if ticket_id not in df['TicketID'].values:
      return jsonify({"error": "Booking not found"}), 404
    # Update CSV
    df.loc[df['TicketID'] == ticket_id, 'Rating'] = rating
    df.loc[df['TicketID'] == ticket_id, 'Review'] = review
    df.to_csv(BOOKING_DB_FILE, index=False)
    # Best-effort: update Mongo too
    try:
      db = get_db()
      bookings_col = db.bookings
      bookings_col.update_one({"TicketID": ticket_id}, {"$set": {"Rating": rating, "Review": review}})
      # Also store a record in dedicated ratings collection for admin reporting
      try:
        ratings_col = db.ratings
        # Try to enrich with booking info
        bdoc = bookings_col.find_one({"TicketID": ticket_id})
        if not bdoc:
          # fallback to CSV row
          row = df[df['TicketID'] == ticket_id].iloc[0].to_dict()
          bdoc = {
            "TicketID": row.get('TicketID', ticket_id),
            "Museum": row.get('Museum', ''),
            "Date": row.get('Date', ''),
            "Time": row.get('Time', ''),
            "VisitorName": row.get('VisitorName', ''),
            "VisitorEmail": row.get('VisitorEmail', ''),
            "VisitorPhone": row.get('VisitorPhone', ''),
            "MuseumType": row.get('MuseumType', '')
          }
        doc = {
          "TicketID": ticket_id,
          "Museum": bdoc.get('Museum', ''),
          "MuseumType": bdoc.get('MuseumType', ''),
          "Date": bdoc.get('Date', ''),
          "Time": bdoc.get('Time', ''),
          "VisitorName": bdoc.get('VisitorName', ''),
          "VisitorEmail": bdoc.get('VisitorEmail', ''),
          "VisitorPhone": bdoc.get('VisitorPhone', ''),
          "Rating": int(rating) if str(rating).isdigit() else rating,
          "Review": review,
          "created_at": datetime.utcnow()
        }
        ratings_col.insert_one(doc)
      except Exception as e:
        print(f"Warning: failed to insert into ratings collection: {e}")
    except Exception as e:
      print(f"Warning: failed to update review in MongoDB: {e}")
    return jsonify({"message": "Review submitted successfully"})
  except Exception as e:
    return jsonify({"error": str(e)}), 500

@app.route('/api/admin/ratings', methods=['GET'])
def admin_ratings():
  # Require admin session
  if 'admin_id' not in session:
    return jsonify({"error": "Unauthorized"}), 401
  try:
    db = get_db()
    ratings_col = db.ratings
    # pagination detection
    paginate = ('page' in request.args) or ('per_page' in request.args)
    try:
      page = int(request.args.get('page', 1))
      per_page = int(request.args.get('per_page', 10))
    except ValueError:
      page, per_page = 1, 10
    page = max(1, page)
    per_page = max(1, min(per_page, 100))

    projection = {"_id": 0}
    if paginate:
      total = ratings_col.count_documents({})
      cursor = ratings_col.find({}, projection).sort('created_at', -1).skip((page - 1) * per_page).limit(per_page)
      docs = list(cursor)
      total_pages = (total + per_page - 1) // per_page if per_page else 1
      return jsonify({
        "items": docs,
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
      })
    else:
      docs = list(ratings_col.find({}, projection).sort('created_at', -1))
      return jsonify(docs)
  except Exception as e:
    return jsonify({"error": str(e)}), 500

@app.route('/admin/ratings')
def admin_ratings_page():
    # Check if admin is logged in
    if 'admin_id' not in session:
        return redirect(url_for('admin_login'))
    return render_template("admin_ratings.html")

@app.route('/api/popular')
def get_popular():
    # Use bookingDB file if it exists, otherwise use original booking file
    booking_file_to_use = BOOKING_DB_FILE if os.path.exists(BOOKING_DB_FILE) else BOOKING_FILE
    
    if not os.path.exists(booking_file_to_use):
        return jsonify([])
    try:
        df = pd.read_csv(booking_file_to_use)
        if 'Rating' not in df.columns:
            return jsonify([])
        rating_counts = df['Rating'].value_counts().reset_index()
        rating_counts.columns = ['Rating', 'Count']
        return jsonify(rating_counts.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/personalized')
def personalized():
    # Use bookingDB file if it exists, otherwise use original booking file
    booking_file_to_use = BOOKING_DB_FILE if os.path.exists(BOOKING_DB_FILE) else BOOKING_FILE
    
    if not os.path.exists(booking_file_to_use):
        return jsonify([])
    try:
        df = pd.read_csv(booking_file_to_use)
        if 'MuseumType' not in df.columns or df['MuseumType'].isnull().all():
            return jsonify([])
        top_types = df['MuseumType'].dropna().value_counts().head(2).index.tolist()
        suggestions = museum_df[museum_df['Type'].isin(top_types)].dropna().head(5)
        return jsonify(suggestions[['Name', 'City', 'Type']].to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/foreign-visitors')
def foreign_visitors():
    try:
        df = pd.read_csv(FOREIGN_FILE)
        # Handle missing values and convert to numeric
        df['Visitors'] = pd.to_numeric(df['Visitors'], errors='coerce')
        df = df.dropna(subset=['Visitors'])
        
        # Group by year and sum visitors
        summary = df.groupby("Year")["Visitors"].sum().reset_index()
        result = dict(zip(summary["Year"], summary["Visitors"]))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/foreign-visitors-by-district')
def foreign_visitors_by_district():
    try:
        df = pd.read_csv(FOREIGN_FILE)
        # Handle missing values and convert to numeric
        df['Visitors'] = pd.to_numeric(df['Visitors'], errors='coerce')
        df = df.dropna(subset=['Visitors'])
        
        # Group by district and sum visitors, get top 10
        district_summary = df.groupby("District")["Visitors"].sum().reset_index()
        district_summary = district_summary.sort_values("Visitors", ascending=False).head(10)
        
        # Convert to list of dictionaries
        result = district_summary.to_dict(orient='records')
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/foreign-visitors-monthly')
def foreign_visitors_monthly():
    try:
        df = pd.read_csv(FOREIGN_FILE)
        # Handle missing values and convert to numeric
        df['Visitors'] = pd.to_numeric(df['Visitors'], errors='coerce')
        df = df.dropna(subset=['Visitors'])
        
        # Group by month and sum visitors across all years
        monthly_summary = df.groupby("Month")["Visitors"].sum().reset_index()
        
        # Define month order for proper sorting
        month_order = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
        
        # Sort by month order
        monthly_summary['Month'] = pd.Categorical(monthly_summary['Month'], categories=month_order, ordered=True)
        monthly_summary = monthly_summary.sort_values('Month')
        
        # Convert to list of dictionaries
        result = monthly_summary.to_dict(orient='records')
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)})

# ==================== ADMIN API ROUTES ====================
@app.route('/api/admin/bookings')
def admin_bookings():
    # Use bookingDB file if it exists, otherwise use original booking file
    booking_file_to_use = BOOKING_DB_FILE if os.path.exists(BOOKING_DB_FILE) else BOOKING_FILE
    
    if not os.path.exists(booking_file_to_use):
        return jsonify([])
    try:
        df = pd.read_csv(booking_file_to_use)
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/admin/analytics')
def admin_analytics():
    try:
        booking_stats = {}
        # Use bookingDB file if it exists, otherwise use original booking file
        booking_file_to_use = BOOKING_DB_FILE if os.path.exists(BOOKING_DB_FILE) else BOOKING_FILE
        
        if os.path.exists(booking_file_to_use):
            df = pd.read_csv(booking_file_to_use)
            booking_stats = {
                'total_bookings': len(df),
                'attended_bookings': len(df[df['Attended'] == 'Yes']) if 'Attended' in df.columns else 0,
                'avg_rating': df['Rating'].mean() if 'Rating' in df.columns else 0
            }

        museum_stats = {}
        if not museum_df.empty:
            museum_stats = {
                'total_museums': len(museum_df),
                'museums_by_type': museum_df['Type'].value_counts().to_dict()
            }

        return jsonify({
            'booking_stats': booking_stats,
            'museum_stats': museum_stats
        })
    except Exception as e:
        return jsonify({"error": str(e)})

# ==================== MUSEUM CRUD (Admin) ====================
@app.route('/api/admin/museums', methods=['GET'])
def list_museums():
    # Require admin session
    if 'admin_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        db = get_db()
        museums_col = db.museums
        # pagination detection
        paginate = ('page' in request.args) or ('per_page' in request.args)
        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 10))
        except ValueError:
            page, per_page = 1, 10
        page = max(1, page)
        per_page = max(1, min(per_page, 100))

        projection = {"Name": 1, "City": 1, "State": 1, "Type": 1, "Established": 1}
        if paginate:
            total = museums_col.count_documents({})
            cursor = museums_col.find({}, projection).sort('_id', -1).skip((page - 1) * per_page).limit(per_page)
            docs = list(cursor)
            for d in docs:
                d['id'] = str(d.pop('_id'))
            total_pages = (total + per_page - 1) // per_page if per_page else 1
            return jsonify({
                "items": docs,
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            })
        else:
            docs = list(museums_col.find({}, projection).sort('_id', -1))
            for d in docs:
                d['id'] = str(d.pop('_id'))
            return jsonify(docs)
    except Exception as e:
        # File fallback with pagination support
        try:
            paginate = ('page' in request.args) or ('per_page' in request.args)
            try:
                page = int(request.args.get('page', 1))
                per_page = int(request.args.get('per_page', 10))
            except ValueError:
                page, per_page = 1, 10
            page = max(1, page)
            per_page = max(1, min(per_page, 100))

            items = _load_admin_museums_file()
            # newest-first by a pseudo timestamp embedded in id is not available; keep as file order newest last, so reverse
            items = list(reversed(items))
            if paginate:
                total = len(items)
                start = (page - 1) * per_page
                end = start + per_page
                page_items = items[start:end]
                total_pages = (total + per_page - 1) // per_page if per_page else 1
                return jsonify({
                    "items": page_items,
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1
                })
            else:
                return jsonify(items)
        except Exception as e2:
            return jsonify({"error": str(e2)}), 500

@app.route('/api/admin/museums', methods=['POST'])
def create_museum():
    if 'admin_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    doc = {
        "Name": data.get("Name", "").strip(),
        "City": data.get("City", "").strip(),
        "State": data.get("State", "").strip(),
        "Type": data.get("Type", "").strip(),
        "Established": data.get("Established", "").strip(),
    }
    if not doc["Name"]:
        return jsonify({"error": "Name is required"}), 400
    try:
        db = get_db()
        museums_col = db.museums
        res = museums_col.insert_one(doc)
        # PyMongo may mutate `doc` by adding `_id` ObjectId; remove it for JSON safety
        doc.pop('_id', None)
        response_doc = {**doc, 'id': str(res.inserted_id)}
        return jsonify(response_doc), 201
    except Exception as e:
        # File fallback create
        try:
            from uuid import uuid4
            items = _load_admin_museums_file()
            new_doc = {**doc, 'id': str(uuid4())}
            items.append(new_doc)
            _save_admin_museums_file(items)
            return jsonify(new_doc), 201
        except Exception as e2:
            return jsonify({"error": str(e2)}), 500

@app.route('/api/admin/museums/<mid>', methods=['PUT'])
def update_museum(mid):
    if 'admin_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    updates = {k: v.strip() for k, v in data.items() if k in {"Name", "City", "State", "Type", "Established"} and isinstance(v, str)}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400
    try:
        db = get_db()
        museums_col = db.museums
        result = museums_col.update_one({"_id": ObjectId(mid)}, {"$set": updates})
        if result.matched_count == 0:
            return jsonify({"error": "Not found"}), 404
        doc = museums_col.find_one({"_id": ObjectId(mid)})
        doc['id'] = str(doc.pop('_id'))
        return jsonify(doc)
    except Exception as e:
        # File fallback update
        try:
            items = _load_admin_museums_file()
            idx = next((i for i, x in enumerate(items) if x.get('id') == mid), None)
            if idx is None:
                return jsonify({"error": "Not found"}), 404
            items[idx].update(updates)
            _save_admin_museums_file(items)
            return jsonify(items[idx])
        except Exception as e2:
            return jsonify({"error": str(e2)}), 500

@app.route('/api/admin/museums/<mid>', methods=['DELETE'])
def delete_museum(mid):
    if 'admin_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        db = get_db()
        museums_col = db.museums
        result = museums_col.delete_one({"_id": ObjectId(mid)})
        if result.deleted_count == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Deleted"})
    except Exception as e:
        # File fallback delete
        try:
            items = _load_admin_museums_file()
            new_items = [x for x in items if x.get('id') != mid]
            if len(new_items) == len(items):
                return jsonify({"error": "Not found"}), 404
            _save_admin_museums_file(new_items)
            return jsonify({"message": "Deleted"})
        except Exception as e2:
            return jsonify({"error": str(e2)}), 500

# ==================== RUN ====================
if __name__ == '__main__':
    app.run(debug=True)
