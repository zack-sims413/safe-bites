"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Star, MapPin, Calendar, Edit2, Trash2, AlertCircle, Utensils, CheckCircle2, ShieldCheck, ChefHat } from "lucide-react";
import Link from "next/link";

interface RestaurantData {
  name: string;
  city: string | null;
  address: string;
}

interface Review {
  id: string;
  place_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  // Safety Booleans
  has_gf_menu: boolean;
  staff_knowledgeable: boolean;
  did_feel_safe: boolean;
  has_dedicated_fryer: boolean;
  // The joined data from the 'restaurants' table comes in as an object or array
  restaurants: RestaurantData | null;
}

export default function MyReviewsPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // We select all columns from user_reviews (*)
      // AND we join the 'restaurants' table to get the name and city
      const { data, error } = await supabase
        .from("user_reviews")
        .select(`
          *,
          restaurants (
            name,
            city,
            address
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reviews:", error);
        setError("Could not load your reviews.");
      } else {
        // Supabase returns the joined data, but TypeScript sometimes needs help asserting it
        setReviews(data as any[] || []);
      }
      setLoading(false);
    };
    fetchReviews();
  }, [supabase, router]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    const { error } = await supabase
        .from("user_reviews")
        .delete()
        .eq("id", reviewId);

    if (!error) {
        setReviews(reviews.filter(r => r.id !== reviewId));
    } else {
        alert("Failed to delete review.");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-black mb-2">My Reviews</h1>
        <p className="text-slate-700 font-medium mb-8">Manage the feedback you've shared with the community.</p>

        {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6 flex items-center gap-2 font-medium border border-red-100">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
        )}

        {reviews.length === 0 && !error ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                    <Star className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No reviews yet</h3>
                <p className="text-slate-500 mb-8 max-w-xs mx-auto">Start rating places to help others find safe food.</p>
                <Link href="/" className="bg-black text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-all shadow-lg">
                    Find a place
                </Link>
            </div>
        ) : (
            <div className="space-y-6">
                {reviews.map((review) => {
                    // Extract restaurant name safely
                    const rName = review.restaurants?.name || "Unknown Restaurant";
                    const rCity = review.restaurants?.city;

                    return (
                        <div key={review.id} className="bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-slate-300 transition-colors group relative">
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-xl text-black mb-1 line-clamp-1">
                                        {rName}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(review.created_at).toLocaleDateString()}
                                        {rCity && (
                                            <>
                                                <span className="text-slate-300">•</span>
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {rCity}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                                    review.rating >= 4 ? "bg-green-50 border-green-100 text-green-800" :
                                    review.rating === 3 ? "bg-yellow-50 border-yellow-100 text-yellow-800" :
                                    "bg-red-50 border-red-100 text-red-800"
                                }`}>
                                    <span className="font-black text-lg">{review.rating}</span>
                                    <Star className="w-4 h-4 fill-current" />
                                </div>
                            </div>

                            {/* USER COMMENT */}
                            {review.comment && (
                                <p className="text-slate-700 font-medium leading-relaxed mb-5 bg-slate-50/50 p-3 rounded-lg border border-slate-50">
                                    "{review.comment}"
                                </p>
                            )}

                            {/* SAFETY BADGES */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {review.has_gf_menu && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide border border-emerald-100">
                                        <Utensils className="w-3 h-3" /> GF Menu
                                    </span>
                                )}
                                {review.has_dedicated_fryer && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wide border border-blue-100">
                                        <ChefHat className="w-3 h-3" /> Dedicated Fryer
                                    </span>
                                )}
                                {review.staff_knowledgeable && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wide border border-purple-100">
                                        <ShieldCheck className="w-3 h-3" /> Staff Knew
                                    </span>
                                )}
                                {review.did_feel_safe && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wide border border-green-100">
                                        <CheckCircle2 className="w-3 h-3" /> Felt Safe
                                    </span>
                                )}
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                <Link 
                                    href={`/restaurant/${review.place_id}`}
                                    className="text-xs font-bold text-slate-500 hover:text-green-600 flex items-center gap-1 transition-colors mr-auto"
                                >
                                    View Page <ArrowRightIcon className="w-3 h-3" />
                                </Link>

                                <Link 
                                    href={`/restaurant/${review.place_id}?edit=${review.id}`}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Review"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Link>

                                <button 
                                    onClick={() => handleDelete(review.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Review"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
}

// Simple helper icon for the View Page link
function ArrowRightIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>;
}