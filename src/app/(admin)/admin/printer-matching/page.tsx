import { ArrowUpRight, Beaker } from "lucide-react";
import {
  AdminHeroCard,
  AdminWorkspace,
  DataCard,
  StatCard,
} from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { matchingConfigFromSettings } from "@/lib/printer-matching/config";
import { MatchingConfigForm } from "./MatchingConfigForm";
import { MatchingLabClient } from "./MatchingLabClient";

export default async function PrinterMatchingLabPage() {
  const [settings, materials, qualities, printerCount, eligibleCount, providerCount] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { id: "default" } }),
    prisma.material.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.printQuality.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.printer.count(),
    prisma.printer.count({ where: { status: "ONLINE", isAcceptingOrders: true, provider: { isVerified: true } } }),
    prisma.provider.count({ where: { isVerified: true } }),
  ]);
  const config = matchingConfigFromSettings(settings);

  return (
    <AdminWorkspace>
      <AdminHeroCard
        title="Printer Matching Lab"
        description="Tune routing rules, test scenarios, and inspect printer assignment results."
        action={
          <Button className="h-11 rounded-lg bg-[#090914] px-5 text-sm font-medium text-white shadow-[var(--admin-shadow-control)] hover:bg-[#202032]">
            <Beaker className="size-4" strokeWidth={1.8} />
            Run dry test below
            <ArrowUpRight className="size-4" strokeWidth={1.8} />
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered printers" value={printerCount} caption="Fleet total" />
        <StatCard label="Currently eligible" value={eligibleCount} caption="Ready now" />
        <StatCard label="Verified providers" value={providerCount} caption="Production partners" />
        <StatCard label="Heartbeat window" value={`${config.heartbeatTimeoutSeconds}s`} caption={`${config.maxDistanceKm} km max`} />
      </section>

      <section>
        <DataCard title="Routing configuration" action={<span className="rounded-full bg-[#f2f3f5] px-3 py-1.5 text-xs font-semibold text-[#5c616b]">{config.algorithmMode === "NSGA2" ? "NSGA-II" : "Weighted score"}</span>}>
          <MatchingConfigForm initial={{
            algorithmMode: config.algorithmMode,
            distanceWeight: config.distanceWeight * 100,
            queueDurationWeight: config.queueDurationWeight * 100,
            queueCountWeight: config.queueCountWeight * 100,
            loadedMaterialWeight: config.loadedMaterialWeight * 100,
            heartbeatTimeoutSeconds: config.heartbeatTimeoutSeconds,
            maxDistanceKm: config.maxDistanceKm,
            maxQueueMinutes: config.maxQueueMinutes,
            maxQueueJobs: config.maxQueueJobs,
            nsga2PopulationSize: config.nsga2.populationSize,
            nsga2Generations: config.nsga2.generations,
            nsga2MutationRate: config.nsga2.mutationRate,
            nsga2CrossoverRate: config.nsga2.crossoverRate,
            nsga2Seed: config.nsga2.seed,
            nsga2DecisionPolicy: config.nsga2.decisionPolicy,
          }} />
        </DataCard>
      </section>

      <DataCard title="Scenario batch">
        {materials.length > 0 && qualities.length > 0 ? (
          <MatchingLabClient materials={materials} qualities={qualities} />
        ) : (
          <p className="text-sm font-semibold text-rose-700">At least one active material and print quality are required before running the lab.</p>
        )}
      </DataCard>
    </AdminWorkspace>
  );
}
