import os
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from functools import lru_cache # Built-in tool for caching
import math 
from thefuzz import fuzz # <--- NEW IMPORT
import asyncio # <--- For running things in parallel
from urllib.parse import quote

# 1. Load the secret keys
load_dotenv()
GOOGLE_KEY = os.getenv("GOOGLE_API_KEY")
YELP_KEY = os.getenv("YELP_API_KEY")

app = FastAPI()

# 2. Define the data models
class SearchRequest(BaseModel):
    query: str
    location: Optional[str] = None # e.g. "Atlanta, GA"
    address: Optional[str] = None  # e.g. "123 Main St" (User input)
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None

class ReviewRequest(BaseModel):
    google_place_id: Optional[str] = None
    yelp_id: Optional[str] = None
    name: str 
    address: str 
    city: Optional[str] = None # UPDATED: No default value

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
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.id,places.location,places.shortFormattedAddress"
    }
    
    payload = {
        "textQuery": text_query,
        "minRating": 3.5,  # Filter out bad places automatically
        "maxResultCount": 10 # Limit to 10 to save bandwidth/cost
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.json()


# Makes calls to Yelp API to pull in restaurants from Yelp
@lru_cache(maxsize=100)
def fetch_yelp_search(query: str, location: str, lat=None, lng=None):
    if not YELP_KEY: return {"businesses": []}
    url = "https://api.yelp.com/v3/businesses/search"
    headers = {"Authorization": f"Bearer {YELP_KEY}"}
    params = {
        "term": f"{query} gluten-free",
        "limit": 10,
        "sort_by": "best_match"
    }
    if lat and lng:
        params["latitude"] = lat
        params["longitude"] = lng
    else:
        params["location"] = location
    return requests.get(url, headers=headers, params=params).json()
    

# Fetch detailed reviews for a specific restaurant from Google Places
@lru_cache(maxsize=50) # Remembers reviews for the last 50 restaurants looked up
def fetch_google_reviews_data(name: str, address: str, city: Optional[str] = None):
    """
    Search specifically for the restaurant + address + keywords.
    We prefer address for accuracy, but fall back to city if address is empty.
    """
    # STRATEGY: Build a precise but concise query
    query_parts = [name]
    
    # If we have an address, use it (it's the most accurate)
    if city:
        query_parts.append(city)
    # Only fall back to full address if we have absolutely no city
    elif address:
         # Try to clean address? No, just use it as last resort
        query_parts.append(address)
    
    # Always add the magic keywords
    query_parts.append("gluten-free celiac")
    
    text_query = " ".join(query_parts)
    
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": "places.reviews,places.id"
    }
    payload = {"textQuery": text_query, "maxResultCount": 1}
    
    try:
        resp = requests.post(url, json=payload, headers=headers).json()
        if "places" in resp and resp["places"]:
            return resp["places"][0] 
        return {}
    except Exception as e:
        print(f"Google Review Error: {e}")
        return {}

# Fetch detailed reviews for a specific restaurant from Yelp
def fetch_yelp_reviews_data(yelp_id: str):
    if not yelp_id or not YELP_KEY: 
        print("Skipping Yelp: No ID or Key")
        return {}
    
    clean_id = quote(yelp_id.strip())

    url = f"https://api.yelp.com/v3/businesses/{clean_id}/reviews"
    headers = {"Authorization": f"Bearer {YELP_KEY}"}

    try:
        # Debug: Print the exact URL to ensure it looks right
        print(f"Calling Yelp URL: {url}")
        
        resp = requests.get(url, headers=headers)
        
        if resp.status_code != 200:
            print(f"Yelp Failed ({resp.status_code}): {resp.text}")
            return {}
            
        return resp.json()
    except Exception as e:
        print(f"Yelp Review Error: {e}")
        return {}

# 4. API Endpoints

@app.get("/api/health")
def health_check():
    return {"status": "SafeBites API is running", "caching": "active"}

@app.post("/api/search")
async def search_restaurants(search: SearchRequest):
    # 1. Handle Geocoding (if address provided but no coords)
    user_lat, user_lon = search.user_lat, search.user_lon
    search_location = search.location

    if search.address and (not user_lat or not user_lon):
        lat, lng = geocode_address(search.address)
        if lat:
            user_lat, user_lon = lat, lng
            # If we have coords, we can search "near me" instead of using a city name
            search_location = search.address 
    
    # Fallback
    if not search_location and not (user_lat and user_lon):
         raise HTTPException(status_code=400, detail="Must provide location or address")

    # 2. Run Searches in Parallel using asyncio
    loop = asyncio.get_event_loop()
    
    future_google = loop.run_in_executor(None, fetch_google_search, search.query, search_location)
    future_yelp = loop.run_in_executor(None, fetch_yelp_search, search.query, search_location, user_lat, user_lon)

    google_data, yelp_data = await asyncio.gather(future_google, future_yelp)

    combined_results = []
    merged_map = {} 

    # 3. Process Google Data
    if "places" in google_data:
        for place in google_data["places"]:
            g_id = place.get("id")
            lat = place.get("location", {}).get("latitude")
            lng = place.get("location", {}).get("longitude")
            
            # Calculate exact distance (float)
            dist = calculate_distance(user_lat, user_lon, lat, lng) if user_lat else None

            # Extract city from address string if possible
            address_str = place.get("formattedAddress", "")
            city_extracted = None
            if address_str:
                parts = address_str.split(",")
                if len(parts) >= 2:
                    # Heuristic: City is often the 2nd or 3rd to last item (before State/Zip)
                    city_extracted = parts[-3].strip() if len(parts) > 3 else parts[1].strip()

            restaurant = {
                "name": place.get("displayName", {}).get("text", "Unknown"),
                "address": address_str,
                "city": city_extracted,
                "google_rating": place.get("rating", None),
                "yelp_rating": None,
                "source": "Google",
                "google_id": g_id,
                "yelp_id": None,
                "location": {"lat": lat, "lng": lng},
                "distance_miles": dist
            }
            
            merged_map[g_id] = restaurant
            combined_results.append(restaurant)

    # 4. Process Yelp & Merge
    if "businesses" in yelp_data:
        for biz in yelp_data["businesses"]:
            y_name = biz.get("name")
            y_lat = biz.get("coordinates", {}).get("latitude")
            y_lng = biz.get("coordinates", {}).get("longitude")
            y_dist = calculate_distance(user_lat, user_lon, y_lat, y_lng) if user_lat else None
            
            match_found = False
            for g_id, g_rest in merged_map.items():
                geo_match = False
                if g_rest["location"]["lat"] and y_lat:
                    d_btwn = calculate_distance(g_rest["location"]["lat"], g_rest["location"]["lng"], y_lat, y_lng)
                    # Check against exact 0.0 or small distance
                    if d_btwn is not None and d_btwn < 0.3: geo_match = True
                
                name_sim = fuzz.token_set_ratio(g_rest["name"], y_name)
                
                if geo_match and name_sim > 70:
                    g_rest["yelp_rating"] = biz.get("rating")
                    g_rest["yelp_id"] = biz.get("id") 
                    g_rest["source"] = "Google & Yelp"
                    match_found = True
                    break 
            
            if not match_found:
                combined_results.append({
                    "name": y_name,
                    "address": " ".join(biz.get("location", {}).get("display_address", [])),
                    "city": biz.get("location", {}).get("city"),
                    "google_rating": None,
                    "yelp_rating": biz.get("rating", 0.0),
                    "source": "Yelp",
                    "google_id": None,
                    "yelp_id": biz.get("id"),
                    "location": {"lat": y_lat, "lng": y_lng},
                    "distance_miles": y_dist
                })

    if user_lat:
        combined_results.sort(key=lambda x: x["distance_miles"] or 9999)
    else:
        combined_results.sort(key=lambda x: (x.get("google_rating") or x.get("yelp_rating") or 0), reverse=True)

    # Final cleanup: Round distances for display
    for res in combined_results:
        if res["distance_miles"] is not None:
            res["distance_miles"] = round(res["distance_miles"], 2)

    return {"results": combined_results}


@app.post("/api/reviews")
async def get_reviews(req: ReviewRequest):
    loop = asyncio.get_event_loop()
    tasks = []
    
    # GOOGLE: Search "Name Address Gluten Free" (Use address first, fall back to city)
    tasks.append(loop.run_in_executor(
        None, 
        fetch_google_reviews_data, 
        req.name, 
        req.address, 
        req.city
    ))

    # YELP: Fetch using ID
    if req.yelp_id:
        tasks.append(loop.run_in_executor(None, fetch_yelp_reviews_data, req.yelp_id))
    else:
        tasks.append(loop.run_in_executor(None, lambda: {}))

    google_data, yelp_data = await asyncio.gather(*tasks)

    all_reviews = []
    keywords = ["gluten", "celiac", "coeliac", "gluten-free", "coeliac-friendly"]

    # Parse Google (Limit 5)
    if "reviews" in google_data:
        for r in google_data["reviews"]:
            text = r.get("text", {}).get("text", "")
            relevant = any(k in text.lower() for k in keywords)
            all_reviews.append({
                "source": "Google",
                "text": text,
                "rating": r.get("rating", 0),
                "author": r.get("authorAttribution", {}).get("displayName", "Anonymous"),
                "relevant": relevant
            })

    # Parse Yelp (Limit 3)
    if "reviews" in yelp_data:
        for r in yelp_data["reviews"]:
            text = r.get("text", "")
            relevant = any(k in text.lower() for k in keywords)
            all_reviews.append({
                "source": "Yelp",
                "text": text,
                "rating": r.get("rating", 0),
                "author": r.get("user", {}).get("name", "Yelp User"),
                "relevant": relevant
            })
    else:
        if req.yelp_id and "error" in yelp_data:
             print("Yelp Error:", yelp_data)

    return {"reviews": all_reviews, "count": len(all_reviews)}