"use client";

import Link from "next/link";
import { 
  Play, Search, Heart, Filter, MessageSquare, 
  ArrowRight, ShieldCheck, ListPlus, CheckCircle2 
} from "lucide-react";

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-white">
      
      {/* 1. HERO & VIDEO SECTION */}
      <div className="bg-slate-900 text-white pt-12 pb-20 px-6 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 to-slate-900 pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 text-center">
            <h1 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">
                Welcome to Wise<span className="text-green-500">Bites</span>
            </h1>
            <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                You’re joining a community dedicated to more easily finding gluten-free dining options.
                WiseBites aggregates reviews and leverages AI so you can gain insights on gluten-free options quickly.
            </p>

            {/* VIDEO PLACEHOLDER */}
            <div className="aspect-video bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-center relative group cursor-pointer overflow-hidden">
                {/* Replace this div with your <iframe src="..." /> later */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                <button className="relative w-16 h-16 bg-green-600 rounded-full flex items-center justify-center pl-1 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-8 h-8 text-white fill-white" />
                </button>
                <p className="absolute bottom-6 text-sm font-bold text-slate-300 tracking-wider uppercase">Watch the 1-min walkthrough</p>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

        {/* 2. HOW IT WORKS (3 STEPS) */}
        <section>
            <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-slate-900">How to use WiseBites</h2>
                <p className="text-slate-500">Three steps to finding your next meal.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                        <Search className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Search Smart</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Enter your search location and craving (search by cuisine type or restaurant name). Our AI scans reviews to highlight places with dedicated gluten-free options or knowledgeable staff.
                    </p>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                        <Filter className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Filter & Assess</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Use filters like "Dedicated Fryer" or "GF Menu" to narrow down your choices. Read the AI summary to understand the experiences of other diners.
                    </p>
                </div>

                {/* Step 3 */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                        <Heart className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Save Favorites</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Found a spot that looks promising? Save it to your Favorites or organize it into custom lists for future outings.
                    </p>
                </div>
            </div>
        </section>

        {/* 3. THE "WHY REVIEW" SECTION (CRITICAL) */}
        <section className="bg-slate-900 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                <div className="flex-shrink-0 bg-white/10 p-6 rounded-full border border-white/10 backdrop-blur-sm">
                    <MessageSquare className="w-12 h-12 text-green-400" />
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-white mb-3">Your Voice Powers the AI</h2>
                    <p className="text-slate-300 leading-relaxed mb-6">
                        WiseBites gets smarter with every review you leave. By sharing the details of your dining experience—whether positive or negative—you provide vital context for others.
                    </p>
                    <ul className="text-left space-y-3 mb-8 inline-block">
                        <li className="flex items-start gap-3 text-slate-200 text-sm">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>Was the establishment 100% gluten-free?</span>
                        </li>
                        <li className="flex items-start gap-3 text-slate-200 text-sm">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>Was there a dedicated menu?</span>
                        </li>
                        <li className="flex items-start gap-3 text-slate-200 text-sm">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>Was the staff knowledgeable about gluten-related issues?</span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        {/* 4. PREMIUM SPOTLIGHT */}
        <section className="border border-amber-100 bg-amber-50/50 rounded-3xl p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wide">
                        <ShieldCheck className="w-3 h-3" /> Enjoy Premium Access
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Experience Premium Features</h2>
                    <p className="text-slate-600 max-w-lg">
                        During this pilot, you have full access to our advanced tools. Try creating <strong>Custom Lists</strong> (like "Date Night" or "Vacation Spots") and using our <strong>Advanced Filters</strong> to refine your search.
                    </p>
                </div>
                
                {/* Visual of a custom list card */}
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 w-full max-w-xs transform rotate-2 hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center gap-3 mb-3 border-b border-slate-50 pb-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <ListPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">NYC Trip</p>
                            <p className="text-xs text-slate-400">4 places saved</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-2 bg-slate-100 rounded w-3/4" />
                        <div className="h-2 bg-slate-100 rounded w-1/2" />
                    </div>
                </div>
            </div>
        </section>

        {/* 5. CTA */}
        <div className="text-center pt-8 pb-12">
            <Link 
                href="/" 
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-xl text-lg shadow-xl shadow-slate-200 hover:shadow-green-200 hover:-translate-y-1 transition-all duration-300"
            >
                Start Exploring <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="mt-6 text-sm text-slate-500">
                Have questions or feedback? Email us directly at <br/>
                <a href="mailto:wisebitesapp@gmail.com" className="font-bold text-green-600 hover:underline">
                    wisebitesapp@gmail.com
                </a>
            </p>
        </div>

      </div>
    </div>
  );
}