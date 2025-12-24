"use client";

import { useState } from "react";
// Import your new component
// The '@' symbol automatically points to your src folder
import RestaurantCard from "@/components/RestaurantCard";

// Ensure this matches the interface in your RestaurantCard.tsx file
interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  city: string | null;
  rating: number;
  distance_miles: number | null;
  is_open_now: boolean | null;
  hours_schedule: string[];
}

export default function Home() {
  // --- STATE ---
  const [query, setQuery] = useState(""); 
  const [location, setLocation] = useState(""); 
  const [results, setResults] = useState<Restaurant[]>([]); 
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(""); 

  // --- HANDLER ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);
    setError("");
    setResults([]); // Clear old results

    try {
      // 1. Fetch the list of 10 restaurants (Fast)
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          location: location || "Atlanta, GA", 
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch results");

      const data = await response.json();
      setResults(data.results); 
      
    } catch (err) {
      setError("Something went wrong. Is the Python backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-green-700 mb-2 tracking-tight">SafeBites 🌾</h1>
          <p className="text-gray-600 text-lg">
            Find Celiac-safe restaurants using AI analysis.
          </p>
        </div>

        {/* SEARCH FORM */}
        <form onSubmit={handleSearch} className="bg-white p-8 rounded-xl shadow-lg mb-10 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Query Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">What are you craving?</label>
              <input
                type="text"
                placeholder="e.g. Pizza, Thai, Burger"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Location Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Where?</label>
              <input
                type="text"
                placeholder="e.g. Atlanta, GA"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 transition-all"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? "Searching Google Maps..." : "Find Safe Restaurants"}
          </button>
        </form>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-8 shadow-sm">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* RESULTS LIST */}
        <div className="space-y-6">
          {results.map((place) => (
            // This is where we use your new Lazy-Loading Component!
            <RestaurantCard key={place.place_id} place={place} />
          ))}
          
          {results.length === 0 && !loading && !error && (
            <div className="text-center text-gray-400 mt-12">
              <p>Enter a food and location to get started.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}