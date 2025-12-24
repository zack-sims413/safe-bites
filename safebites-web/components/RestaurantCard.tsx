"use client";

import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer"; // <--- THE MAGIC HOOK

interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  city: string | null;
  rating: number;
  distance_miles: number | null;
  is_open_now: boolean | null;
  hours_schedule: string[];
}

export default function RestaurantCard({ place }: { place: Restaurant }) {
  // State for AI Data
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false); // To ensure we only fetch once

  // The "In View" Hook
  // ref: Attach this to the HTML element you want to watch
  // inView: Becomes 'true' when that element enters the screen
  const { ref, inView } = useInView({
    triggerOnce: true, // Only fire this event once (don't refetch if they scroll up/down)
    threshold: 0.1,    // Trigger when 10% of the card is visible
  });

  useEffect(() => {
    // CONDITION: If card is visible (inView) AND we haven't fetched yet...
    if (inView && !hasFetched) {
      setHasFetched(true); // Mark as done immediately so we don't double-fire
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
          setSafetyScore(data.ai_safety_score);
          setSummary(data.ai_summary);
        } catch (err) {
          console.error("Failed to load score", err);
        } finally {
          setLoading(false);
        }
      };

      fetchSafetyScore();
    }
  }, [inView, hasFetched, place.place_id, place.name, place.address]);

  // Color logic
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    // Attach the 'ref' here so the observer watches this box
    <div ref={ref} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{place.name}</h2>
          <p className="text-gray-500 text-sm">{place.address}</p>
          <p className="text-gray-400 text-xs mt-1">
            {place.city} • {place.distance_miles} miles away
          </p>
        </div>
        <div className="text-right">
          <div className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded inline-block">
            Google: {place.rating} ★
          </div>
          <div className={`text-xs mt-1 font-medium ${place.is_open_now ? 'text-green-600' : 'text-red-500'}`}>
            {place.is_open_now ? "Open Now" : "Closed"}
          </div>
        </div>
      </div>

      {/* THE AI SECTION */}
      <div className="mt-4 pt-4 border-t border-gray-100 min-h-[80px]"> 
        {/* min-h preserves space so layout doesn't jump */}
        
        {!hasFetched && !loading ? (
           // State 1: Card is off-screen (or just entered), hasn't loaded yet
           <p className="text-sm text-gray-400 italic">Scroll to load safety score...</p>
        ) : loading ? (
           // State 2: Fetching
          <div className="animate-pulse flex space-x-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ) : safetyScore !== null ? (
           // State 3: Done
          <div className={`p-3 rounded-md border ${getScoreColor(safetyScore)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm uppercase tracking-wide">Celiac Safety Score</span>
              <span className="text-xl font-bold">{safetyScore}/10</span>
            </div>
            <p className="text-sm opacity-90">{summary}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Safety analysis unavailable.</p>
        )}
      </div>
    </div>
  );
}