"use client";

import Link from "next/link";
import { ShieldCheck, Search, Star, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="text-xl font-bold tracking-tight">
          Wise<span className="text-green-600">Bites</span> 🌾
        </div>
        {/* Login/Signup buttons removed to reduce redundancy */}
      </nav>

      {/* HERO SECTION */}
      <header className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider mb-6 border border-green-100">
            <ShieldCheck className="w-4 h-4" /> The Celiac Restaurant Navigator
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8 leading-tight">
          Dine out with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
            with real information.
          </span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          WiseBites uses AI to analyze thousands of reviews, so you can find celiac-friendly spots without the guesswork.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 hover:scale-105 transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2">
                Start Exploring <ArrowRight className="w-5 h-5" />
            </Link>
        </div>
      </header>

      {/* FEATURE GRID */}
      <section className="bg-slate-50 py-20 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12">
                <Feature 
                    icon={<Search className="w-8 h-8 text-blue-500" />}
                    title="AI Analysis"
                    desc="We analyze reviews from WiseBites members, as well as Google reviews, so you don't have to, flagging hidden risks like 'shared fryers'."
                />
                <Feature 
                    icon={<ShieldCheck className="w-8 h-8 text-green-500" />}
                    title="Celiac Focused"
                    desc="Built specifically to help those with Celiac Disease, Gluten Sensitivity, and related conditions explore."
                />
                <Feature 
                    icon={<Star className="w-8 h-8 text-amber-500" />}
                    title="Community Powered"
                    desc="Real reports from fellow Celiacs carry more weight in our WiseBites scores."
                />
            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} WiseBites. Dine out with more confidence.</p>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">{icon}</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
            <p className="text-slate-600 leading-relaxed">{desc}</p>
        </div>
    );
}