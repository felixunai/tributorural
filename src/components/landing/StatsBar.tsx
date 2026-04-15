const stats = [
  { label: "Alíquotas ICMS", value: "702" },
  { label: "Produtos rurais com NCM", value: "30+" },
  { label: "Estados cobertos", value: "27" },
  { label: "Encargos CLT calculados", value: "7" },
];

export function StatsBar() {
  return (
    <div className="border-y bg-muted/40">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
