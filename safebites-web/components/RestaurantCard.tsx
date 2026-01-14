"use client";

import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { 
  MapPin, Star, ShieldCheck, AlertTriangle, Clock, Info, Heart, 
  ThumbsDown, ThumbsUp, Loader2, X, Ban, ListPlus, Check, Plus, Lock 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import Link from "next/link";

interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  city: string | null;
  rating: number; 
  average_safety_rating?: number | null; 
  distance_miles: number | null;
  is_open_now: boolean | null;
  hours_schedule: string[];
  ai_safety_score?: number | null;
  ai_summary?: string | null;
  relevant_count?: number;
  wise_bites_score?: number | null; 
  is_cached?: boolean;
  favorite_id?: string;
  is_dedicated_gluten_free?: boolean;
}

// --- NEW PROPS INTERFACE ---
interface RestaurantCardProps {
  place: Restaurant;
  initialIsFavorite?: boolean;
  initialIsDisliked?: boolean;
  preloadedLists?: any[]; // Passed from parent
  isPremium?: boolean;
  preloadedMembership?: Set<string>;
}

export default function RestaurantCard({ 
    place, 
    initialIsFavorite = false, 
    initialIsDisliked = false,
    preloadedLists = [],
    isPremium = false,
    preloadedMembership = new Set()
}: RestaurantCardProps) {
    
  const supabase = createClient();
  const router = useRouter();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  // --- STATE: Data ---
  const [safetyScore, setSafetyScore] = useState<number | null>(place.ai_safety_score ?? null);
  const [relevantCount, setRelevantCount] = useState<number | null>(place.relevant_count ?? null);
  const [summary, setSummary] = useState<string | null>(place.ai_summary ?? null);
  const [loading, setLoading] = useState(!place.is_cached);
  const [hasFetched, setHasFetched] = useState(place.is_cached || false);
  const [wiseBitesScore, setWiseBitesScore] = useState<number | null>(place.wise_bites_score ?? null);

  // --- STATE: User Interaction (Initialized from Props) ---
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isDisliked, setIsDisliked] = useState(initialIsDisliked);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<"none" | "helpful" | "unhelpful">("none");

  // --- STATE: Custom Lists ---
  const [showListModal, setShowListModal] = useState(false);
  const [userLists, setUserLists] = useState<any[]>(preloadedLists); // Initialize with passed lists
  const [containingLists, setContainingLists] = useState<Set<string>>(preloadedMembership);
  const [listLoading, setListLoading] = useState(false);
  const [newListName, setNewListName] = useState("");

  // NOTE: Removed the per-card useEffect that checked status!
  // It is no longer needed because data is passed in.

  // --- HANDLERS ---
  const toggleFavorite = async () => {
    // Optimistic Update
    setIsFavorite(!isFavorite);
    if (isDisliked) setIsDisliked(false); // Can't be both
    
    // Background Sync
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("place_id", place.place_id);
    } else {
      if (isDisliked) await supabase.from("dislikes").delete().eq("user_id", user.id).eq("place_id", place.place_id);
      await supabase.from("favorites").insert({ user_id: user.id, place_id: place.place_id });
    }
  };

  const toggleDislike = async () => {
    setIsDisliked(!isDisliked);
    if (isFavorite) setIsFavorite(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    if (isDisliked) {
      await supabase.from("dislikes").delete().eq("user_id", user.id).eq("place_id", place.place_id);
    } else {
      if (isFavorite) await supabase.from("favorites").delete().eq("user_id", user.id).eq("place_id", place.place_id);
      await supabase.from("dislikes").insert({ user_id: user.id, place_id: place.place_id });
    }
  };

  const handleListIconClick = async () => {
      setShowListModal(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // USE PROP DIRECTLY - NO FETCHING
      if (isPremium) {
          // If for some reason we have 0 lists (e.g. fresh upgrade), we can try one fetch
          if (userLists.length === 0) {
               setListLoading(true);
               const { data: lists } = await supabase.from('custom_lists').select('*').eq('user_id', user.id).order('name');
               setUserLists(lists || []);
               setListLoading(false);
          }
          
          // REMOVED THE MEMBERSHIP FETCH HERE
          // We rely on 'containingLists' being initialized correctly from 'preloadedMembership'
          // This makes the UI instant and eliminates the "flash".
      }
  };

  const toggleListMembership = async (listId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isMember = containingLists.has(listId);
      const newSet = new Set(containingLists);

      if (isMember) {
          await supabase.from('list_items').delete().eq('list_id', listId).eq('place_id', place.place_id);
          newSet.delete(listId);
      } else {
          await supabase.from('list_items').insert({ list_id: listId, place_id: place.place_id });
          newSet.add(listId);
      }
      setContainingLists(newSet);
  };

  const createNewList = async () => {
      if (!newListName.trim()) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newList, error } = await supabase.from('custom_lists').insert({
          user_id: user.id,
          name: newListName.trim()
      }).select().single();

      if (newList && !error) {
          await supabase.from('list_items').insert({ list_id: newList.id, place_id: place.place_id });
          setUserLists([...userLists, newList]);
          setContainingLists(prev => new Set(prev).add(newList.id));
          setNewListName("");
      }
  };

  // --- 5. FETCH DATA (Lazy Load) ---
  useEffect(() => {
    if (inView && !hasFetched && !place.is_cached) {
      setHasFetched(true);
      setLoading(true);
      fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            place_id: place.place_id, 
            name: place.name, 
            address: place.address, 
            city: place.city, 
            rating: place.rating, 
            hours_schedule: place.hours_schedule,
            is_dedicated_gluten_free: place.is_dedicated_gluten_free
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setSafetyScore(data.ai_safety_score || 0);
          setSummary(data.ai_summary);
          setRelevantCount(data.relevant_count || 0);
          if (data.wise_bites_score && data.wise_bites_score > 0) setWiseBitesScore(data.wise_bites_score);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [inView, hasFetched, place]);

  const handleAiFeedback = async (isHelpful: boolean) => {
    if (feedbackStatus !== "none") return;
    setFeedbackStatus(isHelpful ? "helpful" : "unhelpful");
    try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("ai_feedback").insert({ place_id: place.place_id, user_id: user?.id || null, is_helpful: isHelpful });
    } catch (err) { console.error("Feedback error"); }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100";
    if (score >= 7.0) return "bg-blue-50 text-blue-700 border-blue-200";
    if (score >= 5.0) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div ref={ref} className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden relative flex flex-col h-full">
      
      {/* TOP: Restaurant Info */}
      <div className="p-5 pb-0 relative"> 
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
              {place.is_dedicated_gluten_free && (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wide border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> 100% Dedicated GF
                </span>
              )}
            <Link href={`/restaurant/${place.place_id}`} className="group/link block">
              <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1 group-hover/link:text-green-700 group-hover/link:underline transition-colors break-words">
                {place.name}
              </h2>
            </Link>
            <p className="text-slate-500 text-sm mb-3 truncate">{place.address}</p>
            
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mb-4">
              <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-xs font-medium shrink-0">
                <MapPin className="w-3 h-3" /> {place.city}
              </span>
              {place.distance_miles !== null && (
                <span className="flex items-center gap-1 text-xs shrink-0">
                  <Clock className="w-3 h-3 text-slate-400" /> {place.distance_miles} mi
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md shrink-0">
                <Star className="w-3 h-3 fill-current" /> {place.rating}
              </span>
            </div>
          </div>
        </div>

        {/* --- BUTTONS --- */}
        <div className="flex items-center justify-end gap-2 mb-4 sm:mb-0 sm:absolute sm:top-4 sm:right-4 sm:z-10 relative">
            
            {/* ADD TO LIST BUTTON */}
            <div className="relative">
                <button onClick={handleListIconClick} className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm" title="Add to Custom List">
                   <ListPlus className="w-5 h-5 text-slate-400 hover:text-blue-500" />
                </button>
                
                {/* --- LIST POPUP MODAL --- */}
                {showListModal && (
                    <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowListModal(false)} />
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                        {listLoading ? (
                             <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                        ) : !isPremium ? (
                             // LOCKED STATE
                             <div className="text-center p-2">
                                 <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2"><Lock className="w-5 h-5 text-amber-600" /></div>
                                 <h4 className="font-bold text-slate-900 text-sm">Premium Feature</h4>
                                 <p className="text-xs text-slate-500 mb-3">Upgrade to create custom lists like "Date Night" or "NYC Trip".</p>
                                 <button onClick={() => alert("Upgrade Flow")} className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg">Upgrade Now</button>
                             </div>
                        ) : (
                             // LIST SELECTION STATE
                             <>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Save to List</h4>
                                <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                                    {userLists.map(list => {
                                        const isSelected = containingLists.has(list.id);
                                        return (
                                            <button 
                                                key={list.id}
                                                onClick={() => toggleListMembership(list.id)}
                                                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm font-medium transition-colors ${isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"}`}
                                            >
                                                <span className="truncate">{list.name}</span>
                                                {isSelected && <Check className="w-4 h-4" />}
                                            </button>
                                        );
                                    })}
                                    {userLists.length === 0 && <p className="text-xs text-slate-400 italic p-2">No lists yet.</p>}
                                </div>
                                <div className="border-t border-slate-100 pt-2 flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="New List..." 
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs outline-none focus:border-blue-500 text-slate-900"
                                        value={newListName}
                                        onChange={(e) => setNewListName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && createNewList()}
                                    />
                                    <button onClick={createNewList} disabled={!newListName.trim()} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"><Plus className="w-4 h-4" /></button>
                                </div>
                             </>
                        )}
                    </div>
                    </>
                )}
            </div>

            <button onClick={toggleFavorite} disabled={actionLoading} className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm" title="Save to Favorites">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Heart className={`w-5 h-5 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-400 hover:text-red-400"}`} />}
            </button>
            <button onClick={toggleDislike} disabled={actionLoading} className={`p-2 rounded-full border shadow-sm transition-all ${isDisliked ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`} title="Add to Avoid List">
                <Ban className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* BOTTOM: AI Analysis Area */}
      <div className="bg-slate-50/50 border-t border-slate-100 p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between">
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

            <div className="flex-1">
                {loading ? (
                <div className="space-y-2 mt-1">
                    <div className="h-2 bg-slate-200 rounded w-1/3 animate-pulse" />
                    <div className="h-2 bg-slate-200 rounded w-2/3 animate-pulse" />
                </div>
                ) : !place.is_cached && !hasFetched ? (
                <p className="text-xs text-slate-400 italic flex items-center gap-2 mt-2"><Info className="w-3 h-3" /> Scroll to trigger AI analysis...</p>
                ) : relevantCount === 0 ? (
                <div className="flex items-start gap-2 mt-1"><AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" /><p className="text-sm text-slate-500">No reviews found mentioning gluten or celiac-related issues.</p></div>
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

                    <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase opacity-60">Helpful?</span>
                        {feedbackStatus === "none" ? (
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleAiFeedback(true)} className="p-1 hover:bg-black/5 rounded transition-colors opacity-70 hover:opacity-100" title="Yes"><ThumbsUp className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleAiFeedback(false)} className="p-1 hover:bg-black/5 rounded transition-colors opacity-70 hover:opacity-100" title="No"><ThumbsDown className="w-3.5 h-3.5" /></button>
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
            className="mt-4 block w-full text-center py-2.5 rounded-xl bg-white border-2 border-slate-100 text-slate-600 hover:border-green-500 hover:text-green-700 font-bold text-sm transition-all"
        >
            View Full Details & Reviews
        </Link>
      </div>
    </div>
  );
}