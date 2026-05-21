import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  History, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Search, 
  PhoneCall, 
  ArrowRight,
  Plus,
  ShoppingCart,
  ChevronRight,
  Monitor,
  Cpu,
  Wrench,
  Zap,
  Send,
  MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Produto, CartItem, User, Encomenda } from '../types';

interface ClientPageProps {
  user: User;
  onAddToCart: (p: Produto) => void;
  cart: CartItem[];
  onOpenCart: () => void;
}

type TabType = 'overview' | 'catalog' | 'orders' | 'settings' | 'support';

interface Message {
  id: string;
  sender: 'user' | 'support';
  text: string;
  timestamp: Date;
  type?: 'text' | 'action';
  actionLabel?: string;
  actionUrl?: string;
}

export const ClientPage = ({ user, onAddToCart, cart, onOpenCart }: ClientPageProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas as Categorias');
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'support',
      text: 'Olá! Sou o assistente técnico da E&S Engenharia. Como posso ajudar na sua infraestrutura hoje?',
      timestamp: new Date(),
      type: 'text'
    },
    {
      id: '2',
      sender: 'support',
      text: 'Precisa de assistência técnica especializada?',
      timestamp: new Date(),
      type: 'action',
      actionLabel: 'Solicitar Engenheiro',
      actionUrl: 'https://wa.me/258844821126'
    }
  ]);

  // Handle auto-scroll
  useEffect(() => {
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatInput,
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setChatInput('');

    // Simulate basic responsive support
    setTimeout(() => {
      const supportResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'support',
        text: 'Recebemos a sua mensagem. Um dos nossos especialistas entrará em contacto em breve. Se for uma emergência, utilize a nossa linha directa.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, supportResponse]);
    }, 1000);
  };

  const fetchOrders = () => {
    fetch(`/api/encomendas/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setEncomendas(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Error fetching orders:', err));
  };

  useEffect(() => {
    // Fetch real products from system
    fetch('/api/produtos')
      .then(res => res.json())
      .then(data => {
        setProdutos(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setProdutos([]);
      })
      .finally(() => {
        setLoading(false);
      });

    fetchOrders();

    // Listen for order updates
    window.addEventListener('orders-updated', fetchOrders);
    return () => window.removeEventListener('orders-updated', fetchOrders);
  }, [user.id]);

  const handleLogout = () => {
    localStorage.removeItem('es_user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const filteredProdutos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return produtos.filter(p => {
      const nome = p.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const cat = p.categoria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const desc = (p.descricao || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const matchesSearch = nome.includes(term) || cat.includes(term) || desc.includes(term);
      const matchesCategory = selectedCategory === 'Todas as Categorias' || p.categoria === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [produtos, searchTerm, selectedCategory]);

  const sidebarItems = [
    { id: 'overview', label: 'Início', icon: Monitor },
    { id: 'catalog', label: 'Catálogo de Materiais', icon: Package },
    { id: 'orders', label: 'Minhas Encomendas', icon: History },
    { id: 'support', label: 'Suporte Técnico', icon: PhoneCall },
    { id: 'settings', label: 'Definições', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row pb-20 lg:pb-0">
      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-50 bg-[#0B1120]/90 backdrop-blur-xl rounded-[32px] p-2 flex items-center justify-around border border-white/10 shadow-2xl">
        {sidebarItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex flex-col items-center gap-1 p-4 rounded-2xl transition-all ${
              activeTab === item.id 
              ? 'bg-brand-cyan text-[#0B1120] shadow-xl' 
              : 'text-slate-400'
            }`}
          >
            <item.icon size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* Navigation Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 h-screen sticky top-0 hidden lg:flex flex-col">
        <div className="p-10 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-[#0B1120] rounded-xl flex items-center justify-center p-1 border border-light/10">
              <img src="/LogoTipo.png" className="w-full h-full object-contain" alt="Logo" onError={(e) => {
                 (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ES&background=0B1120&color=00D2FF&bold=true';
              }} />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tighter text-[#0B1120] leading-none">E&S Engenharia</h1>
              <p className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest mt-1">Portal do Cliente</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                ? 'bg-[#0B1120] text-white shadow-xl shadow-[#0B1120]/10' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-[#0B1120]'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-brand-cyan' : 'text-slate-300'} />
              <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
              {item.id === 'catalog' && produtos.length > 0 && (
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'catalog' ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-slate-100 text-slate-500'}`}>
                  {produtos.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-slate-100">
           <div className="bg-slate-50 rounded-2xl p-6 mb-6">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200">
                 <UserIcon size={18} className="text-slate-400" />
               </div>
               <div className="min-w-0">
                 <p className="text-xs font-black text-slate-900 truncate">{user.nome || user.email.split('@')[0]}</p>
                 <p className="text-[10px] font-medium text-slate-400 truncate">{user.email}</p>
               </div>
             </div>
             <button 
              onClick={handleLogout}
              className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
             >
               <LogOut size={14} /> Sair do Sistema
             </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-30">
          <div className="flex items-center gap-4 lg:hidden">
            <div className="w-12 h-12 bg-[#0B1120] rounded-xl flex items-center justify-center p-1">
               <img src="/LogoTipo.png" className="w-full h-full object-contain" alt="Logo" />
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-10">
            {activeTab === 'catalog' && (
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar materiais (Ex: Disjuntor, Correia, Cabo)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-14 pr-6 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
            {activeTab !== 'catalog' && (
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                {sidebarItems.find(i => i.id === activeTab)?.label}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={onOpenCart}
              className="relative p-4 bg-[#0B1120] text-white rounded-2xl hover:scale-105 transition-all shadow-lg shadow-[#0B1120]/20 hover:shadow-brand-cyan/20 border border-white/5 group"
            >
              <ShoppingCart size={20} className="group-hover:text-brand-cyan transition-colors" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-brand-cyan text-[#0B1120] rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg">
                  {cart.reduce((acc, item) => acc + item.cartQuantity, 0)}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="p-10">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-16 -translate-y-16 group-hover:bg-slate-100 transition-all" />
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Estado da Conta</h3>
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xl font-black text-slate-900 uppercase">Activo</span>
                     </div>
                     <p className="text-xs text-slate-400 font-medium leading-relaxed">Sua conta corporativa está habilitada para requisições directas e suporte prioritário.</p>
                  </div>

                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Média de Entrega</h3>
                     <div className="flex items-center gap-4 mb-4 text-slate-900">
                        <Zap size={24} className="text-brand-purple" />
                        <span className="text-xl font-black uppercase">48 Horas</span>
                     </div>
                     <p className="text-xs text-slate-400 font-medium leading-relaxed">Tempo médio para materiais em stock no armazém central.</p>
                  </div>

                  <div className="bg-[#0B1120] p-8 rounded-[32px] text-white shadow-2xl shadow-[#0B1120]/20 border border-white/5 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full translate-x-16 -translate-y-16 group-hover:scale-125 transition-transform" />
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Total de Requisições</h3>
                     <div className="text-4xl font-black mb-4 text-brand-cyan">{encomendas.length}</div>
                     <button onClick={() => setActiveTab('orders')} className="text-[10px] font-black uppercase tracking-widest text-white hover:text-brand-cyan flex items-center gap-2 transition-colors">
                       Ver Histórico <ChevronRight size={14} />
                     </button>
                  </div>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Requisições Recentes</h3>
                      <p className="text-xs text-slate-400 mt-1">Acompanhe o estado das suas ordens de trabalho.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="px-6 py-3 bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                    >
                      Ver Tudo
                    </button>
                  </div>

                  {encomendas.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-6">
                       <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                         <History size={40} />
                       </div>
                       <div>
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhuma encomenda registada</p>
                         <button 
                          onClick={() => setActiveTab('catalog')}
                          className="mt-6 text-slate-900 font-black text-xs uppercase tracking-widest hover:underline"
                         >
                           Explorar Catálogo <ArrowRight size={14} className="inline ml-2" />
                         </button>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {encomendas.slice(0, 3).map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-slate-300 transition-all">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm">
                              <Package size={20} />
                            </div>
                            <div>
                               <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">Encomenda #{order.id ? String(order.id).slice(-6) : '---'}</p>
                               <p className="text-[10px] text-slate-400 font-medium">{new Date(order.created_at).toLocaleDateString('pt-MZ')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-10">
                             <div className="text-right">
                               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1">Total</p>
                               <p className="text-sm font-black text-slate-900">{order.total.toLocaleString()} Kz/MT</p>
                             </div>
                             <div className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                               order.status === 'Entregue' ? 'bg-emerald-500/10 text-emerald-500' :
                               order.status === 'Pendente' ? 'bg-amber-500/10 text-amber-500' :
                               'bg-blue-500/10 text-blue-500'
                             }`}>
                               {order.status}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'catalog' && (
              <motion.div 
                key="catalog"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Estoque Técnico</h1>
                    <p className="text-sm text-slate-400 mt-1">Materiais certificados para infraestruturas críticas.</p>
                  </div>
                  <div className="flex gap-4">
                     <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer shadow-sm"
                     >
                       <option>Todas as Categorias</option>
                       <option>Elétrico</option>
                       <option>Mecânico</option>
                       <option>Informático</option>
                       <option>Software</option>
                       <option>Mobiliário</option>
                     </select>
                     {searchTerm && (
                       <button 
                        onClick={() => setSearchTerm('')}
                        className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                       >
                         Limpar Busca
                       </button>
                     )}
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                     {[1,2,3,4,5,6,7,8].map(i => (
                       <div key={i} className="h-96 bg-slate-50 rounded-[32px] border border-slate-100 relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                         <div className="p-8 space-y-4">
                            <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse" />
                            <div className="w-full h-3 bg-slate-100 rounded animate-pulse" />
                            <div className="w-3/4 h-3 bg-slate-100 rounded animate-pulse" />
                         </div>
                       </div>
                     ))}
                  </div>
                ) : filteredProdutos.length === 0 ? (
                  <div className="py-32 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                    <Package size={48} className="mx-auto text-slate-200 mb-6" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum material encontrado com "{searchTerm}"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
                    {filteredProdutos.map(p => (
                      <motion.div 
                        key={p.id}
                        layout
                        className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 hover:border-slate-300 transition-all flex flex-col h-full"
                      >
                        <div className="h-56 bg-slate-100 relative overflow-hidden">
                           <img 
                              src={p.foto_url || 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=400&q=80'} 
                              alt={p.nome}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                              referrerPolicy="no-referrer"
                           />
                           <div className="absolute top-4 left-4">
                             <span className="px-3 py-1 bg-white/90 text-slate-900 text-[9px] font-black uppercase tracking-widest rounded-lg backdrop-blur">
                               {p.categoria}
                             </span>
                           </div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col">
                           <h4 className="text-sm font-black text-[#0B1120] leading-tight mb-2 group-hover:text-brand-purple transition-colors">{p.nome}</h4>
                           <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mb-6 flex-1">{p.descricao}</p>
                           
                           <div className="flex flex-col gap-4 mt-auto pt-6 border-t border-slate-50">
                              <div className="flex items-center justify-between">
                                 <div>
                                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Preço Unitário</p>
                                   <p className="text-lg font-black text-[#0B1120] tracking-tighter">
                                     {p.preco.toLocaleString()} <span className="text-[10px] font-bold text-slate-300 ml-1">Kz/MT</span>
                                   </p>
                                 </div>
                                 <button 
                                   onClick={() => onAddToCart(p)}
                                   className="w-12 h-12 bg-slate-50 text-[#0B1120] border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-brand-cyan hover:text-[#0B1120] hover:border-brand-cyan transition-all active:scale-90 shadow-sm"
                                   title="Adicionar ao Carrinho"
                                 >
                                   <Plus size={20} />
                                 </button>
                              </div>
                              <button 
                                onClick={() => {
                                  onAddToCart(p);
                                  onOpenCart();
                                }}
                                className="w-full py-4 bg-[#0B1120] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-purple transition-all active:scale-95 shadow-xl shadow-[#0B1120]/10 border border-white/5"
                              >
                                Adquirir Ativo
                              </button>
                           </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Minhas Encomendas</h1>
                    <p className="text-sm text-slate-400 mt-1">Acompanhe o percurso dos seus materiais industriais.</p>
                  </div>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-10">
                  {encomendas.length === 0 ? (
                    <div className="py-32 text-center flex flex-col items-center gap-6">
                       <History size={48} className="text-slate-100" />
                       <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Histórico de requisições vazio</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {encomendas.map((order) => (
                        <div key={order.id} className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 hover:border-slate-300 transition-all relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8">
                             <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] ${
                               order.status === 'Entregue' ? 'bg-emerald-500/10 text-emerald-500' :
                               order.status === 'Pendente' ? 'bg-amber-500/10 text-amber-500' :
                               'bg-blue-500/10 text-blue-500'
                             }`}>
                               {order.status}
                             </div>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center gap-12">
                             <div className="space-y-1">
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">ID Requisição</p>
                               <p className="text-xl font-black text-slate-900">#ORD-{order.id ? String(order.id).slice(-6).toUpperCase() : '---'}</p>
                               <p className="text-xs text-slate-400 font-medium">{new Date(order.created_at).toLocaleString('pt-MZ')}</p>
                             </div>

                             <div className="flex-1 border-l border-slate-200 pl-12">
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-4">Materiais Requisitados</p>
                               <div className="flex flex-wrap gap-2">
                                 {order.items.map((item, idx) => (
                                   <span key={idx} className="bg-white border border-slate-200 text-[10px] font-bold text-slate-600 px-3 py-1.5 rounded-lg shadow-sm">
                                     {item.cartQuantity}x {item.nome}
                                   </span>
                                 ))}
                               </div>
                             </div>

                             <div className="text-right">
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-2">Total do Investimento</p>
                               <p className="text-3xl font-black text-slate-900 tracking-tighter">{order.total.toLocaleString()} <span className="text-xs font-bold text-slate-400">Kz/MT</span></p>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'support' && (
              <motion.div 
                key="support"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-5xl mx-auto py-10 space-y-12"
              >
                <div className="text-center mb-16">
                  <div className="w-20 h-20 bg-[#0B1120] text-brand-cyan rounded-[30px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-slate-900/20">
                    <MessageCircle size={32} />
                  </div>
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Suporte de Engenharia</h1>
                  <p className="text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
                    Canal directo de comunicação técnica com a equipa <span className="text-[#0B1120] font-black">E&S Engenharia</span>.
                  </p>
                </div>

                {/* Chat Interface */}
                <div className="bg-white rounded-[48px] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[700px]">
                   {/* Chat Header */}
                   <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-4">
                         <div className="relative">
                            <div className="w-12 h-12 bg-[#0B1120] rounded-2xl flex items-center justify-center p-2">
                               <img src="/LogoTipo.png" className="w-full h-full object-contain" alt="Logo" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                         </div>
                         <div>
                            <p className="text-sm font-black text-[#0B1120] uppercase tracking-tighter">Centro de Comando Técnico</p>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Equipa Online</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Protocolo: #SUP-258</span>
                      </div>
                   </div>

                   {/* Messages Area */}
                   <div 
                     id="chat-messages"
                     className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
                   >
                      {messages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                             {/* Message Bubble */}
                             <div className={`
                                p-6 rounded-[28px] text-sm font-medium leading-relaxed
                                ${msg.sender === 'user' 
                                  ? 'bg-[#0B1120] text-white rounded-tr-none shadow-xl shadow-[#0B1120]/10' 
                                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-md'}
                             `}>
                                {msg.text}

                                {msg.type === 'action' && msg.actionUrl && (
                                   <div className="mt-6 flex flex-wrap gap-3">
                                      <a 
                                        href={msg.actionUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-cyan text-[#0B1120] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                                      >
                                        <Zap size={14} /> {msg.actionLabel}
                                      </a>
                                      <button className="px-6 py-3 bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all">
                                        Outras Opções
                                      </button>
                                   </div>
                                )}
                             </div>
                             {/* Timestamp */}
                             <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-3 px-2">
                                {msg.sender === 'user' ? 'Enviado' : 'Suporte E&S'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </div>
                        </div>
                      ))}
                   </div>

                   {/* Chat Input */}
                   <form 
                     onSubmit={handleSendMessage}
                     className="p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-6"
                   >
                      <div className="flex-1 relative group">
                         <input 
                           type="text" 
                           value={chatInput}
                           onChange={(e) => setChatInput(e.target.value)}
                           placeholder="Descreva o seu problema técnico ou dúvida..."
                           className="w-full bg-white border border-slate-200 rounded-2xl py-5 px-8 pr-16 text-sm font-medium focus:ring-4 focus:ring-brand-cyan/5 transition-all outline-none"
                         />
                         <button 
                           type="submit"
                           className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#0B1120] text-white rounded-xl flex items-center justify-center hover:bg-brand-purple transition-all active:scale-95 group-hover:shadow-lg"
                         >
                           <Send size={18} />
                         </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => window.open('https://wa.me/258844821126', '_blank')}
                        className="p-5 bg-emerald-500/10 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                        title="Canal WhatsApp Direct"
                      >
                         <PhoneCall size={20} />
                      </button>
                   </form>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm group hover:border-[#0B1120] transition-all">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0B1120] mb-8 group-hover:bg-[#0B1120] group-hover:text-brand-cyan transition-all">
                      <Zap size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 whitespace-nowrap">Sistemas Elétricos</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-8">Especialidade em quadros industriais, instalações de alta potência e automação elétrica.</p>
                  </div>

                  <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm group hover:border-[#0B1120] transition-all">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0B1120] mb-8 group-hover:bg-[#0B1120] group-hover:text-brand-cyan transition-all">
                      <Cpu size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 whitespace-nowrap">Assistência de Hardware</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-8">Protocolos de manutenção e configuração de servidores, UPS e rede industrial.</p>
                  </div>

                  <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm group hover:border-[#0B1120] transition-all">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#0B1120] mb-8 group-hover:bg-[#0B1120] group-hover:text-brand-cyan transition-all">
                      <Wrench size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Intervenção Mecânica</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-8">Solicite uma equipa no local para reparação de bombas, geradores e motobombas.</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-12 rounded-[48px] text-white overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan opacity-20 blur-[100px] translate-x-1/2 -translate-y-1/2" />
                   <div className="relative z-10">
                     <h3 className="text-2xl font-black text-white mb-4">Linha Directa de Emergência</h3>
                     <p className="text-white/40 text-sm mb-10 max-w-md">Para paragens críticas de produção ou falhas graves de infraestrutura.</p>
                     <div className="flex flex-wrap gap-4">
                        <a href="tel:+258844821126" className="px-8 py-5 bg-white text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-cyan transition-all flex items-center gap-3">
                          <PhoneCall size={16} /> Ligar Agora (+258)
                        </a>
                     </div>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto py-10"
              >
                <div className="mb-12">
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Definições da Conta</h1>
                   <p className="text-sm text-slate-400 mt-1">Gira as suas preferências e informações corporativas.</p>
                </div>

                <div className="space-y-8">
                  <div className="bg-white rounded-[40px] border border-slate-200 p-10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rotate-45 translate-x-16 -translate-y-16" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-10">Perfil Corporativo</h3>
                    <div className="grid md:grid-cols-2 gap-12 relative z-10">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nome Completo / Empresa</p>
                          <p className="text-lg font-black text-slate-900">{user.nome || user.email.split('@')[0]}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Endereço de E-mail</p>
                          <p className="text-lg font-black text-slate-900">{user.email}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Cargo / Role</p>
                          <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">{user.role}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Localização de Operação</p>
                          <p className="text-lg font-black text-slate-900">Moçambique, África</p>
                        </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[40px] border border-slate-200 p-10">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Preferências do Sistema</h3>
                    <div className="space-y-6">
                       <div className="flex items-center justify-between py-6 border-b border-slate-50">
                          <div>
                            <p className="text-sm font-black text-slate-900">Notificações por WhatsApp</p>
                            <p className="text-xs text-slate-400 mt-1">Receba alertas de processamento de materiais via direct text.</p>
                          </div>
                          <div className="w-12 h-6 bg-slate-900 rounded-full relative">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                          </div>
                       </div>
                       <div className="flex items-center justify-between py-6">
                          <div>
                            <p className="text-sm font-black text-slate-900">Relatórios de Stock</p>
                            <p className="text-xs text-slate-400 mt-1">Sincronização automática de preços e disponibilidade em tempo real.</p>
                          </div>
                          <div className="w-12 h-6 bg-slate-100 rounded-full relative">
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
