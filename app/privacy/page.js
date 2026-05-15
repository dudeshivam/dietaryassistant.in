import { LegalPage } from "@/components/legal-content";

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Privacy" title="Privacy Policy - Dietary Assistant">
      <p>Your privacy is important to us.</p>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">1. Information We Collect</h2>
        <p className="mt-2">We may collect personal details such as name, age, height, weight, goals, account data such as email and password credentials managed by our authentication provider, usage data such as activity, meals, interactions, and optional uploaded images.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">2. How We Use Information</h2>
        <p className="mt-2">We use information to generate personalized diet suggestions, track progress, improve user experience, and enhance AI performance and app reliability.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">3. Data Storage and Security</h2>
        <p className="mt-2">Your data is stored securely using trusted infrastructure such as Supabase. We use secure authentication methods, access controls, and encryption provided by our infrastructure providers.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">4. Data Sharing</h2>
        <p className="mt-2">We do not sell your data. We may share limited data with payment providers for transactions and AI service providers for generating responses.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">5. User Rights</h2>
        <p className="mt-2">You can request access to your data, request deletion of your data, and update your personal information. The App includes an account deletion option in the profile screen.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">6. Consent and Data Protection</h2>
        <p className="mt-2">We collect and use personal data with user consent and aim to follow the basic principles of India's Digital Personal Data Protection Act, 2023, including purpose limitation, reasonable security safeguards, and user control over personal information.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">7. Cookies</h2>
        <p className="mt-2">We may use cookies to improve functionality, authentication, and user experience.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">8. Policy Updates</h2>
        <p className="mt-2">We may update this Privacy Policy periodically.</p>
      </section>
    </LegalPage>
  );
}
