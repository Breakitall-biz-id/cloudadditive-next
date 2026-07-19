import { prisma } from "../src/lib/prisma";
import {
  interpretLegacyDuration,
  parseLegacyDurationArguments,
} from "../src/lib/printer-matching/legacy-duration";

async function main() {
  const options = parseLegacyDurationArguments(process.argv.slice(2));
  const orders = await prisma.order.findMany({
    where: { estimatedPrintTime: { not: null } },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      estimatedPrintTime: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.table(
    orders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      currentValue: order.estimatedPrintTime,
      interpretedMinutes: interpretLegacyDuration(
        order.estimatedPrintTime,
        options.mode
      ) ?? "ambiguous/report-only",
    }))
  );

  if (!options.apply) {
    console.log(`Report only: ${orders.length} rows inspected, zero rows updated.`);
    return;
  }

  await prisma.$transaction(
    orders.map((order) =>
      prisma.order.update({
        where: { id: order.id },
        data: {
          estimatedPrintTime: interpretLegacyDuration(
            order.estimatedPrintTime,
            options.mode
          ),
        },
      })
    )
  );
  console.log(`Updated ${orders.length} rows using explicit seconds interpretation.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
