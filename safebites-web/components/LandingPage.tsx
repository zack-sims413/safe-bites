"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Star,
  ArrowRight,
  Filter,
  Sparkles,
  Smartphone,
  Info,
} from "lucide-react";
// IMPORT THE PRICING SECTION WE BUILT
import PricingSection from "./PricingSection"; 

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* HERO SECTION */}
      <header className="max-w-5xl mx-auto px-6 pt-16 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider mb-6 border border-green-100">
          <ShieldCheck className="w-4 h-4" />
          Gluten-related insights from real restaurant reviews
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
          Dine out with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
            fewer surprises
          </span>
          .
        </h1>

        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
          WiseBites uses AI to summarize gluten-related signals from Google reviews and the WiseBites community—surfacing
          common concerns like shared fryers, staff knowledge, and dedicated gluten-free kitchens so you don’t
          have to read dozens of reviews yourself.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 hover:scale-[1.02] transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
          >
            Create a free account <ArrowRight className="w-5 h-5" />
          </Link>

          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-slate-900 font-bold text-lg border border-slate-200 hover:bg-slate-50 transition flex items-center justify-center gap-2"
          >
            See how it works <Sparkles className="w-5 h-5" />
          </a>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Free to start • No credit card required • Installable on your phone (PWA)
        </div>

        <div className="mt-8 max-w-3xl mx-auto text-xs text-slate-500 flex items-start justify-center gap-2">
          <Info className="w-4 h-4 mt-[2px] flex-shrink-0" />
          <p>
            WiseBites provides informational insights only and does not verify restaurant operations. Dining decisions are
            made at your discretion.
          </p>
        </div>
      </header>

      {/* PROBLEM SECTION */}
      <section className="py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              “Gluten-free” doesn’t always tell the full story.
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
              Many restaurants offer gluten-free options, but cross-contamination, shared fryers, and inconsistent staff
              training are often buried deep in reviews—or not mentioned at all. WiseBites helps surface what matters so
              you can decide with more confidence.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-slate-50 py-20 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">How WiseBites helps you decide</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              A well-informed dining decision shouldn’t require reading 80 reviews. WiseBites turns scattered feedback into a
              clear summary of past concerns and positive signals.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <Feature
              icon={<Search className="w-8 h-8 text-blue-500" />}
              title="Review intelligence"
              desc="We pull gluten-related mentions from Google reviews and WiseBites users, then summarize themes so you can quickly spot red flags and strong signals."
            />
            <Feature
              icon={<Filter className="w-8 h-8 text-green-500" />}
              title="Gluten-centric filters"
              desc="Filter by what actually matters: dedicated gluten-free, dedicated fryer, knowledgeable staff, and gluten-free menu availability."
            />
            <Feature
              icon={<Star className="w-8 h-8 text-amber-500" />}
              title="Community-weighted scoring"
              desc="We score restaurants using review quality and volume, with extra weight given to WiseBites community reports—especially high-signal, gluten-specific feedback."
            />
          </div>

          <div className="mt-14 flex items-center justify-center gap-3 text-slate-600">
            <Smartphone className="w-5 h-5" />
            <p className="text-sm">
              Install WiseBites to your home screen like an app—no App Store required.
            </p>
          </div>
        </div>
      </section>

      {/* --- REPLACED: PRICING SECTION --- */}
      {/* We now use the shared component so logic is consistent everywhere */}
      <PricingSection />

      {/* FINAL CTA */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-3xl bg-gradient-to-r from-green-600 to-emerald-500 text-white p-10 md:p-14 text-center shadow-lg">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
              Less guessing. More clarity.
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
              Create a free account and start exploring restaurants with gluten-related insights summarized for you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-slate-900 font-bold text-lg hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                Create a free account <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/40 text-white font-bold text-lg hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                Learn more <Sparkles className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} WiseBites. Dine out with more confidence.</p>
          
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}