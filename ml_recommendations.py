import random
from math import radians, sin, cos, sqrt, atan2
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from db_utils import get_db

db = get_db()
museums = db.museums

def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = radians(float(lat2) - float(lat1))
    dlon = radians(float(lon2) - float(lon1))
    a = sin(dlat/2)**2 + cos(radians(float(lat1))) * cos(radians(float(lat2))) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

def _to_df():
    docs = list(museums.find({}, {"_id": 0}))
    if not docs:
        return pd.DataFrame(columns=["Name","City","State","Type","Category","Latitude","Longitude"])
    return pd.DataFrame(docs)

def personalized_suggestions(interests, top_n=8):
    """
    interests: list like ["Art","History","Science"]
    Scans Type/Category text using TF-IDF and returns best matches.
    """
    df = _to_df()
    if df.empty:
        return []

    text = (df.get("Category").fillna("")
            if "Category" in df else pd.Series([""]*len(df)))
    if "Type" in df:
        text = (text.astype(str) + " " + df["Type"].fillna("").astype(str))
    if "City" in df:
        text = (text.astype(str) + " " + df["City"].fillna("").astype(str))
    if "State" in df:
        text = (text.astype(str) + " " + df["State"].fillna("").astype(str))

    vectorizer = TfidfVectorizer(stop_words="english")
    X = vectorizer.fit_transform(text.astype(str).tolist())

    query = " ".join(interests) if interests else "museum art history science"
    qv = vectorizer.transform([query])

    sims = cosine_similarity(qv, X).ravel()
    df["score"] = sims
    top = df.sort_values("score", ascending=False).head(top_n)

    cols = [c for c in ["Name","City","State","Category","Type","Latitude","Longitude"] if c in df.columns]
    return top[cols].to_dict(orient="records")

def popular_exhibits(top_n=8):
    """
    If 'Visitors' column exists, sort by it; else return random top N.
    """
    df = _to_df()
    if df.empty:
        return []
    if "Visitors" in df.columns:
        df["Visitors"] = pd.to_numeric(df["Visitors"], errors="coerce").fillna(0)
        df = df.sort_values("Visitors", ascending=True if df["Visitors"].max()==0 else False)
    else:
        df = df.sample(frac=1, random_state=42)
    cols = [c for c in ["Name","City","State","Category","Type","Latitude","Longitude","Visitors"] if c in df.columns]
    return df.head(top_n)[cols].to_dict(orient="records")

def nearby_museums(lat, lon, radius_km=25.0, top_n=12):
    df = _to_df()
    if df.empty or "Latitude" not in df.columns or "Longitude" not in df.columns:
        return []
    out = []
    for _, r in df.iterrows():
        try:
            mlat = float(r["Latitude"])
            mlon = float(r["Longitude"])
        except Exception:
            continue
        d = _haversine_km(lat, lon, mlat, mlon)
        if d <= radius_km:
            item = {k: r.get(k) for k in ["Name","City","State","Category","Type","Latitude","Longitude"]}
            item["distance_km"] = round(d, 1)
            out.append(item)
    out.sort(key=lambda x: x["distance_km"])
    return out[:top_n]
