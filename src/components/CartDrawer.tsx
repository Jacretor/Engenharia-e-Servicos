import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Smartphone, Upload, CheckCircle2, ChevronLeft, CreditCard, Coins } from 'lucide-react';
import { CartItem } from '../types';
import { useState, useRef } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: (paymentData: { 
    method: 'M-Pesa' | 'e-Mola' | 'Dinheiro'; 
    receipt: string;
    tipo_entrega: 'levantamento' | 'delivery';
    distancia_km: number;
    custo_delivery: number;
  }) => Promise<void>;
  isProcessing?: boolean;
}

type CheckoutStep = 'cart' | 'delivery' | 'method' | 'receipt';

interface CityRoute {
  id: string;
  name: string;
  dist: number;
  desc: string;
}

const PREDEFINED_ROUTES: CityRoute[] = [
  { id: 'independencia', name: 'Praça da Independência (Chimoio Central)', dist: 3, desc: 'Lugar Público - Próximo ao Prédio do Governo' },
  { id: 'shoprite', name: 'Shoprite Chimoio (Parque de Estacionamento)', dist: 4, desc: 'Lugar Público - Frente ao Supermercado' },
  { id: 'fevereiro', name: 'Mercado 3 de Fevereiro (Entrada Principal)', dist: 5, desc: 'Lugar Público - Rotunda de Chimoio' },
  { id: 'galp', name: 'Posto de Abastecimento Galp EN6 (Chimoio)', dist: 6, desc: 'Lugar Público - À beira da Estrada Nacional' },
  { id: 'gondola-cruz', name: 'Cruzamento de Gôndola (Chapa Próximo ao Mercado)', dist: 22, desc: 'Lugar Público Regional EN6' },
  { id: 'manica-rotunda', name: 'Rotunda Central de Manica (Posto Administrativo)', dist: 36, desc: 'Lugar Público Regional de Manica' },
];

export const CartDrawer = ({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onRemove, 
  onCheckout,
  isProcessing = false 
}: CartDrawerProps) => {
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [method, setMethod] = useState<'M-Pesa' | 'e-Mola' | 'Dinheiro' | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState<'levantamento' | 'delivery'>('levantamento');
  const [distanciaKm, setDistanciaKm] = useState<number>(10);
  const [customDistanceActive, setCustomDistanceActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = items.reduce((sum, item) => sum + item.preco * item.cartQuantity, 0);
  const custoDelivery = tipoEntrega === 'delivery' ? distanciaKm * 20 : 0;
  const grandTotal = total + custoDelivery;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptBase64(reader.result as string);
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFinalCheckout = () => {
    if (!method) return;
    onCheckout({ 
      method, 
      receipt: receiptBase64 || 'PAGO_NA_ENTREGA',
      tipo_entrega: tipoEntrega,
      distancia_km: tipoEntrega === 'delivery' ? distanciaKm : 0,
      custo_delivery: custoDelivery
    });
  };

  const resetAndClose = () => {
    setStep('cart');
    setMethod(null);
    setReceiptBase64(null);
    setTipoEntrega('levantamento');
    setDistanciaKm(10);
    setCustomDistanceActive(false);
    onClose();
  };

  const PAYMENT_NUMBERS = {
    'M-Pesa': '+258 84 482 1126',
    'e-Mola': '+258 86 482 1126',
    'Dinheiro': 'PAGO_NA_ENTREGA'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-ink/60 backdrop-blur-md z-[60]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white z-[70] shadow-[0_0_100px_rgba(0,0,0,0.2)] flex flex-col"
          >
            <div className="p-10 lg:p-14 flex items-center justify-between border-b border-slate-50 relative overflow-hidden bg-slate-50/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="flex items-center gap-6 relative z-10">
                {step !== 'cart' && (
                  <button 
                    onClick={() => {
                      if (step === 'delivery') setStep('cart');
                      else if (step === 'method') setStep('delivery');
                      else if (step === 'receipt') setStep('method');
                    }}
                    className="p-3 bg-white text-slate-400 hover:text-[#0B1120] rounded-xl border border-slate-100 transition-all mr-2"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <div className="w-14 h-14 bg-[#0B1120] rounded-2xl flex items-center justify-center text-brand-cyan shadow-xl">
                  {step === 'cart' ? <ShoppingBag size={28} /> : <CreditCard size={28} />}
                </div>
                <div>
                  <h2 className="text-4xl font-black text-[#0B1120] uppercase tracking-tighter leading-none mb-2">
                    {step === 'cart' ? 'Requisição' : step === 'delivery' ? 'Entrega' : step === 'method' ? 'Pagamento' : 'Confirmação'}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {step === 'cart' ? 'Inventário de Activos • Protocolo E&S' : step === 'delivery' ? 'RASTREIO & COORDENADAS EM TEMPO REAL' : 'Processamento Seguro M-Pesa / e-Mola'}
                  </p>
                </div>
              </div>
              <button 
                onClick={resetAndClose}
                className="p-4 bg-white text-slate-300 hover:text-[#0B1120] rounded-full transition-all border border-slate-100 active:scale-90"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-10 lg:px-14 py-12 space-y-8 scrollbar-hide">
              {step === 'cart' ? (
                items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10 border border-slate-100">
                      <ShoppingBag size={48} className="text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-[#0B1120] uppercase tracking-tighter mb-4">Lista Vazia</h3>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] max-w-xs leading-relaxed">Não foram seleccionados activos para este protocolo de requisição.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {items.map((item) => (
                    <div key={item.id} className="flex gap-8 group bg-white border border-slate-50 p-6 rounded-[32px] hover:border-brand-cyan/20 hover:shadow-xl transition-all">
                      <div className="w-28 h-28 bg-slate-50 rounded-[24px] overflow-hidden border border-slate-100 flex-shrink-0 relative">
                        {item.foto_url ? (
                          <img src={item.foto_url} alt={item.nome} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-100"><ShoppingBag size={32} /></div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h3 className="text-xl font-black text-[#0B1120] tracking-tighter leading-tight mb-2 group-hover:text-brand-cyan transition-colors line-clamp-1">{item.nome}</h3>
                          <span className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.categoria}</span>
                        </div>
                        <div className="flex items-end justify-between mt-6">
                          <div className="flex items-center bg-slate-50 rounded-full p-1.5 border border-slate-100">
                            <button 
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-[#0B1120] shadow-sm hover:text-brand-purple transition-all"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-10 text-center text-sm font-black text-[#0B1120]">{item.cartQuantity}</span>
                            <button 
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-[#0B1120] shadow-sm hover:text-brand-cyan transition-all"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="flex flex-col items-end">
                             <button 
                              onClick={() => onRemove(item.id)}
                              className="p-2 text-slate-200 hover:text-red-500 transition-colors mb-2"
                            >
                              <Trash2 size={16} />
                            </button>
                            <span className="font-black text-xl tracking-tighter text-[#0B1120]">
                              { (item.preco * item.cartQuantity).toLocaleString() } <span className="text-[10px] text-slate-300">MT</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )) : step === 'delivery' ? (
                <div className="space-y-8 font-sans">
                  <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Resumo dos Artigos</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Subtotal Equipamentos/Serviços:</span>
                      <span className="font-black text-[#0B1120] text-lg">{total.toLocaleString()} MT</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Como deseja receber seus activos?</span>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoEntrega('levantamento');
                          setCustomDistanceActive(false);
                        }}
                        className={`p-6 rounded-[24px] border-2 text-left transition-all flex flex-col justify-between min-h-[130px] ${
                          tipoEntrega === 'levantamento' 
                            ? 'border-brand-purple bg-brand-purple/5 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-tight text-[#0B1120]">Levantamento Local</span>
                        <div>
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider mt-1">Sede em Chimoio</p>
                          <p className="text-base font-black text-emerald-600 mt-1">Grátis (0 MT)</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTipoEntrega('delivery');
                        }}
                        className={`p-6 rounded-[24px] border-2 text-left transition-all flex flex-col justify-between min-h-[130px] ${
                          tipoEntrega === 'delivery' 
                            ? 'border-brand-cyan bg-brand-cyan/5 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-tight text-[#0B1120]">Entrega ao Encontro</span>
                        <div>
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider mt-1">Delivery Regional</p>
                          <p className="text-base font-black text-brand-purple mt-1">20 MT / KM</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {tipoEntrega === 'levantamento' && (
                    <div className="space-y-4 bg-emerald-50 border border-emerald-100 p-6 rounded-[28px] mt-4 animate-fade-in text-left">
                      <span className="block text-[8px] font-black text-emerald-700 uppercase tracking-widest leading-none">📍 Trajeto Oficial & Levantamento Individual</span>
                      <h4 className="text-xs font-black text-[#0B1120] uppercase mt-1">E&S Engenharia & Serviços Limitada</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                        Nossa sede e oficina física estão localizadas em Chimoio. Carregue no botão abaixo para ver o mapa detalhado com rotas, caminho exato de GPS e direções de trânsito em tempo real:
                      </p>
                      
                      <a 
                        href="https://www.google.com/maps/dir/?api=1&destination=-19.1160,33.4750"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-[#0B1120] hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 duration-300 text-center"
                      >
                        <span>🧭 Ver Mapa Oficial & Trajeto em Direto</span>
                      </a>
                    </div>
                  )}

                  {tipoEntrega === 'delivery' && (
                    <div className="space-y-6 bg-slate-50/70 border border-slate-100 p-6 rounded-[28px] mt-4 animate-fade-in">
                      <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Selecione o Destino Regional de Entrega</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {PREDEFINED_ROUTES.map((r) => {
                          const isSel = !customDistanceActive && distanciaKm === r.dist;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setDistanciaKm(r.dist);
                                setCustomDistanceActive(false);
                              }}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                isSel ? 'bg-[#0B1120] text-white border-[#0B1120]' : 'bg-white text-[#0B1120] border-slate-100 hover:border-slate-200'
                              }`}
                            >
                              <span className="block text-[9px] font-black uppercase tracking-tight truncate">{r.name}</span>
                              <span className="block text-[7px] font-bold opacity-60 uppercase mt-0.5">{r.dist} km • {r.desc}</span>
                            </button>
                          );
                        })}
                        
                        <button
                          type="button"
                          onClick={() => {
                            setCustomDistanceActive(true);
                            setDistanciaKm(50);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all col-span-2 ${
                            customDistanceActive ? 'bg-[#0B1120] text-white border-[#0B1120]' : 'bg-white text-[#0B1120] border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <span className="block text-[9px] font-black uppercase tracking-tight">Outra Distância (Definir Quilómetragem Manual)</span>
                          <span className="block text-[7px] font-bold opacity-60 uppercase mt-0.5">Definir raio de quilómetros específico</span>
                        </button>
                      </div>

                      {customDistanceActive && (
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500 tracking-widest">
                            <span>Distância Definida:</span>
                            <span className="text-[#0B1120] font-black text-xs">{distanciaKm} km</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="1200"
                            step="5"
                            value={distanciaKm}
                            onChange={(e) => setDistanciaKm(Number(e.target.value))}
                            className="w-full h-2 rounded-lg cursor-pointer bg-slate-200 accent-brand-cyan"
                          />
                          <div className="flex justify-between text-[7px] text-slate-400 font-bold tracking-widest uppercase">
                            <span>1 km</span>
                            <span>600 km</span>
                            <span>1200 km</span>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <div>
                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Preço de Transporte Calculado</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{distanciaKm} km × 20 MT</span>
                        </div>
                        <span className="text-xl font-black text-[#0B1120]">{custoDelivery.toLocaleString()} MT</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : step === 'method' ? (
                <div className="space-y-10">
                  <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 mb-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Total a Liquidar</p>
                    <p className="text-6xl font-black text-[#0B1120] tracking-tighter">{grandTotal.toLocaleString()} <span className="text-2xl text-slate-300">MT</span></p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {(['M-Pesa', 'e-Mola', 'Dinheiro'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`p-8 rounded-[32px] border-2 transition-all flex items-center gap-8 ${
                          method === m 
                            ? 'border-brand-cyan bg-brand-cyan/5' 
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                          m === 'M-Pesa' ? 'bg-red-50 text-red-600' : m === 'e-Mola' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {m === 'Dinheiro' ? <Coins size={32} /> : <Smartphone size={32} />}
                        </div>
                        <div className="text-left">
                          <h4 className="text-xl font-black text-[#0B1120] uppercase tracking-tight">
                            {m === 'Dinheiro' ? 'Dinheiro (Na Entrega)' : m}
                          </h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {m === 'Dinheiro' ? 'Pagar no acto de delivery' : 'Transferência Directa MZN'}
                          </p>
                        </div>
                        {method === m && <div className="ml-auto w-8 h-8 rounded-full bg-brand-cyan flex items-center justify-center text-white"><CheckCircle2 size={16} /></div>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="bg-[#0B1120] p-12 rounded-[40px] text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 rounded-full blur-[100px]" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 relative z-10">Transferir para o número:</p>
                    <h3 className="text-4xl lg:text-5xl font-black tracking-tighter mb-4 relative z-10">{PAYMENT_NUMBERS[method!]}</h3>
                    <p className="text-[10px] font-black text-brand-cyan uppercase tracking-widest relative z-10 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                      Titular: HELENA JOÃO GARIFE (E&S)
                    </p>
                  </div>

                  <div className="space-y-6">
                    <p className="text-sm font-black text-[#0B1120] uppercase tracking-tighter">Comprovativo de Pagamento</p>
                    <div 
                      onClick={() => !uploadLoading && fileInputRef.current?.click()}
                      className={`w-full aspect-video rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-6 cursor-pointer transition-all ${
                        receiptBase64 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-brand-cyan bg-slate-50 hover:bg-brand-cyan/5'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      
                      {receiptBase64 ? (
                        <div className="w-full h-full p-4 relative group">
                          <img src={receiptBase64} className="w-full h-full object-contain rounded-2xl" />
                          <div className="absolute inset-4 bg-emerald-500/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all rounded-2xl flex items-center justify-center">
                            <p className="text-white font-black text-[10px] uppercase tracking-widest">Alterar Imagem</p>
                          </div>
                        </div>
                      ) : uploadLoading ? (
                        <div className="animate-spin text-brand-cyan"><Upload size={40} /></div>
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-slate-300">
                            <Upload size={32} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-black text-[#0B1120] uppercase tracking-widest mb-1">Upload de Comprovativo</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-10">Capture a tela do M-Pesa/e-mola</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </div>
              
              <div className="p-10 lg:p-14 border-t border-slate-100 space-y-6 bg-slate-50/30 relative">
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-brand-cyan/5 to-transparent pointer-events-none" />
              
              <div className="space-y-3 pt-2 border-b border-slate-100/50 pb-5 relative z-10 font-sans">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                  <span>Subtotal dos Activos</span>
                  <span className="font-black text-[#0B1120] text-sm">{total.toLocaleString()} MT</span>
                </div>
                {tipoEntrega === 'delivery' && (
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                    <span>Taxa de Entrega ({distanciaKm} km @ 20MT/km)</span>
                    <span className="font-black text-brand-purple text-sm">+{custoDelivery.toLocaleString()} MT</span>
                  </div>
                )}
                <div className="flex items-end justify-between relative z-10 pt-2">
                  <div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] block mb-1">Total Geral</span>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Moeda Oficial: Metical (MZN)</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-4xl font-black text-[#0B1120] tracking-tighter leading-none">
                      {grandTotal.toLocaleString()} <span className="text-sm text-slate-400 font-bold">MT</span>
                    </span>
                  </div>
                </div>
              </div>

              <button 
                disabled={
                  (step === 'cart' && items.length === 0) || 
                  (step === 'method' && !method) || 
                  (step === 'receipt' && !receiptBase64 && method !== 'Dinheiro') || 
                  isProcessing || uploadLoading
                }
                onClick={async () => {
                  if (step === 'cart') {
                    setStep('delivery');
                  } else if (step === 'delivery') {
                    setStep('method');
                  } else if (step === 'method') {
                    if (method === 'Dinheiro') {
                      await onCheckout({ 
                        method: 'Dinheiro', 
                        receipt: 'PAGO_NA_ENTREGA',
                        tipo_entrega: tipoEntrega,
                        distancia_km: tipoEntrega === 'delivery' ? distanciaKm : 0,
                        custo_delivery: custoDelivery
                      });
                    } else {
                      setStep('receipt');
                    }
                  } else {
                    handleFinalCheckout();
                  }
                }}
                className="w-full bg-[#0B1120] text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 shadow-2xl hover:bg-brand-purple transition-all disabled:opacity-50 disabled:grayscale duration-300 relative z-10 active:scale-95 overflow-hidden"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando Requisição...
                  </>
                ) : (
                  <>
                    {step === 'cart' ? 'Definir Entrega' : step === 'delivery' ? 'Escolher Método de Pagamento' : step === 'method' ? 'Confirmar Dinheiro / Setup Transfer' : 'Submeter Comprovante e Finalizar'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="flex flex-col items-center gap-2 relative z-10 font-sans">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-[0.3em]">
                      Protocolo de Transação Segura • E&S Moçambique
                    </p>
                 </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
