"use client";

import { useState, useEffect, Suspense } from "react";
import { User } from "@supabase/supabase-js";
import { Search, MapPin, Loader2 } from "lucide-react";
import RestaurantCard from "../components/RestaurantCard"; 
import { createClient } from "../utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

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
  is_dedicated_gluten_free?: boolean;
}

function HomeContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [query, setQuery] = useState(searchParams.get("q") || ""); 
  const [location, setLocation] = useState(searchParams.get("loc") || ""); 
  
  const [results, setResults] = useState<Restaurant[]>([]); 
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(""); 
  const [hasSearched, setHasSearched] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Checking profile state to determine if we need to prompt for more info
  const [checkingProfile, setCheckingProfile] = useState(true);

  // --- AUTH & PROFILE CHECK (TRAFFIC COP) ---
  useEffect(() => {
    const checkUserAndProfile = async () => {
      // A. Get Auth User
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // B. Fetch Profile Data (Dietary Prefs)
        const { data: profile } = await supabase
            .from('profiles')
            .select('dietary_preference')
            .eq('id', user.id)
            .single();
        
        // C. TRAFFIC COP CHECK
        // If they are a Google User who just signed up, this will be null.
        if (!profile?.dietary_preference) {
            // REDIRECT to profile to finish setup
            router.push('/profile?alert=setup_needed');
            return; // Stop execution here so we don't turn off loading
        }
      }
      // D. All good? Let them in.
      setCheckingProfile(false);
    };
    checkUserAndProfile();
  }, [supabase, router]);

  // --- SEARCH FUNCTION ---
  const performSearch = async (searchQuery: string, searchLoc: string) => {
    if (!searchQuery && !searchLoc) return;
    
    setLoading(true);
    setError("");
    setHasSearched(true);
    setResults([]); 

    try {
        let lat = null;
        let lng = null;

        const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                query: searchQuery, 
                location: searchLoc, 
                user_lat: lat,
                user_lon: lng
            }),
        });

        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.results || []);

    } catch (err) {
        console.error(err);
        setError("Failed to fetch results. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  // --- URL SYNC EFFECT (FIXED) ---
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    const urlLoc = searchParams.get("loc");

    if (urlQuery || urlLoc) {
        // If params exist, sync inputs and Search
        setQuery(urlQuery || "");
        setLocation(urlLoc || "");
        performSearch(urlQuery || "", urlLoc || "");
    } else {
        // FIX: If params are missing (Back button hit), RESET EVERYTHING
        setResults([]);
        setHasSearched(false);
        setQuery("");
        setLocation("");
    }
  }, [searchParams]);

  // --- HANDLE FORM SUBMIT ---
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("loc", location);
    router.push(`/?${params.toString()}`);
  };

  // --- RENDER ---

  // 2. BLOCK RENDER UNTIL PROFILE CHECKED
  if (checkingProfile) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      
      {/* HERO SECTION */}
      <div className="relative bg-slate-900 text-white pt-32 pb-24 px-6 rounded-b-[3rem] shadow-xl overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-900 pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
           
           <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
             Wise<span className="text-green-400">Bites</span> 🌾
           </h1>
           <p className="text-lg text-slate-300 max-w-lg mx-auto mb-8 leading-relaxed">
             Dine out with more confidence. We use AI to analyze thousands of reviews to find the most celiac-friendly spots near you.
           </p>

           {/* SEARCH BAR */}
           <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 mt-10 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-green-400 transition-colors" />
              <input 
                type="text" 
                placeholder="What are you craving? (e.g. Pizza, Thai)" 
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-slate-800/50 border border-transparent focus:border-green-500/50 focus:bg-slate-800 text-white placeholder:text-slate-500 outline-none transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-green-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Location (e.g. Atlanta, GA)" 
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-slate-800/50 border border-transparent focus:border-green-500/50 focus:bg-slate-800 text-white placeholder:text-slate-500 outline-none transition-all"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold h-14 px-8 rounded-xl transition-all shadow-lg shadow-green-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </button>
          </form>

          {error && (
             <div className="mt-6 p-4 bg-red-500/20 text-red-200 rounded-xl border border-red-500/30 text-sm font-medium animate-fade-in">
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

        <div className="space-y-6 pb-20">
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

// WRAPPER (Required for useSearchParams in Next.js App Router)
export default function SearchDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>}>
      <HomeContent />
    </Suspense>
  );
}