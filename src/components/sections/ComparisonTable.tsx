export default function ComparisonTable() {
  const rows = [
    ['Manual attendance tracking', 'Low visibility', 'Slow updates', 'High admin load'],
    ['Legacy systems', 'Poor mobile support', 'Limited insights', 'Difficult reporting'],
    ['Attentra', 'Real-time analytics', 'Smart automated alerts', 'Simple institution-wide oversight'],
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-10 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Why choose Attentra</p>
        <h2 className="mt-3 text-4xl font-bold text-white">Built to outperform legacy attendance tools.</h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="min-w-full border-collapse text-left text-sm text-slate-300">
          <thead className="bg-slate-900 text-slate-100">
            <tr>
              <th className="p-4">Feature</th>
              <th className="p-4">Traditional</th>
              <th className="p-4">Modern tools</th>
              <th className="p-4">Attentra</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-slate-800 bg-slate-950/50">
                <td className="p-4 font-medium text-white">{row[0]}</td>
                <td className="p-4">{row[1]}</td>
                <td className="p-4">{row[2]}</td>
                <td className="p-4 text-cyan-300">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
