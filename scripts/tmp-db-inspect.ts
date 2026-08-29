/** Temporary DB inspection (deleted after use). */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const providers = await prisma.provider.findMany({
    select: { id: true, name: true, status: true },
  });
  console.log("PROVIDERS:", JSON.stringify(providers, null, 1));

  const activeModels = await prisma.model.count({ where: { active: true } });
  console.log("ACTIVE MODELS:", activeModels);

  const models = await prisma.model.findMany({
    select: { modelIdentifier: true, active: true, provider: { select: { name: true } } },
    orderBy: { modelIdentifier: "asc" },
  });
  console.log(
    "MODELS:",
    JSON.stringify(models.map((m) => `${m.provider.name}:${m.modelIdentifier}:${m.active ? "on" : "off"}`))
  );

  const activeSnapshots = await prisma.pricingSnapshot.count({
    where: { effectiveTo: null },
  });
  console.log("ACTIVE SNAPSHOTS:", activeSnapshots);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
