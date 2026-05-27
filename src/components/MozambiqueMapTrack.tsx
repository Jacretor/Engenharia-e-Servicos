import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Globe, Compass, Activity, CheckCircle2, Clock, Truck } from 'lucide-react';

interface CityNode {
  id: string;
  name: string;
  coords: { x: number; y: number };
  details: string;
  role: string;
  avgTime: string;
}

export const MozambiqueMapTrack = () => {
  const [hoveredNode, setHoveredNode] = useState<CityNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<string>('chimoio');
  const [simulatedTransit, setSimulatedTransit] = useState(true);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Math interpolator converting latitude / longitude points to viewbox SVG layout
  const getXY = (lat: number, lng: number) => {
    // Maputo (Lat: -25.97, Lng: 32.58) -> x: 120, y: 410
    // Chimoio (Lat: -19.12, Lng: 33.48) -> x: 170, y: 240
    // Nampula (Lat: -15.11, Lng: 39.26) -> x: 280, y: 125
    
    const latPct = (-25.97 - lat) / (-25.97 - (-12.5)); // 0 near Maputo, 1 near far North
    const y = 410 - (latPct * 290); // maps to 410 through 120
    
    const lngPct = (lng - 32.0) / (41.0 - 32.0);
    const x = 110 + (lngPct * 180);
    
    return { 
      x: Math.max(90, Math.min(310, x)), 
      y: Math.max(50, Math.min(420, y)) 
    };
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/encomendas');
        if (res.ok) {
          const data = await res.json();
          setActiveOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Falha de ligação', err);
      }
    };
    fetchOrders();

    window.addEventListener('orders-updated', fetchOrders);
    return () => window.removeEventListener('orders-updated', fetchOrders);
  }, []);

  const nodes: CityNode[] = [
    {
      id: 'maputo',
      name: 'Maputo',
      coords: { x: 120, y: 410 },
      role: 'Centro Aduaneiro & Entrada Portuária',
      details: 'Ponto crucial de desembarque de peças e insumos internacionais de alta precisão.',
      avgTime: '48 - 72 Horas'
    },
    {
      id: 'chimoio',
      name: 'Chimoio',
      coords: { x: 170, y: 240 },
      role: 'Sede Operacional & Centro de Engenharia E&S',
      details: 'Supervisão técnica principal sob a liderança direta de Lavo João Mouzinho.',
      avgTime: 'Pronta Entrega / 24h'
    },
    {
      id: 'mocambique',
      name: 'Região Norte / Moçambique',
      coords: { x: 280, y: 125 },
      role: 'Hub Regional Avançado',
      details: 'Atendimento e distribuição para projetos agrícolas, industriais de mecânica e rede TI.',
      avgTime: '72 Horas'
    }
  ];

  return (
    <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-xl font-sans relative overflow-hidden">
      {/* Dynamic Ambient Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8 mb-8">
        <div>
          <span className="flex items-center gap-2 text-[10px] font-black uppercase text-brand-purple tracking-[0.2em] mb-2">
            <Globe size={12} className="text-brand-cyan animate-spin-slow" /> Monitorização Geográfica Activa
          </span>
          <h4 className="text-2xl font-black text-[#0B1120] tracking-tighter uppercase">
            Mapa de Rota & Distribuição Física
          </h4>
          <p className="text-xs text-slate-400 font-medium">
            Rastreamento de ativos e pessoal técnico entre os principais centros operativos de Moçambique.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSimulatedTransit(!simulatedTransit)}
            className={`px-5 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
              simulatedTransit 
                ? 'bg-brand-cyan text-[#0B1120] hover:bg-[#0B1120] hover:text-white' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            } border border-black/5 flex items-center gap-2`}
          >
            <span className={`w-2 h-2 rounded-full ${simulatedTransit ? 'bg-white animate-ping' : 'bg-slate-300'}`} />
            {simulatedTransit ? 'Trânsito Activo' : 'Pausar Simulador'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        {/* Interactive SVG Map Column */}
        <div className="lg:col-span-7 bg-slate-50 rounded-3xl border border-slate-100 p-6 flex items-center justify-center relative min-h-[360px] md:min-h-[460px] overflow-hidden group">
          {/* Subtle Grid Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />

          {/* Map Compass Accent */}
          <div className="absolute bottom-6 right-6 flex items-center gap-2 pointer-events-none text-slate-200" title="Compasso">
            <Compass size={24} className="animate-spin-slow" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">N - S / E&S</span>
          </div>

          <svg 
            viewBox="50 30 300 440" 
            className="w-full h-full max-h-[420px] transition-transform duration-500"
          >
            {/* Highly stylized outline of Mozambique's Coastline */}
            <motion.path
              d="M280,60 L320,80 L325,110 L295,140 L260,165 L240,190 L210,210 L195,240 L200,280 L180,310 L155,340 C140,370 120,400 120,440 L110,445 L105,435 L125,380 L135,330 L160,280 L165,220 L180,180 L185,150 L205,120 L220,105 L235,90 L265,55 Z"
              fill="#0B1120"
              fillOpacity="0.04"
              stroke="#0B1120"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="transition-all group-hover:stroke-brand-purple/20 duration-500"
            />

            {/* Simulated Logistics Flow/Wave Path */}
            {simulatedTransit && (
              <>
                {/* Maputo to Chimoio Flow */}
                <path
                  d="M120,410 Q145,325 170,240"
                  fill="none"
                  stroke="url(#gradient-cyan)"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  className="stroke-cyan-glow"
                />
                {/* Chimoio to Mozambique North Flow */}
                <path
                  d="M170,240 Q225,182 280,125"
                  fill="none"
                  stroke="url(#gradient-purple)"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  className="stroke-purple-glow"
                />
              </>
            )}

            {/* Custom Definitions for Stroke Gradients */}
            <defs>
              <linearGradient id="gradient-cyan" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#00D2FF" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="gradient-purple" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7048E8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#7048E8" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Glowing Dotted Lines Animation CSS */}
            <style>{`
              @keyframes dash {
                to {
                  stroke-dashoffset: -40;
                }
              }
              .stroke-cyan-glow {
                animation: dash 3s linear infinite;
                stroke: #00D2FF;
                filter: drop-shadow(0px 0px 4px rgba(0,210,255,0.5));
              }
              .stroke-purple-glow {
                animation: dash 4s linear infinite;
                stroke: #7048E8;
                filter: drop-shadow(0px 0px 4px rgba(112,72,232,0.5));
              }
            `}</style>

            {/* Nodes on Map */}
            {nodes.map((node) => {
              const isActive = selectedNode === node.id || hoveredNode?.id === node.id;
              return (
                <g 
                  key={node.id} 
                  className="cursor-pointer group/node"
                  onClick={() => setSelectedNode(node.id)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Outer Pulsing Aura if selected/hovered */}
                  {isActive && (
                    <circle
                      cx={node.coords.x}
                      cy={node.coords.y}
                      r="18"
                      fill={node.id === 'chimoio' ? '#7048E8' : '#00D2FF'}
                      fillOpacity="0.15"
                      className="animate-ping"
                      style={{ animationDuration: '2.5s' }}
                    />
                  )}

                  {/* Operational Target Dot */}
                  <circle
                    cx={node.coords.x}
                    cy={node.coords.y}
                    r={isActive ? "9" : "6"}
                    fill={node.id === 'chimoio' ? '#7048E8' : '#00D2FF'}
                    stroke="white"
                    strokeWidth="2.5"
                    className="transition-all duration-300 shadow-md group-hover/node:scale-125"
                  />

                  {/* Label tag offset nicely */}
                  <text
                    x={node.coords.x}
                    y={node.coords.y - 16}
                    textAnchor="middle"
                    className="font-sans font-black uppercase text-[8px] tracking-wider fill-[#0B1120] filter drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]"
                  >
                    {node.name.split(' ')[0]}
                  </text>
                </g>
              );
            })}

            {/* Live Client Order Tracking Markers on Map */}
            {activeOrders
              .filter(o => o.localizacao_coordenadas && (o.status === 'Confirmado' || o.status === 'Em Trânsito' || o.status === 'Processando' || o.status === 'Pendente'))
              .map((order) => {
                let coords = order.localizacao_coordenadas;
                if (typeof coords === 'string') {
                  try {
                    coords = JSON.parse(coords);
                  } catch (e) {
                    return null;
                  }
                }
                if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return null;
                
                const pt = getXY(coords.lat, coords.lng);
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <g 
                    key={order.id} 
                    className="cursor-pointer group/order-pin"
                    onClick={() => setSelectedOrder(order)}
                  >
                    {/* Ring aura */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? "14" : "10"}
                      fill="#00D2FF"
                      fillOpacity="0.25"
                      className="animate-pulse"
                    />
                    {/* Core pin */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="5.5"
                      fill={order.status === 'Em Trânsito' ? '#7048E8' : '#00D2FF'}
                      stroke="white"
                      strokeWidth="2"
                    />
                    {/* Little Label */}
                    <text
                      x={pt.x}
                      y={pt.y - 11}
                      textAnchor="middle"
                      className="font-sans font-black text-[6.5px] fill-brand-cyan uppercase tracking-tighter filter drop-shadow-[0_1px_2px_rgba(11,17,32,0.9)]"
                    >
                      🚚 {String(order.id).slice(0, 4)}
                    </text>
                  </g>
                );
              })}
          </svg>

          {/* Floating Live Hover Tooltip */}
          {hoveredNode && (
            <div 
              className="absolute bg-[#0B1120] text-white p-5 rounded-2xl border border-white/10 shadow-2xl pointer-events-none w-64 z-30 flex flex-col gap-2 transition-all"
              style={{
                top: hoveredNode.id === 'mocambique' ? '10%' : hoveredNode.id === 'chimoio' ? '40%' : '65%',
                left: hoveredNode.id === 'mocambique' ? '40%' : hoveredNode.id === 'chimoio' ? '45%' : '20%'
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black uppercase text-brand-cyan tracking-widest">{hoveredNode.name}</span>
                <span className="text-[7px] font-black uppercase bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded">Activo</span>
              </div>
              <h5 className="text-[10px] font-black uppercase tracking-tight text-white leading-tight">{hoveredNode.role}</h5>
              <div className="w-full h-px bg-white/5 my-1" />
              <p className="text-[9px] text-slate-400 leading-normal font-medium">{hoveredNode.details}</p>
              <div className="flex gap-1.5 items-center justify-end mt-1 text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                <Clock size={10} className="text-brand-purple" /> Méd: {hoveredNode.avgTime}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Node Information & Logs Column */}
        <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
          <div className="space-y-6">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.3em] block mb-2">Selecção de Nó Logístico</span>
            
            <div className="flex flex-col gap-3">
              {nodes.map((node) => {
                const isSel = selectedNode === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all flex justify-between items-start gap-4 ${
                      isSel 
                        ? 'bg-slate-50 border-[#0B1120]/15 shadow-sm' 
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSel 
                          ? node.id === 'chimoio' ? 'bg-brand-purple text-white' : 'bg-brand-cyan text-[#0B1120]'
                          : 'bg-slate-50 text-slate-400'
                      }`}>
                        <MapPin size={14} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-black uppercase text-[#0B1120] tracking-tight">{node.name}</span>
                        <span className="block text-[8px] font-semibold text-slate-400 uppercase tracking-wider truncate mt-0.5">{node.role}</span>
                      </div>
                    </div>
                    {isSel && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 self-center animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Node Deep View / Live Client Order Active Tracker overlay */}
            {selectedOrder ? (
              <div className="bg-[#0B1120] text-white p-6 rounded-3xl border border-brand-cyan/20 space-y-4 shadow-xl relative overflow-hidden font-sans text-left">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-brand-cyan uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                    <Truck size={10} className="text-brand-cyan" /> RASTREIO DA ENCOMENDA
                  </span>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-[8px] bg-slate-800 hover:bg-red-500/20 hover:text-red-400 px-2 py-1 rounded font-black uppercase tracking-wider transition-colors"
                  >
                    Fechar
                  </button>
                </div>

                <div>
                  <h5 className="text-sm font-black uppercase tracking-tight text-white mb-2">
                    Pedido #{String(selectedOrder.id).slice(0, 8).toUpperCase()}
                  </h5>
                  
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-1 mt-1 mb-3">
                    <span className="block text-[7px] text-slate-400 font-extrabold uppercase tracking-widest">Localização Reportada</span>
                    <span className="text-xs font-black text-brand-purple uppercase">
                      📍 {selectedOrder.localizacao_atual || 'Aguardando despacho aduaneiro / Porto'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-sans">Estado de Expedição:</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      selectedOrder.status === 'Em Trânsito' ? 'bg-indigo-505/20 text-indigo-300' :
                      selectedOrder.status === 'Entregue' ? 'bg-emerald-500/20 text-emerald-300' :
                      selectedOrder.status === 'Confirmado' ? 'bg-[#00D2FF]/20 text-[#00D2FF]' :
                      'bg-amber-500/20 text-text-amber-300'
                    }`}>
                      {selectedOrder.status || 'Pendente'}
                    </span>
                  </div>
                </div>

                {selectedOrder.admin_feedback && (
                  <div className="pt-3 border-t border-white/5 font-sans">
                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Nota da Engenheira Helena G.</span>
                    <p className="text-[10px] text-slate-300 italic font-medium leading-relaxed">
                      "{selectedOrder.admin_feedback}"
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[8px] text-slate-400 font-black uppercase tracking-widest font-sans">
                  <span>Modo: {selectedOrder.tipo_entrega === 'delivery' ? 'Delivery Regional' : 'Levantamento'}</span>
                  {selectedOrder.distancia_km ? <span>{selectedOrder.distancia_km} km</span> : null}
                </div>
              </div>
            ) : selectedNode ? (
              <div className="bg-[#0B1120] text-white p-6 rounded-3xl border border-white/5 space-y-4">
                {(() => {
                  const node = nodes.find(n => n.id === selectedNode);
                  if (!node) return null;
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-brand-cyan uppercase tracking-widest">Apoio Logístico Activo</span>
                        <div className="flex items-center gap-1.5 bg-brand-purple/20 border border-brand-purple/30 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-brand-purple">
                          <Activity size={8} className="animate-pulse" /> Operando
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-black uppercase tracking-tight text-white mb-2">{node.name} - Hub</h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium mb-4">{node.details}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div>
                          <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Média de Trânsito</span>
                          <div className="flex items-center gap-2 text-white">
                            <Clock size={12} className="text-brand-cyan" />
                            <span className="text-xs font-black uppercase tracking-tight">{node.avgTime}</span>
                          </div>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Operação</span>
                          <div className="flex items-center gap-2 text-white">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span className="text-xs font-black uppercase tracking-tight">Habilitado</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>

          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 justify-center lg:justify-start">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Ligado via redundância por rádio digital de Manica
          </div>
        </div>
      </div>
    </div>
  );
};
