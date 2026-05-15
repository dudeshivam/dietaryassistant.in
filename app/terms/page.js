import { LegalPage } from "@/components/legal-content";

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms and Conditions - Dietary Assistant">
      <p>By accessing or using Dietary Assistant ("the App"), you agree to these Terms.</p>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">1. Nature of Service</h2>
        <p className="mt-2">Dietary Assistant provides AI-generated diet suggestions based on user-provided information. The service is for informational and lifestyle purposes only.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">2. No Medical Advice</h2>
        <p className="mt-2">The App does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before making dietary or health changes.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">3. User Responsibility</h2>
        <p className="mt-2">You agree to provide accurate and updated information, use the App responsibly, and make independent decisions regarding your diet.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">4. AI Limitations</h2>
        <p className="mt-2">Diet plans and responses are generated using AI and may not always be accurate, complete, or suitable for your condition.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">5. Account Security</h2>
        <p className="mt-2">You are responsible for maintaining the confidentiality of your login credentials.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">6. Subscription and Payments</h2>
        <p className="mt-2">Premium features are billed monthly at ₹99 or as displayed in the App. Payments are processed securely via third-party providers such as Razorpay. No refunds are provided unless required by applicable law.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">7. Limitation of Liability</h2>
        <p className="mt-2">We are not liable for any health issues arising from use of the App, decisions made based on AI suggestions, service interruptions, or data loss.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">8. Termination</h2>
        <p className="mt-2">We reserve the right to suspend or terminate accounts that violate these Terms.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">9. Changes to Terms</h2>
        <p className="mt-2">We may update these Terms at any time. Continued use means acceptance of changes.</p>
      </section>
    </LegalPage>
  );
}
