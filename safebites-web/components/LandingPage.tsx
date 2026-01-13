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
  Check,
  X,
  Info,
} from "lucide-react";

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
            href="/login"
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

        {/* Gentle disclaimer without sounding scary */}
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
              clear summary of risks and positive signals.
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

      {/* FREE VS PREMIUM */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Start free. Upgrade when you want deeper insight.
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              The free tier helps you discover places quickly. Premium unlocks deeper filtering, unlimited lists, and the
              strongest community signals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <PlanCard
              badge="Free"
              title="Free account"
              price="$0"
              subtitle="Great for quick discovery"
              features={[
                "Search restaurants and view gluten-related summaries",
                "Basic review insight score and key signals",
                "Favorites & avoid list (limited)",
                "Daily search limit",
              ]}
              ctaHref="/signup"
              ctaLabel="Create free account"
              secondaryText="No credit card required"
              highlight={false}
            />

            <PlanCard
              badge="Premium"
              title="WiseBites Premium"
              price="$4.99/mo"
              subtitle="Or $39.99/year (save ~33%)"
              features={[
                "Advanced gluten & cross-contamination filters",
                "Unlimited custom lists & collections",
                "Stronger weighting of high-signal WiseBites reports",
                "Better discovery for travel and new places",
              ]}
              ctaHref="/signup"
              ctaLabel="Unlock Premium"
              secondaryText="Cancel anytime"
              highlight={true}
            />
          </div>

          <div className="mt-10 text-center text-xs text-slate-500">
            We never guarantee a restaurant is safe. WiseBites summarizes information to help you decide.
          </div>
        </div>
      </section>

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
      <footer className="py-12 text-center text-slate-400 text-sm border-t border-slate-100">
        <p>&copy; {new Date().getFullYear()} WiseBites. Dine out with more confidence.</p>
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

function PlanCard({
  badge,
  title,
  price,
  subtitle,
  features,
  ctaHref,
  ctaLabel,
  secondaryText,
  highlight,
}: {
  badge: string;
  title: string;
  price: string;
  subtitle: string;
  features: string[];
  ctaHref: string;
  ctaLabel: string;
  secondaryText: string;
  highlight: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl border p-8 shadow-sm bg-white",
        highlight
          ? "border-green-200 ring-2 ring-green-100"
          : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={[
            "text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border",
            highlight
              ? "bg-green-50 text-green-700 border-green-100"
              : "bg-slate-50 text-slate-700 border-slate-100",
          ].join(" ")}
        >
          {badge}
        </span>
      </div>

      <h3 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
        {title}
      </h3>

      <div className="mt-3 flex items-end gap-2">
        <div className="text-4xl font-black text-slate-900">{price}</div>
        <div className="text-sm text-slate-500 pb-1">{subtitle}</div>
      </div>

      <ul className="mt-6 space-y-3 text-slate-700">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 mt-[1px]" />
            <span className="leading-relaxed">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Link
          href={ctaHref}
          className={[
            "w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-lg transition",
            highlight
              ? "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200"
              : "bg-slate-900 text-white hover:bg-slate-800",
          ].join(" ")}
        >
          {ctaLabel} <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="mt-2 text-xs text-slate-500 text-center">
          {secondaryText}
        </div>
      </div>

      {/* Subtle reassurance: informational only */}
      <div className="mt-6 text-xs text-slate-500 flex items-start gap-2">
        <Info className="w-4 h-4 mt-[2px]" />
        <p>
          Insights are derived from reviews and community reports and may be incomplete or outdated.
        </p>
      </div>
    </div>
  );
}
