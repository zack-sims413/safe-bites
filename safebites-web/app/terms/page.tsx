export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 px-6 py-12">
      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1>Terms of Service</h1>
        <p className="text-sm text-slate-500">Last updated: January 2026</p>
        
        <h3>1. Informational Purpose</h3>
        <p>
          WiseBites is an informational review aggregator, not a medical service. The "WiseBites Score" and AI summaries are generated based on historical public data and user-submitted feedback. Restaurant conditions, ingredients, staff, and kitchen protocols can change at any time without notice.
        </p>
        
        <h3>2. Liability Waiver</h3>
        <p>
          WiseBites does not guarantee the safety of any food item or establishment. By using this platform, you acknowledge that you assume full responsibility for your dining choices. We strongly recommend always speaking directly to a manager or chef regarding your specific allergens before consuming any food.
        </p>
        
        <h3>3. Acknowledgement</h3>
        <p>
          I acknowledge that WiseBites is for informational purposes only and does not constitute medical advice. I understand that dining decisions are my responsibility and understand that restaurant conditions can change at any time.
        </p>
      </div>
    </div>
  );
}