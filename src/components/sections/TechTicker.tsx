export default function TechTicker() {
  const items = ['AI Attendance', 'Live Insights', 'Smart Alerts', 'Student Engagement', 'Facial Recognition', 'Analytics'];

  return (
    <section className="overflow-hidden border-y border-slate-800 bg-slate-900/40 py-5">
      <div className="flex animate-[slide_18s_linear_infinite] whitespace-nowrap gap-10 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
        {[...items, ...items].map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </section>
  );
}
