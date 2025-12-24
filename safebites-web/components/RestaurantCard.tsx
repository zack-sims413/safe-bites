"use client";

import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { MapPin, Star, ShieldCheck, AlertTriangle, Clock, Info } from "lucide-react"; // Modern Icons

interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  city: string | null;
  rating: number;
  distance_miles: number | null;
  is_open_now: boolean | null;
  hours_schedule: string[];
  // Cache Fields
  ai_safety_score?: number | null;
  ai_summary?: string | null;
  relevant_count?: number;
  is_cached?: boolean;
}

export default function RestaurantCard({ place }: { place: Restaurant }) {
  // State initialization
  const [safetyScore, setSafetyScore] = useState<number | null>(place.ai_safety_score ?? null);
  const [relevantCount, setRelevantCount] = useState<number | null>(place.relevant_count ?? null);
  const [summary, setSummary] = useState<string | null>(place.ai_summary ?? null);
  const [loading, setLoading] = useState(!place.is_cached);
  const [hasFetched, setHasFetched] = useState(place.is_cached || false);
  const [safeBitesScore, setSafeBitesScore] = useState<number | null>(null);

  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  // Scoring Logic (Client-side mirror of backend)
  const calculateSafeBitesScore = (aiScore: number, revCount: number, googleRating: number, dist: number | null) => {
    if (revCount === 0) return null;
    const safetyPoints = aiScore * 6;
    const confidencePoints = Math.min(revCount, 20);
    const qualityPoints = googleRating * 2;
    let distancePoints = 5;
    if (dist !== null) distancePoints = Math.max(0, 10 - dist);
    return parseFloat(((safetyPoints + confidencePoints + qualityPoints + distancePoints) / 10).toFixed(1));
  };

  // Effects
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

  // Modern Color Palette
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100";
    if (score >= 7.0) return "bg-blue-50 text-blue-700 border-blue-200";
    if (score >= 5.0) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div ref={ref} className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
          
          {/* LEFT: Restaurant Info */}
          <div className="flex-1">
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

          {/* RIGHT: The Score Badge */}
          <div className="flex-shrink-0 text-right">
            {loading ? (
              <div className="w-16 h-12 bg-slate-100 rounded-lg animate-pulse" />
            ) : safeBitesScore !== null ? (
              <div className="flex flex-col items-center justify-center bg-green-50 border border-green-100 px-3 py-2 rounded-xl">
                <span className="text-3xl font-black text-green-600 leading-none tracking-tight">{safeBitesScore}</span>
                <span className="text-[10px] font-bold text-green-800 uppercase tracking-widest mt-1">Score</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                <span className="text-xl font-bold text-slate-300">--</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No Data</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: AI Analysis Area */}
      <div className="bg-slate-50/50 border-t border-slate-100 p-5">
        {loading ? (
          <div className="space-y-2 opacity-50">
            <div className="h-2 bg-slate-200 rounded w-1/3 animate-pulse" />
            <div className="h-2 bg-slate-200 rounded w-2/3 animate-pulse" />
          </div>
        ) : !place.is_cached && !hasFetched ? (
          <p className="text-xs text-slate-400 italic flex items-center gap-2">
            <Info className="w-3 h-3" /> Scroll to trigger AI analysis...
          </p>
        ) : relevantCount === 0 ? (
          <div className="flex items-start gap-3 opacity-70">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-500">
              No specific reviews found mentioning "gluten" or "celiac".
            </p>
          </div>
        ) : safeBitesScore !== null ? (
          <div className={`p-4 rounded-xl border ${getScoreColor(safeBitesScore)}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide opacity-90">AI Safety Analysis</span>
              <span className="text-xs ml-auto opacity-70">Based on {relevantCount} reviews</span>
            </div>
            <p className="text-sm leading-relaxed opacity-95">
              {summary}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}