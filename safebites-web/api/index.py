import os
import requests
import math
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from functools import lru_cache
from supabase import create_client, Client
from datetime import datetime, timedelta, timezone
from groq import Groq
import json 

# 1. Load Keys
load_dotenv()
GOOGLE_KEY = os.getenv("GOOGLE_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

app = FastAPI()

# --- DATA MODELS ---
class SearchRequest(BaseModel):
    query: str
    location: Optional[str] = None 
    address: Optional[str] = None  
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None

class ReviewRequest(BaseModel):
    place_id: str # Google Place ID
    name: Optional[str] = "Unknown" 
    address: Optional[str] = "Unknown"
    # NEW FIELDS (Required for Favorites Fix)
    city: Optional[str] = None
    rating: Optional[float] = 0.0

# 3. Helper Functions

# NEW: City Extractor for clean database data
def extract_city(address: str) -> str:
    """Parses '123 Main St, Atlanta, GA 30308' -> 'Atlanta, GA'"""
    if not address: return None
    parts = address.split(',')
    if len(parts) >= 3:
        city = parts[-3].strip()
        state_zip = parts[-2].strip() 
        state = state_zip.split(' ')[0]
        return f"{city}, {state}"
    if len(parts) == 2: return address.strip()
    return parts[0].strip()

# The "Free" Distance Calculator
def calculate_distance(lat1, lon1, lat2, lon2):
    if not lat1 or not lon1 or not lat2 or not lon2: 
        return None
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    a = math.sin((lat2-lat1)/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2-lon1)/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    return c * 3956  # Radius of earth in miles

# Function to convert address to lat/lon using Google Geocoding API
@lru_cache(maxsize=100)
def geocode_address(address: str):
    """Converts a string address to lat/lon"""
    if not GOOGLE_KEY: return None, None
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": GOOGLE_KEY}
    resp = requests.get(url, params=params).json()
    if resp.get("results"):
        loc = resp["results"][0]["geometry"]["location"]
        return loc["lat"], loc["lng"]
    return None, None

def analyze_reviews_with_ai(reviews: List[dict]):
    """
    Sends reviews to Groq (llama-3.3-70b-versatile) to generate a safety score and summary.
    """
    if not reviews:
        return 0, "No reviews available to analyze."

    reviews_text = "\n".join([f"- {r['text']}" for r in reviews[:15]]) 
    
    system_prompt = (
        "You are an expert dietician specializing in Celiac Disease and gluten safety. "
        "Analyze the following restaurant reviews and determine if this place is safe for someone with Celiac Disease. "
        "Focus on keywords like 'cross-contamination', 'dedicated fryer', 'separate prep area', and 'got sick'. "
        "Return a JSON object with exactly two keys: "
        "'score' (an integer 1-10, where 10 is perfectly safe and 1 is dangerous) and "
        "'summary' (a concise 2-sentence explanation of the rating)."
    )

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here are the reviews:\n{reviews_text}"}
            ],
            temperature=0, 
            response_format={"type": "json_object"} 
        )
        
        result = json.loads(completion.choices[0].message.content)
        return result.get("score", 5), result.get("summary", "Analysis failed.")

    except Exception as e:
        print(f"Groq AI Error: {e}")
        return 0, "AI Analysis currently unavailable."

def calculate_wisebites_score(ai_score, rev_count, google_rating, dist_miles):
    # Safety Check: If AI Score is missing, the score is invalid (0)
    if not ai_score or ai_score == 0: return 0
    if not rev_count: rev_count = 0
    if not google_rating: google_rating = 0
    
    # 1. AI SAFETY (70% of total) - Heavily weighted!
    # A 10/10 AI score gives 70 points
    safety_points = ai_score * 7
    
    # 2. CONFIDENCE (20% of total)
    # We cap this at 20 reviews. 
    # (If you have >20 relevant reviews, we trust the data fully)
    confidence_points = min(rev_count, 20)
    
    # 3. QUALITY (10% of total)
    # Uses Google Star Rating (0-5) * 2 = Max 10 points
    quality_points = google_rating * 2
    
    # 4. DISTANCE (REMOVED)
    # We no longer penalize for distance. Safety is safety.
    
    # Calculate Total (Max 100)
    total = (safety_points + confidence_points + quality_points) / 10
    
    return round(total, 1)

@lru_cache(maxsize=100) 
def fetch_google_search(query: str, location: str, lat: float = None, lng: float = None):
    if lat and lng:
        text_query = f"{query} gluten-free"
    else:
        text_query = f"{query} gluten-free in {location}"

    url = "https://places.googleapis.com/v1/places:searchText"
    field_mask = "places.displayName,places.formattedAddress,places.rating,places.id,places.location,places.regularOpeningHours,places.businessStatus"
    headers = {"Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_KEY, "X-Goog-FieldMask": field_mask}
    
    payload = {
        "textQuery": text_query, 
        "minRating": 3.5, 
        "maxResultCount": 10
    }

    if lat and lng:
        payload["locationBias"] = {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 5000.0 
            }
        }

    return requests.post(url, json=payload, headers=headers).json()


def fetch_serpapi_reviews(place_id: str):
    if not SERPAPI_KEY:
        print("Error: Missing SerpApi Key")
        return []

    url = "https://serpapi.com/search"
    params = {
        "engine": "google_maps_reviews",
        "place_id": place_id, 
        "api_key": SERPAPI_KEY,
        "query": "gluten celiac", 
        "sort_by": "qualityScore",
        "hl": "en" 
    }

    try:
        print(f"Calling SerpApi for Place ID: {place_id}")
        response = requests.get(url, params=params)
        data = response.json()
        
        if "error" in data:
            print("SerpApi Error:", data["error"])
            return []
            
        return data.get("reviews", [])

    except Exception as e:
        print(f"SerpApi Exception: {str(e)}")
        return []
    

@app.post("/api/search")
def search_restaurants(search: SearchRequest):
    user_lat, user_lon = search.user_lat, search.user_lon
    search_location = search.location

    if not user_lat and not user_lon and search_location:
        lat, lng = geocode_address(search_location)
        if lat:
            user_lat, user_lon = lat, lng

    if search.address and (not user_lat or not user_lon):
        lat, lng = geocode_address(search.address)
        if lat:
            user_lat, user_lon = lat, lng
            search_location = search.address 
    
    if not search_location and not (user_lat and user_lon):
         raise HTTPException(status_code=400, detail="Must provide location or address")

    google_data = fetch_google_search(search.query, search_location, user_lat, user_lon)
    
    raw_results = []
    place_ids = []

    if "places" in google_data:
        for place in google_data["places"]:
            pid = place.get("id")
            if pid: place_ids.append(pid)

            lat = place.get("location", {}).get("latitude")
            lng = place.get("location", {}).get("longitude")
            dist = calculate_distance(user_lat, user_lon, lat, lng) if user_lat else None
            
            address_str = place.get("formattedAddress", "")
            city_extracted = None
            if address_str:
                parts = address_str.split(",")
                if len(parts) >= 2:
                    city_extracted = parts[-3].strip() if len(parts) > 3 else parts[1].strip()

            opening_hours = place.get("regularOpeningHours", {})

            raw_results.append({
                "name": place.get("displayName", {}).get("text", "Unknown"),
                "address": address_str,
                "city": city_extracted,
                "rating": place.get("rating", 0.0), 
                "place_id": pid,
                "location": {"lat": lat, "lng": lng},
                "distance_miles": round(dist, 2) if dist else None,
                "is_open_now": opening_hours.get("openNow", None),
                "hours_schedule": opening_hours.get("weekdayDescriptions", []),
                "ai_safety_score": None,
                "ai_summary": None,
                "relevant_count": 0,
                "is_cached": False,
                "wise_bites_score": 0 
            })

    if place_ids:
        try:
            response = supabase.table("restaurants").select("*").in_("place_id", place_ids).execute()
            cache_map = {row['place_id']: row for row in response.data}

            for r in raw_results:
                if r['place_id'] in cache_map:
                    cached = cache_map[r['place_id']]
                    last_updated_str = cached.get("last_updated")
                    is_fresh = False
                    
                    if last_updated_str:
                        last_updated = datetime.fromisoformat(last_updated_str.replace('Z', '+00:00'))
                        if datetime.now(timezone.utc) - last_updated < timedelta(days=30):
                            is_fresh = True
                    
                    if is_fresh:
                        r["ai_safety_score"] = float(cached.get("ai_safety_score") or 0)
                        r["ai_summary"] = cached.get("ai_summary")
                        r["relevant_count"] = int(cached.get("relevant_count") or 0)
                        r["is_cached"] = True
                        r["wise_bites_score"] = calculate_wisebites_score(
                            r["ai_safety_score"],
                            r["relevant_count"],
                            r["rating"],
                            r["distance_miles"]
                        )
        except Exception as e:
            print(f"Batch Error: {e}")

    def sort_key(x):
        sb_score = x["wise_bites_score"]
        dist = x["distance_miles"] or 9999
        if sb_score > 0:
            return (0, -sb_score) 
        else:
            return (1, dist)

    if user_lat:
        raw_results.sort(key=sort_key)
    else:
        raw_results.sort(key=lambda x: x["rating"], reverse=True)

    return {"results": raw_results}

@app.post("/api/reviews")
def get_reviews(req: ReviewRequest):
    """
    Check Cache -> Fetch SerpApi -> Run AI Analysis -> Save to DB
    """
    # 1. CHECK SUPABASE
    try:
        response = supabase.table("restaurants").select("*").eq("place_id", req.place_id).execute()
        data = response.data
        if data:
            record = data[0]
            last_updated = datetime.fromisoformat(record["last_updated"].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) - last_updated < timedelta(days=30): 
                print("Returning Cached Data")
                return {
                    "reviews": record["reviews"],
                    "relevant_count": record["relevant_count"],
                    "average_safety_rating": record["average_safety_rating"],
                    "ai_safety_score": record.get("ai_safety_score", 0), 
                    "ai_summary": record.get("ai_summary", "No summary available."), 
                    "source": "Cache"
                }
    except Exception as e:
        print(f"Supabase Read Error: {e}")

    # 2. FETCH FRESH DATA
    print("Fetching fresh data from SerpApi...")
    raw_reviews = fetch_serpapi_reviews(req.place_id)
    
    processed_reviews = []
    total_rating_sum = 0
    relevant_count = 0
    
    for r in raw_reviews:
        text_content = r.get("snippet", "")
        rating = r.get("rating", 0)
        if not text_content: continue 
        relevant_count += 1
        total_rating_sum += rating
        processed_reviews.append({
            "source": "Google (via SerpApi)",
            "text": text_content,
            "rating": rating,
            "author": r.get("user", {}).get("name", "Anonymous"),
            "date": r.get("date", ""),
            "relevant": True
        })

    avg_rating = 0
    if relevant_count > 0:
        avg_rating = round(total_rating_sum / relevant_count, 1)

    # 3. RUN AI ANALYSIS
    print("Running AI Analysis...")
    ai_score, ai_summary = analyze_reviews_with_ai(processed_reviews)

    # 4. SAVE TO SUPABASE (UPDATED LOGIC)
    try:
        upsert_data = {
            "place_id": req.place_id,
            # NEW: Backup Alias
            "google_place_id": req.place_id, 
            "name": req.name,
            "address": req.address,
            # NEW: Save City & Rating so Favorites page works
            "city": req.city or extract_city(req.address),
            "rating": req.rating,
            "reviews": processed_reviews,
            "relevant_count": relevant_count,
            "average_safety_rating": avg_rating,
            "ai_safety_score": ai_score, 
            "ai_summary": ai_summary,    
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("restaurants").upsert(upsert_data).execute()
        print("Saved new data to Supabase")
    except Exception as e:
        print(f"Supabase Write Error: {e}")

    return {
        "reviews": processed_reviews, 
        "relevant_count": relevant_count, 
        "average_safety_rating": avg_rating,
        "ai_safety_score": ai_score,
        "ai_summary": ai_summary,
        "source": "SerpApi + Groq"
    }