"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import GoogleSignInButton from "../../components/GoogleSignInButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;

        // FIX: Force a hard refresh.
        // This clears the Next.js client cache and guarantees the 
        // middleware sees the new session cookie immediately.
        window.location.href = "/"; 
        
    } catch (err: any) {
        setError(err.message);
        setLoading(false); // Only stop loading if there is an error
    } 
    // Remove the 'finally' block that turns off loading.
    // We want it to keep spinning until the page hard-refreshes.
};

  const handleSignUp = async () => {
    // 1. Manual Validation
    if (!email || !password) {
      setMessage("Please enter an email and password first.");
      return;
    }
    
    setLoading(true);
    setMessage("");
    
    // 2. Sign up logic
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This ensures the user is redirected to home after clicking the email link
        // (Only matters if email confirmation is ON, but good practice)
        emailRedirectTo: `${location.origin}/`, 
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      // If auto-confirm is ON (which we just did), you can log them in or ask them to sign in
      setMessage("Account created! You can now Sign In.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome Back</h1>
        <p className="text-slate-500 mb-8">Sign in to save your safe spots.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-6">
            {/* UPDATED: Flex container to hold Label + Forgot Link */}
            <div className="flex justify-between items-center mb-2">
                <label className="block text-slate-500 text-sm font-bold">Password</label>
                <Link 
                    href="/forgot-password" 
                    className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline"
                >
                    Forgot Password?
                </Link>
            </div>
            
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 outline-none transition-all font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* --- ERROR MESSAGE DISPLAY --- */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium animate-in fade-in zoom-in-95">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>
                {error === "Invalid login credentials" 
                  ? "Incorrect email or password. Please try again." 
                  : error}
              </span>
            </div>
          )}

          {message && (
            <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
          </button>
        </form>

        {/* --- 2. GOOGLE BUTTON SECTION HERE --- */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <GoogleSignInButton />
          </div>
        </div>
        {/* --------------------------------------------- */}

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <Link 
            href="/signup"
            className="text-green-600 font-bold hover:underline"
          >
            Sign up
          </Link>
        </div>
        
      </div>
    </div>
  );
}