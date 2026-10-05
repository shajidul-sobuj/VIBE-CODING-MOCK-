export function validateBuildingData(data: any): string | null {
  if (!data || typeof data !== 'object') return "Invalid JSON object.";
  
  if (typeof data.building !== 'string' || data.building.trim() === '') {
    return "Missing or empty 'building' name.";
  }

  if (!Array.isArray(data.nodes) || data.nodes.length < 2 || data.nodes.length > 60) {
    return "Nodes array must contain between 2 and 60 nodes.";
  }

  if (!Array.isArray(data.edges) || data.edges.length < 1 || data.edges.length > 150) {
    return "Edges array must contain between 1 and 150 edges.";
  }

  const nodeIds = new Set<string>();
  let hasRoomOrJunction = false;
  let hasExit = false;

  for (const node of data.nodes) {
    if (!node.id || typeof node.id !== 'string') return "Invalid node ID.";
    if (nodeIds.has(node.id)) return `Duplicate node ID: ${node.id}`;
    if (!node.label || typeof node.label !== 'string' || node.label.trim() === '') return `Invalid or empty label for node ${node.id}.`;
    if (typeof node.x !== 'number' || typeof node.y !== 'number') return `Invalid coordinates for node ${node.id}.`;
    if (!['room', 'junction', 'exit'].includes(node.type)) return `Invalid type for node ${node.id}.`;
    
    nodeIds.add(node.id);
    if (node.type === 'room' || node.type === 'junction') hasRoomOrJunction = true;
    if (node.type === 'exit') hasExit = true;
  }

  if (!hasRoomOrJunction) return "Graph must have at least one room or junction.";
  if (!hasExit) return "Graph must have at least one exit.";

  const edgePairs = new Set<string>();
  const edgeIds = new Set<string>();
  
  for (const edge of data.edges) {
    if (!edge.id || typeof edge.id !== 'string') return "Invalid edge ID.";
    if (edgeIds.has(edge.id)) return `Duplicate edge ID: ${edge.id}`;
    edgeIds.add(edge.id);

    if (typeof edge.cost !== 'number' || edge.cost <= 0 || !Number.isInteger(edge.cost)) {
      return `Invalid cost for edge ${edge.id}. Must be a positive integer.`;
    }
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      return `Edge ${edge.id} references non-existent nodes.`;
    }
    if (edge.from === edge.to) return `Self-loop detected on edge ${edge.id}.`;
    
    const pair1 = `${edge.from}-${edge.to}`;
    const pair2 = `${edge.to}-${edge.from}`;
    if (edgePairs.has(pair1) || edgePairs.has(pair2)) {
      return `Repeated edge pair detected between ${edge.from} and ${edge.to}.`;
    }
    edgePairs.add(pair1);
  }

  if (!data.initial_state || typeof data.initial_state !== 'object') {
    return "Missing initial_state object.";
  }

  const { blocked_nodes, blocked_edges, closed_exits } = data.initial_state;
  if (!Array.isArray(blocked_nodes) || !Array.isArray(blocked_edges) || !Array.isArray(closed_exits)) {
    return "initial_state arrays are invalid or missing.";
  }

  for (const id of blocked_nodes) {
    if (!nodeIds.has(id)) return `initial_state: blocked_node ${id} does not exist.`;
    const nodeType = data.nodes.find((n: any) => n.id === id).type;
    if (nodeType !== 'room' && nodeType !== 'junction') return `initial_state: exit node ${id} cannot be in blocked_nodes.`;
  }

  for (const id of blocked_edges) {
    if (!edgeIds.has(id)) return `initial_state: blocked_edge ${id} does not exist.`;
  }

  for (const id of closed_exits) {
    if (!nodeIds.has(id)) return `initial_state: closed_exit ${id} does not exist.`;
    const nodeType = data.nodes.find((n: any) => n.id === id).type;
    if (nodeType !== 'exit') return `initial_state: non-exit node ${id} cannot be in closed_exits.`;
  }

  return null;
}
