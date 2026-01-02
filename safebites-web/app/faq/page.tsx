import { Shield, Lock, FileText, Sparkles, Database, Server, Zap, Filter, Infinity } from "lucide-react";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        
        <h1 className="text-3xl font-black text-slate-900 mb-2">FAQ & Privacy</h1>
        <p className="text-slate-500 mb-12">Common questions, terms of use, and our premium features.</p>

        <div className="space-y-16">
            
            {/* SECTION 1: THE "WHY" & WISEBITES+ */}
            <section>
                <div className="mb-8">
                    <h3 className="font-bold text-slate-900 text-lg mb-3">Why isn't this platform free?</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                        Great question. The truth is, <strong>quality data, AI, and product experience costs money.</strong> 
                    </p>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Every time you search and we analyze thousands of reviews to flag relevant reviws, we pay server and processing costs. To ensure WiseBites remains fast, accurate, and ad-free, we rely on subscriber support. This allows us to keep the platform running and constantly improve our detection algorithms without selling your data to advertisers.
                    </p><br></br>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Additonally, to ensure quality reviews and prevent spam, we let reviews from paid subscribers carry more weight in our analysis. This creates a positive feedback loop where supporting the platform directly improves the quality of data for everyone.
                    </p>
                </div>

                <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="w-5 h-5 text-amber-500 fill-current" />
                    <h2 className="text-xl font-bold text-slate-900">Introducing WiseBites+</h2>
                </div>
                
                {/* PRICING CARD */}
                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden mb-10">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-4">Unlock the full power of safe dining.</h3>
                        <p className="text-slate-300 mb-8 leading-relaxed max-w-lg">
                            Support the mission and get access to advanced planning tools designed for frequent travelers and foodies.
                        </p>
                        
                        <div className="grid sm:grid-cols-2 gap-8 mb-8">
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <Infinity className="w-4 h-4 text-green-400" />
                                    </div>
                                    <span className="font-bold text-sm">Unlimited AI Searches</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <Filter className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <span className="font-bold text-sm">Dedicated Gluten Filters</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <Database className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <span className="font-bold text-sm">Unlimited "Saved Places"</span>
                                </li>
                            </ul>
                            
                            <div className="bg-white/10 rounded-2xl p-6 border border-white/10 text-center flex flex-col justify-center">
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Launch Price</div>
                                <div className="text-4xl font-black text-white tracking-tight">$4.99<span className="text-lg font-medium text-slate-400">/mo</span></div>
                                <div className="text-xs text-green-400 font-bold mt-2 bg-green-500/10 inline-block px-2 py-1 rounded-full mx-auto">
                                    or $39.99/yr (Save 33%)
                                </div>
                            </div>
                        </div>
                        
                        <button className="w-full bg-white text-slate-900 font-black py-4 rounded-xl hover:bg-slate-100 transition-colors shadow-lg">
                            Upgrade to WiseBites+
                        </button>
                    </div>
                </div>

                {/* THE "SELL" COPY - BENEFITS BREAKDOWN */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            Never hit a limit
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Free users get 3 detailed AI safety scans per day. Premium users get <strong>unlimited access</strong>. Perfect for heavy research days when planning a vacation or a night out in a new city.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                            <Filter className="w-4 h-4 text-blue-500" />
                            Filter by "Gluten Needs"
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Stop scrolling. WiseBites+ lets you toggle filters like <strong>"Dedicated Fryer Only"</strong> or <strong>"100% GF Kitchen"</strong> to instantly remove risky options from your search results.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                            <Database className="w-4 h-4 text-green-500" />
                            Build your collections
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Create unlimited lists of favorites. Save places for "Date Night," "Chicago Trip," or "Lunch Spots" without hitting the free-tier cap.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                            <Server className="w-4 h-4 text-purple-500" />
                            Priority Infrastructure
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Your searches run on our fastest, highest-priority servers, ensuring your AI summaries load instantly, even during peak dining hours.
                        </p>
                    </div>
                </div>
            </section>

            <div className="w-full h-px bg-slate-100"></div>

            {/* SECTION 2: DATA & PRIVACY */}
            <section>
                <div className="flex items-center gap-2 mb-6">
                    <Lock className="w-5 h-5 text-green-600" />
                    <h2 className="text-xl font-bold text-slate-900">Data & Sources</h2>
                </div>
                
                <div className="space-y-8">
                    <div>
                        <h3 className="font-bold text-slate-900 mb-2">Where does the review data come from?</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            We aggregate data from two main sources: broad public datasets (like Google Reviews) and our own proprietary WiseBites community reviews. 
                            While Google gives us volume, we prioritize and heavily weight reviews left directly on WiseBites, as these come from verified community members specifically assessing gluten safety. Our goal is to grow our own database to become the single source of truth for the community.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900 mb-2">Why do you need to use reviews from Google?</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            The truth is, there really aren't many places with a large number of gluten reviews that are recent & relevant. Additionally, with our platform being new, we do not have existing user data we can rely on that. 
                            By leveraging existing Google reviews, it helps give us some data and information on restaurants. That being said, we place a more significant weight on reviews submitted on the WiseBites platform, because we
                            have a review form dedicated to answering critical questions or celiac and gluten-intolerant individuals. 
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900 mb-2">How do you use my data?</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            We do not sell your data. Your dietary preferences and search history are used strictly to personalize your search results (e.g., hiding shared fryers if you are Celiac) and to improve the accuracy of our AI model.
                        </p>
                    </div>
                </div>
            </section>

            {/* SECTION 3: TERMS & LIABILITY */}
            <section>
                <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-900">Terms & Disclaimer</h2>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-xs text-slate-500 leading-relaxed space-y-4">
                    <p>
                        <strong>WiseBites is an informational review aggregator, not a medical service.</strong>
                    </p>
                    <p>
                        The "WiseBites Score" and AI summaries are generated based on historical public data and user-submitted feedback. Restaurant conditions, ingredients, staff, and kitchen protocols can change at any time without notice. 
                    </p>
                    <p>
                        WiseBites does not guarantee the safety of any food item or establishment. By using this platform, you acknowledge that you assume full responsibility for your dining choices. We strongly recommend always speaking directly to a manager or chef regarding your specific allergens before consuming any food.
                    </p>
                </div>
            </section>

        </div>
      </div>
    </div>
  );
}