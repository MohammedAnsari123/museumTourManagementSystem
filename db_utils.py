from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "museum_db"

_client = None

def get_db():
    global _client
    if _client is None:
        try:
            _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            _client.admin.command('ping')
        except Exception as e:
            print(f"Failed to connect to MongoDB: {e}")
            raise Exception("Could not connect to MongoDB. Please ensure MongoDB is running.")
    return _client[DB_NAME]

def create_user(username, email, password):
    """Create a new user with hashed password"""
    db = get_db()
    users_collection = db.users

    if users_collection.find_one({"username": username}):
        return {"success": False, "message": "Username already exists"}

    if users_collection.find_one({"email": email}):
        return {"success": False, "message": "Email already registered"}

    hashed_password = generate_password_hash(password)

    user_data = {
        "username": username,
        "email": email,
        "password": hashed_password
    }
    
    result = users_collection.insert_one(user_data)
    if result.inserted_id:
        return {"success": True, "message": "User created successfully", "user_id": str(result.inserted_id)}
    else:
        return {"success": False, "message": "Failed to create user"}

def verify_user(username, password):
    """Verify user credentials"""
    db = get_db()
    users_collection = db.users
    
    user = users_collection.find_one({"username": username})
    if user and check_password_hash(user['password'], password):
        return {"success": True, "user": {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user['email']
        }}
    else:
        return {"success": False, "message": "Invalid username or password"}

def get_user_by_id(user_id):
    """Get user by ID"""
    db = get_db()
    users_collection = db.users
    
    from bson.objectid import ObjectId
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if user:
        return {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user['email']
        }
    return None
