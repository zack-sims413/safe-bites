"use client";

import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { MapPin, Star, ShieldCheck, AlertTriangle, Clock, Info, Heart, ThumbsDown, ThumbsUp, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import Link from "next/link";

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
  favorite_id?: string;
}

export default function RestaurantCard({ place }: { place: Restaurant }) {
  // --- STATE: Data ---
  const [safetyScore, setSafetyScore] = useState<number | null>(place.ai_safety_score ?? null);
  const [relevantCount, setRelevantCount] = useState<number | null>(place.relevant_count ?? null);
  const [summary, setSummary] = useState<string | null>(place.ai_summary ?? null);
  const [loading, setLoading] = useState(!place.is_cached);
  const [hasFetched, setHasFetched] = useState(place.is_cached || false);
  const [wiseBitesScore, setWiseBitesScore] = useState<number | null>(null);

  // --- STATE: User Interaction ---
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<"none" | "helpful" | "unhelpful">("none");

  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const supabase = createClient();
  const router = useRouter();

  // --- 1. CHECK USER STATUS ON LOAD ---
  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: favData } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("place_id", place.place_id).single();
      if (favData) setIsFavorite(true);

      const { data: dislikeData } = await supabase.from("dislikes").select("id").eq("user_id", user.id).eq("place_id", place.place_id).single();
      if (dislikeData) setIsDisliked(true);
    };
    checkStatus();
  }, [place.place_id]);

  // --- 2. HANDLE FAVORITE CLICK ---
  const toggleFavorite = async () => {
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("place_id", place.place_id);
      setIsFavorite(false);
    } else {
      if (isDisliked) {
        await supabase.from("dislikes").delete().eq("user_id", user.id).eq("place_id", place.place_id);
        setIsDisliked(false);
      }
      await supabase.from("favorites").insert({ user_id: user.id, place_id: place.place_id });
      setIsFavorite(true);
    }
    setActionLoading(false);
  };

  // --- 3. HANDLE DISLIKE CLICK ---
  const toggleDislike = async () => {
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    if (isDisliked) {
      await supabase.from("dislikes").delete().eq("user_id", user.id).eq("place_id", place.place_id);
      setIsDisliked(false);
    } else {
      if (isFavorite) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("place_id", place.place_id);
        setIsFavorite(false);
      }
      await supabase.from("dislikes").insert({ user_id: user.id, place_id: place.place_id });
      setIsDisliked(true);
    }
    setActionLoading(false);
  };

  // --- 4. HANDLE AI FEEDBACK ---
  const handleAiFeedback = async (isHelpful: boolean) => {
    if (feedbackStatus !== "none") return;
    setFeedbackStatus(isHelpful ? "helpful" : "unhelpful");

    try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("ai_feedback").insert({
            place_id: place.place_id,
            user_id: user?.id || null,
            is_helpful: isHelpful
        });
    } catch (err) {
        console.error("Feedback error", err);
    }
  };

  // --- SCORE CALCULATION LOGIC ---
  const calculateWiseBitesScore = (aiScore: number, revCount: number, googleRating: number, dist: number | null) => {
    if (revCount === 0 || aiScore === null || aiScore === undefined) return null;
    const rating = googleRating || 0; 
    const safetyPoints = aiScore * 7;
    const confidencePoints = Math.min(revCount, 20);
    const qualityPoints = rating * 2;
    return parseFloat(((safetyPoints + confidencePoints + qualityPoints) / 10).toFixed(1));
  };

  useEffect(() => {
    if (place.is_cached && place.ai_safety_score) {
      const wbScore = calculateWiseBitesScore(place.ai_safety_score, place.relevant_count || 0, place.rating, place.distance_miles);
      setWiseBitesScore(wbScore);
    }
  }, [place]);

  useEffect(() => {
    if (inView && !hasFetched && !place.is_cached) {
      setHasFetched(true);
      setLoading(true);
      fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: place.place_id, name: place.name, address: place.address, city: place.city, rating: place.rating }),
      })
        .then((res) => res.json())
        .then((data) => {
          const aiScore = data.ai_safety_score || 0;
          const revCount = data.relevant_count || 0;
          setSafetyScore(aiScore);
          setSummary(data.ai_summary);
          setRelevantCount(revCount);
          setWiseBitesScore(calculateWiseBitesScore(aiScore, revCount, place.rating, place.distance_miles));
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
    <div ref={ref} className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative flex flex-col h-full">
      
      {/* INTERACTION BUTTONS (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        
        {/* Helper Label - NOW ALWAYS VISIBLE */}
        <span className="text-[10px] font-bold text-slate-500 bg-white/90 backdrop-blur px-2 py-1.5 rounded-lg shadow-sm">
            Save to Profile
        </span>

        <button onClick={toggleFavorite} disabled={actionLoading} className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-slate-100 hover:bg-slate-50 transition-all" title="Save to Favorites">
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Heart className={`w-5 h-5 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-400 hover:text-red-400"}`} />}
        </button>
        <button onClick={toggleDislike} disabled={actionLoading} className={`p-2 rounded-full shadow-sm border transition-all ${isDisliked ? "bg-slate-800 text-white border-slate-800" : "bg-white/80 border-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`} title="Add to Avoid List">
            <X className="w-5 h-5" />
        </button>
      </div>

      {/* TOP: Restaurant Info */}
      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
          <Link href={`/restaurant/${place.place_id}`} target="_blank" rel="noopener noreferrer" className="group/link">
            <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1 group-hover/link:text-green-700 group-hover/link:underline transition-colors">{place.name}</h2>
          </Link>
            <p className="text-slate-500 text-sm mb-3">{place.address}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-xs font-medium"><MapPin className="w-3 h-3" /> {place.city}</span>
              {place.distance_miles !== null && (<span className="flex items-center gap-1 text-xs"><Clock className="w-3 h-3 text-slate-400" /> {place.distance_miles} mi</span>)}
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md"><Star className="w-3 h-3 fill-current" /> {place.rating}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: AI Analysis Area */}
      <div className="bg-slate-50/50 border-t border-slate-100 p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between">
            {/* Left: Score Badge */}
            <div className="flex-shrink-0 mr-4">
                 {loading ? (
                  <div className="w-16 h-12 bg-slate-200 rounded-lg animate-pulse" />
                ) : wiseBitesScore !== null && !isNaN(wiseBitesScore) ? (
                  <div className="flex flex-col items-center justify-center bg-white border border-green-200 px-3 py-2 rounded-xl shadow-sm">
                    <span className="text-2xl font-black text-green-600 leading-none">{wiseBitesScore}</span>
                    <span className="text-[9px] font-bold text-green-800 uppercase tracking-widest mt-0.5">WiseScore</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-white border border-slate-200 px-3 py-2 rounded-xl">
                    <span className="text-lg font-bold text-slate-300">--</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">No Data</span>
                  </div>
                )}
            </div>

            {/* Right: AI Summary + Feedback */}
            <div className="flex-1">
                {loading ? (
                <div className="space-y-2 mt-1">
                    <div className="h-2 bg-slate-200 rounded w-1/3 animate-pulse" />
                    <div className="h-2 bg-slate-200 rounded w-2/3 animate-pulse" />
                </div>
                ) : !place.is_cached && !hasFetched ? (
                <p className="text-xs text-slate-400 italic flex items-center gap-2 mt-2"><Info className="w-3 h-3" /> Scroll to trigger AI analysis...</p>
                ) : relevantCount === 0 ? (
                <div className="flex items-start gap-2 mt-1"><AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" /><p className="text-sm text-slate-500">No reviews found mentioning "gluten".</p></div>
                ) : wiseBitesScore !== null ? (
                
                <div className={`p-3 rounded-xl border ${getScoreColor(wiseBitesScore)}`}>
                    <div className="flex items-center justify-between mb-2 opacity-80">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">AI Analysis</span>
                        </div>
                        <span className="text-[10px] font-semibold">Based on {relevantCount} reviews</span>
                    </div>
                    
                    <p className="text-sm leading-relaxed opacity-95">{summary}</p>

                    {/* FEEDBACK BUTTONS INSIDE THE BOX */}
                    <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase opacity-60">Helpful?</span>
                        {feedbackStatus === "none" ? (
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleAiFeedback(true)} className="p-1 hover:bg-black/5 rounded transition-colors opacity-70 hover:opacity-100" title="Yes">
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleAiFeedback(false)} className="p-1 hover:bg-black/5 rounded transition-colors opacity-70 hover:opacity-100" title="No">
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <span className="text-[10px] font-bold animate-in fade-in opacity-80">
                                {feedbackStatus === "helpful" ? "Thanks! 👍" : "Noted. 🔧"}
                            </span>
                        )}
                    </div>

                </div>
                ) : null}
            </div>
        </div>
      
        <Link 
            href={`/restaurant/${place.place_id}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 block w-full text-center py-2.5 rounded-xl bg-white border-2 border-slate-100 text-slate-600 hover:border-green-500 hover:text-green-700 font-bold text-sm transition-all"
        >
            View Full Details & Reviews
        </Link>
      </div>
    </div>
  );
}