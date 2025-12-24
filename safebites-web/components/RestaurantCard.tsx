"use client";

import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";

interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  city: string | null;
  rating: number;
  distance_miles: number | null;
  is_open_now: boolean | null;
  hours_schedule: string[];
  // New Cache Fields
  ai_safety_score?: number | null;
  ai_summary?: string | null;
  relevant_count?: number;
  is_cached?: boolean;
}

export default function RestaurantCard({ place }: { place: Restaurant }) {
  // 1. Initialize State: Use cached data if available!
  const [safetyScore, setSafetyScore] = useState<number | null>(place.ai_safety_score ?? null);
  const [relevantCount, setRelevantCount] = useState<number | null>(place.relevant_count ?? null);
  const [summary, setSummary] = useState<string | null>(place.ai_summary ?? null);
  
  // Only show "loading" state if we don't have the data yet
  const [loading, setLoading] = useState(!place.is_cached);
  
  // If it's cached, we consider it "already fetched"
  const [hasFetched, setHasFetched] = useState(place.is_cached || false);
  
  const [safeBitesScore, setSafeBitesScore] = useState<number | null>(null);

  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  const calculateSafeBitesScore = (aiScore: number, revCount: number, googleRating: number, dist: number | null) => {
    if (revCount === 0) return null;

    const safetyPoints = aiScore * 6; 
    const confidencePoints = Math.min(revCount, 20); 
    const qualityPoints = googleRating * 2; 
    
    let distancePoints = 5;
    if (dist !== null) {
      distancePoints = Math.max(0, 10 - dist); 
    }

    const total = (safetyPoints + confidencePoints + qualityPoints + distancePoints) / 10;
    return parseFloat(total.toFixed(1));
  };

  // 2. EFFECT: Calculate Meta Score immediately if cache exists
  useEffect(() => {
    if (place.is_cached && place.ai_safety_score) {
         const sbScore = calculateSafeBitesScore(
            place.ai_safety_score, 
            place.relevant_count || 0, 
            place.rating, 
            place.distance_miles
          );
          setSafeBitesScore(sbScore);
    }
  }, [place]); 

  // 3. EFFECT: Fetch Data if NOT cached and coming into view
  useEffect(() => {
    // Crucial: We check !place.is_cached so we don't double-fetch
    if (inView && !hasFetched && !place.is_cached) {
      setHasFetched(true);
      setLoading(true);

      const fetchSafetyScore = async () => {
        try {
          const res = await fetch("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              place_id: place.place_id,
              name: place.name,
              address: place.address,
            }),
          });
          
          const data = await res.json();
          
          const aiScore = data.ai_safety_score || 0;
          const revCount = data.relevant_count || 0;

          setSafetyScore(aiScore);
          setSummary(data.ai_summary);
          setRelevantCount(revCount);

          const sbScore = calculateSafeBitesScore(
            aiScore, 
            revCount, 
            place.rating, 
            place.distance_miles
          );
          setSafeBitesScore(sbScore);

        } catch (err) {
          console.error("Failed to load score", err);
        } finally {
          setLoading(false);
        }
      };

      fetchSafetyScore();
    }
  }, [inView, hasFetched, place]);

  // UI Helpers
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "bg-green-100 text-green-800 border-green-200 ring-1 ring-green-400";
    if (score >= 7.0) return "bg-green-50 text-green-700 border-green-100";
    if (score >= 5.0) return "bg-yellow-50 text-yellow-700 border-yellow-100";
    return "bg-red-50 text-red-700 border-red-100";
  };

  return (
    <div ref={ref} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{place.name}</h2>
          <p className="text-gray-600 text-sm">{place.address}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
            <span className="font-semibold bg-gray-100 px-2 py-0.5 rounded text-xs">
              {place.city}
            </span>
            {place.distance_miles && (
                <span className="flex items-center">📍 {place.distance_miles} mi</span>
            )}
            <span className="flex items-center text-yellow-600 font-medium">
               ⭐ {place.rating} (Google)
            </span>
          </div>
        </div>
        
        <div className="text-right min-w-[80px]">
           {loading ? (
             <div className="animate-pulse h-10 w-16 bg-gray-100 rounded ml-auto"></div>
           ) : safeBitesScore !== null ? (
             <div className="flex flex-col items-end">
               <div className="text-3xl font-black text-green-700">{safeBitesScore}</div>
               <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">SafeBites Score</div>
             </div>
           ) : (
             <div className="flex flex-col items-end">
                <div className="text-lg font-bold text-gray-300">--</div>
                <div className="text-[9px] uppercase font-bold text-gray-300 tracking-wider">No Data</div>
             </div>
           )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 min-h-[60px]"> 
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse"></div>
          </div>
        ) : !place.is_cached && !hasFetched ? (
           <p className="text-sm text-gray-400 italic flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-gray-300"></span>
             Scroll to analyze safety...
           </p>
        ) : relevantCount === 0 ? (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
             <p className="text-sm text-gray-500">
               ⚠️ <span className="font-semibold">Insufficient Data:</span> We couldn't find any reviews mentioning "gluten" or "celiac" here.
             </p>
          </div>
        ) : safeBitesScore !== null ? (
          <div className={`p-4 rounded-lg border ${getScoreColor(safeBitesScore)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm flex items-center gap-2">
                🛡️ AI Analysis
              </span>
              <span className="text-xs font-medium opacity-80">
                Found {relevantCount} relevant reviews
              </span>
            </div>
            <p className="text-sm leading-relaxed opacity-90">
              {summary}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Analysis unavailable.</p>
        )}
      </div>
    </div>
  );
}