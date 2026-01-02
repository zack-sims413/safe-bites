import { Search, ShieldCheck, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        
        {/* HERO */}
        <div className="text-center mb-16">
            <h1 className="text-4xl font-black text-slate-900 mb-6 leading-tight">
                Finding clear gluten information shouldn't be harder than finding the restaurant itself.
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Stop keyword-searching through thousands of reviews. WiseBites consolidates the data you need to dine with confidence.
            </p>
        </div>

        {/* MISSION GRID */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <ShieldCheck className="w-8 h-8 text-green-600 mb-4" />
                <h3 className="font-bold text-slate-900 mb-2">Information First</h3>
                <p className="text-sm text-slate-600">We analyze reviews for critical details: dedicated fryers, cross-contamination protocols, and staff knowledge.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <Heart className="w-8 h-8 text-rose-500 mb-4" />
                <h3 className="font-bold text-slate-900 mb-2">Built with Love</h3>
                <p className="text-sm text-slate-600">Created by a husband for his wife, to bring spontaneity back to dining out after discovering she couldn't eat gluten.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <Search className="w-8 h-8 text-amber-500 mb-4" />
                <h3 className="font-bold text-slate-900 mb-2">AI Powered</h3>
                <p className="text-sm text-slate-600">We turn thousands of messy reviews into a single, digestible "WiseBites Score" so you can decide instantly.</p>
            </div>
        </div>

        {/* STORY TEXT */}
        <div className="prose prose-slate max-w-none space-y-12">
            <section>
                <h2 className="text-2xl font-black text-slate-900 mb-4">Our Story</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                    Hi, I’m <strong>Zack Sims</strong>. I created WiseBites after my wife was diagnosed with a severe intolerance to gluten.
                </p>
                <p className="text-slate-600 leading-relaxed mb-4">
                    Before the diagnosis, we loved to travel and eat out spontaneously. Afterwards, that spontaneity became very challenging. Every dinner date or trip became a research project. I found myself spending hours scrolling through Google Maps, keyword-searching "gluten" over and over, trying to piece together if a place was actually safe or just had a salad on the menu.
                </p>
                <p className="text-slate-600 leading-relaxed mb-4">
                    I realized that existing platforms were fragmented. Some had great reviews but no safety info; others had safety info but were outdated or had limited reviews. There was no single source of truth.
                </p>
                <p className="text-slate-600 leading-relaxed">
                    Working in Machine Learning & AI, I decided to build a solution for us. I wanted a tool that could read all those reviews <em>for me</em> and tell us exactly where we could eat. As I built it, I realized this wouldn't just help my wife—it could help the entire Celiac and gluten-sensitive community reclaim their time and their freedom to travel.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-black text-slate-900 mb-4">How it Works</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                    WiseBites combines data from sources like Google Reviews with the specialized, community-powered reviews found only on our platform.
                </p>
                <p className="text-slate-600 leading-relaxed">
                    We leverage AI to read these thousands of data points and summarize them into something digestible. By analyzing review volume, sentiment, and specific gluten-related keywords (like "dedicated fryer", "cross-contamination", etc.), we generate a <strong>WiseBites Score</strong>. This score places a heavy emphasis on reviews from our own community, ensuring that the needs of Celiac and gluten-intolerant diners are prioritized over general food preferences.
                </p>
            </section>
        </div>

      </div>
    </div>
  );
}