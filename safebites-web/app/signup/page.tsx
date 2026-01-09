"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck, Users, Search, Mail, LogOut } from "lucide-react"; // Added LogOut icon
import Link from "next/link";
import GoogleSignInButton from "../../components/GoogleSignInButton";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Form State
  const [step, setStep] = useState<1 | 2>(1); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Data State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null); // New State to track email

  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [preference, setPreference] = useState<
    "symptomatic_celiac" | "asymptomatic_celiac" | "gluten_intolerant" | "wheat_allergy" | "other"
  >("symptomatic_celiac")
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserEmail(session.user.email || null);
        setStep(2);
      }
    };
    checkSession();
  }, [supabase.auth]);

  // NEW: Handle Logout during Sign Up
  const handleLogoutReset = async () => {
      await supabase.auth.signOut();
      setStep(1);
      setCurrentUserEmail(null);
      setEmail("");
      setPassword("");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        const { data, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback?next=/signup`,
            }
        });

        if (authError) throw authError;

        if (data.user && !data.session) {
            setVerificationSent(true);
            return;
        }

        if (data.session) {
            setCurrentUserEmail(data.user?.email || "");
            setStep(2);
        }

    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!agreedToTerms) {
        setError("You must agree to the Terms & Disclaimer to continue.");
        setLoading(false);
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No session found. Please log in.");

        const { error: profileError } = await supabase
            .from("profiles")
            .insert({
                id: user.id, 
                full_name: fullName,
                birthday: birthday,
                dietary_preference: preference
            });

        if (profileError) throw profileError;

        router.push("/");
        
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  if (verificationSent) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            <div className="max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900">Check your inbox!</h2>
                <p className="text-slate-500 text-lg">
                    We sent a verification link to <span className="font-bold text-slate-900">{email}</span>.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                    Please click the link in that email to activate your account. Once verified, you can log in and complete your profile.
                </div>
                <button 
                    onClick={() => router.push("/login")}
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all"
                >
                    Back to Login
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      
      {/* LEFT SIDE: Feature Overview */}
      <div className="hidden md:flex flex-col justify-between bg-slate-900 p-12 text-white">
        <div>
            <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center font-bold text-slate-900">W</div>
                <span className="text-xl font-bold">WiseBites</span>
            </div>
            <h1 className="text-4xl font-black mb-6 leading-tight">Find safe food, faster.</h1>
            <p className="text-slate-400 text-lg mb-12">Stop guessing. Start eating with confidence using our 3-layer safety check.</p>
        
            <div className="space-y-8">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <ShieldCheck className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">AI Safety Scores</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Our AI scans thousands of reviews to detect hidden cross-contamination risks instantly.</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Community Verified</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">See reviews from real people with Celiac and Gluten Intolerance, not just generic foodies.</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <Search className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Personalized Search</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Filter specifically for dedicated fryers, gluten-free menus, and knowledgeable staff.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="text-xs text-slate-600 mt-12">
            © {new Date().getFullYear()} WiseBites. Built for the GF community.
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="flex flex-col justify-center px-8 py-12 md:px-16">
        <div className="max-w-md mx-auto w-full">
            
            {/* PROGRESS BAR */}
            <div className="flex items-center gap-2 mb-8">
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? "bg-green-600" : "bg-slate-100"}`} />
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? "bg-green-600" : "bg-slate-100"}`} />
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {/* --- STEP 1: CREDENTIALS --- */}
            {step === 1 && (
                <form onSubmit={handleSignUp} className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
                        <p className="text-slate-500">Start your safe dining journey today.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input 
                                required type="email" 
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input 
                                required type="password" 
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                placeholder="Min. 6 characters"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Get Started <ArrowRight className="w-4 h-4" /></>}
                    </button>

                    {/* --- 2. ADDED GOOGLE BUTTON HERE --- */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <GoogleSignInButton nextUrl="/profile" />
                    {/* ----------------------------------- */}

                    <p className="text-center text-slate-500 text-sm">
                        Already have an account? <Link href="/login" className="text-green-600 font-bold hover:underline">Log in</Link>
                    </p>
                </form>
            )}

            {/* --- STEP 2: PROFILE & PREFERENCES --- */}
            {step === 2 && (
                <form onSubmit={handleSaveProfile} className="space-y-6 animate-in slide-in-from-right duration-300">
                    
                    {/* NEW: USER STATUS BANNER */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {currentUserEmail?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signing up as</span>
                                <span className="text-xs font-bold text-slate-900 truncate">{currentUserEmail}</span>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={handleLogoutReset}
                            className="text-xs text-red-500 font-bold hover:text-red-700 flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-3 h-3" /> Not you?
                        </button>
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome! 👋</h2>
                        <p className="text-slate-500">Tell us a bit about yourself so we can personalize your results.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input 
                                required type="text" 
                                value={fullName} onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-green-500"
                                placeholder="e.g. Sarah Jenkins"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Birthday</label>
                            <input 
                                required type="date" 
                                value={birthday} onChange={(e) => setBirthday(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:border-green-500"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium text-slate-900 mb-3">What fits your needs best?</label>
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
                                  desc: "I avoid gluten, but cross-contact is less critical." 
                                },
                                { 
                                  id: "wheat_allergy", 
                                  label: "Wheat Allergy", 
                                  desc: "I strictly avoid wheat." 
                                },
                                { 
                                  id: "other", 
                                  label: "Other", 
                                  desc: "Supporting friend or loved one." 
                                }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setPreference(opt.id as any)}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                                        preference === opt.id 
                                        ? "border-green-600 bg-green-50/50 ring-1 ring-green-600" 
                                        : "border-slate-100 hover:border-slate-300 bg-white"
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-bold ${preference === opt.id ? "text-green-800" : "text-slate-900"}`}>{opt.label}</span>
                                        {preference === opt.id && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                                    </div>
                                    <p className="text-xs text-slate-500">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* --- LIABILITY WAIVER SECTION --- */}
                    <div className="pt-4 pb-2">
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input 
                                type="checkbox"
                                required
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                            <span className="text-xs text-slate-500 leading-relaxed">
                                <span className="font-bold text-slate-700">I acknowledge that WiseBites is for informational purposes only and does not constitute medical advice.</span> I assume full responsibility for my dining choices and understand that restaurant conditions can change at any time.
                            </span>
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-green-200"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Complete Profile"}
                    </button>
                </form>
            )}

        </div>
      </div>
    </div>
  );
}