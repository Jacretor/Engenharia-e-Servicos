import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => Promise<void>;
}

export const CartDrawer = ({ isOpen, onClose, items, onUpdateQuantity, onRemove, onCheckout }: CartDrawerProps) => {
  const total = items.reduce((sum, item) => sum + item.preco * item.cartQuantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                <div className="w-14 h-14 bg-[#0B1120] rounded-2xl flex items-center justify-center text-brand-cyan shadow-xl">
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-[#0B1120] uppercase tracking-tighter leading-none mb-2">Requisição</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Inventário de Activos • Protocolo E&S</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-4 bg-white text-slate-300 hover:text-[#0B1120] rounded-full transition-all border border-slate-100 active:scale-90"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-10 lg:px-14 py-12 space-y-8 scrollbar-hide">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10 border border-slate-100">
                    <ShoppingBag size={48} className="text-slate-200" />
                  </div>
                  <h3 className="text-2xl font-black text-[#0B1120] uppercase tracking-tighter mb-4">Lista Vazia</h3>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] max-w-xs leading-relaxed">Não foram seleccionados activos para este protocolo de requisição.</p>
                </div>
              ) : (
                items.map((item) => (
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
                ))
              )}
            </div>

            <div className="p-10 lg:p-14 border-t border-slate-100 space-y-10 bg-slate-50/30 relative">
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-brand-cyan/5 to-transparent pointer-events-none" />
              <div className="flex items-end justify-between relative z-10">
                <div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] block mb-2">Total Estimado</span>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Moeda: Metical (MZN)</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-5xl font-black text-[#0B1120] tracking-tighter leading-none">
                    {total.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-black text-brand-cyan uppercase tracking-widest mt-2">Sincronizado via Local Node</span>
                </div>
              </div>
              <button 
                disabled={items.length === 0}
                onClick={onCheckout}
                className="w-full bg-[#0B1120] text-white py-8 rounded-[32px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-6 shadow-2xl shadow-[#0B1120]/20 hover:bg-brand-purple transition-all disabled:opacity-20 disabled:grayscale transition-all duration-700 relative z-10 active:scale-95"
              >
                Solicitar via WhatsApp Direct
                <ArrowRight size={24} />
              </button>
              <div className="flex flex-col items-center gap-4 relative z-10">
                 <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[9px] text-slate-300 uppercase font-black tracking-[0.4em]">
                      Ambiente de Protocolo Seguro 256-bit
                    </p>
                 </div>
                 <div className="w-20 h-1 bg-slate-100 rounded-full" />
              </div>
            </div>
          </motion.div>

        </>
      )}
    </AnimatePresence>
  );
};
