"use client";

import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import { Star, Check, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface ReviewFormProps {
  placeId: string;
  onReviewSubmitted: () => void; // Callback to refresh the page/list after submit
}

export default function ReviewForm({ placeId, onReviewSubmitted }: ReviewFormProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form State
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  // The 4 WiseBites Questions
  const [hasGfMenu, setHasGfMenu] = useState(false);
  const [staffKnowledgeable, setStaffKnowledgeable] = useState(false);
  const [didFeelSafe, setDidFeelSafe] = useState(false);
  const [hasDedicatedFryer, setHasDedicatedFryer] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.from("user_reviews").insert({
        user_id: user.id,
        place_id: placeId,
        rating,
        comment,
        has_gf_menu: hasGfMenu,
        staff_knowledgeable: staffKnowledgeable,
        did_feel_safe: didFeelSafe,
        has_dedicated_fryer: hasDedicatedFryer,
      });

      if (error) {
        if (error.code === "23505") { // Unique violation code
            setError("You have already reviewed this place.");
        } else {
            throw error;
        }
      } else {
        setSuccess(true);
        // Reset form slightly just in case
        setComment("");
        setRating(0);
        onReviewSubmitted(); // Tell parent component to reload reviews
      }
    } catch (err) {
      setError("Failed to submit review. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-green-800">Review Submitted!</h3>
        <p className="text-green-700">Thank you for helping the community eat safer.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
        <p className="text-slate-500 mb-4">Join the community to share your experience.</p>
        <Link href="/login" className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors">
          Sign In to Review
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Write a Review</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Overall Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform active:scale-90"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredStar || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* The 4 WiseBites Questions */}
        <div className="grid sm:grid-cols-2 gap-4">
            <Toggle label="Dedicated GF Menu?" checked={hasGfMenu} onChange={setHasGfMenu} />
            <Toggle label="Staff asked about allergies?" checked={staffKnowledgeable} onChange={setStaffKnowledgeable} />
            <Toggle label="Did you feel safe?" checked={didFeelSafe} onChange={setDidFeelSafe} />
            <Toggle label="Dedicated fryer/space?" checked={hasDedicatedFryer} onChange={setHasDedicatedFryer} />
        </div>

        {/* Comment */}
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Detailed Feedback</label>
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us about your experience..."
                // ADDED 'text-slate-900' explicitly here:
                className="w-full p-3 text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none min-h-[100px]"
            />
        </div>

        <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Review"}
        </button>

      </form>
    </div>
  );
}

// Helper Component for the Yes/No Toggles
function Toggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <div 
            onClick={() => onChange(!checked)}
            className={`cursor-pointer p-3 rounded-lg border flex items-center justify-between transition-all ${
                checked 
                ? "bg-green-50 border-green-200" 
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
        >
            <span className={`text-sm font-medium ${checked ? "text-green-800" : "text-slate-600"}`}>
                {label}
            </span>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                checked ? "bg-green-500 border-green-500" : "border-slate-300"
            }`}>
                {checked && <Check className="w-3 h-3 text-white" />}
            </div>
        </div>
    )
}