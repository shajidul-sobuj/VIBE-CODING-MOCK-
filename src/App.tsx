import React, { useState, useEffect } from 'react';
import { BuildingData, InitialState, RouteResult } from './types';
import { calculateRoute } from './utils/dijkstra';
import enTranslations from './locales/en.json';
import bnTranslations from './locales/bn.json';
import { MapViewer } from './components/MapViewer';
import { Upload, RotateCcw, AlertTriangle, Languages } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type Lang = 'en' | 'bn';

function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [building, setBuilding] = useState<BuildingData | null>(null);
  const [currentState, setCurrentState] = useState<InitialState>({ blocked_nodes: [], blocked_edges: [], closed_exits: [] });
  const [startNode, setStartNode] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [hazardMode, setHazardMode] = useState<boolean>(false);

  const t = lang === 'en' ? enTranslations : bnTranslations;

  useEffect(() => {
    fetch('/building.json')
      .then(res => res.json())
      .then((data: BuildingData) => {
        setBuilding(data);
        setCurrentState(JSON.parse(JSON.stringify(data.initial_state)));
      })
      .catch(err => console.error("Failed to load default building", err));
  }, []);

  useEffect(() => {
    if (building && startNode) {
      const result = calculateRoute(building, startNode, currentState);
      setRoute(result);
    } else {
      setRoute(null);
    }
  }, [building, startNode, currentState]);

  const handleReset = () => {
    if (building) {
      setCurrentState(JSON.parse(JSON.stringify(building.initial_state)));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BuildingData;
        // Basic validation could be added here
        setBuilding(data);
        setCurrentState(JSON.parse(JSON.stringify(data.initial_state)));
        setStartNode(null);
      } catch (err) {
        alert("Invalid JSON format");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const toggleNodeHazard = (nodeId: string) => {
    if (!building) return;
    const node = building.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setCurrentState(prev => {
      const newState = { ...prev };
      if (node.type === 'exit') {
        if (newState.closed_exits.includes(nodeId)) {
          newState.closed_exits = newState.closed_exits.filter(id => id !== nodeId);
        } else {
          newState.closed_exits.push(nodeId);
        }
      } else {
        if (newState.blocked_nodes.includes(nodeId)) {
          newState.blocked_nodes = newState.blocked_nodes.filter(id => id !== nodeId);
        } else {
          newState.blocked_nodes.push(nodeId);
        }
      }
      return newState;
    });
  };

  const toggleEdgeHazard = (edgeId: string) => {
    setCurrentState(prev => {
      const newState = { ...prev };
      if (newState.blocked_edges.includes(edgeId)) {
        newState.blocked_edges = newState.blocked_edges.filter(id => id !== edgeId);
      } else {
        newState.blocked_edges.push(edgeId);
      }
      return newState;
    });
  };

  const handleNodeClick = (nodeId: string) => {
    if (!building) return;
    const node = building.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (hazardMode) {
      toggleNodeHazard(nodeId);
    } else {
      if (node.type !== 'exit') {
        setStartNode(nodeId);
      }
    }
  };

  const handleEdgeClick = (edgeId: string) => {
    if (hazardMode) {
      toggleEdgeHazard(edgeId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium transition-colors">
            <Upload size={16} />
            {t.uploadLabel}
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={() => setLang(l => l === 'en' ? 'bn' : 'en')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium transition-colors"
          >
            <Languages size={16} />
            {t.langToggle}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto p-6 gap-6">
        <aside className="w-full lg:w-80 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <h2 className="font-semibold mb-3 text-lg">Controls</h2>
            <p className="text-sm text-slate-600 mb-4">{t.instructions}</p>
            
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg border">
              <span className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle size={16} className={hazardMode ? "text-orange-500" : "text-slate-400"} />
                {t.hazardMode}
              </span>
              <button 
                onClick={() => setHazardMode(!hazardMode)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold transition-colors",
                  hazardMode ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-600"
                )}
              >
                {hazardMode ? t.hazardModeOn : t.hazardModeOff}
              </button>
            </div>

            <button 
              onClick={handleReset}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              <RotateCcw size={16} />
              {t.resetBtn}
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border flex-1">
            <h2 className="font-semibold mb-3 text-lg">Route Info</h2>
            {!startNode ? (
              <div className="text-slate-500 text-sm flex items-center justify-center h-32 bg-slate-50 rounded-lg border border-dashed">
                {t.statusSelectStart}
              </div>
            ) : route ? (
              route.error ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 font-medium">
                  {route.error === 'start_blocked' ? t.errorStartBlocked : t.errorNoRoute}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <div className="text-green-800 text-xl font-bold mb-1">{t.routeCost}: {route.cost}</div>
                    <div className="text-green-700 text-sm">{t.exitReached}: <span className="font-semibold">{route.exitId}</span></div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 mb-2">{t.path}</div>
                    <div className="flex flex-wrap gap-2">
                      {route.path.map((nodeId, idx) => (
                        <React.Fragment key={nodeId}>
                          <span className="px-2 py-1 bg-slate-100 border rounded text-sm font-medium text-slate-700">
                            {nodeId}
                          </span>
                          {idx < route.path.length - 1 && (
                            <span className="text-slate-400 self-center">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </aside>

        <section className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden relative min-h-[500px]">
          {building && (
            <MapViewer 
              building={building} 
              currentState={currentState}
              route={route}
              startNode={startNode}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              hazardMode={hazardMode}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
