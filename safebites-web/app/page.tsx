"use client";

import { useState, useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Import your two views
import LandingPage from "@/components/LandingPage";
import SearchDashboard from "@/components/SearchDashboard";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // 1. Check active session on load
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setLoading(false);
    };
    checkSession();

    // 2. Listen for auth changes (Login/Logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Loading State (Brief spinner while we check Supabase)
  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
    );
  }

  // --- TRAFFIC COP LOGIC ---
  
  // If NO session -> Show Marketing Landing Page
  if (!session) {
    return <LandingPage />;
  }

  // If YES session -> Show the App (SearchDashboard)
  // We wrap it in Suspense because your SearchDashboard uses useSearchParams()
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>}>
        <SearchDashboard />
    </Suspense>
  );
}