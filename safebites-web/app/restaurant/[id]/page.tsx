"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import Navbar from "../../../components/Navbar";
import { 
  Loader2, MapPin, Star, ShieldCheck, ArrowLeft, ExternalLink, Quote, 
  Calendar, MessageSquare 
} from "lucide-react";

interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  city: string | null;
  rating: number;
  hours_schedule: string[];
  ai_safety_score?: number | null;
  ai_summary?: string | null;
  relevant_count?: number;
  wise_bites_score?: number;
  reviews?: any[]; 
}

export default function RestaurantDetailsPage() {
  const { id } = useParams();
  const [place, setPlace] = useState<Restaurant | null>(null);
  const [sortedReviews, setSortedReviews] = useState<any[]>([]); // New State for Sorted Data
  const [loading, setLoading] = useState(true);
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // --- HELPER: Parse "A month ago" into Integer Days ---
  const getDaysAgo = (dateStr: string) => {
    if (!dateStr) return 99999; // Handle missing dates
    
    // Normalize string: "A month" -> "1 month"
    const cleanStr = dateStr.toLowerCase().replace("a ", "1 ").replace("an ", "1 ");
    
    const parts = cleanStr.split(" ");
    const val = parseInt(parts[0]);
    
    if (isNaN(val)) return 99999;

    let multiplier = 1;
    // Logic: Convert everything to approximate "Days"
    if (cleanStr.includes("second") || cleanStr.includes("minute") || cleanStr.includes("hour")) multiplier = 0; // Very fresh (0 days)
    else if (cleanStr.includes("day")) multiplier = 1;
    else if (cleanStr.includes("week")) multiplier = 7;
    else if (cleanStr.includes("month")) multiplier = 30;
    else if (cleanStr.includes("year")) multiplier = 365;

    return val * multiplier;
  };

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("place_id", id)
        .single();

      if (data) {
        setPlace(data);
        const score = data.wise_bites_score || calculateWiseBitesScore(data.ai_safety_score, data.relevant_count, data.rating);
        setCalculatedScore(score);

        // SORT REVIEWS: Newest (lowest days ago) -> Oldest
        if (data.reviews && Array.isArray(data.reviews)) {
          const sorted = [...data.reviews].sort((a, b) => getDaysAgo(a.date) - getDaysAgo(b.date));
          setSortedReviews(sorted);
        }
        
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  const calculateWiseBitesScore = (aiScore: any, revCount: any, googleRating: any) => {
    if (!aiScore) return null;
    const rating = googleRating || 0; 
    const count = revCount || 0;
    const safetyPoints = aiScore * 7;
    const confidencePoints = Math.min(count, 20);
    const qualityPoints = rating * 2;
    return parseFloat(((safetyPoints + confidencePoints + qualityPoints) / 10).toFixed(1));
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 7.0) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 5.0) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-slate-900">Restaurant not found</h2>
        <button onClick={() => router.back()} className="mt-4 text-green-600 hover:underline">Go Back</button>
      </div>
    );
  }

  // Get Latest Date from the SORTED array
  const latestReviewDate = sortedReviews.length > 0 ? sortedReviews[0].date : "N/A";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </button>

        {/* HEADER */}
        <div className="border-b border-slate-100 pb-8 mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{place.name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-slate-600">
                <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" /> {place.address}
                </span>
                <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {place.rating} Stars on Google
                </span>
            </div>
            <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.address)}&query_place_id=${place.place_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-green-600 hover:text-green-700 hover:underline"
            >
                View on Google Maps <ExternalLink className="w-3 h-3" />
            </a>
        </div>

        {/* SCORES GRID */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
            
            {/* 1. WiseScore Card */}
            <div className={`p-6 rounded-2xl border flex flex-col justify-between ${calculatedScore ? getScoreColor(calculatedScore) : "border-slate-100 bg-slate-50"}`}>
                <div>
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">WiseScore</span>
                    </div>
                    <div className="text-4xl font-black">{calculatedScore || "--"}</div>
                    <p className="text-xs mt-2 opacity-75">Out of 10.0 based on safety analysis</p>
                </div>

                <div className="mt-6 pt-4 border-t border-black/10 flex flex-col gap-1.5 text-sm opacity-80">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-medium">{place.relevant_count || 0} Relevant Reviews</span>
                    </div>
                    {/* Shows the NEWEST date based on our sorting */}
                    {sortedReviews.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Latest: {latestReviewDate}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. AI Analysis Card */}
            <div className="md:col-span-2 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    AI Safety Summary
                </h3>
                <p className="text-slate-600 leading-relaxed flex-grow">
                    {place.ai_summary || "No detailed analysis available yet."}
                </p>
            </div>
        </div>

        <div className="space-y-12">
            
            {/* Community Reviews Placeholder */}
            <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Community Reviews</h2>
                <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500">
                    <p>User reviews coming soon...</p>
                </div>
            </section>

             {/* Gluten-Free Menu Placeholder */}
             <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Gluten-Free Menu</h2>
                <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500">
                    <p>No menus uploaded yet.</p>
                </div>
            </section>

            {/* GOOGLE REVIEWS SECTION (Sorted) */}
            {sortedReviews.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        Mentioned Reviews
                        <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            From Google
                        </span>
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {sortedReviews.map((review: any, i: number) => (
                            <div key={i} className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-3">
                                    <Quote className="w-8 h-8 text-green-100 shrink-0" />
                                    <div className="w-full">
                                        <p className="text-slate-700 text-sm leading-relaxed mb-3">
                                            "{review.text || review.snippet}"
                                        </p>
                                        <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-2">
                                            <span className="text-xs font-bold text-slate-900">
                                                {review.author || "Google User"}
                                            </span>
                                            
                                            <div className="flex items-center gap-3">
                                                {review.date && (
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">
                                                        {review.date}
                                                    </span>
                                                )}
                                                {review.rating && (
                                                    <div className="flex text-amber-400">
                                                        {[...Array(Math.round(review.rating))].map((_, i) => (
                                                            <Star key={i} className="w-3 h-3 fill-current" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

        </div>

      </main>
    </div>
  );
}