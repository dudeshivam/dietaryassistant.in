import { ContactBlock } from "@/components/legal-content";

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8">
      <article className="mx-auto w-full max-w-3xl rounded-lg border border-amber-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-amber-700">Medical safety</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Medical Disclaimer - Dietary Assistant</h1>
        <div className="mt-8 space-y-5 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
          <p className="text-lg font-semibold text-slate-950">Dietary Assistant is not a medical application.</p>
          <p>All diet plans, recommendations, and AI responses are for informational and educational purposes only.</p>
          <section>
            <h2 className="text-xl font-semibold text-slate-950">We do not provide:</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Medical advice</li>
              <li>Diagnosis</li>
              <li>Treatment</li>
            </ul>
          </section>
          <p>Always consult a certified doctor, dietitian, or healthcare provider before making dietary or lifestyle changes.</p>
          <p>Use of this App is at your own risk.</p>
          <p>If you have any medical condition, allergy, or injury, do not rely solely on this application.</p>
        </div>
        <ContactBlock />
      </article>
    </main>
  );
}
