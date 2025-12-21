import os
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from functools import lru_cache # Built-in tool for caching
import math 

# 1. Load the secret keys
load_dotenv()
GOOGLE_KEY = os.getenv("GOOGLE_API_KEY")
YELP_KEY = os.getenv("YELP_API_KEY")

app = FastAPI()

# 2. Define the data models
class SearchRequest(BaseModel):
    query: str      # e.g., "Thai food"
    location: str   # e.g., "Atlanta, GA"
    # NEW: Optional coordinates for precise distance
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None

class ReviewRequest(BaseModel):
    place_id: str

# 3. Helper Functions (Cached to save money)

# NEW: The "Free" Distance Calculator
def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    if not lat1 or not lon1 or not lat2 or not lon2:
        return None

    # Convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 3956 # Radius of earth in miles. Use 6371 for kilometers
    
    return round(c * r, 2)

# This logic lives outside the endpoint so we can "wrap" it in the cache
@lru_cache(maxsize=100) # Remembers the last 100 distinct searches in memory
def fetch_google_search(query: str, location: str):
    if not GOOGLE_KEY:
        raise Exception("Google API Key not configured")

    # Force "gluten free" into the query for better relevance
    text_query = f"{query} gluten free in {location}"
    
    url = "https://places.googleapis.com/v1/places:searchText"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        # FieldMask: Only ask for what we need to save costs
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.id,places.location"
    }
    
    payload = {
        "textQuery": text_query,
        "minRating": 3.5,  # Filter out bad places automatically
        "maxResultCount": 10 # Limit to 10 to save bandwidth/cost
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.json()

@lru_cache(maxsize=50) # Remembers reviews for the last 50 restaurants looked up
def fetch_google_reviews(place_id: str):
    if not GOOGLE_KEY:
        raise Exception("Google API Key not configured")

    url = f"https://places.googleapis.com/v1/places/{place_id}"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": "reviews" # Only fetch reviews here
    }
    
    response = requests.get(url, headers=headers)
    return response.json()

# 4. API Endpoints

@app.get("/api/health")
def health_check():
    return {"status": "SafeBites API is running", "caching": "active"}

@app.post("/api/search")
def search_restaurants(search: SearchRequest):
    try:
        data = fetch_google_search(search.query, search.location)

        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"]["message"])

        results = []
        if "places" in data:
            for place in data["places"]:
                # Get restaurant coords
                place_lat = place.get("location", {}).get("latitude")
                place_lng = place.get("location", {}).get("longitude")
                
                # Calculate distance if user provided their location
                distance_miles = None
                if search.user_lat and search.user_lon:
                    distance_miles = calculate_distance(
                        search.user_lat, search.user_lon,
                        place_lat, place_lng
                    )

                results.append({
                    "name": place.get("displayName", {}).get("text", "Unknown"),
                    "address": place.get("formattedAddress", "No address"),
                    "rating": place.get("rating", 0.0),
                    "source": "Google",
                    "place_id": place.get("id"),
                    "location": {"lat": place_lat, "lng": place_lng}, # Pass these to frontend for map
                    "distance_miles": distance_miles # <--- NEW FIELD
                })
        
        # Optional: Sort by distance if available
        if search.user_lat:
            results.sort(key=lambda x: x["distance_miles"] or 9999)

        return {"results": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reviews")
def get_restaurant_reviews(request: ReviewRequest):
    """
    Fetches detailed reviews for a specific restaurant.
    """
    try:
        # Call the cached function
        data = fetch_google_reviews(request.place_id)
        
        reviews = []
        if "reviews" in data:
            for r in data["reviews"]:
                # Basic cleaning of text
                text_content = r.get("text", {}).get("text", "")
                
                reviews.append({
                    "text": text_content,
                    "rating": r.get("rating", 0),
                    "author": r.get("authorAttribution", {}).get("displayName", "Anonymous"),
                    "published_time": r.get("publishTime", "")
                })
        
        return {"reviews": reviews}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))