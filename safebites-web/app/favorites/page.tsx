"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Trash2, ShieldCheck, Clock, ArrowDownAZ, Heart, Ban, Folder, Plus, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Generic interface for items in either list
interface PlaceItem {
  id: string; // ID of the favorite/dislike record
  created_at: string;
  restaurants: {
    place_id: string;
    name: string;
    city: string;
    wise_bites_score: number | null; 
    ai_safety_score: number | null; 
    is_dedicated_gluten_free?: boolean;
  };
}

// interface for custom lists
interface CustomList {
  id: string;
  name: string;
  created_at: string;
  item_count?: number; 
}

type TabType = 'saved' | 'avoid' | 'lists';
type SortType = 'recent' | 'safety' | 'alpha';

export default function FavoritesPage() {
  const supabase = createClient();
  const router = useRouter();
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<TabType>('saved');
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);

  // Data State
  const [savedPlaces, setSavedPlaces] = useState<PlaceItem[]>([]);
  const [avoidPlaces, setAvoidPlaces] = useState<PlaceItem[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);

  // List Detail State
  const [selectedList, setSelectedList] = useState<CustomList | null>(null);
  const [listItems, setListItems] = useState<PlaceItem[]>([]); // Items inside a specific custom list

  // UI State
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("recent");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");

  // --- HELPER: Fetch Lists (Reusable) ---
  // Accepts userId arg so we can call it immediately in useEffect before state settles
  const fetchCustomLists = async (userId?: string) => {
    const targetId = userId || user?.id;
    if (!targetId) return;

    const { data: lists } = await supabase
      .from("custom_lists")
      .select("*")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false });

    if (lists) {
        // Count items manually
        const listsWithCounts = await Promise.all(lists.map(async (list) => {
            const { count } = await supabase.from("list_items").select("*", { count: 'exact', head: true }).eq("list_id", list.id);
            return { ...list, item_count: count || 0 };
        }));
        setCustomLists(listsWithCounts);
    }
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // 1. Check Premium Status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();
      const premiumStatus = profile?.is_premium || false;
      
      setIsPremium(premiumStatus);
      setUser(user);

      const querySelect = `
        id, created_at,
        restaurants (place_id, name, city, wise_bites_score, ai_safety_score, is_dedicated_gluten_free)
      `;

      // 2. OPTIMIZATION: Fetch ALL lists in parallel (Saved, Avoid, AND Custom)
      const promises = [
        supabase.from("favorites").select(querySelect).eq("user_id", user.id),
        supabase.from("dislikes").select(querySelect).eq("user_id", user.id),
      ];

      // If premium, add the custom lists fetch to the queue immediately
      if (premiumStatus) {
          // We can't use the helper here easily because of the count logic, 
          // so we'll just let the helper run after the main batch or call it directly.
          // Actually, let's just call the helper function immediately after the main fetch 
          // to keep the code clean, or simply await it here.
      }

      const [savedRes, avoidRes] = await Promise.all(promises);

      if (savedRes.data) setSavedPlaces(savedRes.data as any[]);
      if (avoidRes.data) setAvoidPlaces(avoidRes.data as any[]);
      
      // 3. Trigger Custom List Fetch Immediately if Premium
      if (premiumStatus) {
          await fetchCustomLists(user.id);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [router, supabase]);


  const fetchListDetails = async (listId: string) => {
      setListItems([]); // <--- 1. CLEAR OLD DATA INSTANTLY
      setDetailLoading(true);
      
      const { data } = await supabase
        .from("list_items")
        .select(`
            id, added_at,
            restaurants (place_id, name, city, wise_bites_score, ai_safety_score, is_dedicated_gluten_free)
        `)
        .eq("list_id", listId)
        .order("added_at", { ascending: false });
      
      if (data) {
          const formattedItems = data.map((item: any) => ({
              id: item.id,
              created_at: item.added_at,
              restaurants: item.restaurants
          }));
          setListItems(formattedItems);
      }
      setDetailLoading(false);
  };

  const handleTabChange = (tab: TabType) => {
      setActiveTab(tab);
      setSelectedList(null);
      // Removed lazy load check here since we load upfront now!
  };

  const handleCreateList = async () => {
      if (!newListName.trim()) {
          alert("Please enter a name for your list.");
          return;
      }
      if (!user) {
          console.error("User is missing from state.");
          return;
      }

      try {
          const { error } = await supabase.from("custom_lists").insert({
              user_id: user.id,
              name: newListName.trim()
          });

          if (error) {
              console.error("Supabase Error:", error);
              alert(`Failed to create list: ${error.message}`);
              return;
          }

          setNewListName("");
          setShowCreateModal(false);
          fetchCustomLists(user.id); // Refresh list

      } catch (err) {
          console.error("Unexpected Error:", err);
          alert("An unexpected error occurred.");
      }
  };

  const handleDeleteList = async (listId: string) => {
      if (!confirm("Delete this list? Items inside will remain in the database.")) return;
      await supabase.from("custom_lists").delete().eq("id", listId);
      if (selectedList?.id === listId) setSelectedList(null);
      fetchCustomLists(user.id);
  };

  const removePlace = async (id: string) => {
    if (activeTab === 'lists') {
        await supabase.from("list_items").delete().eq("id", id);
        setListItems(prev => prev.filter(item => item.id !== id));
        fetchCustomLists(user.id); // Refresh counts
        return;
    }

    const table = activeTab === 'saved' ? "favorites" : "dislikes";
    const setState = activeTab === 'saved' ? setSavedPlaces : setAvoidPlaces;

    setState((prev) => prev.filter((item) => item.id !== id));
    await supabase.from(table).delete().eq("id", id);
  };

  // --- DERIVED DATA ---
  let currentList = activeTab === 'saved' ? savedPlaces : avoidPlaces;
  if (activeTab === 'lists' && selectedList) currentList = listItems;

  // --- SORTING LOGIC ---
  const sortedList = [...currentList].sort((a, b) => {
    if (sortBy === "recent") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "safety") {
        const scoreA = a.restaurants.wise_bites_score || 0;
        const scoreB = b.restaurants.wise_bites_score || 0;
        return scoreB - scoreA;
    } else {
        const nameA = a.restaurants.name || "";
        const nameB = b.restaurants.name || "";
        return nameA.localeCompare(nameB);
    }
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-slate-400" /></div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        
        {/* --- TABS --- */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-8 w-full md:w-fit mx-auto md:mx-0 overflow-x-auto no-scrollbar">
            <button
                onClick={() => handleTabChange('saved')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'saved' ? "bg-white text-green-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
            >
                <Heart className={`w-4 h-4 ${activeTab === 'saved' ? 'fill-current' : ''}`} /> 
                Saved Places ({savedPlaces.length})
            </button>
            <button
                onClick={() => handleTabChange('avoid')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'avoid' ? "bg-white text-red-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
            >
                <Ban className="w-4 h-4" /> 
                Avoid List ({avoidPlaces.length})
            </button>
            <button
                onClick={() => handleTabChange('lists')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'lists' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
            >
                <Folder className={`w-4 h-4 ${activeTab === 'lists' ? 'fill-current' : ''}`} /> 
                My Lists
            </button>
        </div>


        {/* HEADER & CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
                {activeTab === 'lists' && !selectedList ? (
                     <h1 className="text-3xl font-black text-black mb-2">My Collections</h1>
                ) : activeTab === 'lists' && selectedList ? (
                     <div className="flex items-center gap-3">
                         <button onClick={() => setSelectedList(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100"><ArrowLeft className="w-6 h-6" /></button>
                         <h1 className="text-3xl font-black text-black mb-0">{selectedList.name}</h1>
                     </div>
                ) : (
                    <h1 className="text-3xl font-black text-black mb-2">
                        {activeTab === 'saved' ? "My Saved Places" : "My Avoid List"}
                    </h1>
                )}
                
                <p className="text-slate-700 font-medium">
                    {activeTab === 'saved' ? "Your personal collection of safe spots." : 
                     activeTab === 'avoid' ? "Places you've flagged to stay away from." :
                     !selectedList ? "Organize your spots into custom folders." : 
                     `${sortedList.length} places in this list.`}
                </p>
            </div>

            {/* SORT BUTTONS */}
            {!(activeTab === 'lists' && !selectedList) && (
                <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
                    <button onClick={() => setSortBy("recent")} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${sortBy === "recent" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-900"}`}><Clock className="w-4 h-4" /> <span className="hidden sm:inline">Recent</span></button>
                    <button onClick={() => setSortBy("safety")} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${sortBy === "safety" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-900"}`}><ShieldCheck className="w-4 h-4" /> <span className="hidden sm:inline">Safety</span></button>
                    <button onClick={() => setSortBy("alpha")} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${sortBy === "alpha" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-900"}`}><ArrowDownAZ className="w-4 h-4" /> <span className="hidden sm:inline">A-Z</span></button>
                </div>
            )}
            
            {/* DELETE LIST BUTTON */}
            {activeTab === 'lists' && selectedList && (
                 <button onClick={() => handleDeleteList(selectedList.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto md:ml-0" title="Delete List">
                    <Trash2 className="w-5 h-5" />
                </button>
            )}
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        
        {/* SCENARIO 1: CUSTOM LISTS TAB (PREMIUM CHECK) */}
        {activeTab === 'lists' && !isPremium && (
             <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center max-w-md mx-auto px-6">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 border border-amber-200">
                        <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Unlock Custom Lists</h2>
                    <p className="text-slate-500 mb-8">
                        Organize your gluten-free life. Create unlimited lists like "NYC Trip", "Date Night", or "Best Pizza" with WiseBites Premium.
                    </p>
                    <button onClick={() => alert("Upgrade Flow")} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5">
                        Upgrade to Premium
                    </button>
                </div>
            </div>
        )}

        {/* SCENARIO 2: CUSTOM LISTS DASHBOARD (FOLDERS) */}
        {activeTab === 'lists' && isPremium && !selectedList && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Create New Button */}
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="aspect-[4/3] flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                    <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                        <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                    </div>
                    <span className="font-bold text-slate-500 group-hover:text-blue-600">Create New List</span>
                </button>

                {/* List Cards */}
                {customLists.map(list => (
                    <div 
                        key={list.id} 
                        onClick={() => { setSelectedList(list); fetchListDetails(list.id); }}
                        className="aspect-[4/3] bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                    >
                        <Folder className="w-10 h-10 text-blue-100 fill-blue-50 group-hover:text-blue-500 group-hover:fill-blue-100 transition-colors" />
                        <div>
                            <h3 className="font-bold text-slate-800 truncate text-lg">{list.name}</h3>
                            <p className="text-xs text-slate-400 font-medium">{list.item_count} places</p>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* SCENARIO 3: ITEM LIST (Saved, Avoid, or List Detail) */}
        {((activeTab !== 'lists') || (activeTab === 'lists' && selectedList && isPremium)) && (
            
            // --- 2. ADD LOADING CHECK HERE ---
            detailLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sortedList.map((item) => {
                        const r = item.restaurants;
                        const score = r.wise_bites_score ?? 0;
                        
                        let scoreColor = "bg-slate-100 text-slate-600 border-slate-200";
                        if (score >= 8) scoreColor = "bg-green-50 text-green-800 border-green-200";
                        else if (score >= 5) scoreColor = "bg-yellow-50 text-yellow-800 border-yellow-200";
                        else if (score > 0) scoreColor = "bg-red-50 text-red-800 border-red-200";

                        return (
                            <div key={item.id} className="group bg-white border-2 border-slate-100 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-sm hover:shadow-md flex flex-col">
                                <div className="flex justify-between items-start gap-4 mb-4">
                                    <div>
                                        <h3 className="font-bold text-xl text-black leading-tight mb-1 line-clamp-2">{r.name}</h3>
                                        <p className="text-sm font-medium text-slate-500 flex items-center gap-1">{r.city || "Unknown City"}</p>
                                        {r.is_dedicated_gluten_free && (
                                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide mt-2">
                                                <ShieldCheck className="w-3 h-3" /> Dedicated GF
                                            </span>
                                        )}
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-xl font-black text-sm shadow-sm border shrink-0 ${scoreColor}`}>
                                        {score > 0 ? `${score}/10` : "NR"}
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                                    <Link href={`/restaurant/${r.place_id}`} className="text-sm font-bold text-slate-900 hover:text-green-600 flex items-center gap-1 transition-colors">
                                        View Details <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => removePlace(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remove">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* EMPTY STATES */}
                    {sortedList.length === 0 && !detailLoading && (
                        <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            {activeTab === 'lists' ? (
                                <>
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100"><Folder className="w-8 h-8 text-slate-300" /></div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">This list is empty</h3>
                                    <Link href="/" className="text-blue-600 font-bold hover:underline mt-2 inline-block">Find places to add</Link>
                                </>
                            ) : activeTab === 'saved' ? (
                                <>
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100"><Heart className="w-8 h-8 text-slate-300 fill-slate-100" /></div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">No saved places yet</h3>
                                    <Link href="/" className="bg-black text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-all mt-4 inline-block">Find a place</Link>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100"><Ban className="w-8 h-8 text-slate-300" /></div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">Your avoid list is empty</h3>
                                    <Link href="/" className="bg-black text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-800 transition-all mt-4 inline-block">Back to search</Link>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )
        )}
      </div>

      {/* CREATE LIST MODAL */}
      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Create New List</h3>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="e.g. NYC Pizza, Date Night..." 
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 outline-none mb-6"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
                      <button onClick={handleCreateList} className="flex-1 py-3 font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200">Create</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}