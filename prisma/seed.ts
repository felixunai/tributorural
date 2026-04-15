import { PrismaClient, BrazilianState } from "@prisma/client";
type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// ICMS INTER-STATE RATES
// Based on Resolução do Senado Federal nº 22/1989 + EC 87/2015
// ─────────────────────────────────────────────────────────────────────────────

const ALL_STATES: BrazilianState[] = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// States from South/Southeast/Center-West that use 7% to SP/RJ
const STATES_DEVELOPED: BrazilianState[] = [
  "SP", "RJ", "MG", "RS", "PR", "SC", "GO", "DF", "ES", "MT", "MS", "RO", "TO", "AM",
];

// States from North/Northeast that always charge 12%
const STATES_LESS_DEVELOPED: BrazilianState[] = [
  "AC", "AL", "AP", "BA", "CE", "MA", "PA", "PB", "PE", "PI", "RR", "SE", "RN",
];

// Destinations that receive at 7% from developed origins
const WEALTHY_DESTINATIONS: BrazilianState[] = ["SP", "RJ"];

function getIcmsRate(origin: BrazilianState, destination: BrazilianState): number {
  if (origin === destination) return 0.12; // intra-state (fallback)

  if (STATES_LESS_DEVELOPED.includes(origin)) {
    return 0.12;
  }

  if (STATES_DEVELOPED.includes(origin)) {
    if (WEALTHY_DESTINATIONS.includes(destination)) {
      return 0.07;
    }
    return 0.12;
  }

  return 0.12;
}

async function seedIcmsRates() {
  console.log("Seeding ICMS rates (702 pairs)...");
  let count = 0;

  for (const origin of ALL_STATES) {
    for (const dest of ALL_STATES) {
      if (origin === dest) continue;

      const rate = getIcmsRate(origin, dest);

      await prisma.icmsRate.upsert({
        where: { originState_destinationState: { originState: origin, destinationState: dest } },
        update: { rate },
        create: { originState: origin, destinationState: dest, rate },
      });
      count++;
    }
  }

  console.log(`  ✓ ${count} ICMS rate pairs seeded`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNRURAL RATES
// ─────────────────────────────────────────────────────────────────────────────

async function seedFunruralRates() {
  console.log("Seeding FUNRURAL rates...");

  const rates = [
    {
      name: "Pessoa Física",
      rate: 0.012,
      baseType: "RECEITA_BRUTA",
      description: "INSS Rural (1,2%) — produtor rural pessoa física",
    },
    {
      name: "Pessoa Jurídica",
      rate: 0.015,
      baseType: "RECEITA_BRUTA",
      description: "FUNRURAL (1,5%) — agroindústria e pessoa jurídica rural",
    },
  ];

  for (const r of rates) {
    await prisma.funruralRate.upsert({
      where: { id: r.name === "Pessoa Física" ? "funrural-pf" : "funrural-pj" },
      update: r,
      create: { id: r.name === "Pessoa Física" ? "funrural-pf" : "funrural-pj", ...r },
    });
  }

  console.log("  ✓ FUNRURAL rates seeded");
}

// ─────────────────────────────────────────────────────────────────────────────
// RURAL PRODUCTS
// PIS/COFINS rates based on Lei 10.925/2004 (alíquota zero for primary products)
// ─────────────────────────────────────────────────────────────────────────────

const ruralProducts = [
  // GRÃOS
  { name: "Soja em Grão", ncmCode: "12010090", pisRate: 0.0, cofinsRate: 0.0, category: "Grãos", description: "Soja em grão, mesmo triturada" },
  { name: "Milho em Grão", ncmCode: "10059010", pisRate: 0.0, cofinsRate: 0.0, category: "Grãos", description: "Milho para outros usos" },
  { name: "Trigo em Grão", ncmCode: "10019900", pisRate: 0.0, cofinsRate: 0.0, category: "Grãos", description: "Trigo (exceto trigo duro/durum)" },
  { name: "Arroz em Casca", ncmCode: "10061000", pisRate: 0.0, cofinsRate: 0.0, category: "Grãos", description: "Arroz com casca (paddy)" },
  { name: "Feijão", ncmCode: "07133390", pisRate: 0.0, cofinsRate: 0.0, category: "Grãos", description: "Feijão — espécies Vigna e Phaseolus" },
  { name: "Sorgo em Grão", ncmCode: "10070090", pisRate: 0.0, cofinsRate: 0.0, category: "Grãos", description: "Sorgo granífero" },
  { name: "Girassol em Grão", ncmCode: "12060090", pisRate: 0.0, cofinsRate: 0.0, category: "Grãos", description: "Sementes de girassol" },
  { name: "Algodão em Pluma", ncmCode: "52010000", pisRate: 0.0, cofinsRate: 0.0, category: "Fibras", description: "Algodão não cardado nem penteado" },
  // CARNES
  { name: "Carne Bovina Resfriada", ncmCode: "02011000", pisRate: 0.0, cofinsRate: 0.0, category: "Carnes", description: "Carcaças e meias-carcaças bovinas refrigeradas" },
  { name: "Carne Bovina Congelada", ncmCode: "02021000", pisRate: 0.0, cofinsRate: 0.0, category: "Carnes", description: "Carcaças e meias-carcaças bovinas congeladas" },
  { name: "Carne Suína", ncmCode: "02031100", pisRate: 0.0, cofinsRate: 0.0, category: "Carnes", description: "Carcaças e meias-carcaças suínas" },
  { name: "Frango Inteiro", ncmCode: "02071100", pisRate: 0.0, cofinsRate: 0.0, category: "Aves", description: "Galos/galinhas não cortados em pedaços, frescos ou refrigerados" },
  { name: "Ovos de Galinha", ncmCode: "04070011", pisRate: 0.0, cofinsRate: 0.0, category: "Aves", description: "Ovos de galinha para consumo" },
  // LÁCTEOS
  { name: "Leite Cru", ncmCode: "04011000", pisRate: 0.0, cofinsRate: 0.0, category: "Lácteos", description: "Leite cru com teor de matérias gordas ≤ 1%" },
  { name: "Queijo Mussarela", ncmCode: "04061000", pisRate: 0.0065, cofinsRate: 0.03, category: "Lácteos", description: "Queijo fresco (não curado)" },
  { name: "Manteiga", ncmCode: "04051000", pisRate: 0.0065, cofinsRate: 0.03, category: "Lácteos", description: "Manteiga de leite de vaca" },
  // FRUTAS
  { name: "Laranja", ncmCode: "08051000", pisRate: 0.0, cofinsRate: 0.0, category: "Frutas", description: "Laranjas frescas ou secas" },
  { name: "Banana", ncmCode: "08030011", pisRate: 0.0, cofinsRate: 0.0, category: "Frutas", description: "Bananas do grupo Nanica/Nanicão" },
  { name: "Uva de Mesa", ncmCode: "08061000", pisRate: 0.0, cofinsRate: 0.0, category: "Frutas", description: "Uvas frescas" },
  { name: "Melão", ncmCode: "08071100", pisRate: 0.0, cofinsRate: 0.0, category: "Frutas", description: "Melões frescos" },
  { name: "Manga", ncmCode: "08045020", pisRate: 0.0, cofinsRate: 0.0, category: "Frutas", description: "Mangas frescas" },
  { name: "Maçã", ncmCode: "08081000", pisRate: 0.0, cofinsRate: 0.0, category: "Frutas", description: "Maçãs frescas" },
  // HORTALIÇAS
  { name: "Tomate", ncmCode: "07020000", pisRate: 0.0, cofinsRate: 0.0, category: "Hortaliças", description: "Tomates frescos ou refrigerados" },
  { name: "Batata", ncmCode: "07011000", pisRate: 0.0, cofinsRate: 0.0, category: "Hortaliças", description: "Batatas para semente" },
  { name: "Cebola", ncmCode: "07031000", pisRate: 0.0, cofinsRate: 0.0, category: "Hortaliças", description: "Cebolas e escalônias" },
  // OUTROS
  { name: "Cana-de-Açúcar", ncmCode: "12129200", pisRate: 0.0, cofinsRate: 0.0, category: "Energia/Açúcar", description: "Cana-de-açúcar" },
  { name: "Café em Coco", ncmCode: "09011100", pisRate: 0.0, cofinsRate: 0.0, category: "Bebidas", description: "Café não torrado, não descafeinado" },
  { name: "Cacau em Amêndoa", ncmCode: "18010000", pisRate: 0.0, cofinsRate: 0.0, category: "Bebidas", description: "Cacau em massa/pasta, não desengordurado" },
  { name: "Madeira em Tora", ncmCode: "44032000", pisRate: 0.0, cofinsRate: 0.0, category: "Madeira", description: "Madeira de coníferas em toras" },
  { name: "Eucalipto (Celulose)", ncmCode: "44039900", pisRate: 0.0, cofinsRate: 0.0, category: "Madeira", description: "Outras madeiras em toras (eucalipto)" },
];

async function seedRuralProducts() {
  console.log("Seeding rural products (30)...");

  for (const p of ruralProducts) {
    await prisma.ruralProduct.upsert({
      where: { ncmCode: p.ncmCode },
      update: p,
      create: p,
    });
  }

  console.log(`  ✓ ${ruralProducts.length} rural products seeded`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION PLANS
// ─────────────────────────────────────────────────────────────────────────────

async function seedPlans() {
  console.log("Seeding subscription plans...");

  const plans: Array<{
    id: string;
    name: string;
    tier: PlanTier;
    priceMonthly: number;
    priceYearly: number;
    maxCalculationsMonth: number;
    canExportPdf: boolean;
    canExportCsv: boolean;
    canAccessRhCalc: boolean;
    canAccessHistory: boolean;
    historyRetentionDays: number;
  }> = [
    {
      id: "plan-free",
      name: "Gratuito",
      tier: "FREE",
      priceMonthly: 0,
      priceYearly: 0,
      maxCalculationsMonth: 5,
      canExportPdf: false,
      canExportCsv: false,
      canAccessRhCalc: false,
      canAccessHistory: false,
      historyRetentionDays: 0,
    },
    {
      id: "plan-pro",
      name: "Profissional",
      tier: "PRO",
      priceMonthly: 49.9,
      priceYearly: 479,
      maxCalculationsMonth: -1,
      canExportPdf: false,
      canExportCsv: true,
      canAccessRhCalc: true,
      canAccessHistory: true,
      historyRetentionDays: 90,
    },
    {
      id: "plan-enterprise",
      name: "Empresarial",
      tier: "ENTERPRISE",
      priceMonthly: 149.9,
      priceYearly: 1439,
      maxCalculationsMonth: -1,
      canExportPdf: true,
      canExportCsv: true,
      canAccessRhCalc: true,
      canAccessHistory: true,
      historyRetentionDays: -1,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
  }

  console.log("  ✓ 3 plans seeded (FREE, PRO, ENTERPRISE)");
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN USER (optional — for dev)
// ─────────────────────────────────────────────────────────────────────────────

async function seedAdminUser() {
  const bcrypt = await import("bcryptjs");
  const adminEmail = "admin@tributorural.com.br";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log("  ✓ Admin user already exists, skipping");
    return;
  }

  const freePlan = await prisma.plan.findUnique({ where: { tier: "FREE" } });
  if (!freePlan) throw new Error("FREE plan not found — run seedPlans first");

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Administrador",
      passwordHash: await bcrypt.hash("admin123!", 12),
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  await prisma.subscription.create({
    data: {
      userId: admin.id,
      planId: freePlan.id,
      status: "ACTIVE",
    },
  });

  console.log(`  ✓ Admin user created: ${adminEmail} / admin123!`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting Tributo Rural seed...\n");

  await seedPlans();
  await seedIcmsRates();
  await seedFunruralRates();
  await seedRuralProducts();
  await seedAdminUser();

  console.log("\n✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
