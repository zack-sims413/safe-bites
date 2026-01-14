"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createClient } from "../utils/supabase/client";
import { useRouter, usePathname } from "next/navigation"; // Added usePathname
import { LogOut, Heart, Search, User, Settings, ChevronDown, BookOpen, HelpCircle, Star, ChevronLeft } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname(); // Hooks into route changes

  // 1. DEFINE ROOT PAGES
  // These are the "Main Tabs" where we want to show the Logo, NOT the back button.
  const rootPages = ["/", "/favorites", "/profile", "/faq", "/about", "/my-reviews", "/login", "/signup"];
  
  // If the current path is NOT in this list (e.g. "/restaurant/123"), show the back button.
  const showBackButton = !rootPages.includes(pathname);
  
  // Hide Navbar on Login/Signup pages if you want (Optional, but often cleaner)
  // if (pathname === "/login" || pathname === "/signup") return null;

  useEffect(() => {
    // 1. Get user immediately
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();

    // 2. Listen for ANY auth change (Login, Logout, Auto-refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    router.refresh();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-16">
      <div className="max-w-5xl mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          
          {/* LEFT SIDE: Back Button + Logo */}
          <div className="flex items-center gap-3">
            
            {/* 1. Back Button (Conditionally Rendered) */}
            {showBackButton && (
              <button 
                onClick={() => router.back()} 
                className="p-2 -ml-2 text-slate-500 hover:text-green-600 hover:bg-slate-100 rounded-full transition-all"
                title="Go Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* 2. Logo (ALWAYS Rendered) */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-tr from-green-600 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:shadow-md transition-all group-hover:scale-105">
                W
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                Wise<span className="text-green-600">Bites</span>
              </span>
            </Link>
          </div>

          {/* RIGHT SIDE (Keep exactly as is) */}
          <div className="flex items-center gap-4">
            {/* ... Your existing User Menu / Login buttons code ... */}
            {/* Paste the rest of your existing return code here for the right side menu */}
             {user ? (
              <>
                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-6 mr-4">
                  <Link href="/" className={`text-sm font-medium transition-colors ${pathname === "/" ? "text-green-600" : "text-slate-500 hover:text-slate-900"}`}>Search</Link>
                  <Link href="/favorites" className={`text-sm font-medium transition-colors ${pathname === "/favorites" ? "text-green-600" : "text-slate-500 hover:text-slate-900"}`}>Favorites</Link>
                </div>

                {/* User Dropdown */}
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 p-1 pr-3 rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all bg-white">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-white shadow-sm">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 origin-top-right">
                      <div className="px-4 py-3 border-b border-slate-50 mb-1">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Signed in as</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
                      </div>

                      <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-green-600 transition-colors">
                        <Settings className="w-4 h-4" /> Profile Settings
                      </Link>
                      <Link href="/favorites" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-green-600 transition-colors">
                        <Heart className="w-4 h-4" /> My Favorites
                      </Link>
                      <Link href="/faq" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-green-600 transition-colors">
                        <HelpCircle className="w-4 h-4" /> FAQ & Privacy
                      </Link>
                      <Link href="/my-reviews" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-green-600 transition-colors">
                        <Star className="w-4 h-4" /> My Reviews
                      </Link>
                      
                      <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Log in</Link>
                <Link href="/signup" className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">Sign Up</Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}