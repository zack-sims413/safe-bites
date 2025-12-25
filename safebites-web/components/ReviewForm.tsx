"use client";

import { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import { Star, Check, AlertCircle, Loader2 } from "lucide-react";

interface ReviewFormProps {
  placeId: string;
  onReviewSubmitted: () => void;
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
    has_gf_menu: boolean;
    staff_knowledgeable: boolean;
    did_feel_safe: boolean;
    has_dedicated_fryer: boolean;
  } | null;
}

export default function ReviewForm({ placeId, onReviewSubmitted, existingReview }: ReviewFormProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState({
    has_gf_menu: false,
    staff_knowledgeable: false,
    did_feel_safe: false,
    has_dedicated_fryer: false,
  });

  // --- EFFECT: Pre-fill form if editing ---
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || "");
      setTags({
        has_gf_menu: existingReview.has_gf_menu,
        staff_knowledgeable: existingReview.staff_knowledgeable,
        did_feel_safe: existingReview.did_feel_safe,
        has_dedicated_fryer: existingReview.has_dedicated_fryer,
      });
    }
  }, [existingReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setMessage({ type: 'error', text: "Please select a star rating." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage({ type: 'error', text: "You must be logged in to leave a review." });
        setLoading(false);
        return;
      }

      const reviewData = {
        place_id: placeId,
        user_id: user.id,
        rating,
        comment,
        ...tags,
      };

      let error;

      if (existingReview) {
        // UPDATE existing review
        const { error: updateError } = await supabase
          .from("user_reviews")
          .update(reviewData)
          .eq("id", existingReview.id);
        error = updateError;
      } else {
        // INSERT new review
        const { error: insertError } = await supabase
          .from("user_reviews")
          .insert(reviewData);
        error = insertError;
      }

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: existingReview ? "Review updated successfully!" : "Review submitted successfully!" 
      });
      
      // Clear message after 2 seconds
      setTimeout(() => {
          setMessage(null);
          // Only clear form if it was a NEW review
          if (!existingReview) {
            setRating(0);
            setComment("");
            setTags({
                has_gf_menu: false,
                staff_knowledgeable: false,
                did_feel_safe: false,
                has_dedicated_fryer: false,
            });
          }
          onReviewSubmitted();
      }, 2000);

    } catch (err) {
      console.error("Error submitting review:", err);
      setMessage({ type: 'error', text: "Failed to submit review. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-1">
        {existingReview ? "Edit Your Review" : "Leave a Review"}
      </h3>
      <p className="text-slate-500 text-sm mb-6">
        {existingReview ? "Update your experience for others." : "Share your experience with the community."}
      </p>

      {message && (
        <div className={`p-3 mb-4 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Stars */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Safety Checks</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TagCheckbox 
              label="Gluten-Free Menu Available" 
              checked={tags.has_gf_menu} 
              onChange={(c) => setTags(p => ({ ...p, has_gf_menu: c }))} 
            />
            <TagCheckbox 
              label="Staff Knowledgeable" 
              checked={tags.staff_knowledgeable} 
              onChange={(c) => setTags(p => ({ ...p, staff_knowledgeable: c }))} 
            />
            <TagCheckbox 
              label="Dedicated Fryer/Area" 
              checked={tags.has_dedicated_fryer} 
              onChange={(c) => setTags(p => ({ ...p, has_dedicated_fryer: c }))} 
            />
            <TagCheckbox 
              label="I Felt Safe Eating Here" 
              checked={tags.did_feel_safe} 
              onChange={(c) => setTags(p => ({ ...p, did_feel_safe: c }))} 
            />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Comment (Optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            // UPDATED: Added text-slate-900 for dark text color
            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none h-32 text-sm"
            placeholder="What did you order? How was the service?"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white font-medium py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {existingReview ? "Update Review" : "Submit Review"}
        </button>
      </form>
    </div>
  );
}

function TagCheckbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: (c: boolean) => void }) {
  return (
    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
      checked ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 hover:border-slate-300 text-slate-600"
    }`}>
      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
        checked ? "bg-green-500 border-green-500" : "bg-white border-slate-300"
      }`}>
        {checked && <Check className="w-3.5 h-3.5 text-white" />}
      </div>
      <input 
        type="checkbox" 
        className="hidden" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      <span className="text-sm font-medium select-none">{label}</span>
    </label>
  );
}