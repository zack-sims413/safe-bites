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

# 1. Load Keys
load_dotenv()
GOOGLE_KEY = os.getenv("GOOGLE_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

# 3. Helper Functions (Cached to save money)

# NEW: The "Free" Distance Calculator
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


# This logic lives outside the endpoint so we can "wrap" it in the cache
@lru_cache(maxsize=100) # Remembers the last 100 distinct searches in memory
def fetch_google_search(query: str, location: str):
    if not GOOGLE_KEY:
        raise Exception("Google API Key not configured")

    # Force "gluten free" into the query for better relevance
    text_query = f"{query} gluten-free in {location}"
    
    url = "https://places.googleapis.com/v1/places:searchText"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        # FieldMask: Only ask for what we need to save costs
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.id,places.location,places.regularOpeningHours"
    }
    
    payload = {
        "textQuery": text_query,
        "minRating": 3.5,  # Filter out bad places automatically
        "maxResultCount": 10 # Limit to 10 to save bandwidth/cost
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.json()


def fetch_serpapi_reviews(place_id: str):
    """
    Uses SerpApi to scrape Google Maps Reviews.
    We pass 'q=gluten' to filter reviews server-side!
    """
    if not SERPAPI_KEY:
        print("Error: Missing SerpApi Key")
        return []

    url = "https://serpapi.com/search"
    
    # We search for "gluten celiac" specifically within this restaurant's reviews
    params = {
        "engine": "google_maps_reviews",
        "place_id": place_id, # SerpApi accepts the Google Place ID directly!
        "api_key": SERPAPI_KEY,
        "query": "gluten celiac", # The Magic Filter: Only get relevant reviews
        "sort_by": "qualityScore",
        "hl": "en" # Force English
    }

    try:
        print(f"Calling SerpApi for Place ID: {place_id}")
        response = requests.get(url, params=params)
        data = response.json()
        
        if "error" in data:
            print("SerpApi Error:", data["error"])
            return []
            
        # SerpApi returns reviews in a 'reviews' list
        return data.get("reviews", [])

    except Exception as e:
        print(f"SerpApi Exception: {str(e)}")
        return []
    

@app.post("/api/search")
def search_restaurants(search: SearchRequest):
    # 1. Resolve Location
    user_lat, user_lon = search.user_lat, search.user_lon
    search_location = search.location

    if search.address and (not user_lat or not user_lon):
        lat, lng = geocode_address(search.address)
        if lat:
            user_lat, user_lon = lat, lng
            search_location = search.address 
    
    if not search_location and not (user_lat and user_lon):
         raise HTTPException(status_code=400, detail="Must provide location or address")

    # 2. Fetch from Google (Sync is fine since we removed the slow Yelp merge)
    google_data = fetch_google_search(search.query, search_location)
    
    results = []
    if "places" in google_data:
        for place in google_data["places"]:
            lat = place.get("location", {}).get("latitude")
            lng = place.get("location", {}).get("longitude")
            
            # Calculate Distance
            dist = calculate_distance(user_lat, user_lon, lat, lng) if user_lat else None
            
            # Extract City (Simple heuristic)
            address_str = place.get("formattedAddress", "")
            city_extracted = None
            if address_str:
                parts = address_str.split(",")
                if len(parts) >= 2:
                    city_extracted = parts[-3].strip() if len(parts) > 3 else parts[1].strip()

            # UPDATED: Extract Opening Hours
            opening_hours = place.get("regularOpeningHours", {})
            weekday_text = opening_hours.get("weekdayDescriptions", [])

            results.append({
                "name": place.get("displayName", {}).get("text", "Unknown"),
                "address": address_str,
                "city": city_extracted,
                "rating": place.get("rating", 0.0), # Just one rating now
                "place_id": place.get("id"),
                "location": {"lat": lat, "lng": lng},
                "distance_miles": round(dist, 2) if dist else None,
                "hours_schedule": weekday_text # List of strings ["Mon: 9am-5pm", ...]
            })

    # 3. Sort by Distance (if available) or Rating
    if user_lat:
        results.sort(key=lambda x: x["distance_miles"] or 9999)
    else:
        results.sort(key=lambda x: x["rating"], reverse=True)

    return {"results": results}

@app.post("/api/reviews")
def get_reviews(req: ReviewRequest):
    """
    Check Supabase Cache -> If Stale/Missing -> Fetch SerpApi -> Save to Supabase
    """
    
    # 1. CHECK SUPABASE
    try:
        # Fetch the record for this Place ID
        response = supabase.table("restaurants").select("*").eq("place_id", req.place_id).execute()
        data = response.data
        
        # Check if we have data and if it's fresh (e.g., < 30 days old)
        # For a POC, let's say 7 days cache
        if data:
            record = data[0]
            last_updated = datetime.fromisoformat(record["last_updated"].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) - last_updated < timedelta(days=7):
                print("Returning Cached Data from Supabase")
                return {
                    "reviews": record["reviews"],
                    "relevant_count": record["relevant_count"],
                    "average_safety_rating": record["average_safety_rating"],
                    "source": "Cache"
                }
    except Exception as e:
        print(f"Supabase Read Error: {e}")

    # 2. IF CACHE MISS: FETCH FRESH DATA
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

    avg_safety_rating = 0
    if relevant_count > 0:
        avg_safety_rating = round(total_rating_sum / relevant_count, 1)

    # 3. SAVE TO SUPABASE
    try:
        upsert_data = {
            "place_id": req.place_id,
            "name": req.name,
            "address": req.address,
            "reviews": processed_reviews,
            "relevant_count": relevant_count,
            "average_safety_rating": avg_safety_rating,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("restaurants").upsert(upsert_data).execute()
        print("Saved new data to Supabase")
    except Exception as e:
        print(f"Supabase Write Error: {e}")

    return {
        "reviews": processed_reviews, 
        "relevant_count": relevant_count, 
        "average_safety_rating": avg_safety_rating, 
        "source": "SerpApi"
    }