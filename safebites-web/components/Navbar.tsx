"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { createClient } from "../utils/supabase/client";
import { useRouter, usePathname } from "next/navigation"; // Added usePathname
import { LogOut, Heart, Search, User, Settings, ChevronDown, BookOpen, HelpCircle, Star } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname(); // Hooks into route changes

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

          {/* RIGHT: Navigation */}
          <div className="flex items-center gap-3 sm:gap-6">
            
            {user ? (
              <>
                {/* 1. SAVED PLACES */}
                <Link 
                  href="/favorites" 
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-green-600 transition-colors p-2"
                  title="My Saved Places"
                >
                  <Heart className="w-5 h-5" />
                  <span className="hidden sm:block">Saved</span>
                </Link>

                {/* 2. USER DROPDOWN */}
                <div className="relative" ref={menuRef}>
                  <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {user.email?.slice(0, 2).toUpperCase()}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-slate-50">
                        <p className="text-xs text-slate-400 font-medium uppercase">Signed in as</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
                      </div>
                      
                      <Link 
                        href="/profile" 
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-green-600 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Profile Settings
                      </Link>

                      {/* NEW: About & FAQ Links */}
                      <Link 
                        href="/about" 
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-green-600 transition-colors"
                      >
                        <BookOpen className="w-4 h-4" /> 
                        About WiseBites
                      </Link>

                      <Link 
                        href="/faq" 
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-green-600 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" /> 
                        FAQ & Privacy
                      </Link>

                      <Link 
                        href="/my-reviews" 
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-green-600 transition-colors"
                      >
                        <Star className="w-4 h-4" /> 
                        My Reviews
                      </Link>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // LOGGED OUT STATE
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Log in
                </Link>
                <Link href="/signup" className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}