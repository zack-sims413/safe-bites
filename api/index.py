import os
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from functools import lru_cache # Built-in tool for caching

# 1. Load the secret keys
load_dotenv()
GOOGLE_KEY = os.getenv("GOOGLE_API_KEY")
YELP_KEY = os.getenv("YELP_API_KEY")

app = FastAPI()

# 2. Define the data models
class SearchRequest(BaseModel):
    query: str      # e.g., "Thai food"
    location: str   # e.g., "Atlanta, GA"

class ReviewRequest(BaseModel):
    place_id: str

# 3. Helper Functions (Cached to save money)
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
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.id"
    }
    
    payload = {
        "textQuery": text_query,
        "minRating": 3.5,  # Filter out bad places automatically
        "maxResultCount": 5 # Limit to 5 to save bandwidth/cost
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
    """
    Searches for restaurants. 
    Uses caching to avoid calling Google if the same search is repeated.
    """
    try:
        # Call the cached function
        data = fetch_google_search(search.query, search.location)

        # Check for errors from Google
        if "error" in data:
            print("Google Error:", data)
            raise HTTPException(status_code=400, detail=data["error"]["message"])

        results = []
        if "places" in data:
            for place in data["places"]:
                results.append({
                    "name": place.get("displayName", {}).get("text", "Unknown"),
                    "address": place.get("formattedAddress", "No address"),
                    "rating": place.get("rating", 0.0),
                    "source": "Google",
                    "place_id": place.get("id")
                })
        
        return {"results": results}

    except Exception as e:
        print(f"Server Error: {str(e)}")
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