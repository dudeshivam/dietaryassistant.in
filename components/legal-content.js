export const effectiveDate = "May 15, 2026";

export const contact = {
  name: "Shivam",
  email: "kshivam.work@gmail.com",
  businessName: "Dietary Assistant",
  supportEmail: "help.dietaryassistant@gmail.com"
};

export function ContactBlock() {
  return (
    <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-lg font-semibold text-slate-950">Contact Information</h2>
      <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <div><dt className="font-semibold">Name</dt><dd>{contact.name}</dd></div>
        <div><dt className="font-semibold">Email</dt><dd>{contact.email}</dd></div>
        <div><dt className="font-semibold">Business Name</dt><dd>{contact.businessName}</dd></div>
        <div className="sm:col-span-2"><dt className="font-semibold">Support Email</dt><dd>{contact.supportEmail}</dd></div>
      </dl>
    </section>
  );
}

export function LegalPage({ children, eyebrow, title }) {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8">
      <article className="mx-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">Effective Date: {effectiveDate}</p>
        <div className="mt-8 space-y-6 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
          {children}
        </div>
        <ContactBlock />
      </article>
    </main>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Dietary Assistant provides AI-assisted personalized diet guidance only. It is not medical advice.
        </p>
        <nav className="flex flex-wrap gap-4 font-semibold text-slate-700">
          <a className="hover:text-emerald-700" href="/terms">Terms</a>
          <a className="hover:text-emerald-700" href="/privacy">Privacy</a>
          <a className="hover:text-emerald-700" href="/disclaimer">Medical Disclaimer</a>
          <a className="hover:text-emerald-700" href={`mailto:${contact.supportEmail}`}>Support</a>
        </nav>
      </div>
    </footer>
  );
}

export function MedicalSafetyNote({ className = "" }) {
  return (
    <p className={`text-xs leading-5 text-slate-500 ${className}`}>
      Dietary Assistant is not a medical application. AI suggestions are informational only; consider consulting a qualified professional before changing your diet, especially for medical conditions, allergies, injuries, pregnancy, or medication use.
    </p>
  );
}
