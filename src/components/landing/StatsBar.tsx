const stats = [
  { value: "702", label: "Alíquotas ICMS", sub: "todos os 27 estados" },
  { value: "30+", label: "Produtos Rurais", sub: "com código NCM real" },
  { value: "27", label: "Estados cobertos", sub: "cobertura nacional" },
  { value: "7", label: "Encargos CLT", sub: "cálculo completo" },
];

export function StatsBar() {
  return (
    <section className="bg-primary py-14">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <div key={s.label} className="relative">
              {i < stats.length - 1 && (
                <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 h-12 w-px bg-white/20" />
              )}
              <p className="font-heading text-4xl sm:text-5xl font-extrabold text-white">
                {s.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/90">{s.label}</p>
              <p className="text-xs text-white/50 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
