"use client";

import { useState } from "react";
import { Check, Info, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">
            Start free. Upgrade for deeper insight.
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            The free tier helps you discover places quickly. Premium unlocks deeper filtering, unlimited custom lists, and no daily search limits.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* FREE CARD */}
          <PlanCard
            badge="Free"
            title="Free account"
            price="$0"
            subtitle="Forever free"
            features={[
              "Search restaurants & view summaries",
              "Basic insight scores",
              "Daily search limit",
            ]}
            ctaHref="/signup"
            ctaLabel="Create free account"
            secondaryText="No credit card required"
            highlight={false}
            // Free card doesn't need the toggle
            showToggle={false}
          />

          {/* PREMIUM CARD */}
          <PlanCard
            badge="Premium"
            title="WiseBites+"
            price={billingCycle === "monthly" ? "$4.99/mo" : "$39.99/yr"}
            subtitle={
              billingCycle === "monthly" 
                ? "Or $39.99/year (save ~33%)" 
                : "Billed annually ($3.33/mo)"
            }
            features={[
              "No daily search limit",
              "Dedicated fryer & facility search",
              "Unlimited custom lists",
              "Priority access to new features",
            ]}
            ctaHref="/signup"
            ctaLabel="Unlock Premium"
            secondaryText="Cancel anytime"
            highlight={true}
            priceId={
              billingCycle === "monthly"
                ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY
                : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY
            }
            // Enable Toggle for this card
            showToggle={true}
            billingCycle={billingCycle}
            setBillingCycle={setBillingCycle}
          />
        </div>
      </div>
    </section>
  );
}

// --- INTERNAL COMPONENT: PlanCard ---
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
  priceId,
  showToggle,
  billingCycle,
  setBillingCycle,
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
  priceId?: string;
  showToggle?: boolean;
  billingCycle?: "monthly" | "yearly";
  setBillingCycle?: (cycle: "monthly" | "yearly") => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!priceId) {
      router.push(ctaHref);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (response.status === 401) {
        router.push("/signup");
        return;
      }

      if (!response.ok) {
        console.error("Checkout API error");
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL received");
        setLoading(false);
      }
    } catch (error) {
      console.error("Network error during checkout:", error);
      setLoading(false);
    }
  };

  return (
    <div
      className={[
        "rounded-3xl border p-8 shadow-sm bg-white flex flex-col h-full relative",
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

      <h3 className="text-2xl font-black tracking-tight text-slate-900 mb-4">
        {title}
      </h3>

      {/* --- TOGGLE PLACEMENT (Only renders if showToggle is true) --- */}
      {showToggle && billingCycle && setBillingCycle && (
        <div className="mb-4 inline-flex bg-slate-100 p-1 rounded-lg self-start">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                billingCycle === "yearly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Yearly (-33%)
            </button>
        </div>
      )}
      {/* ----------------------------------------------------------- */}

      <div className="flex items-end gap-2">
        <div className="text-4xl font-black text-slate-900">{price}</div>
        <div className="text-sm text-slate-500 pb-1">{subtitle}</div>
      </div>

      <ul className="mt-6 space-y-3 text-slate-700 flex-grow">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 mt-[1px] shrink-0" />
            <span className="leading-relaxed">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {priceId ? (
          <button
            onClick={handleCheckout}
            disabled={loading}
            className={[
              "w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-lg transition",
              highlight
                ? "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200"
                : "bg-slate-900 text-white hover:bg-slate-800",
            ].join(" ")}
          >
            {loading ? <Loader2 className="animate-spin" /> : ctaLabel}{" "}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        ) : (
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
        )}

        <div className="mt-2 text-xs text-slate-500 text-center">
          {secondaryText}
        </div>
      </div>

      <div className="mt-6 text-xs text-slate-500 flex items-start gap-2">
        <Info className="w-4 h-4 mt-[2px] shrink-0" />
        <p>
          Insights are derived from reviews and community reports.
        </p>
      </div>
    </div>
  );
}