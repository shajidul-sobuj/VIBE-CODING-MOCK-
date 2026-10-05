export type NodeType = 'room' | 'junction' | 'exit';

export interface Node {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  cost: number;
}

export interface InitialState {
  blocked_nodes: string[];
  blocked_edges: string[];
  closed_exits: string[];
}

export interface BuildingData {
  building: string;
  nodes: Node[];
  edges: Edge[];
  initial_state: InitialState;
}

export interface RouteResult {
  path: string[];
  cost: number;
  exitId: string;
  error?: 'no_route' | 'start_blocked';
}
