import React, { useState, useEffect } from 'react';
import { BuildingData, InitialState, RouteResult } from './types';
import { calculateRoute } from './utils/dijkstra';
import { validateBuildingData } from './utils/validation';
import enTranslations from './locales/en.json';
import bnTranslations from './locales/bn.json';
import { MapViewer } from './components/MapViewer';
import { Upload, RotateCcw, AlertTriangle, Languages, Route, AlertCircle } from 'lucide-react';
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

  const t = lang === 'en' ? enTranslations : bnTranslations as typeof enTranslations;

  useEffect(() => {
    fetch('/building.json')
      .then(res => res.json())
      .then((data) => {
        const error = validateBuildingData(data);
        if (error) {
          console.error("Default building.json validation failed:", error);
          return;
        }
        setBuilding(data as BuildingData);
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
      setStartNode(null);
      // Route is cleared via useEffect when startNode becomes null
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const errorMsg = validateBuildingData(parsed);
        
        if (errorMsg) {
          alert(`Validation Error: ${errorMsg}`);
          return;
        }
        
        const data = parsed as BuildingData;
        setBuilding(data);
        setCurrentState(JSON.parse(JSON.stringify(data.initial_state)));
        setStartNode(null);
        setRoute(null);
        setHazardMode(false); // Clean UX reset on new file
      } catch (err) {
        alert("Invalid JSON format");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleNodeHazard = (nodeId: string) => {
    if (!building) return;
    const node = building.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setCurrentState(prev => {
      if (node.type === 'exit') {
        return {
          ...prev,
          closed_exits: prev.closed_exits.includes(nodeId)
            ? prev.closed_exits.filter(id => id !== nodeId)
            : [...prev.closed_exits, nodeId]
        };
      } else {
        return {
          ...prev,
          blocked_nodes: prev.blocked_nodes.includes(nodeId)
            ? prev.blocked_nodes.filter(id => id !== nodeId)
            : [...prev.blocked_nodes, nodeId]
        };
      }
    });
  };

  const toggleEdgeHazard = (edgeId: string) => {
    setCurrentState(prev => ({
      ...prev,
      blocked_edges: prev.blocked_edges.includes(edgeId)
        ? prev.blocked_edges.filter(id => id !== edgeId)
        : [...prev.blocked_edges, edgeId]
    }));
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
      <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between z-10 relative">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-md text-sm font-medium transition-all">
            <Upload size={16} />
            {t.uploadLabel}
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={() => setLang(l => l === 'en' ? 'bn' : 'en')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-md text-sm font-medium transition-all"
          >
            <Languages size={16} />
            {t.langToggle}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto p-6 gap-6">
        <aside className="w-full lg:w-80 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border transition-all">
            <h2 className="font-semibold mb-3 text-lg">Controls</h2>
            <p className="text-sm text-slate-600 mb-4 min-h-[40px] animate-pop-in transition-all" key={hazardMode ? 'haz' : 'norm'}>
              {hazardMode ? t.instructionsHazard : t.instructionsNormal}
            </p>
            
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg border transition-all hover:bg-slate-100">
              <span className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle size={16} className={cn("transition-colors duration-300", hazardMode ? "text-orange-500" : "text-slate-400")} />
                {t.hazardMode}
              </span>
              <button 
                onClick={() => setHazardMode(!hazardMode)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95",
                  hazardMode ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "bg-slate-200 text-slate-600"
                )}
              >
                {hazardMode ? t.hazardModeOn : t.hazardModeOff}
              </button>
            </div>

            <button 
              onClick={handleReset}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-md text-sm font-medium transition-all shadow-sm"
            >
              <RotateCcw size={16} />
              {t.resetBtn}
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border flex-1">
            <h2 className="font-semibold mb-4 text-lg">Route Info</h2>
            {!startNode ? (
              <div className="text-slate-500 text-sm flex flex-col items-center justify-center h-32 bg-slate-50 rounded-lg border border-dashed transition-all">
                <Route size={24} className="mb-2 opacity-20" />
                {t.statusSelectStart}
              </div>
            ) : route ? (
              <div key={route.error || route.path.join('')} className="animate-fade-slide space-y-4">
                {route.error ? (
                  <div className="bg-red-50 text-red-900 p-4 rounded-lg border border-red-200">
                    <div className="font-bold flex items-center gap-2 mb-1">
                      <AlertCircle size={18} className="text-red-600" />
                      {route.error === 'start_blocked' ? t.errorStartBlocked : t.errorNoRoute}
                    </div>
                    <div className="text-sm text-red-700">
                      {route.error === 'start_blocked' ? t.expStartBlocked : t.expNoRoute}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Route size={48} />
                      </div>
                      <div className="text-green-900 font-bold mb-1 flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                         {t.routeFound}
                      </div>
                      <div className="text-green-800 text-2xl font-black mb-1">
                        {t.routeCost}: {route.cost}
                      </div>
                      <div className="text-green-700 text-sm font-medium">
                        {t.exitReached}: <span className="bg-green-200 px-2 py-0.5 rounded ml-1">{route.exitId}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.path}</div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {route.path.map((nodeId, idx) => (
                          <React.Fragment key={nodeId}>
                            <span className="px-2.5 py-1 bg-white border border-slate-200 shadow-sm rounded text-sm font-bold text-slate-700">
                              {nodeId}
                            </span>
                            {idx < route.path.length - 1 && (
                              <span className="text-slate-300 font-bold">→</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
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
