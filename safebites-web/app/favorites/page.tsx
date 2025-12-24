"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import RestaurantCard from "@/components/RestaurantCard";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";

// Update Interface to include the Favorite ID
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
  // NEW: We need this for the unique React key
  favorite_id?: string; 
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Select 'id' (the favorite id) AND the restaurant details
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          place_id,
          restaurants (
            *
          )
        `)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching favorites:", error);
      } else if (data) {
        // 2. Filter & Map
        const formatted: Restaurant[] = data
          // Safety Check: Ensure the joined restaurant actually exists (prevents crashes)
          .filter((item: any) => item.restaurants !== null)
          .map((item: any) => {
            const r = item.restaurants;
            return {
              // Vital: Pass the Favorite ID for the React Key
              favorite_id: item.id, 
              
              place_id: r.id, 
              name: r.name,
              address: r.address,
              city: r.city || "",
              rating: r.average_safety_rating || 0,
              distance_miles: null, 
              is_open_now: null,    
              hours_schedule: [],
              ai_safety_score: r.ai_safety_score,
              ai_summary: r.ai_summary,
              relevant_count: r.relevant_count,
              is_cached: true 
            };
          });
        setFavorites(formatted);
      }
      setLoading(false);
    };

    fetchFavorites();
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 mb-8">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">My Saved Places</h1>
        </div>
      </div>

      {/* LIST */}
      <div className="max-w-3xl mx-auto px-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-lg font-semibold text-slate-400 mb-2">No saved places yet.</p>
            <Link href="/" className="text-green-600 font-bold hover:underline">
              Go find some safe bites!
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {favorites.map((place) => (
              // FIX: Use the unique 'favorite_id' as the key
              <RestaurantCard key={place.favorite_id} place={place} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}