"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../utils/supabase/client";
import { Loader2, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState("");

  // Update Logic
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // The user is already "authenticated" because they clicked the magic link 
    // which set the session cookies automatically.
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setStatus('success');
      setLoading(false);
      // Optional: Redirect after 3 seconds
      setTimeout(() => router.push("/"), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-2">Set New Password</h1>
            <p className="text-slate-500 text-sm">Enter your new secure password below.</p>
        </div>

        {status === 'success' ? (
             <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-green-800 mb-2">Password Updated!</h3>
                <p className="text-sm text-green-700 mb-6">
                    Your password has been changed successfully. You will be redirected shortly.
                </p>
                <Link href="/" className="w-full block bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">
                    Go to Homepage
                </Link>
            </div>
        ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="password" 
                            required
                            minLength={6}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 transition-all font-medium"
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {status === 'error' && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {errorMsg}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading || password.length < 6}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                </button>
            </form>
        )}
      </div>
    </div>
  );
}