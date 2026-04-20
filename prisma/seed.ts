import { PrismaClient, BrazilianState } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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
  // GRÃOS — ICMS diferido na saída do produtor (legislação estadual MT, GO, PR, MS, RS)
  { name: "Soja em Grão",     ncmCode: "12010090", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Grãos",        description: "Soja em grão, mesmo triturada" },
  { name: "Milho em Grão",    ncmCode: "10059010", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Grãos",        description: "Milho para outros usos" },
  { name: "Trigo em Grão",    ncmCode: "10019900", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Grãos",        description: "Trigo (exceto trigo duro/durum)" },
  { name: "Arroz em Casca",   ncmCode: "10061000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Grãos",        description: "Arroz com casca (paddy)" },
  { name: "Feijão",           ncmCode: "07133390", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Grãos",        description: "Feijão — espécies Vigna e Phaseolus" },
  { name: "Sorgo em Grão",    ncmCode: "10070090", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Grãos",        description: "Sorgo granífero" },
  { name: "Girassol em Grão", ncmCode: "12060090", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Grãos",        description: "Sementes de girassol" },
  // FIBRAS — diferido na saída do produtor
  { name: "Algodão em Pluma", ncmCode: "52010000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Fibras",       description: "Algodão não cardado nem penteado" },
  // CARNES — produto de frigorífico; ICMS normal com redução de base (Conv. ICMS 89/2005)
  { name: "Carne Bovina Resfriada", ncmCode: "02011000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "normal", category: "Carnes", description: "Carcaças e meias-carcaças bovinas refrigeradas — ICMS normal (redução de base Conv. 89/2005)" },
  { name: "Carne Bovina Congelada", ncmCode: "02021000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "normal", category: "Carnes", description: "Carcaças e meias-carcaças bovinas congeladas — ICMS normal (redução de base Conv. 89/2005)" },
  { name: "Carne Suína",            ncmCode: "02031100", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "normal", category: "Carnes", description: "Carcaças e meias-carcaças suínas — ICMS normal com redução de base" },
  // AVES — frango = saída de frigorífico (normal); ovos = isento (Conv. ICM 44/75)
  { name: "Frango Inteiro",    ncmCode: "02071100", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "normal",  category: "Aves", description: "Galos/galinhas não cortados em pedaços, frescos ou refrigerados — ICMS normal" },
  { name: "Ovos de Galinha",   ncmCode: "04070011", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento",  category: "Aves", description: "Ovos de galinha para consumo — isento (Conv. ICM 44/75)" },
  // LÁCTEOS
  { name: "Leite Cru",        ncmCode: "04011000", pisRate: 0.0,    cofinsRate: 0.0,  icmsDefaultRegime: "diferido", category: "Lácteos", description: "Leite cru — ICMS diferido do produtor para laticínio" },
  { name: "Queijo Mussarela", ncmCode: "04061000", pisRate: 0.0065, cofinsRate: 0.03, icmsDefaultRegime: "normal",   category: "Lácteos", description: "Queijo fresco (não curado) — produto industrializado, ICMS normal" },
  { name: "Manteiga",         ncmCode: "04051000", pisRate: 0.0065, cofinsRate: 0.03, icmsDefaultRegime: "normal",   category: "Lácteos", description: "Manteiga de leite de vaca — produto industrializado, ICMS normal" },
  // FRUTAS — isentas de ICMS (Conv. ICM 44/75, vigente na maioria dos estados)
  { name: "Laranja",    ncmCode: "08051000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento", category: "Frutas", description: "Laranjas frescas — isento Conv. ICM 44/75" },
  { name: "Banana",     ncmCode: "08030011", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento", category: "Frutas", description: "Bananas do grupo Nanica/Nanicão — isento Conv. ICM 44/75" },
  { name: "Uva de Mesa",ncmCode: "08061000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento", category: "Frutas", description: "Uvas frescas — isento Conv. ICM 44/75" },
  { name: "Melão",      ncmCode: "08071100", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento", category: "Frutas", description: "Melões frescos — isento Conv. ICM 44/75" },
  { name: "Manga",      ncmCode: "08045020", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento", category: "Frutas", description: "Mangas frescas — isento Conv. ICM 44/75" },
  { name: "Maçã",       ncmCode: "08081000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento", category: "Frutas", description: "Maçãs frescas — isento Conv. ICM 44/75" },
  // HORTALIÇAS — isentas de ICMS (Conv. ICM 44/75)
  { name: "Tomate",         ncmCode: "07020000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento", category: "Hortaliças", description: "Tomates frescos ou refrigerados — isento Conv. ICM 44/75" },
  { name: "Batata-Semente", ncmCode: "07011000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento", category: "Hortaliças", description: "Batatas para semente (insumo agrícola) — isento Conv. ICMS 100/97" },
  { name: "Cebola",         ncmCode: "07031000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "isento", category: "Hortaliças", description: "Cebolas e escalônias — isento Conv. ICM 44/75" },
  // OUTROS
  { name: "Cana-de-Açúcar",      ncmCode: "12129200", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Energia/Açúcar", description: "Cana-de-açúcar — ICMS diferido do canavieiro para usina" },
  { name: "Café em Coco",        ncmCode: "09011100", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Bebidas",       description: "Café não torrado, não descafeinado — ICMS diferido do produtor" },
  { name: "Cacau em Massa/Pasta",ncmCode: "18010000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Bebidas",       description: "Cacau em massa/pasta, não desengordurado (NCM 18010000)" },
  { name: "Madeira em Tora",     ncmCode: "44032000", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Madeira",       description: "Madeira de coníferas em toras — ICMS diferido na saída do produtor florestal" },
  { name: "Eucalipto (Celulose)",ncmCode: "44039900", pisRate: 0.0, cofinsRate: 0.0, icmsDefaultRegime: "diferido", category: "Madeira",       description: "Outras madeiras em toras (eucalipto) — ICMS diferido do produtor para celulose" },
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
      priceMonthly: 29.9,
      priceYearly: 290,
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
