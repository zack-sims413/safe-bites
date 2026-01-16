"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    setErrorMsg("");

    // 1. Trigger Supabase Reset Flow
    // We explicitly tell Supabase where to send them back to (/update-password)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('success');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm">
        
        {/* Header */}
        <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-2">Reset Password</h1>
            <p className="text-slate-500 text-sm">Enter your email to receive a secure link to reset your password.</p>
        </div>

        {/* Success State */}
        {status === 'success' ? (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-green-800 mb-2">Check your email</h3>
                <p className="text-sm text-green-700 mb-6">
                    We sent a reset link to <strong>{email}</strong>. Click the link in that email to set a new password.
                </p>
                <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-slate-900">
                    ← Back to Login
                </Link>
            </div>
        ) : (
            // Form State
            <form onSubmit={handleReset} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="email" 
                            required
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 transition-all font-medium"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                {status === 'error' && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
                        {errorMsg}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading || !email}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                </button>

                <div className="text-center pt-2">
                    <Link href="/login" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                        Cancel and go back
                    </Link>
                </div>
            </form>
        )}
      </div>
    </div>
  );
}