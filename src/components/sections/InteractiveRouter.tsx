export default function InteractiveRouter() {
  return (
    <section id="workflow" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-10 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">How it works</p>
        <h2 className="mt-3 text-4xl font-bold text-white">A smarter student and staff workflow.</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          ['01', 'Capture attendance', 'Scan presence through secure, fast verification methods.'],
          ['02', 'Analyze activity', 'AI identifies changes in behavior, attendance patterns, and risk signals.'],
          ['03', 'Take action', 'Notify mentors, staff, and departments with automated next steps.'],
        ].map(([step, title, desc]) => (
          <div key={step} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 text-sm font-semibold text-cyan-300">{step}</div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            <p className="mt-3 text-slate-300">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
