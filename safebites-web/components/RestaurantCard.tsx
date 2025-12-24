"use client";

import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { MapPin, Star, ShieldCheck, AlertTriangle, Clock, Info, Heart, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client"; // Import Supabase
import { useRouter } from "next/navigation";

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
}

export default function RestaurantCard({ place }: { place: Restaurant }) {
  // Data State
  const [safetyScore, setSafetyScore] = useState<number | null>(place.ai_safety_score ?? null);
  const [relevantCount, setRelevantCount] = useState<number | null>(place.relevant_count ?? null);
  const [summary, setSummary] = useState<string | null>(place.ai_summary ?? null);
  const [loading, setLoading] = useState(!place.is_cached);
  const [hasFetched, setHasFetched] = useState(place.is_cached || false);
  const [safeBitesScore, setSafeBitesScore] = useState<number | null>(null);

  // Favorite State
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const supabase = createClient();
  const router = useRouter();

  // --- 1. CHECK IF FAVORITED ON LOAD ---
  useEffect(() => {
    const checkFavorite = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("place_id", place.place_id)
        .single();

      if (data) setIsFavorite(true);
    };
    checkFavorite();
  }, [place.place_id]);

  // --- 2. HANDLE CLICK ---
  const toggleFavorite = async () => {
    setFavLoading(true);
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login"); // Redirect if not logged in
      return;
    }

    if (isFavorite) {
      // Remove
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("place_id", place.place_id);
      setIsFavorite(false);
    } else {
      // Add
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, place_id: place.place_id });
      setIsFavorite(true);
    }
    setFavLoading(false);
  };

  // Score Logic
  const calculateSafeBitesScore = (aiScore: number, revCount: number, googleRating: number, dist: number | null) => {
    if (revCount === 0) return null;
    const safetyPoints = aiScore * 6;
    const confidencePoints = Math.min(revCount, 20);
    const qualityPoints = googleRating * 2;
    let distancePoints = 5;
    if (dist !== null) distancePoints = Math.max(0, 10 - dist);
    return parseFloat(((safetyPoints + confidencePoints + qualityPoints + distancePoints) / 10).toFixed(1));
  };

  useEffect(() => {
    if (place.is_cached && place.ai_safety_score) {
      const sbScore = calculateSafeBitesScore(place.ai_safety_score, place.relevant_count || 0, place.rating, place.distance_miles);
      setSafeBitesScore(sbScore);
    }
  }, [place]);

  useEffect(() => {
    if (inView && !hasFetched && !place.is_cached) {
      setHasFetched(true);
      setLoading(true);
      fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: place.place_id, name: place.name, address: place.address }),
      })
        .then((res) => res.json())
        .then((data) => {
          const aiScore = data.ai_safety_score || 0;
          const revCount = data.relevant_count || 0;
          setSafetyScore(aiScore);
          setSummary(data.ai_summary);
          setRelevantCount(revCount);
          setSafeBitesScore(calculateSafeBitesScore(aiScore, revCount, place.rating, place.distance_miles));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [inView, hasFetched, place]);

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100";
    if (score >= 7.0) return "bg-blue-50 text-blue-700 border-blue-200";
    if (score >= 5.0) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div ref={ref} className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
      
      {/* HEART BUTTON (Top Right Absolute) */}
      <button 
        onClick={toggleFavorite}
        disabled={favLoading}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"
      >
        {favLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : (
            <Heart 
                className={`w-5 h-5 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-400 hover:text-red-400"}`} 
            />
        )}
      </button>

      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 pr-10"> {/* pr-10 prevents text from overlapping the heart */}
            <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1 group-hover:text-green-700 transition-colors">
              {place.name}
            </h2>
            <p className="text-slate-500 text-sm mb-3">{place.address}</p>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-xs font-medium">
                <MapPin className="w-3 h-3" /> {place.city}
              </span>
              {place.distance_miles !== null && (
                <span className="flex items-center gap-1 text-xs">
                  <Clock className="w-3 h-3 text-slate-400" /> {place.distance_miles} mi
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">
                <Star className="w-3 h-3 fill-current" /> {place.rating}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50/50 border-t border-slate-100 p-5">
        <div className="flex items-start justify-between">
            {/* Score Badge */}
            <div className="flex-shrink-0 mr-4">
                 {loading ? (
                  <div className="w-16 h-12 bg-slate-200 rounded-lg animate-pulse" />
                ) : safeBitesScore !== null ? (
                  <div className="flex flex-col items-center justify-center bg-white border border-green-200 px-3 py-2 rounded-xl shadow-sm">
                    <span className="text-2xl font-black text-green-600 leading-none">{safeBitesScore}</span>
                    <span className="text-[9px] font-bold text-green-800 uppercase tracking-widest mt-0.5">Score</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-white border border-slate-200 px-3 py-2 rounded-xl">
                    <span className="text-lg font-bold text-slate-300">--</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">No Data</span>
                  </div>
                )}
            </div>

            {/* AI Summary */}
            <div className="flex-1">
                {loading ? (
                <div className="space-y-2 mt-1">
                    <div className="h-2 bg-slate-200 rounded w-1/3 animate-pulse" />
                    <div className="h-2 bg-slate-200 rounded w-2/3 animate-pulse" />
                </div>
                ) : !place.is_cached && !hasFetched ? (
                <p className="text-xs text-slate-400 italic flex items-center gap-2 mt-2">
                    <Info className="w-3 h-3" /> Scroll to trigger AI analysis...
                </p>
                ) : relevantCount === 0 ? (
                <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-500">
                    No reviews found mentioning "gluten".
                    </p>
                </div>
                ) : safeBitesScore !== null ? (
                <div className={`p-3 rounded-xl border ${getScoreColor(safeBitesScore)}`}>
                    <p className="text-sm leading-relaxed opacity-95">
                    {summary}
                    </p>
                </div>
                ) : null}
            </div>
        </div>
      </div>
    </div>
  );
}