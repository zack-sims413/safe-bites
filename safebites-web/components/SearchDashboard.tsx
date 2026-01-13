"use client";

import { useState, useEffect, Suspense } from "react";
import { User } from "@supabase/supabase-js";
import { Search, MapPin, Loader2, ShieldCheck, AlignLeft, ArrowDownUp, Star, Filter, Lock } from "lucide-react";
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
  const [limitReached, setLimitReached] = useState(false);

  // --- PREMIUM FILTER STATE ---
  const [filters, setFilters] = useState({
      dedicated_gf: false,
      dedicated_fryer: false,
      gf_menu: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [limitType, setLimitType] = useState<"search" | "feature">("search");

  // Handling Sort State and Logic
  const [sortBy, setSortBy] = useState("relevant"); // 1. State for Sort

  const handleSortChange = (newSort: string) => {   // 2. Helper for Dropdown
      setSortBy(newSort);
      if (query || location) {
          performSearch(query, location, newSort);
      }
  };

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
            .select('dietary_preference, is_premium')
            .eq('id', user.id)
            .single();

        if (profile) setIsPremium(profile.is_premium || false);
        
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
  const performSearch = async (searchQuery: string, searchLoc: string, sortOverride?: string, filtersOverride?: any) => {
    if (!searchQuery && !searchLoc) return;
    
    setLoading(true);
    setError("");
    setHasSearched(true);
    setLimitReached(false); // Reset before new search
    setResults([]); 

    const currentSort = sortOverride || sortBy;
    const currentFilters = filtersOverride || filters; // <--- Use override if provided

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
                user_lon: lng,
                user_id: user?.id,
                sort_by: currentSort,
                // --- PASS PREMIUM FILTERS ---
                filter_dedicated_gf: currentFilters.dedicated_gf,
                filter_dedicated_fryer: currentFilters.dedicated_fryer,
                filter_gf_menu: currentFilters.gf_menu
            }),
        });

        // ADD THIS CHECK FOR THE PAYWALL
        if (res.status === 403) {
            setLimitReached(true);
            setLoading(false);
            return; // Stop here so we don't throw an error
        }

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

  // FILTER TOGGLE HANDLER
  const handleFilterToggle = (key: keyof typeof filters) => {
      // 1. Premium Check
      if (!isPremium) {
          setLimitType("feature"); 
          setLimitReached(true);
          setShowFilters(false); // Close menu to show modal clearly
          return;
      }
      
      // 2. Toggle State
      const newFilters = { ...filters, [key]: !filters[key] };
      setFilters(newFilters);
      
      // 3. Trigger Search (Wait for state update workaround)
      // We pass the *newFilters* explicitly because state hasn't updated yet
      performSearch(query, location, sortBy, newFilters);
  };

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
             WiseBites uses AI to summarize gluten-related experiences from restaurant reviews, so you don’t have to read them all.
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

      {/* HEADER & CONTROLS */}
      {hasSearched && !loading && !error && (
        <div className="mb-6 space-y-3">
            
            {/* ROW 1: Counts & Filters (Fixed Position) */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    {results.length} Restaurants Found
                </h3>

                {/* FILTER BUTTON (Moved Out of Scroll Area) */}
                <div className="relative">
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm border ${
                            Object.values(filters).some(Boolean) 
                            ? "bg-green-600 text-white border-green-600 ring-2 ring-green-100" 
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        <Filter className="w-4 h-4" /> Filters
                        {Object.values(filters).some(Boolean) && (
                            <span className="flex h-2 w-2 rounded-full bg-white ml-1 animate-pulse" />
                        )}
                    </button>

                    {/* FILTER DROPDOWN (Right Aligned) */}
                    {showFilters && (
                        <>
                            {/* Invisible Backdrop to close on click-outside */}
                            <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                            
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-20 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between items-center">
                                    Safety Filters
                                    {!isPremium && <Lock className="w-3 h-3 text-amber-500" />}
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { key: 'dedicated_gf', label: 'Dedicated Gluten Free', sub: '100% GF Facility' },
                                        { key: 'dedicated_fryer', label: 'Dedicated Fryer', sub: 'No shared oil' },
                                        { key: 'gf_menu', label: 'Gluten-Free Menu', sub: 'Labeled options' }
                                    ].map((opt) => (
                                        <label key={opt.key} className="flex items-center justify-between cursor-pointer group">
                                            <div>
                                                <span className="block text-sm font-bold text-slate-700 group-hover:text-green-700 transition-colors">{opt.label}</span>
                                                <span className="text-xs text-slate-400">{opt.sub}</span>
                                            </div>
                                            <div 
                                                // @ts-ignore
                                                onClick={(e) => { e.preventDefault(); handleFilterToggle(opt.key); }}
                                                className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out shrink-0 ${filters[opt.key as keyof typeof filters] ? "bg-green-500" : "bg-slate-200"}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${filters[opt.key as keyof typeof filters] ? "translate-x-5" : ""}`} />
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                
                                {/* Clear Filters Option */}
                                {Object.values(filters).some(Boolean) && (
                                    <button 
                                        onClick={() => {
                                            setFilters({ dedicated_gf: false, dedicated_fryer: false, gf_menu: false });
                                            // Ideally trigger search refresh here too
                                            performSearch(query, location, sortBy, { dedicated_gf: false, dedicated_fryer: false, gf_menu: false });
                                        }}
                                        className="w-full mt-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 border-t border-slate-100"
                                    >
                                        Clear Active Filters
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            {/* ROW 2: Sort Pills (Scrollable) */}
            <div className="relative group">
                {/* Visual Scroll Hint (Fade on right) */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none md:hidden" />
                
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 no-scrollbar scroll-smooth">
                    {/* Sort Label (Optional, good for context) */}
                    <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">Sort by:</span>

                    {/* RELEVANT */}
                    <button 
                        onClick={() => handleSortChange("relevant")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                            sortBy === "relevant" 
                            ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-100" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        <AlignLeft className="w-4 h-4" /> Relevant
                    </button>
                    
                    {/* TOP RATED */}
                    <button 
                        onClick={() => handleSortChange("top_rated")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                            sortBy === "top_rated" 
                            ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-100" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4" /> Top Rated
                    </button>

                    {/* NEAREST */}
                    <button 
                        onClick={() => handleSortChange("distance")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                            sortBy === "distance" 
                            ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-100" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        <MapPin className="w-4 h-4" /> Nearest
                    </button>

                    {/* MOST REVIEWED */}
                    <button 
                        onClick={() => handleSortChange("reviews")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                            sortBy === "reviews" 
                            ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-100" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        <Star className="w-4 h-4" /> Most Reviewed
                    </button>
                </div>
            </div>
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

      {/* 3. PASTE THIS MODAL AT THE BOTTOM */}
      {limitReached && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-100 transform transition-all scale-100">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">👑</span>
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 mb-2">
                    {limitType === "feature" ? "Premium Feature Locked" : "Daily Limit Reached"}
                </h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    {limitType === "feature" 
                     ? "Premium seaerch filters like 'Dedicated Fryer' are available exclusively to WiseBites Premium members."
                     : "You've used all your free searches for today. Upgrade to WiseBites Premium for unlimited access."}
                </p>

                <div className="space-y-3">
                    <button 
                        onClick={() => alert("This button will link to Stripe Checkout later!")}
                        className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all transform hover:-translate-y-0.5"
                    >
                        Upgrade to Premium
                    </button>
                    
                    <button 
                        onClick={() => setLimitReached(false)}
                        className="text-sm text-slate-400 font-semibold hover:text-slate-600 transition-colors"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
      )}
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