"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
// RELATIVE IMPORT: Adjust if your folder structure is different
import { createClient } from "../utils/supabase/client"; 
import { useRouter } from "next/navigation";
import { LogOut, Heart, Search } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
    router.push("/login");
  };

  return (
    <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* LEFT: Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-green-600 rounded-lg p-1.5 group-hover:bg-green-700 transition-colors">
              <Search className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">
              Wise<span className="text-green-600">Bites</span>
            </span>
          </Link>

          {/* RIGHT: Navigation Links */}
          <div className="flex items-center gap-6">
            
            {/* Favorites Link (Only show if logged in) */}
            {user && (
              <Link 
                href="/favorites" 
                className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-green-600 transition-colors"
              >
                <Heart className="w-4 h-4" />
                My Saved Places
              </Link>
            )}

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400 hidden sm:block">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              // --- UPDATED SECTION: LOGGED OUT STATE ---
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md"
                >
                  Sign Up
                </Link>
              </div>
              // ----------------------------------------
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}