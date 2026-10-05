import { useMemo } from 'react';
import { BuildingData, InitialState, RouteResult } from '../types';
import { cn } from '../App';

interface MapViewerProps {
  building: BuildingData;
  currentState: InitialState;
  route: RouteResult | null;
  startNode: string | null;
  onNodeClick: (nodeId: string) => void;
  onEdgeClick: (edgeId: string) => void;
  hazardMode: boolean;
}

export function MapViewer({ 
  building, 
  currentState, 
  route, 
  startNode, 
  onNodeClick, 
  onEdgeClick,
  hazardMode
}: MapViewerProps) {
  
  const { minX, minY, maxX, maxY } = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    building.nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });
    return { minX: minX - 50, minY: minY - 50, maxX: maxX + 50, maxY: maxY + 50 };
  }, [building]);

  const width = Math.max(maxX - minX, 100);
  const height = Math.max(maxY - minY, 100);

  const getEdgeRouteDirection = (from: string, to: string) => {
    if (!route || route.error || route.path.length < 2) return null;
    for (let i = 0; i < route.path.length - 1; i++) {
      if (route.path[i] === from && route.path[i+1] === to) {
        return 1; // forward
      }
      if (route.path[i] === to && route.path[i+1] === from) {
        return -1; // backward
      }
    }
    return null;
  };

  return (
    <svg 
      viewBox={`${minX} ${minY} ${width} ${height}`} 
      className="w-full h-full select-none"
    >
      <defs>
        <pattern id="blocked-pattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="4" />
        </pattern>
      </defs>

      {/* Layer 1: Static Edge Geometry */}
      <g id="layer-static-edges">
        {building.edges.map(edge => {
          const fromNode = building.nodes.find(n => n.id === edge.from);
          const toNode = building.nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const isExplicitlyBlocked = currentState.blocked_edges.includes(edge.id);
          const isNodeBlocked = currentState.blocked_nodes.includes(edge.from) || currentState.blocked_nodes.includes(edge.to);

          let strokeColor = '#cbd5e1';
          let strokeDash = 'none';

          if (isExplicitlyBlocked) {
            strokeColor = '#fca5a5';
            strokeDash = '8,8';
          } else if (isNodeBlocked) {
            strokeColor = '#e2e8f0'; 
            strokeDash = '4,4';
          }

          return (
            <line 
              key={`static-${edge.id}`}
              x1={fromNode.x} y1={fromNode.y} 
              x2={toNode.x} y2={toNode.y} 
              stroke={strokeColor} 
              strokeWidth="4"
              strokeDasharray={strokeDash}
              className="transition-all duration-300 ease-out"
            />
          );
        })}
      </g>

      {/* Layer 2: Highlighted Route Overlay */}
      <g id="layer-route-edges">
        {building.edges.map(edge => {
          const fromNode = building.nodes.find(n => n.id === edge.from);
          const toNode = building.nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const routeDir = getEdgeRouteDirection(edge.from, edge.to);
          if (!routeDir) return null;

          // Draw explicitly in the direction of travel for perfect animation
          const startX = routeDir === 1 ? fromNode.x : toNode.x;
          const startY = routeDir === 1 ? fromNode.y : toNode.y;
          const endX = routeDir === 1 ? toNode.x : fromNode.x;
          const endY = routeDir === 1 ? toNode.y : fromNode.y;

          return (
            <line 
              key={`route-${edge.id}`}
              x1={startX} y1={startY} 
              x2={endX} y2={endY} 
              stroke="#3b82f6" 
              strokeWidth="6"
              className="animate-draw-line"
            />
          );
        })}
      </g>

      {/* Layer 3: Edge Interaction & Labels */}
      <g id="layer-edge-labels">
        {building.edges.map(edge => {
          const fromNode = building.nodes.find(n => n.id === edge.from);
          const toNode = building.nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const isExplicitlyBlocked = currentState.blocked_edges.includes(edge.id);
          const isNodeBlocked = currentState.blocked_nodes.includes(edge.from) || currentState.blocked_nodes.includes(edge.to);
          
          const cx = (fromNode.x + toNode.x) / 2;
          const cy = (fromNode.y + toNode.y) / 2;

          const canToggle = hazardMode && !isNodeBlocked;

          let circleFill = '#ffffff';
          let circleStroke = '#cbd5e1';
          let textFill = '#64748b';

          if (isExplicitlyBlocked) {
            circleFill = '#fef2f2';
            circleStroke = '#fca5a5';
            textFill = '#ef4444';
          } else if (isNodeBlocked) {
            circleFill = '#f8fafc';
            circleStroke = '#e2e8f0';
            textFill = '#cbd5e1';
          }

          return (
            <g key={`label-${edge.id}`} 
               onClick={() => { if (canToggle) onEdgeClick(edge.id); }}
               className={cn("transition-opacity duration-200", canToggle ? "cursor-pointer hover:opacity-70" : "")}
            >
              {/* Hit area for clicking */}
              <line 
                x1={fromNode.x} y1={fromNode.y} 
                x2={toNode.x} y2={toNode.y} 
                stroke="transparent" strokeWidth="24" 
                className={canToggle ? "" : "pointer-events-none"}
              />

              <g transform={`translate(${cx}, ${cy})`} className="transition-transform duration-300">
                <circle r="12" fill={circleFill} stroke={circleStroke} strokeWidth="2" className="transition-colors duration-300" />
                <text textAnchor="middle" dy=".3em" fontSize="12" fontWeight="bold" fill={textFill} className="transition-colors duration-300">
                  {edge.cost}
                </text>
                
                {isExplicitlyBlocked && (
                  <g className="scale-150 animate-pop-in">
                    <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ef4444" strokeWidth="1.5" />
                    <line x1="-5" y1="5" x2="5" y2="-5" stroke="#ef4444" strokeWidth="1.5" />
                  </g>
                )}
              </g>
            </g>
          );
        })}
      </g>

      {/* Layer 4: Nodes */}
      <g id="layer-nodes">
        {building.nodes.map(node => {
          const isBlocked = currentState.blocked_nodes.includes(node.id);
          const isClosed = currentState.closed_exits.includes(node.id);
          const isUnusable = isBlocked || isClosed;
          
          const isStart = startNode === node.id;
          const isEnd = route?.exitId === node.id && !route.error;
          const isInPath = route?.path.includes(node.id);

          let fillColor = '#ffffff';
          let strokeColor = '#94a3b8';

          if (isUnusable) {
            fillColor = 'url(#blocked-pattern)';
            strokeColor = '#ef4444';
          } else if (isStart) {
            fillColor = '#eff6ff';
            strokeColor = '#2563eb';
          } else if (isEnd) {
            fillColor = '#f0fdf4';
            strokeColor = '#22c55e';
          } else if (isInPath) {
            fillColor = '#f8fafc';
            strokeColor = '#3b82f6';
          } else {
            if (node.type === 'room') { strokeColor = '#6366f1'; fillColor = '#eef2ff'; }
            if (node.type === 'junction') { strokeColor = '#8b5cf6'; fillColor = '#f5f3ff'; }
            if (node.type === 'exit') { strokeColor = '#10b981'; fillColor = '#ecfdf5'; }
          }

          return (
            <g 
              key={`node-${node.id}`} 
              transform={`translate(${node.x}, ${node.y})`}
            >
              <g 
                onClick={() => onNodeClick(node.id)}
                className={cn(
                  "cursor-pointer transition-all duration-200 ease-out",
                  hazardMode ? "hover:scale-[1.04] hover:drop-shadow-md" : "hover:brightness-95",
                  isStart ? "animate-start-node" : "",
                  isUnusable ? "animate-subtle-glow" : ""
                )}
              >
                {isStart && (
                  <circle key={`ring-${startNode}`} r="24" fill="none" stroke="#2563eb" strokeWidth="1.5" className="opacity-40 transition-opacity duration-300" />
                )}
                
                <circle 
                  r="20" 
                  fill={fillColor} 
                  stroke={strokeColor} 
                  strokeWidth={isInPath || isStart || isEnd ? "4" : "3"} 
                  className="transition-colors duration-300"
                />
                
                <text textAnchor="middle" dy=".3em" fontSize="12" fontWeight="bold" fill="#334155">
                  {node.id}
                </text>

                {isUnusable && (
                  <path d="M-12,-12 L12,12 M-12,12 L12,-12" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className="animate-pop-in" />
                )}
              </g>
            </g>
          );
        })}
      </g>

      {/* Layer 5: Node Labels */}
      <g id="layer-node-labels" className="pointer-events-none">
        {building.nodes.map(node => (
          <g key={`nodelabel-${node.id}`} transform={`translate(${node.x}, ${node.y})`}>
            <text textAnchor="middle" y="34" fontSize="11" fontWeight="600" fill="#475569">
              {node.label}
            </text>
            <text textAnchor="middle" y="46" fontSize="9" fontWeight="700" fill="#94a3b8" className="uppercase tracking-wider">
              {node.type}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
