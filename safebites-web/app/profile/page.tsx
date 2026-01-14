"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "../../utils/supabase/client";
import { Loader2, CheckCircle2, Save, AlertTriangle, Search, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// 1. Rename the main logic to "ProfileContent"
function ProfileContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Now this is safe because we are inside Suspense
  const isSetupMode = searchParams.get("alert") === "setup_needed";

  // Form State
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [preference, setPreference] = useState<
    "symptomatic_celiac" | "asymptomatic_celiac" | "gluten_intolerant" | "wheat_allergy" | "other"
  >("symptomatic_celiac");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setBirthday(data.birthday || "");
        setPreference(data.dietary_preference || "symptomatic_celiac");
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        birthday: birthday,
        dietary_preference: preference,
        updated_at: new Date().toISOString()
      });

    setSaving(false);
    
    if (!error) {
      setMessage("Profile updated successfully! You're ready to eat.");
      router.refresh(); 
    } else {
      console.error("Profile update failed");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
        <div className="max-w-xl mx-auto px-4 py-12">
            
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 mb-2">Profile Settings</h1>
                <p className="text-slate-600 font-medium">Manage your account details and dietary needs.</p>
            </div>

            {/* Alert: Action Required */}
            {(!preference || isSetupMode) && !message && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-amber-900 text-sm">Action Required</h3>
                        <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                            To ensure the best product experience, we need to know your dietary needs before you can search for restaurants.
                        </p>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {message && (
                <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-700" />
                        <span className="font-bold text-green-900">{message}</span>
                    </div>
                    
                    <Link 
                        href="/"
                        className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all shadow-sm"
                    >
                        <Search className="w-4 h-4" />
                        Start Searching Now
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-8">
                <div className="space-y-4">
                    <h2 className="font-black text-lg text-slate-900 border-b border-slate-100 pb-2">Personal Information</h2>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                        <input 
                            required type="text" 
                            value={fullName} onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-green-600 focus:ring-0 outline-none transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Birthday</label>
                        <input 
                            required type="date" 
                            value={birthday} onChange={(e) => setBirthday(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 outline-none focus:border-green-600 focus:ring-0 font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="font-black text-lg text-slate-900 border-b border-slate-100 pb-2">Dietary Needs</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { 
                              id: "symptomatic_celiac", 
                              label: "Symptomatic Celiac", 
                              desc: "I have Celiac Disease and react to cross-contamination." 
                            },
                            { 
                              id: "asymptomatic_celiac", 
                              label: "Asymptomatic Celiac", 
                              desc: "I have Celiac Disease but do not feel immediate symptoms." 
                            },
                            { 
                              id: "gluten_intolerant", 
                              label: "Gluten Intolerant / Sensitivity", 
                              desc: "I react to gluten and have concerns about cross-contamination." 
                            },
                            { 
                              id: "wheat_allergy", 
                              label: "Wheat Allergy", 
                              desc: "I strictly avoid wheat." 
                            },
                            { 
                              id: "other", 
                              label: "Other", 
                              desc: "Supporting a friend or loved one." 
                            }
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setPreference(opt.id as any)}
                                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                                    preference === opt.id 
                                    ? "border-green-600 bg-green-50 ring-1 ring-green-600" 
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-bold ${preference === opt.id ? "text-green-900" : "text-slate-900"}`}>{opt.label}</span>
                                    {preference === opt.id && <CheckCircle2 className="w-5 h-5 text-green-700" />}
                                </div>
                                <p className={`text-xs font-medium ${preference === opt.id ? "text-green-800" : "text-slate-500"}`}>{opt.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                    {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
            </form>
        </div>
    </div>
  );
}

// 2. The Exported Wrapper
export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}