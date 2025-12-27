"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";

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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

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