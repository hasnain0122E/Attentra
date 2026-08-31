/**
 * Temporary report stats for Phase 8 Step 3 final report.
 * Deleted immediately after running.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const providers = await prisma.provider.findMany({
    where: { status: "ACTIVE" },
    include: {
      models: {
        include: { pricingSnapshots: { where: { effectiveTo: null } } },
      },
    },
  });

  let totalRoutable = 0;
  for (const provider of providers) {
    const total = provider.models.length;
    const active = provider.models.filter((m) => m.active).length;
    const priced = provider.models.filter(
      (m) => m.pricingSnapshots.length > 0
    ).length;
    const routable = provider.models.filter(
      (m) => m.active && m.pricingSnapshots.length > 0
    ).length;
    totalRoutable += routable;
    console.log(
      `${provider.name}: total=${total} active=${active} priced=${priced} routable(active+priced)=${routable}`
    );
  }
  console.log(`TOTAL routable candidates: ${totalRoutable}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
