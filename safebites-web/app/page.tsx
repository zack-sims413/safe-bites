"use client"; // This tells Next.js: "This page has interactivity (buttons, inputs)"

import { useState } from "react";

// --- 1. DATA MODELS (Think of these as Pydantic Models) ---
// This ensures we don't accidentally try to print "restaurant.nome" instead of "name"
interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  city: string | null;
  rating: number;
  distance_miles: number | null;
  business_status: string;
  is_open_now: boolean | null;
  hours_schedule: string[];
}

export default function Home() {
  // --- 2. STATE (Think of these as variables) ---
  // [variableName, functionToUpdateIt] = useState(initialValue)
  const [query, setQuery] = useState(""); // Stores user input
  const [location, setLocation] = useState(""); // Stores user location input
  const [results, setResults] = useState<Restaurant[]>([]); // Stores the list of restaurants
  const [loading, setLoading] = useState(false); // Are we waiting for the API?
  const [error, setError] = useState(""); // Did something break?

  // --- 3. THE FUNCTION (Similar to your Python def search_restaurants) ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault(); // Stop the page from reloading (default HTML behavior)
    setLoading(true);
    setError("");
    setResults([]);

    try {
      // We call our own Frontend API route, which proxies to Python
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          location: location || "Atlanta, GA", // Default fallback if empty
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch results");

      const data = await response.json();
      setResults(data.results); // Update the state -> Screen updates automatically!
    } catch (err) {
      setError("Something went wrong. Is the Python backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. THE UI (The HTML Template) ---
  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <h1 className="text-4xl font-bold text-green-700 mb-2">SafeBites 🌾</h1>
        <p className="text-gray-600 mb-8">
          Find Celiac-safe restaurants using AI analysis.
        </p>

        {/* SEARCH FORM */}
        <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Query Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">What are you craving?</label>
              <input
                type="text"
                placeholder="e.g. Pizza, Thai, Burger"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none text-black"
                value={query}
                onChange={(e) => setQuery(e.target.value)} // Update state as user types
              />
            </div>

            {/* Location Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Where?</label>
              <input
                type="text"
                placeholder="e.g. Atlanta, GA or 123 Main St"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none text-black"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition disabled:bg-gray-400"
          >
            {loading ? "Searching..." : "Search Restaurants"}
          </button>
        </form>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* RESULTS LIST */}
        <div className="space-y-4">
          {results.map((place) => (
            // This maps over our list, just like [render_card(p) for p in results]
            <div key={place.place_id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{place.name}</h2>
                  <p className="text-gray-500 text-sm">{place.address}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {place.city} • {place.distance_miles} miles away
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-green-100 text-green-800 text-sm font-bold px-2 py-1 rounded inline-block">
                    {place.rating} ★
                  </div>
                  <div className={`text-xs mt-1 font-medium ${place.is_open_now ? 'text-green-600' : 'text-red-500'}`}>
                    {place.is_open_now ? "Open Now" : "Closed"}
                  </div>
                </div>
              </div>
              
              {/* Placeholder for AI Score (We will add this next!) */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                 <p className="text-sm text-gray-500 italic">
                   Safety Score loading... (Feature coming soon)
                 </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}