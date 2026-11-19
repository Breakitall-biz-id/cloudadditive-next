import type { LabOptions } from "./lab-config";
import { crowding, dominates, fronts, paretoArchive, seededRandom, type LabSolution } from "./lab-pareto";

export function optimizeLabAssignments(
  feasible: number[][], distances: number[][],
  evaluate: (genes: number[]) => LabSolution,
  options: LabOptions,
  printerCount: number,
) {
  const random = seededRandom(options.seed);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const repair = (genes: number[]) => genes.map((gene, i) => {
    const rounded = Math.max(0, Math.min(printerCount - 1, Math.round(gene)));
    if (!feasible[i].length) return -1;
    return feasible[i].includes(rounded) ? rounded : [...feasible[i]].sort((a, b) => distances[i][a] - distances[i][b] || a - b)[0];
  });
  const create = () => evaluate(feasible.map((items) => items.length ? pick(items) : -1));
  const mutate = (genes: number[], probability: number) => genes.map((gene, i) => {
    const alternatives = feasible[i].filter((p) => p !== gene);
    return alternatives.length && random() < probability ? pick(alternatives) : gene;
  });
  let population = Array.from({ length: options.populationSize }, create);
  const convergence: Array<{ iteration: number; violations: number; distance: number; loadStd: number; weightedLateness: number }> = [];
  const record = (iteration: number, archive: LabSolution[]) => {
    convergence.push({ iteration, violations: Math.min(...archive.map((s) => s.objectives[0])),
      distance: Math.min(...archive.map((s) => s.objectives[1])),
      loadStd: Math.min(...archive.map((s) => s.objectives[2])),
      weightedLateness: Math.min(...archive.map((s) => s.objectives[3])) });
  };

  if (options.algorithm === "NSGA2_AHP_TOPSIS") {
    for (let iteration = 0; iteration < options.iterations; iteration++) {
      const ranks = new Map<number, number>();
      const density = new Map<number, number>();
      fronts(population).forEach((front, rank) => {
        const c = crowding(population, front);
        front.forEach((i) => { ranks.set(i, rank); density.set(i, c.get(i)!); });
      });
      const tournament = () => {
        const a = Math.floor(random() * population.length);
        const b = (a + 1 + Math.floor(random() * (population.length - 1))) % population.length;
        return population[ranks.get(a)! < ranks.get(b)! || (ranks.get(a) === ranks.get(b) && density.get(a)! >= density.get(b)!) ? a : b];
      };
      const offspring: LabSolution[] = [];
      while (offspring.length < options.populationSize) {
        let a = [...tournament().genes];
        let b = [...tournament().genes];
        if (a.length >= 2 && random() < options.crossoverRate) {
          const first = Math.floor(random() * a.length);
          const second = (first + 1 + Math.floor(random() * (a.length - 1))) % a.length;
          const lo = Math.min(first, second), hi = Math.max(first, second);
          const old = a;
          a = [...a.slice(0, lo), ...b.slice(lo, hi), ...a.slice(hi)];
          b = [...b.slice(0, lo), ...old.slice(lo, hi), ...b.slice(hi)];
        }
        for (let genes of [a, b]) {
          if (random() < options.mutationRate) genes = mutate(genes, options.geneMutationRate);
          if (offspring.length < options.populationSize) offspring.push(evaluate(repair(genes)));
        }
      }
      const combined = [...population, ...offspring];
      const survivors: LabSolution[] = [];
      for (const front of fronts(combined)) {
        const remaining = options.populationSize - survivors.length;
        if (remaining <= 0) break;
        const c = crowding(combined, front);
        const ordered = front.length <= remaining ? front : [...front].sort((a, b) => c.get(b)! - c.get(a)!);
        survivors.push(...ordered.slice(0, remaining).map((i) => combined[i]));
      }
      population = survivors;
      record(iteration + 1, paretoArchive(population));
    }
    return { archive: paretoArchive(population), convergence };
  }

  const swarm = population.map((current) => ({ current, best: current, velocity: current.genes.map(() => random() * 2 - 1) }));
  let archive = paretoArchive(population, options.archiveSize);
  for (let iteration = 0; iteration < options.iterations; iteration++) {
    const progress = iteration / Math.max(options.iterations - 1, 1);
    const inertia = options.inertiaStart + (options.inertiaEnd - options.inertiaStart) * progress;
    const mutation = options.mutationStart + (options.mutationEnd - options.mutationStart) * progress;
    const c = crowding(archive);
    for (const particle of swarm) {
      const a = Math.floor(random() * archive.length);
      const b = archive.length > 1 ? (a + 1 + Math.floor(random() * (archive.length - 1))) % archive.length : a;
      const leader = archive[c.get(a)! > c.get(b)! ? a : c.get(b)! > c.get(a)! ? b : random() < 0.5 ? a : b];
      particle.velocity = particle.velocity.map((velocity, i) => Math.max(-options.velocityLimit, Math.min(options.velocityLimit,
        inertia * velocity + options.cognitive * random() * (particle.best.genes[i] - particle.current.genes[i]) +
        options.social * random() * (leader.genes[i] - particle.current.genes[i]))));
      const candidate = particle.current.genes.map((gene, i) => Math.max(0, Math.min(printerCount - 1, Math.round(gene + particle.velocity[i]))));
      particle.current = evaluate(repair(mutate(candidate, mutation)));
      if (dominates(particle.current, particle.best) || (!dominates(particle.best, particle.current) && random() < 0.5)) particle.best = particle.current;
    }
    archive = paretoArchive([...archive, ...swarm.flatMap((p) => [p.current, p.best])], options.archiveSize);
    record(iteration + 1, archive);
  }
  return { archive, convergence };
}
