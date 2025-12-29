"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import ReviewForm from "../../../components/ReviewForm";
import { 
  Loader2, MapPin, Star, ShieldCheck, ExternalLink, Quote, 
  Calendar, MessageSquare, CheckCircle2, User, ThumbsUp, ThumbsDown,
  Heart, X, Clock, ChevronDown
} from "lucide-react";

// ... (Interfaces remain the same) ...
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
  average_safety_rating?: number; // Added to interface
}

interface CommunityReview {
  id: string;
  user_id: string; // Added user_id to interface to track ownership
  rating: number;
  comment: string | null;
  created_at: string;
  has_gf_menu: boolean;
  staff_knowledgeable: boolean;
  did_feel_safe: boolean;
  has_dedicated_fryer: boolean;
  is_dedicated_gluten_free: boolean;
}

export default function RestaurantDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [place, setPlace] = useState<Restaurant | null>(null);
  const [sortedGoogleReviews, setSortedGoogleReviews] = useState<any[]>([]);
  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>([]);
  const [currentUserReview, setCurrentUserReview] = useState<CommunityReview | null>(null); // NEW: Track user's review
  const [loading, setLoading] = useState(true);
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);
  
  // Feedback State
  const [feedbackStatus, setFeedbackStatus] = useState<"none" | "helpful" | "unhelpful">("none");

  // User Action State (Save/Avoid)
  const [userAction, setUserAction] = useState<"none" | "saved" | "avoided">("none");
  const [actionLoading, setActionLoading] = useState(false);

  const [showHours, setShowHours] = useState(false);

  // --- LOGIC: Check User Status ---
  const checkUserStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;

    // Check Favorites
    const { data: fav } = await supabase
        .from('favorites')
        .select('id')
        .eq('place_id', id)
        .eq('user_id', user.id)
        .single();
    
    if (fav) {
        setUserAction('saved');
        return;
    }

    // Check Dislikes
    const { data: dis } = await supabase
        .from('dislikes')
        .select('id')
        .eq('place_id', id)
        .eq('user_id', user.id)
        .single();

    if (dis) {
        setUserAction('avoided');
    }
  }, [id, supabase]);

  // --- LOGIC: Handle Save/Avoid Toggle ---
  const handleToggleAction = async (action: 'save' | 'avoid') => {
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        router.push('/login'); // Redirect if not logged in
        return;
    }

    try {
        if (action === 'save') {
            if (userAction === 'saved') {
                await supabase.from('favorites').delete().eq('place_id', id).eq('user_id', user.id);
                setUserAction('none');
            } else {
                if (userAction === 'avoided') {
                    await supabase.from('dislikes').delete().eq('place_id', id).eq('user_id', user.id);
                }
                await supabase.from('favorites').insert({ place_id: id, user_id: user.id });
                setUserAction('saved');
            }
        } else if (action === 'avoid') {
            if (userAction === 'avoided') {
                await supabase.from('dislikes').delete().eq('place_id', id).eq('user_id', user.id);
                setUserAction('none');
            } else {
                if (userAction === 'saved') {
                    await supabase.from('favorites').delete().eq('place_id', id).eq('user_id', user.id);
                }
                await supabase.from('dislikes').insert({ place_id: id, user_id: user.id });
                setUserAction('avoided');
            }
        }
    } catch (error) {
        console.error("Error toggling status:", error);
    } finally {
        setActionLoading(false);
    }
  };

  const handleAiFeedback = async (isHelpful: boolean) => {
    if (feedbackStatus !== "none" || !place) return; 

    setFeedbackStatus(isHelpful ? "helpful" : "unhelpful");

    try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("ai_feedback").insert({
            place_id: place.place_id,
            user_id: user?.id || null, 
            is_helpful: isHelpful
        });
    } catch (err) {
        console.error("Feedback error:", err);
    }
  };

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    // Get current user for review matching
    const { data: { user } } = await supabase.auth.getUser();

    // A. Fetch Community Reviews FIRST (so we can use them in scoring)
    const { data: userReviews } = await supabase
      .from("user_reviews")
      .select("*")
      .eq("place_id", id)
      .order("created_at", { ascending: false });
    
    const safeUserReviews = userReviews || [];
    setCommunityReviews(safeUserReviews);

    // Identify if current user has reviewed
    if (user && safeUserReviews.length > 0) {
        const myReview = safeUserReviews.find((r: CommunityReview) => r.user_id === user.id);
        setCurrentUserReview(myReview || null);
    }

    // B. Fetch Restaurant Data
    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("place_id", id)
      .single();

    if (restaurantData) {
      setPlace(restaurantData);
      
      // STRICT LOGIC: Only use average_safety_rating. If it's missing or 0, pass 0.
      const safetyRating = restaurantData.average_safety_rating || 0;

      const score = restaurantData.wise_bites_score || calculateWiseBitesScore(
        restaurantData.ai_safety_score, 
        restaurantData.relevant_count, 
        safetyRating, // STRICTLY passing Safety Rating
        safeUserReviews 
      );
      setCalculatedScore(score);

      // Sort Google Reviews if they exist
      if (restaurantData.reviews && Array.isArray(restaurantData.reviews)) {
        const sorted = [...restaurantData.reviews].sort((a, b) => getDaysAgo(a.date) - getDaysAgo(b.date));
        setSortedGoogleReviews(sorted);
      }
    }

    setLoading(false);
  }, [id, supabase]);

  // NEW: Handle Review Submit -> Force AI Refresh
  const handleReviewSubmitted = async () => {
    setLoading(true); // Show loading state while AI thinks
    
    // 1. Force the AI to re-analyze immediately via API
    try {
        if (place) {
            await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    place_id: place.place_id,
                    name: place.name,
                    address: place.address,
                    city: place.city,
                    rating: place.rating,
                    force_refresh: true // <--- Point #6: Force refresh
                })
            });
        }
    } catch (e) {
        console.error("Failed to refresh AI analysis", e);
    }

    // 2. Re-fetch data from DB to show new score/reviews
    await fetchData();
  };

  // TRIGGER: This runs once when the page loads (or when ID changes)
  useEffect(() => {
    fetchData();
    checkUserStatus(); // Don't forget this if you're using the favorites/save logic
  }, [fetchData, checkUserStatus]);

  // --- HELPERS ---
  const getDaysAgo = (dateStr: string) => {
    if (!dateStr) return 99999;
    const cleanStr = dateStr.toLowerCase().replace("a ", "1 ").replace("an ", "1 ");
    const parts = cleanStr.split(" ");
    const val = parseInt(parts[0]);
    if (isNaN(val)) return 99999;
    let multiplier = 1;
    if (cleanStr.includes("day")) multiplier = 1;
    else if (cleanStr.includes("week")) multiplier = 7;
    else if (cleanStr.includes("month")) multiplier = 30;
    else if (cleanStr.includes("year")) multiplier = 365;
    return val * multiplier;
  };

  // UPDATED FRONTEND SCORING LOGIC (Matching Strict Python Rule)
  const calculateWiseBitesScore = (
    aiScore: number | null | undefined, 
    revCount: number | null | undefined, 
    safetyRating: number | null | undefined, 
    communityReviews: CommunityReview[]
  ) => {
    if (!aiScore) return null;
    
    // RULE 1: STRICT NULL CHECK
    // If no community reviews AND no relevant google reviews, return null.
    if (communityReviews.length === 0 && (!revCount || revCount === 0)) {
        return null;
    }
    
    let finalScore = 0;
    
    // MODE A: Community Data Exists
    if (communityReviews.length > 0) {
        const totalStars = communityReviews.reduce((acc, r) => acc + r.rating, 0);
        const avgCommunityRating = totalStars / communityReviews.length;
        const unsafeReports = communityReviews.filter(r => !r.did_feel_safe).length;
        const safeReports = communityReviews.filter(r => r.did_feel_safe).length;

        // 70% AI + 30% Community
        let total = aiScore * 7.0;
        total += (avgCommunityRating * 2.0) * 3.0; 
        total -= (unsafeReports * 15.0);
        total += (safeReports * 2.0);
        
        finalScore = total / 10.0;
    } 
    // MODE B: Cold Start (Relevant Google Data ONLY)
    else {
        const rating = safetyRating || 0; 
        const count = revCount || 0;
        
        let total = aiScore * 8.0;

        if (count > 3) {
            total += (rating * 4.0);
        } else {
            // New/Low Volume: + Rating * 2 
            total += (rating * 2.0);
        } 
        
        finalScore = total / 10.0;
    }

    return Math.max(1.0, Math.min(10.0, parseFloat(finalScore.toFixed(1))));
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 7.0) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 5.0) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;
  if (!place) return null;

  const totalReviews = (place.relevant_count || 0) + communityReviews.length;
  const latestDate = communityReviews.length > 0 
    ? new Date(communityReviews[0].created_at).toLocaleDateString() 
    : (sortedGoogleReviews.length > 0 ? sortedGoogleReviews[0].date : "N/A");

  return (
    <div className="min-h-screen bg-white">

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* REMOVED: Back to Search Button */}

        {/* HEADER */}
        <div className="border-b border-slate-100 pb-8 mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{place.name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-slate-600 mb-6">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {place.address}</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {place.rating} Stars on Google</span>
            </div>

            {/* Collapsible Hours Section */}
            <div className="flex items-start gap-3 text-slate-600 mb-6">
              <Clock className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                 <button 
                    onClick={() => setShowHours(!showHours)}
                    className="flex items-center gap-2 font-medium text-slate-900 hover:text-green-600 transition-colors"
                 >
                    Opening Hours
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showHours ? "rotate-180" : ""}`} />
                 </button>
                 
                 {/* The Dropdown Content */}
                 {showHours && (
                     <div className="mt-2 pl-2 border-l-2 border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200">
                        {place.hours_schedule && place.hours_schedule.length > 0 ? (
                            <ul className="text-sm space-y-1.5 text-slate-500">
                                {place.hours_schedule.map((day, i) => (
                                    <li key={i}>{day}</li>
                                ))}
                            </ul>
                        ) : (
                            <span className="text-sm text-slate-400">Hours not available</span>
                        )}
                     </div>
                 )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
                {/* SAVE / AVOID BUTTONS */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleToggleAction('save')}
                        disabled={actionLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                            userAction === 'saved'
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${userAction === 'saved' ? "fill-current" : ""}`} />
                        {userAction === 'saved' ? "Saved to Profile" : "Save to Profile"}
                    </button>

                    <button
                        onClick={() => handleToggleAction('avoid')}
                        disabled={actionLoading}
                        className={`p-2 rounded-full border transition-all ${
                            userAction === 'avoided'
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                        }`}
                        title="Add to avoid list"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="hidden sm:block w-px h-8 bg-slate-200 self-center mx-2" />

                <a 
                    href={`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(place.name + " " + place.address)}&query_place_id=${place.place_id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                    View on Google Maps <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </div>

        {/* SCORES GRID */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
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
                    <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /><span className="font-medium">{totalReviews} Relevant Reviews</span></div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span className="font-medium">Latest: {latestDate}</span></div>
                </div>
            </div>

            <div className="md:col-span-2 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    AI Safety Summary
                </h3>
                <p className="text-slate-600 leading-relaxed flex-grow">
                    {place.ai_summary || "No detailed analysis available yet."}
                </p>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Was this summary helpful?</p>
                    
                    {feedbackStatus === "none" ? (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleAiFeedback(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all"
                            >
                                <ThumbsUp className="w-4 h-4" /> Yes
                            </button>
                            <button 
                                onClick={() => handleAiFeedback(false)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all"
                            >
                                <ThumbsDown className="w-4 h-4" /> No
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm font-medium text-slate-500 animate-in fade-in slide-in-from-bottom-1 duration-300">
                           {feedbackStatus === "helpful" ? "Thanks for your feedback! 👍" : "Thanks! We'll improve this. 🔧"}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* REVIEWS SECTION */}
        <div className="space-y-12">
            <section className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5">
                   <div className="sticky top-24">
                      {/* PASSING EXISTING REVIEW:
                         If you want to enable editing, update your ReviewForm component
                         to accept 'existingReview' as a prop and use it to pre-fill the form.
                      */}
                      {/* @ts-ignore - Assuming you will update ReviewForm next */}
                      <ReviewForm 
                            placeId={place.place_id} 
                            onReviewSubmitted={handleReviewSubmitted} 
                            existingReview={currentUserReview} 
                        />
                   </div>
                </div>
                <div className="lg:col-span-7 space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Community Reviews
                        <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{communityReviews.length}</span>
                    </h2>
                    {communityReviews.length === 0 ? (
                        <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500"><p>Be the first to review this spot!</p></div>
                    ) : (
                        communityReviews.map((review) => (
                            <div key={review.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><User className="w-4 h-4 text-slate-400" /></div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">
                                                {/* Show 'You' if it's the current user */}
                                                {currentUserReview?.id === review.id ? "You" : "WiseBites Member"}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex text-amber-400">
                                                    {[...Array(review.rating)].map((_, i) => (<Star key={i} className="w-3 h-3 fill-current" />))}
                                                </div>
                                                <span className="text-xs text-slate-400 font-medium">• {new Date(review.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <Badge label="Dedicated GF" active={review.is_dedicated_gluten_free} />
                                    <Badge label="GF Menu" active={review.has_gf_menu} />
                                    <Badge label="Staff Knowledge" active={review.staff_knowledgeable} />
                                    <Badge label="Dedicated Fryer" active={review.has_dedicated_fryer} />
                                    <Badge label="Felt Safe" active={review.did_feel_safe} />
                                </div>
                                {review.comment && (<p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-3 rounded-lg">"{review.comment}"</p>)}
                            </div>
                        ))
                    )}
                </div>
            </section>

             <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Gluten-Free Menu</h2>
                <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500"><p>No menus uploaded yet.</p></div>
            </section>

            {sortedGoogleReviews.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">Mentioned Reviews <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">From Google</span></h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {sortedGoogleReviews.map((review: any, i: number) => (
                            <div key={i} className="p-5 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-3">
                                    <Quote className="w-8 h-8 text-green-100 shrink-0" />
                                    <div className="w-full">
                                        <p className="text-slate-700 text-sm leading-relaxed mb-3">"{review.text || review.snippet}"</p>
                                        <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-2">
                                            <span className="text-xs font-bold text-slate-900">{review.author || "Google User"}</span>
                                            <div className="flex items-center gap-3">
                                                {review.date && (<span className="text-[10px] uppercase font-bold text-slate-400">{review.date}</span>)}
                                                {review.rating && (<div className="flex text-amber-400">{[...Array(Math.round(review.rating))].map((_, i) => (<Star key={i} className="w-3 h-3 fill-current" />))}</div>)}
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

function Badge({ label, active }: { label: string, active: boolean }) {
    if (!active) return null;
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-100"><CheckCircle2 className="w-3 h-3" /> {label}</span>;
}