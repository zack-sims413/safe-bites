"use client";

import { useEffect, useState } from "react";
import { Loader2, Heart, X } from "lucide-react";
import { useRouter } from "next/navigation";

// RELATIVE IMPORTS
import { createClient } from "../../utils/supabase/client";
import Navbar from "../../components/Navbar";
import RestaurantCard from "../../components/RestaurantCard";

interface SavedPlace {
    id: string; // The favorite/dislike ID
    place_id: string;
    // The joined restaurant data
    restaurants: any; 
}

export default function MyCollectionsPage() {
  const [items, setItems] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"favorites" | "dislikes">("favorites");
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const table = activeTab === "favorites" ? "favorites" : "dislikes";

      // Fetch the joined data using the foreign key relationship
      const { data, error } = await supabase
        .from(table)
        .select(`
          id,
          place_id,
          restaurants (
            place_id,
            name,
            address,
            city,
            rating,
            ai_safety_score,
            ai_summary,
            relevant_count,
            hours_schedule,
            wise_bites_score,
            community_review_count
          )
        `)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setItems(data as any);
      }
      setLoading(false);
    };

    fetchData();
  }, [activeTab, router]);

  // Helper to safely extract restaurant data
  const getRestaurantData = (item: SavedPlace) => {
    // Supabase sometimes returns the joined relation as an array or object
    const r = Array.isArray(item.restaurants) ? item.restaurants[0] : item.restaurants;
    const googleCount = r.relevant_count || 0;
    const wiseBitesCount = r.community_review_count || 0;
    const totalReviews = googleCount + wiseBitesCount;
    
    if (!r) return null;

    // MAPPING LOGIC
    return {
        place_id: r.place_id || item.place_id, 
        name: r.name || "Unknown Restaurant",
        address: r.address || "",
        city: r.city || "", 
        rating: r.rating || 0, 
        distance_miles: null, 
        is_open_now: null, 
        hours_schedule: r.hours_schedule || [],
        ai_safety_score: r.ai_safety_score, 
        ai_summary: r.ai_summary, 
        relevant_count: totalReviews || 0,
        // ADDED MAPPING HERE:
        wise_bites_score: r.wise_bites_score, 
        is_cached: true 
    };
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Collections</h1>
            <p className="text-slate-500">Manage your safe spots and places to avoid.</p>
        </div>

        <div className="flex gap-4 border-b border-slate-100 mb-8">
            <button
                onClick={() => setActiveTab("favorites")}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "favorites"
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
            >
                <Heart className={`w-4 h-4 ${activeTab === "favorites" ? "fill-green-600" : ""}`} />
                My Saved Places
            </button>
            <button
                onClick={() => setActiveTab("dislikes")}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === "dislikes"
                    ? "border-slate-800 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
            >
                <X className="w-4 h-4" />
                Avoid List
            </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400">
                {activeTab === "favorites" 
                    ? "You haven't favorited any restaurants yet." 
                    : "No disliked places yet."}
            </p>
            <button 
                onClick={() => router.push("/")}
                className="mt-4 text-green-600 font-medium hover:underline"
            >
                Find places
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {items.map((item) => {
                const placeData = getRestaurantData(item);
                if (!placeData) return null;
                return <RestaurantCard key={item.id} place={placeData} />;
            })}
          </div>
        )}
      </main>
    </div>
  );
}