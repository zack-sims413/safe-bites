"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Search, MapPin, Loader2 } from "lucide-react";
import RestaurantCard from "../components/RestaurantCard";
import { createClient } from "../utils/supabase/client";

interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  city: string | null;
  rating: number;
  distance_miles: number | null;
  is_open_now: boolean | null;
  hours_schedule: string[];
  ai_safety_score?: number | null;
  ai_summary?: string | null;
  relevant_count?: number;
  is_cached?: boolean;
  wise_bites_score?: number;
}

export default function Home() {
  // --- STATE ---
  const [query, setQuery] = useState(""); 
  const [location, setLocation] = useState(""); 
  const [results, setResults] = useState<Restaurant[]>([]); 
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(""); 
  const [hasSearched, setHasSearched] = useState(false);
  const [user, setUser] = useState<User | null>(null); // Track the user

  const supabase = createClient();

  // --- AUTH CHECK ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  const handleSignOut = async () => {
      await supabase.auth.signOut();
      setUser(null);
  };

  // --- SEARCH HANDLER ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);
    setError("");
    setResults([]); 
    setHasSearched(true);

    try {
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
      setError("Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      

      {/* HERO SECTION */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-12 md:py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            Wise<span className="text-green-600">Bites</span> 🌾
          </h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto mb-8 leading-relaxed">
            Find safer dining options with AI-powered reviews. We analyze thousands of reviews so you don't have to.
          </p>

          {/* SEARCH BAR */}
          <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 flex flex-col md:flex-row gap-2 max-w-2xl mx-auto ring-1 ring-slate-100">
            
            {/* Input 1: Keyword */}
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-green-600 transition-colors" />
              <input
                type="text"
                placeholder="Craving (e.g. Pizza, Tacos)"
                className="w-full pl-12 pr-4 py-3 bg-transparent font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="hidden md:block w-px bg-slate-200 my-2"></div>

            {/* Input 2: Location */}
            <div className="flex-1 relative group">
              <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-green-600 transition-colors" />
              <input
                type="text"
                placeholder="Location (e.g. Atlanta)"
                className="w-full pl-12 pr-4 py-3 bg-transparent font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </button>
          </form>

          {error && (
             <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium animate-fade-in">
               {error}
             </div>
          )}
        </div>
      </div>

      {/* RESULTS SECTION */}
      <div className="max-w-3xl mx-auto px-6 mt-8">
        {hasSearched && !loading && (
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    {results.length} Restaurants Found
                </h3>
            </div>
        )}

        <div className="space-y-6">
          {results.map((place) => (
            <RestaurantCard key={place.place_id} place={place} />
          ))}
          
          {hasSearched && results.length === 0 && !loading && !error && (
            <div className="text-center py-20 opacity-50">
              <p className="text-xl font-semibold">No WiseBites found.</p>
              <p>Try expanding your search area.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}