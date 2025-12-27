"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { Loader2, CheckCircle2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [preference, setPreference] = useState<"celiac" | "intolerance" | "allergy" | "other">("celiac");

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
        setPreference(data.dietary_preference || "celiac");
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
      .update({
        full_name: fullName,
        birthday: birthday,
        dietary_preference: preference,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    setSaving(false);
    if (!error) {
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) return (
    // FIX 1: Ensure loading state also has a white background
    <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-slate-400" />
    </div>
  );

  return (
    // FIX 2: FORCE WHITE BACKGROUND (min-h-screen bg-white)
    <div className="min-h-screen bg-white">
        <div className="max-w-xl mx-auto px-4 py-12">
            
            {/* HEADER SECTION */}
            <h1 className="text-3xl font-black text-black mb-2">Profile Settings</h1>
            <p className="text-slate-700 font-medium mb-8">Manage your account details and dietary preferences.</p>

            {message && (
                <div className="mb-6 p-4 bg-green-50 text-green-900 border border-green-200 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-green-700" />
                    {message}
                </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-8">
                
                {/* SECTION 1: Personal Info */}
                <div className="space-y-4">
                    <h2 className="font-black text-lg text-black border-b border-slate-200 pb-2">Personal Information</h2>
                    <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1">Full Name</label>
                        <input 
                            required type="text" 
                            value={fullName} onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-black placeholder:text-slate-400 focus:border-green-600 focus:ring-0 outline-none transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1">Birthday</label>
                        <input 
                            required type="date" 
                            value={birthday} onChange={(e) => setBirthday(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-black outline-none focus:border-green-600 focus:ring-0 font-medium"
                        />
                    </div>
                </div>

                {/* SECTION 2: Preferences */}
                <div className="space-y-4">
                    <h2 className="font-black text-lg text-black border-b border-slate-200 pb-2">Dietary Needs</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { id: "celiac", label: "Celiac Disease", desc: "Strict protocols required (dedicated fryers, etc)." },
                            { id: "intolerance", label: "Gluten Intolerant", desc: "Avoid gluten, but cross-contact is less critical." },
                            { id: "allergy", label: "Wheat Allergy", desc: "Strict avoidance of wheat." },
                            { id: "other", label: "Other", desc: "Supporting friend or loved one." }
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setPreference(opt.id as any)}
                                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                                    preference === opt.id 
                                    ? "border-green-600 bg-green-50 ring-1 ring-green-600" 
                                    : "border-slate-200 hover:border-slate-400 bg-white"
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-bold ${preference === opt.id ? "text-green-900" : "text-black"}`}>{opt.label}</span>
                                    {preference === opt.id && <CheckCircle2 className="w-5 h-5 text-green-700" />}
                                </div>
                                <p className={`text-xs font-medium ${preference === opt.id ? "text-green-800" : "text-slate-600"}`}>{opt.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                    {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>

            </form>
        </div>
    </div>
  );
}