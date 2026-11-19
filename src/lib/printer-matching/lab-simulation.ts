import type { MatchingConfig } from "./config";
import type { LabOptions, ResearchAlgorithm } from "./lab-config";
import { evaluatePrinterAvailability } from "./availability";
import { projectQueue } from "./projection";
import { scoreEligiblePrinter } from "./scoring";
import type { MatchedPrinter, PrinterCandidate } from "./types";
import type { MatchingScenario, SimulationBatchResult, SimulationResult, SimulationRejectedResult } from "./simulation";
import { calculateAhp, selectTopsis, type LabSolution } from "./lab-pareto";
import { optimizeLabAssignments } from "./lab-optimizers";

type Input = {
  scenarios: MatchingScenario[];
  printers: PrinterCandidate[];
  config: MatchingConfig;
  now: Date;
  fallbackMinutes: number;
  options: LabOptions;
};

export function simulateResearchBatch({ scenarios, printers, config, now, fallbackMinutes, options }: Input): SimulationBatchResult {
  if (options.algorithm === "SAVED") throw new Error("Select a research algorithm");
  const algorithm: ResearchAlgorithm = options.algorithm;
  const optimizer = algorithm === "MOPSO_AHP_TOPSIS" || algorithm === "NSGA2_AHP_TOPSIS";
  const initial = printers.map((printer) => projectQueue({ orders: printer.orders,
    preprocessingTime: printer.preprocessingTime ?? 10, fallbackMinutes }));
  const rejections: SimulationRejectedResult["rejectionSummary"][] = scenarios.map(() => ({}));
  const entries = scenarios.map((order, taskIndex) => printers.map((printer, printerIndex) => {
    const projection = projectQueue({ orders: printer.orders, preprocessingTime: printer.preprocessingTime ?? 10,
      incomingEstimatedMinutes: order.estimatedPrintTime, incomingQuantity: order.quantity, fallbackMinutes });
    const availability = evaluatePrinterAvailability({ printer, order, projection, config, now });
    for (const code of availability.rejectionCodes) rejections[taskIndex][code] = (rejections[taskIndex][code] ?? 0) + 1;
    if (!availability.eligible || availability.distanceKm === null) return null;
    return { printerIndex, printer, projection, distance: availability.distanceKm };
  }));
  const feasible = entries.map((row) => row.flatMap((entry, i) => entry ? [i] : []));
  const distances = entries.map((row) => row.map((entry) => entry?.distance ?? Infinity));
  const arrival = (i: number) => scenarios[i].arrivalMinutes ?? 0;
  const deadline = (i: number) => scenarios[i].deadlineMinutes ?? (scenarios[i].dueDate
    ? (new Date(scenarios[i].dueDate!).getTime() - now.getTime()) / 60_000 : options.horizonMinutes);
  const priority = (i: number) => scenarios[i].priority ?? 3;
  const order = scenarios.map((_, i) => i).sort((a, b) => algorithm === "EDD_FEASIBLE"
    ? deadline(a) - deadline(b) || priority(a) - priority(b) || arrival(a) - arrival(b) || a - b
    : arrival(a) - arrival(b) || priority(a) - priority(b) || deadline(a) - deadline(b) || a - b);

  function schedule(genes?: number[], collect = false) {
    const loads = initial.map((p) => p.waitMinutes);
    const jobs = initial.map((p) => p.jobsAhead);
    const results: SimulationResult[] = [];
    const assignments = scenarios.map(() => -1);
    let totalDistance = 0, lateness = 0, violations = 0, makespan = 0;
    const distribution: Record<string, number> = {};
    for (const i of order) {
      const scenario = scenarios[i];
      const key = (p: number): number[] => {
        const entry = entries[i][p]!;
        const finish = Math.max(arrival(i), loads[p]) + entry.projection.incomingMinutes;
        if (algorithm === "NEAREST_FEASIBLE") return [entry.distance, finish, loads[p]];
        if (algorithm === "EDD_FEASIBLE") return [finish + entry.distance * options.travelMinutesPerKm, entry.distance, loads[p]];
        return [loads[p], finish, entry.distance];
      };
      const ranked = [...feasible[i]].sort((a, b) => {
        const ka = key(a), kb = key(b);
        for (let d = 0; d < ka.length; d++) if (ka[d] !== kb[d]) return ka[d] - kb[d];
        return printers[a].id.localeCompare(printers[b].id);
      });
      const p = genes ? genes[i] : ranked[0] ?? -1;
      const entry = entries[i][p];
      const reject = (reasons: SimulationRejectedResult["rejectionSummary"]) => {
        violations++;
        if (collect) results.push({ success: false, scenarioId: scenario.id, label: scenario.label, rejectionSummary: reasons });
      };
      if (!entry) { reject(rejections[i]); continue; }
      const start = Math.max(arrival(i), loads[p]);
      const finish = start + entry.projection.incomingMinutes;
      if (finish > options.horizonMinutes) { reject({ SIMULATION_HORIZON: 1 }); continue; }
      if (finish > config.maxQueueMinutes) { reject({ QUEUE_DURATION_LIMIT: 1 }); continue; }
      if (jobs[p] + 1 > config.maxQueueJobs) { reject({ QUEUE_JOB_LIMIT: 1 }); continue; }
      const completion = finish + entry.distance * options.travelMinutesPerKm;
      const tardiness = Math.max(0, completion - deadline(i));
      totalDistance += entry.distance;
      lateness += tardiness * (4 - priority(i));
      assignments[i] = p;
      const queueBefore = loads[p];
      const jobsBefore = jobs[p];
      loads[p] = finish; jobs[p]++;
      makespan = Math.max(makespan, finish);
      distribution[entry.printer.id] = (distribution[entry.printer.id] ?? 0) + 1;
      if (collect) {
        const enrich = (index: number): MatchedPrinter => {
          const e = entries[i][index]!;
          const wait = index === p ? queueBefore : loads[index];
          const count = index === p ? jobsBefore : jobs[index];
          const score = scoreEligiblePrinter({ printer: e.printer, order: scenario, config,
            projection: { waitMinutes: wait, jobsAhead: count, incomingMinutes: e.projection.incomingMinutes,
              projectedMinutesAfter: Math.max(arrival(i), wait) + e.projection.incomingMinutes, projectedJobsAfter: count + 1 },
            distanceKm: e.distance });
          return { ...score, providerName: e.printer.provider.businessName, providerCity: e.printer.provider.city,
            providerProvince: e.printer.provider.province, coordinates: { lat: e.printer.provider.latitude!, lng: e.printer.provider.longitude! },
            status: e.printer.status, isVerified: e.printer.provider.isVerified, isAcceptingOrders: e.printer.isAcceptingOrders, queuedOrders: count };
        };
        results.push({ success: true, scenarioId: scenario.id, label: scenario.label,
          customerCoordinates: { lat: scenario.shippingLat, lng: scenario.shippingLng }, selected: enrich(p),
          alternatives: ranked.filter((index) => index !== p && Math.max(arrival(i), loads[index]) + entries[i][index]!.projection.incomingMinutes <= Math.min(options.horizonMinutes, config.maxQueueMinutes) && jobs[index] + 1 <= config.maxQueueJobs).slice(0, 5).map(enrich),
          queueBeforeMinutes: queueBefore, queueBeforeJobs: jobsBefore,
          queueAfterMinutes: finish, queueAfterJobs: jobs[p], expectedStartOffsetMinutes: start,
          expectedFinishOffsetMinutes: finish, expectedDeliveryOffsetMinutes: completion, tardinessMinutes: tardiness });
      }
    }
    const mean = loads.length ? loads.reduce((a, b) => a + b, 0) / loads.length : 0;
    const std = loads.length ? Math.sqrt(loads.reduce((sum, n) => sum + (n - mean) ** 2, 0) / loads.length) : 0;
    return { genes: assignments, objectives: [violations, totalDistance, std, lateness], results, distribution, makespan };
  }

  let chosen: LabSolution | undefined;
  let search: ReturnType<typeof optimizeLabAssignments> | undefined;
  let ahp: NonNullable<SimulationBatchResult["research"]>["ahp"];
  if (optimizer) {
    const calculated = calculateAhp(options.ahpMatrix);
    if (calculated.consistencyRatio > 0.1) throw new Error("AHP consistency ratio exceeds 0.10. Review the pairwise matrix.");
    search = optimizeLabAssignments(feasible, distances, (genes) => ({ genes: [...genes], objectives: schedule(genes).objectives }), options, printers.length);
    const selection = selectTopsis(search.archive, calculated.weights);
    chosen = selection.selected;
    ahp = { ...calculated, topsisScore: selection.score, selectionPoolSize: selection.poolSize };
  }
  const result = schedule(chosen?.genes, true);
  return {
    algorithm, results: result.results, matched: scenarios.length - result.objectives[0], rejected: result.objectives[0],
    distribution: result.distribution, projectedMakespanMinutes: result.makespan,
    research: { options, snapshot: { capturedAt: now.toISOString(), config, scenarios, printers },
      objectives: { violations: result.objectives[0], distanceKm: result.objectives[1], loadStdMinutes: result.objectives[2], weightedLatenessMinutes: result.objectives[3] },
      ahp, paretoFront: search?.archive.map((s) => ({ violations: s.objectives[0], distanceKm: s.objectives[1], loadStdMinutes: s.objectives[2], weightedLatenessMinutes: s.objectives[3] })),
      convergence: search?.convergence },
  };
}
