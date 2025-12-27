"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Trash2, ShieldCheck, Clock, ArrowDownAZ, Heart, Ban } from "lucide-react";
import Link from "next/link";

// Generic interface for items in either list
interface PlaceItem {
  id: string; // ID of the favorite/dislike record
  created_at: string;
  restaurants: {
    place_id: string;
    name: string;
    city: string;
    // Removed photo_url
    wise_bites_score: number | null; 
    ai_safety_score: number | null; 
  };
}

type TabType = 'saved' | 'avoid';
type SortType = 'recent' | 'safety' | 'alpha';

export default function FavoritesPage() {
  const supabase = createClient();
  const router = useRouter();
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<TabType>('saved');
  const [savedPlaces, setSavedPlaces] = useState<PlaceItem[]>([]);
  const [avoidPlaces, setAvoidPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>("recent");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const querySelect = `
        id, created_at,
        restaurants (place_id, name, city, wise_bites_score, ai_safety_score)
      `;

      // 1. Fetch BOTH lists in parallel
      const [savedRes, avoidRes] = await Promise.all([
        supabase.from("favorites").select(querySelect).eq("user_id", user.id),
        supabase.from("dislikes").select(querySelect).eq("user_id", user.id)
      ]);

      if (savedRes.data) setSavedPlaces(savedRes.data as any[]);
      if (avoidRes.data) setAvoidPlaces(avoidRes.data as any[]);
      
      setLoading(false);
    };

    fetchData();
  }, [router, supabase]);

  const removePlace = async (id: string) => {
    // Determine which table and state to update based on active tab
    const table = activeTab === 'saved' ? "favorites" : "dislikes";
    const setState = activeTab === 'saved' ? setSavedPlaces : setAvoidPlaces;

    // Optimistic UI update
    setState((prev) => prev.filter((item) => item.id !== id));
    // Delete from DB
    await supabase.from(table).delete().eq("id", id);
  };

  // --- DERIVED DATA ---
  // Select the list currently active
  const currentList = activeTab === 'saved' ? savedPlaces : avoidPlaces;

  // --- SORTING LOGIC ---
  const sortedList = [...currentList].sort((a, b) => {
    if (sortBy === "recent") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "safety") {
        // For 'Saved', higher score is better. For 'Avoid', lower score is usually "better" (more reason to avoid), 
        // but for consistency in UI sorting, let's keep high scores first.
        const scoreA = a.restaurants.wise_bites_score || 0;
        const scoreB = b.restaurants.wise_bites_score || 0;
        return scoreB - scoreA;
    } else {
        const nameA = a.restaurants.name || "";
        const nameB = b.restaurants.name || "";
        return nameA.localeCompare(nameB);
    }
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        
        {/* --- TABS --- */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-8 w-full md:w-fit mx-auto md:mx-0">
            <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lgtext-sm font-bold transition-all ${
                    activeTab === 'saved' ? "bg-white text-green-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
            >
                <Heart className={`w-4 h-4 ${activeTab === 'saved' ? 'fill-current' : ''}`} /> 
                Saved Places ({savedPlaces.length})
            </button>
            <button
                onClick={() => setActiveTab('avoid')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'avoid' ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
            >
                <Ban className="w-4 h-4" /> 
                Avoid List ({avoidPlaces.length})
            </button>
        </div>


        {/* HEADER & SORT CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-black text-black mb-2">
                    {activeTab === 'saved' ? "My Saved Places" : "My Avoid List"}
                </h1>
                <p className="text-slate-700 font-medium">
                    {activeTab === 'saved' 
                        ? "Your personal collection of safe spots." 
                        : "Places you've flagged to stay away from."}
                </p>
            </div>

            {/* SORT BUTTONS */}
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
                <button 
                    onClick={() => setSortBy("recent")}
                    title="Sort by Newest"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                        sortBy === "recent" 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <Clock className="w-4 h-4" /> <span className="hidden sm:inline">Recent</span>
                </button>
                <button 
                    onClick={() => setSortBy("safety")}
                    title="Sort by Safety Score"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                        sortBy === "safety" 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" /> <span className="hidden sm:inline">Safety</span>
                </button>
                <button 
                    onClick={() => setSortBy("alpha")}
                    title="Sort Alphabetically"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                        sortBy === "alpha" 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <ArrowDownAZ className="w-4 h-4" /> <span className="hidden sm:inline">A-Z</span>
                </button>
            </div>
        </div>

        {/* LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedList.map((item) => {
                const r = item.restaurants;
                const score = r.wise_bites_score ?? 0;
                
                // Color Logic
                let scoreColor = "bg-slate-100 text-slate-600 border-slate-200";
                if (score >= 8) scoreColor = "bg-green-50 text-green-800 border-green-200";
                else if (score >= 5) scoreColor = "bg-yellow-50 text-yellow-800 border-yellow-200";
                else if (score > 0) scoreColor = "bg-red-50 text-red-800 border-red-200";

                return (
                    <div key={item.id} className="group bg-white border-2 border-slate-100 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-sm hover:shadow-md flex flex-col">
                        
                        {/* --- CARD HEADER (Name & Score) --- */}
                        <div className="flex justify-between items-start gap-4 mb-4">
                            <div>
                                <h3 className="font-bold text-xl text-black leading-tight mb-1 line-clamp-2">{r.name}</h3>
                                <p className="text-sm font-medium text-slate-500 flex items-center gap-1">
                                    {r.city || "Unknown City"}
                                </p>
                            </div>
                             {/* SCORE BADGE */}
                            <div className={`px-3 py-1.5 rounded-xl font-black text-sm shadow-sm border shrink-0 ${scoreColor}`}>
                                {score > 0 ? `${score}/10` : "NR"}
                            </div>
                        </div>

                        {/* --- CARD FOOTER (Actions) --- */}
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                            <Link 
                                href={`/restaurant/${r.place_id}`}
                                className="text-sm font-bold text-slate-900 hover:text-green-600 flex items-center gap-1 transition-colors"
                            >
                                View Details <ArrowRight className="w-4 h-4" />
                            </Link>
                            <button 
                                onClick={() => removePlace(item.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title={`Remove from ${activeTab} list`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* EMPTY STATES */}
            {sortedList.length === 0 && activeTab === 'saved' && (
                <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                        <Heart className="w-8 h-8 text-slate-300 fill-slate-100" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No saved places yet</h3>
                    <p className="text-slate-500 mb-6 max-w-xs mx-auto">Start exploring and save your favorite safe spots.</p>
                    <Link href="/" className="bg-black text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-all">
                        Find a place
                    </Link>
                </div>
            )}

            {sortedList.length === 0 && activeTab === 'avoid' && (
                <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                        <Ban className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Your avoid list is empty</h3>
                    <p className="text-slate-500 mb-6 max-w-xs mx-auto">Great! That means you haven't found any risky places yet.</p>
                    <Link href="/" className="bg-black text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-all">
                        Back to search
                    </Link>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}