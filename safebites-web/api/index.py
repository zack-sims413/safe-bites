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
    # NEW FIELD
    hours_schedule: Optional[List[str]] = None
    # Flag to force AI re-analysis (e.g. after user review)
    force_refresh: Optional[bool] = False
    lat: Optional[float] = None
    lng: Optional[float] = None

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
    
    # 1. Define keywords that matter to us
    keywords = ["gluten", "celiac", "cross-contamination", "dedicated fryer", "coeliac"]

    # 2. Sort the reviews: Put reviews containing these keywords at the TOP
    # This ensures that even if we cut off the list, we keep the relevant ones.
    sorted_reviews = sorted(
        reviews, 
        key=lambda r: any(k in r.get('text', '').lower() for k in keywords), 
        reverse=True
    )

    # 3. Format text WITH User Context
    formatted_lines = []
    for r in sorted_reviews[:50]:
        source_label = r.get("source", "Google")
        sensitivity = r.get("user_sensitivity")
        
        # If it's our user, tag their sensitivity!
        if sensitivity:
            # Clean up the string (e.g. "symptomatic_celiac" -> "Symptomatic Celiac")
            readable_sens = sensitivity.replace("_", " ").title()
            prefix = f"[WiseBites {readable_sens} Member]"
        elif source_label == "WiseBites Community":
            prefix = "[WiseBites Member]"
        else:
            prefix = "[Google User]"
            
        formatted_lines.append(f"{prefix}: {r.get('text', '')}")

    # Increase the limit to 40-50 (Llama 3.3 can easily handle this)
    # We slice the SORTED list now.
    reviews_text = "\n".join([f"- {r.get('text', '')}" for r in sorted_reviews[:50]]) 
    
    system_prompt = (
        "You are an expert dietician specializing in Celiac Disease and gluten safety. "
        "Analyze the following restaurant reviews and determine if this place is safe for someone with Celiac Disease. "
        "IMPORTANT: Reviews that begin with \"[WiseBites\" are from users of our app. "
        "Each review is prefixed with the user's status (e.g., [WiseBites Symptomatic Celiac Member], [Google User]). "
        "\n\nRULES:"
        "\n1. Treat these community reviews from WiseBites Members, particularly Symptomatic Celiac Members, as the highest source of truth. "
        "\n2. If a WiseBites Member says they got sick, take it very seriously. "
        "\n3. Focus on keywords like 'cross-contamination', 'dedicated fryer', 'separate prep area', and 'got sick'. "
        "Return a JSON object with exactly two keys: "
        "'score' (an integer 1-10, where 10 is perfectly safe and 1 is dangerous) and "
        "'summary' (a concise 2-sentence explanation of the rating, referencing community feedback if present)."
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

def calculate_wisebites_score(ai_score, safety_rating, relevant_rev_count, wb_avg_rating, wb_safe_count, wb_unsafe_count):
    """
    Hybrid Scoring Logic (Mirrors SQL):
    - IF WiseBites reviews exist: 70% AI + 30% Community + Bonuses
    - ELSE: 80% AI + 20% Google Rating
    """
    if ai_score is None: ai_score = 0
    if safety_rating is None: safety_rating = 0
    if relevant_rev_count is None: relevant_rev_count = 0
    
    wb_review_count = wb_safe_count + wb_unsafe_count

    # RULE 1: STRICT NULL CHECK
    # If no one (Community or Google) has said anything relevant, we return None.
    if wb_review_count == 0 and relevant_rev_count == 0:
        return None
    
    final_score = 0.0

    if wb_review_count > 0:
        # MODE A: VERIFIED (Community Data)
        total = float(ai_score) * 7
        total += (float(wb_avg_rating) * 2) * 3
        # Penalties/Bonuses
        total -= (wb_unsafe_count * 15)
        total += (wb_safe_count * 2)
        final_score = total / 10.0
    else:
        # MODE B: COLD START (Relevant Google Data ONLY)
        # We only get here if relevant_rev_count > 0 due to Rule 1.
        
        total = float(ai_score) * 8
        
        # Established (>3 relevant reviews): Safety Rating * 4
        if relevant_rev_count > 3:
            total += (float(safety_rating) * 4)
        # New (1-3 relevant reviews): Safety Rating * 2
        else:
            total += (float(safety_rating) * 2)
            
        final_score = total / 10.0
    
    # Clamp
    return max(1.0, min(round(final_score, 1), 10.0))

@lru_cache(maxsize=100) 
def fetch_google_search(query: str, location: str, lat: float = None, lng: float = None):
    if lat and lng:
        text_query = f"{query} gluten-free"
    else:
        text_query = f"{query} gluten-free in {location}"

    url = "https://places.googleapis.com/v1/places:searchText"
    field_mask = "places.displayName,places.formattedAddress,places.rating,places.id,places.location,places.regularOpeningHours,places.businessStatus,places.types,places.priceLevel"
    headers = {"Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_KEY, "X-Goog-FieldMask": field_mask}
    
    payload = {
        "textQuery": text_query, 
        "minRating": 3.5, 
        "maxResultCount": 20
    }

    if lat and lng:
        payload["locationBias"] = {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 30000.0
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

    # A. Fetch from Google Places API
    google_data = fetch_google_search(search.query, search_location, user_lat, user_lon)
    
    # B. Fetch from Supabase (Existing "Hidden Gems" or Safe Spots)
    # We call the RPC function we just created
    db_results = []
    if user_lat and user_lon:
        try:
            print("Calling Supabase RPC for nearby restaurants...")
            rpc_params = {
                "user_lat": user_lat,
                "user_lon": user_lon,
                "search_query": search.query,
                "radius_miles": 30.0 # Match your distance cap
            }
            db_resp = supabase.rpc("search_nearby_restaurants", rpc_params).execute()
            if db_resp.data:
                db_results = db_resp.data
            print(f"Supabase returned {len(db_results)} results.")
        except Exception as e:
            print(f"DB Search Error: {e}")

    # --- 2. MERGE RESULTS ---
    combined_results = {} # Use a dict keyed by place_id to deduplicate

    # Process Google Results First
    if "places" in google_data:
        for place in google_data["places"]:
            pid = place.get("id")
            if not pid: continue
            
            lat = place.get("location", {}).get("latitude")
            lng = place.get("location", {}).get("longitude")
            dist = calculate_distance(user_lat, user_lon, lat, lng) if user_lat else None
            
            # Distance Cap
            if dist is not None and dist > 30.0: continue

            address_str = place.get("formattedAddress", "")
            raw_hours = place.get("regularOpeningHours", {}).get("weekdayDescriptions", [])
            cleaned_hours = [h.replace('\u2009', ' ').strip() for h in raw_hours]

            # Save the new metadata to result (and eventually DB)
            google_types = place.get("types", [])
            price_level = place.get("priceLevel", None)

            combined_results[pid] = {
                "name": place.get("displayName", {}).get("text", "Unknown"),
                "address": address_str,
                "city": extract_city(address_str),
                "rating": place.get("rating", 0.0), 
                "place_id": pid,
                "location": {"lat": lat, "lng": lng},
                "distance_miles": round(dist, 2) if dist else None,
                "hours_schedule": cleaned_hours,
                "google_types": google_types,   # <--- NEW
                "price_level": price_level,     # <--- NEW
                "ai_safety_score": None, 
                "wise_bites_score": None,
                "relevant_count": 0,
                "is_cached": False,
                "source": "Google"
            }

    # Process DB Results (Merge into Google Results)
    # If a DB result exists, it OVERWRITES the Google result (because DB has the score!)
    for db_r in db_results:
        pid = db_r['place_id']
        
        # If it's already in the list from Google, we just update the score fields
        # If it wasn't returned by Google (but is in our DB), we ADD it.

        # Calculate TOTAL Count (Google + WiseBites)
        google_count = db_r.get('relevant_count', 0) or 0
        wb_count = db_r.get('community_review_count', 0) or 0 # <--- NEW
        total_count = google_count + wb_count
        db_hours = db_r.get('hours_schedule', [])

        is_dedicated = db_r.get('is_dedicated_gluten_free', False)
        
        if pid in combined_results:
            # Update existing entry with DB scores
            entry = combined_results[pid]
            entry["wise_bites_score"] = float(db_r['wise_bites_score']) if db_r['wise_bites_score'] else None
            entry["ai_safety_score"] = float(db_r['ai_safety_score']) if db_r['ai_safety_score'] else None
            entry["ai_summary"] = db_r['ai_summary']
            entry["relevant_count"] = total_count
            entry["average_safety_rating"] = float(db_r['average_safety_rating']) if db_r['average_safety_rating'] else None
            entry["is_cached"] = True
            entry["is_dedicated_gluten_free"] = is_dedicated
            entry["hours_schedule"] = db_hours if db_hours else entry["hours_schedule"]
            entry["source"] = "Hybrid (Merged)"
        else:
            # Add new entry strictly from DB
            combined_results[pid] = {
                "name": db_r['name'],
                "address": db_r['address'],
                "city": extract_city(db_r['address']),
                "rating": float(db_r['rating']), 
                "place_id": pid,
                # Note: DB RPC doesn't return lat/lng/hours in the simplified query above
                # You might need to select them in the RPC if you want them here.
                # For now, we assume basic display data is enough or we fetch details later.
                "location": {"lat": 0, "lng": 0}, # Placeholder if not selected
                "distance_miles": round(db_r['dist_miles'], 2),
                "hours_schedule": [],
                "google_types": db_r['google_types'],
                "price_level": None,
                "ai_safety_score": float(db_r['ai_safety_score']) if db_r['ai_safety_score'] else None,
                "ai_summary": db_r['ai_summary'],
                "wise_bites_score": float(db_r['wise_bites_score']) if db_r['wise_bites_score'] else None,
                "relevant_count": total_count,
                "is_dedicated_gluten_free": is_dedicated,
                "hours_schedule": db_hours,
                "is_cached": True,
                "source": "Supabase"
            }

    # Convert back to list
    final_list = list(combined_results.values())

    # --- 3. FETCH SCORES FOR NEW GOOGLE RESULTS ---
    # (Existing logic to batch fetch scores for items that came ONLY from Google)
    # We filter for items where 'is_cached' is False
    uncached_ids = [r['place_id'] for r in final_list if not r['is_cached']]
    
    if uncached_ids:
        try:
            response = supabase.table("restaurants").select("*").in_("place_id", uncached_ids).execute()
            cache_map = {row['place_id']: row for row in response.data}

            for r in final_list:
                if r['place_id'] in cache_map and not r['is_cached']:
                    cached = cache_map[r['place_id']]
                    
                    # ... (Standard freshness logic & score hydration) ...
                    last_updated_str = cached.get("last_updated")
                    is_fresh = False
                    if last_updated_str:
                        last_updated = datetime.fromisoformat(last_updated_str.replace('Z', '+00:00'))
                        if datetime.now(timezone.utc) - last_updated < timedelta(days=30):
                            is_fresh = True
                    
                    db_score = cached.get("wise_bites_score")
                    if db_score and float(db_score) > 0:
                        r["wise_bites_score"] = float(db_score)

                    r["is_dedicated_gluten_free"] = cached.get("is_dedicated_gluten_free", False)
                    
                    if is_fresh:
                        r["ai_safety_score"] = float(cached.get("ai_safety_score") or 0)
                        r["ai_summary"] = cached.get("ai_summary")
                        safety_rating = float(cached.get("average_safety_rating") or 0)
                        google_count = int(cached.get("relevant_count") or 0)
                        wb_count = int(cached.get("community_review_count") or 0)
                        r["relevant_count"] = google_count + wb_count
                        r["is_cached"] = True
                        
                        if r["wise_bites_score"] is None or r["wise_bites_score"] == 0:
                            r["wise_bites_score"] = calculate_wisebites_score(
                                r["ai_safety_score"],
                                safety_rating, 
                                google_count,
                                0, 0, 0 
                            )

                        # --- AUTO-UPDATE METADATA ---
                    # Check if DB is missing data that Google just provided
                    db_missing_types = not cached.get("google_types")
                    db_missing_price = not cached.get("price_level")
                    db_missing_loc = (cached.get("lat") is None or cached.get("lng") is None)
                    db_missing_hours = not cached.get("hours_schedule")
                    current_rating = cached.get("rating")
                    db_missing_rating = (current_rating is None or float(current_rating) == 0)
                    
                    if (db_missing_types or db_missing_price or db_missing_loc or db_missing_hours or db_missing_rating):
                        try:
                            update_payload = {}
                            
                            # Only update if Google actually gave us data
                            if r.get("google_types"): 
                                update_payload["google_types"] = r["google_types"]
                            
                            if r.get("price_level"): 
                                update_payload["price_level"] = r["price_level"]
                            
                            if r.get("location"):
                                update_payload["lat"] = r["location"]["lat"]
                                update_payload["lng"] = r["location"]["lng"]

                            if r.get("hours_schedule"): 
                                update_payload["hours_schedule"] = r["hours_schedule"]

                            if r.get("rating") and db_missing_rating:
                                update_payload["rating"] = r["rating"]

                            # If we have something to save, run the update
                            if update_payload:
                                supabase.table("restaurants") \
                                    .update(update_payload) \
                                    .eq("place_id", r["place_id"]) \
                                    .execute()
                                    
                        except Exception as e:
                            # Non-critical: don't fail the search if this update fails
                            print(f"Background metadata update failed for {r['place_id']}: {e}")
                    # =======================================================
                    
                    
        except Exception as e:
            print(f"Batch Error: {e}")

    # Sort (WiseScore > Distance)
    def sort_key(x):
        sb_score = x["wise_bites_score"] if x["wise_bites_score"] is not None else -1
        dist = x["distance_miles"] or 9999
        if sb_score > 0: return (0, -sb_score) 
        else: return (1, dist)

    if user_lat: final_list.sort(key=sort_key)
    else: final_list.sort(key=lambda x: x["rating"], reverse=True)

    return {"results": final_list}

@app.post("/api/reviews")
def get_reviews(req: ReviewRequest):
    
    def format_community_reviews(place_id):
        """Fetches and formats WiseBites reviews for this place."""
        formatted = []
        wb_safe = 0
        wb_unsafe = 0
        wb_avg = 0
        total_count = 0
        
        try:
            # Fetch live from user_reviews table
            resp = supabase.table("user_reviews")\
                .select("*, profiles(dietary_preference)")\
                .eq("place_id", place_id)\
                .execute()
                
            wb_data = resp.data or []
            total_count = len(wb_data)
            
            if wb_data:
                wb_ratings = [r['rating'] for r in wb_data if r.get('rating')]
                if wb_ratings:
                    wb_avg = sum(wb_ratings) / len(wb_ratings)
                
                wb_safe = sum(1 for r in wb_data if r.get('did_feel_safe') is True)
                wb_unsafe = sum(1 for r in wb_data if r.get('did_feel_safe') is False)

                for r in wb_data:
                    safety_tag = "SAFE" if r.get('did_feel_safe') else "UNSAFE"
                    comment = r.get('comment') or "No specific comment."

                    # Extract User Sensitivity
                    # Supabase returns the joined table as a nested dictionary
                    user_profile = r.get('profiles') or {}
                    sensitivity = user_profile.get('dietary_preference', 'Unknown')
                    
                    # Add Badge info if present
                    badge_text = ""
                    if r.get('is_dedicated_gluten_free'):
                        badge_text = " [DEDICATED GF]"

                    formatted.append({
                        "source": "WiseBites Community",
                        "text": f"[{safety_tag} REPORT]{badge_text} {comment}",
                        "rating": r.get('rating', 0),
                        "author": "WiseBites Member",
                        "user_sensitivity": sensitivity,
                        "date": r.get('created_at', "")[:10],
                        "relevant": True,
                        "is_dedicated_gluten_free": r.get('is_dedicated_gluten_free', False)
                    })
        except Exception as e:
            print(f"Error fetching community reviews: {e}")
            
        return formatted, wb_avg, wb_safe, wb_unsafe, total_count
    
    # 1. CHECK CACHE (Skip if force_refresh is True)
    if not req.force_refresh:
        try:
            response = supabase.table("restaurants").select("*").eq("place_id", req.place_id).execute()
            data = response.data
            if data:
                record = data[0]
                last_updated = datetime.fromisoformat(record["last_updated"].replace('Z', '+00:00'))
                if datetime.now(timezone.utc) - last_updated < timedelta(days=30): 
                    print("Returning Cached Data")

                    # A. Get Google Reviews from Cache (Pure)
                    cached_google_reviews = record["reviews"] or []
                    
                    # B. Fetch Community Reviews LIVE (Always Fresh)
                    wb_reviews, wb_avg, wb_safe, wb_unsafe, wb_count = format_community_reviews(req.place_id)
                    
                    # C. Combine for Frontend Display
                    combined_reviews = cached_google_reviews + wb_reviews

                    # Recalculate Total Count
                    google_count = int(record.get("relevant_count") or 0)

                    return {
                        "reviews": combined_reviews, # Return BOTH
                        "relevant_count": google_count + wb_count,
                        "average_safety_rating": record["average_safety_rating"],
                        "ai_safety_score": record.get("ai_safety_score", 0), 
                        "wise_bites_score": record.get("wise_bites_score", 0), 
                        "ai_summary": record.get("ai_summary", "No summary available."), 
                        "is_dedicated_gluten_free": record.get("is_dedicated_gluten_free", False),
                        "source": "Cache (Google) + Live (WiseBites)"
                    }
        except Exception as e:
            print(f"Supabase Read Error: {e}")

    # 2. FETCH GOOGLE DATA
    print("Fetching fresh data from SerpApi...")
    raw_reviews = fetch_serpapi_reviews(req.place_id)
    
    google_reviews = []
    total_rating_sum = 0
    google_relevant_count = 0
    
    for r in raw_reviews:
        text_content = r.get("snippet", "")
        rating = r.get("rating", 0)
        if not text_content: continue 
        google_relevant_count += 1
        total_rating_sum += rating
        google_reviews.append({
            "source": "Google",
            "text": text_content,
            "rating": rating,
            "author": r.get("user", {}).get("name", "Anonymous"),
            "date": r.get("date", ""),
            "relevant": True
        })

    wb_reviews, wb_avg, wb_safe, wb_unsafe, wb_count = format_community_reviews(req.place_id)

    # Calculate Google-only Stats
    avg_safety_rating = 0
    if google_relevant_count > 0:
        avg_safety_rating = round(total_rating_sum / google_relevant_count, 1)
    
    # 3. RUN AI ANALYSIS
    print("Running AI Analysis...")
    all_reviews_for_ai = google_reviews + wb_reviews
    ai_score, ai_summary = analyze_reviews_with_ai(all_reviews_for_ai)

    # --- CALCULATE SCORE ---
    final_wb_score = calculate_wisebites_score(
        ai_score, 
        avg_safety_rating, 
        google_relevant_count,    
        wb_avg, 
        wb_safe, 
        wb_unsafe
    )

    # 4. SAVE TO SUPABASE
    try:
        upsert_data = {
            "place_id": req.place_id,
            "google_place_id": req.place_id, 
            "name": req.name,
            "address": req.address,
            "city": req.city or extract_city(req.address),
            "rating": req.rating,
            "lat": req.lat,
            "lng": req.lng,
            "hours_schedule": req.hours_schedule,
            
            # --- CRITICAL FIX: Only save Google Reviews to DB ---
            "reviews": google_reviews, 
            # ----------------------------------------------------
            
            "relevant_count": google_relevant_count, # Google only count
            "community_review_count": wb_count,      # Separate column
            "average_safety_rating": avg_safety_rating, 
            "ai_safety_score": ai_score, 
            "wise_bites_score": final_wb_score,
            "ai_summary": ai_summary,    
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("restaurants").upsert(upsert_data).execute()
    except Exception as e:
        print(f"Supabase Write Error: {e}")

    return {
        "reviews": google_reviews, 
        "relevant_count": google_relevant_count + wb_count,
        "average_safety_rating": avg_safety_rating,
        "ai_safety_score": ai_score,
        "wise_bites_score": final_wb_score,
        "ai_summary": ai_summary,
        "source": "SerpApi + Groq"
    }