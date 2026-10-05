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
  
  // Find map bounds to center/scale SVG
  const { minX, minY, maxX, maxY } = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    building.nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });
    // Add padding
    return { minX: minX - 50, minY: minY - 50, maxX: maxX + 50, maxY: maxY + 50 };
  }, [building]);

  const width = Math.max(maxX - minX, 100);
  const height = Math.max(maxY - minY, 100);

  const isEdgeInRoute = (from: string, to: string) => {
    if (!route || route.error || route.path.length < 2) return false;
    for (let i = 0; i < route.path.length - 1; i++) {
      if ((route.path[i] === from && route.path[i+1] === to) || 
          (route.path[i] === to && route.path[i+1] === from)) {
        return true;
      }
    }
    return false;
  };

  return (
    <svg 
      viewBox={`${minX} ${minY} ${width} ${height}`} 
      className="w-full h-full select-none"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
        </marker>
        <pattern id="blocked-pattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="4" />
        </pattern>
      </defs>

      {/* Edges */}
      {building.edges.map(edge => {
        const fromNode = building.nodes.find(n => n.id === edge.from);
        const toNode = building.nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return null;

        const isBlocked = currentState.blocked_edges.includes(edge.id) || 
                          currentState.blocked_nodes.includes(edge.from) || 
                          currentState.blocked_nodes.includes(edge.to);
        
        const isRoute = isEdgeInRoute(edge.from, edge.to);

        const cx = (fromNode.x + toNode.x) / 2;
        const cy = (fromNode.y + toNode.y) / 2;

        return (
          <g key={edge.id} 
             onClick={() => onEdgeClick(edge.id)}
             className={cn("transition-all", hazardMode && !isBlocked && "cursor-pointer hover:opacity-70")}
          >
            {/* Hit area for clicking */}
            <line 
              x1={fromNode.x} y1={fromNode.y} 
              x2={toNode.x} y2={toNode.y} 
              stroke="transparent" strokeWidth="20" 
            />
            
            {/* Visual line */}
            <line 
              x1={fromNode.x} y1={fromNode.y} 
              x2={toNode.x} y2={toNode.y} 
              stroke={isBlocked ? '#fca5a5' : isRoute ? '#3b82f6' : '#cbd5e1'} 
              strokeWidth={isRoute ? "6" : "4"}
              strokeDasharray={isBlocked ? "8,8" : "none"}
              className="transition-colors duration-300"
            />

            {/* Edge Cost Label */}
            <g transform={`translate(${cx}, ${cy})`}>
              <circle r="12" fill={isBlocked ? '#fef2f2' : '#ffffff'} stroke={isBlocked ? '#fca5a5' : '#cbd5e1'} strokeWidth="2" />
              <text textAnchor="middle" dy=".3em" fontSize="12" fontWeight="bold" fill={isBlocked ? '#ef4444' : '#64748b'}>
                {edge.cost}
              </text>
            </g>
            
            {isBlocked && (
              <g transform={`translate(${cx}, ${cy}) scale(1.5)`}>
                 <line x1="-8" y1="-8" x2="8" y2="8" stroke="#ef4444" strokeWidth="2" />
                 <line x1="-8" y1="8" x2="8" y2="-8" stroke="#ef4444" strokeWidth="2" />
              </g>
            )}
          </g>
        );
      })}

      {/* Nodes */}
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
          strokeColor = '#3b82f6';
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
            key={node.id} 
            transform={`translate(${node.x}, ${node.y})`}
            onClick={() => onNodeClick(node.id)}
            className={cn(
              "transition-all cursor-pointer",
              hazardMode ? "hover:scale-105" : "hover:brightness-95"
            )}
          >
            {isStart && (
              <circle r="26" fill="none" stroke="#3b82f6" strokeWidth="3" className="animate-ping opacity-20" />
            )}
            
            <circle 
              r="20" 
              fill={fillColor} 
              stroke={strokeColor} 
              strokeWidth={isInPath || isStart || isEnd ? "4" : "3"} 
              className="transition-all duration-300"
            />
            
            <text textAnchor="middle" dy=".3em" fontSize="12" fontWeight="bold" fill="#334155">
              {node.id}
            </text>

            <text textAnchor="middle" y="32" fontSize="11" fontWeight="500" fill="#475569">
              {node.label}
            </text>
            <text textAnchor="middle" y="44" fontSize="9" fill="#94a3b8" className="uppercase tracking-wider">
              {node.type}
            </text>

            {isUnusable && (
              <path d="M-12,-12 L12,12 M-12,12 L12,-12" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
