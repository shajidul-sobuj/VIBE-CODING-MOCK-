import { BuildingData, RouteResult, InitialState } from '../types';

export function calculateRoute(
  building: BuildingData,
  startNodeId: string,
  currentState: InitialState
): RouteResult {
  const { nodes, edges } = building;
  const { blocked_nodes, blocked_edges, closed_exits } = currentState;

  if (blocked_nodes.includes(startNodeId)) {
    return { path: [], cost: 0, exitId: '', error: 'start_blocked' };
  }

  // Create adjacency list
  const adj = new Map<string, { to: string; cost: number; edgeId: string }[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (blocked_edges.includes(edge.id)) continue;
    // Discard edges if incident to a blocked node
    if (blocked_nodes.includes(edge.from) || blocked_nodes.includes(edge.to)) continue;

    if (adj.has(edge.from)) {
      adj.get(edge.from)!.push({ to: edge.to, cost: edge.cost, edgeId: edge.id });
    }
    if (adj.has(edge.to)) {
      adj.get(edge.to)!.push({ to: edge.from, cost: edge.cost, edgeId: edge.id });
    }
  }

  // Dijkstra
  const distances = new Map<string, number>();
  const paths = new Map<string, string[]>();

  for (const node of nodes) {
    distances.set(node.id, Infinity);
  }
  distances.set(startNodeId, 0);
  paths.set(startNodeId, [startNodeId]);

  const pq: { id: string; dist: number }[] = [];
  pq.push({ id: startNodeId, dist: 0 });

  while (pq.length > 0) {
    // Basic array sort for PQ since N <= 60
    pq.sort((a, b) => a.dist - b.dist);
    const curr = pq.shift()!;
    const u = curr.id;
    const d = curr.dist;

    if (d > distances.get(u)!) continue;

    const neighbors = adj.get(u) || [];
    for (const neighbor of neighbors) {
      const v = neighbor.to;
      const weight = neighbor.cost;

      if (closed_exits.includes(v)) continue;

      const alt = distances.get(u)! + weight;
      const currentVPath = [...paths.get(u)!, v];

      const currentVDist = distances.get(v)!;
      if (alt < currentVDist) {
        distances.set(v, alt);
        paths.set(v, currentVPath);
        pq.push({ id: v, dist: alt });
      } else if (alt === currentVDist) {
        // Tie breaker 3: lexicographically smallest sequence of node IDs
        const existingVPath = paths.get(v)!;
        if (lexicographicalCompare(currentVPath, existingVPath) < 0) {
           paths.set(v, currentVPath);
           pq.push({ id: v, dist: alt });
        }
      }
    }
  }

  // Find best exit
  const openExits = nodes.filter(n => n.type === 'exit' && !closed_exits.includes(n.id) && !blocked_nodes.includes(n.id));
  
  let bestExitId: string | null = null;
  let minCost = Infinity;
  let bestPath: string[] = [];

  for (const exit of openExits) {
    const cost = distances.get(exit.id)!;
    if (cost < Infinity) {
      if (cost < minCost) {
        minCost = cost;
        bestExitId = exit.id;
        bestPath = paths.get(exit.id)!;
      } else if (cost === minCost) {
         // Tie breaker 2: lexicographically smallest exit ID
         if (exit.id < bestExitId!) {
             bestExitId = exit.id;
             bestPath = paths.get(exit.id)!;
         } else if (exit.id === bestExitId) {
             const exitPath = paths.get(exit.id)!;
             if (lexicographicalCompare(exitPath, bestPath) < 0) {
                 bestPath = exitPath;
             }
         }
      }
    }
  }

  if (bestExitId === null) {
    return { path: [], cost: 0, exitId: '', error: 'no_route' };
  }

  return {
    path: bestPath,
    cost: minCost,
    exitId: bestExitId
  };
}

function lexicographicalCompare(a: string[], b: string[]): number {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) {
            return a[i] < b[i] ? -1 : 1;
        }
    }
    return a.length - b.length;
}
