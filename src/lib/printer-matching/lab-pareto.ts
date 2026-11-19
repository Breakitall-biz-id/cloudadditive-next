export type LabSolution = { genes: number[]; objectives: number[] };

export function dominates(a: LabSolution, b: LabSolution) {
  return a.objectives.every((v, i) => v <= b.objectives[i]) && a.objectives.some((v, i) => v < b.objectives[i]);
}

export function fronts(population: LabSolution[]): number[][] {
  const counts = population.map(() => 0);
  const dominated = population.map(() => [] as number[]);
  const result: number[][] = [[]];
  population.forEach((a, i) => {
    population.forEach((b, j) => {
      if (i === j) return;
      if (dominates(a, b)) dominated[i].push(j);
      else if (dominates(b, a)) counts[i]++;
    });
    if (!counts[i]) result[0].push(i);
  });
  for (let rank = 0; result[rank]?.length; rank++) {
    const next: number[] = [];
    for (const i of result[rank]) for (const j of dominated[i]) if (--counts[j] === 0) next.push(j);
    if (next.length) result.push(next);
  }
  return result;
}

export function crowding(population: LabSolution[], front = population.map((_, i) => i)) {
  const values = new Map(front.map((i) => [i, 0]));
  if (front.length <= 2) {
    front.forEach((i) => values.set(i, Infinity));
    return values;
  }
  for (let d = 0; d < population[0].objectives.length; d++) {
    const sorted = [...front].sort((a, b) => population[a].objectives[d] - population[b].objectives[d]);
    values.set(sorted[0], Infinity);
    values.set(sorted.at(-1)!, Infinity);
    const span = population[sorted.at(-1)!].objectives[d] - population[sorted[0]].objectives[d];
    if (span <= 1e-12) continue;
    for (let j = 1; j < sorted.length - 1; j++) {
      values.set(sorted[j], values.get(sorted[j])! +
        (population[sorted[j + 1]].objectives[d] - population[sorted[j - 1]].objectives[d]) / span);
    }
  }
  return values;
}

export function paretoArchive(population: LabSolution[], limit = Infinity) {
  const genes = new Set<string>();
  const vectors = new Set<string>();
  const unique = population.filter((item) => {
    const g = item.genes.join(",");
    const v = item.objectives.map((n) => n.toFixed(10)).join(",");
    if (genes.has(g) || vectors.has(v)) return false;
    genes.add(g); vectors.add(v);
    return true;
  });
  const front = unique.filter((a, i) => !unique.some((b, j) => j !== i && dominates(b, a)));
  if (front.length <= limit) return front;
  const distances = crowding(front);
  return front.map((_, i) => i).sort((a, b) => distances.get(b)! - distances.get(a)!).slice(0, limit).map((i) => front[i]);
}

export function calculateAhp(matrix: number[][]) {
  // Perron eigenvector by power iteration, matching numpy's principal eigenvector.
  let weights = [1 / 3, 1 / 3, 1 / 3];
  for (let step = 0; step < 200; step++) {
    const next = matrix.map((row) => row.reduce((sum, v, i) => sum + v * weights[i], 0));
    const total = next.reduce((a, b) => a + b, 0);
    const normalized = next.map((v) => v / total);
    const change = Math.max(...normalized.map((v, i) => Math.abs(v - weights[i])));
    weights = normalized;
    if (change < 1e-13) break;
  }
  const lambda = matrix.reduce((sum, row, i) => sum + row.reduce((s, v, j) => s + v * weights[j], 0) / weights[i], 0) / 3;
  // Matrix order is distance, lateness, load; evaluator order is distance, load, lateness.
  return { weights: [weights[0], weights[2], weights[1]], consistencyRatio: (lambda - 3) / 2 / 0.58 };
}

export function selectTopsis(archive: LabSolution[], weights: number[]) {
  const minimumViolations = Math.min(...archive.map((s) => s.objectives[0]));
  const pool = archive.filter((s) => s.objectives[0] === minimumViolations);
  const norm = weights.map((_, d) => Math.sqrt(pool.reduce((sum, s) => sum + s.objectives[d + 1] ** 2, 0)) || 1e-12);
  const weighted = pool.map((s) => weights.map((w, d) => s.objectives[d + 1] / norm[d] * w));
  const best = weights.map((_, d) => Math.min(...weighted.map((v) => v[d])));
  const worst = weights.map((_, d) => Math.max(...weighted.map((v) => v[d])));
  const scores = weighted.map((v) => {
    const db = Math.sqrt(v.reduce((sum, n, d) => sum + (n - best[d]) ** 2, 0));
    const dw = Math.sqrt(v.reduce((sum, n, d) => sum + (n - worst[d]) ** 2, 0));
    return db + dw > 1e-12 ? dw / (db + dw) : 1;
  });
  const index = scores.indexOf(Math.max(...scores));
  return { selected: pool[index], score: scores[index], poolSize: pool.length };
}

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
