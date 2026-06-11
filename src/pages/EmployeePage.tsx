import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  LogOut, 
  Clipboard, 
  X
} from 'lucide-react';
import { Encomenda, Produto } from '../types';

export const EmployeePage = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'services'>('orders');
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter states
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  // Active edit state for orders
  const [editingOrder, setEditingOrder] = useState<Encomenda | null>(null);
  const [editStatus, setEditStatus] = useState<Encomenda['status']>('Pendente');
  const [editFeedback, setEditFeedback] = useState('');
  const [editLocation, setEditLocation] = useState('');
  
  // Custom manual coordinates helper inputs
  const [latInput, setLatInput] = useState('-19.12');
  const [lngInput, setLngInput] = useState('33.48');

  // Modal / Form state for Services
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Produto | null>(null);
  
  // Service form fields
  const [serviceNome, setServiceNome] = useState('');
  const [serviceDescricao, setServiceDescricao] = useState('');
  const [servicePreco, setServicePreco] = useState('');
  const [serviceFotoUrl, setServiceFotoUrl] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordRes, prodRes] = await Promise.all([
        fetch('/api/encomendas'),
        fetch('/api/produtos')
      ]);

      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setEncomendas(Array.isArray(ordData) ? ordData : []);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProdutos(Array.isArray(prodData) ? prodData : []);
      }
    } catch (e) {
      console.error('Erro ao buscar dados do funcionário:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_nome');
    localStorage.removeItem('user_id');
    window.location.href = '/';
  };

  // Manage Order Update
  const handleUpdateOrderStatus = async (
    id: string, 
    status: string, 
    admin_feedback?: string, 
    localizacao_atual?: string,
    localizacao_coordenadas?: { lat: number; lng: number } | null
  ) => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/encomendas/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          admin_feedback,
          localizacao_atual,
          localizacao_coordenadas
        })
      });

      if (res.ok) {
        setSuccessMsg('Encomenda atualizada com sucesso!');
        setEditingOrder(null);
        fetchData();
        // Dispatch alert system
        window.dispatchEvent(new Event('orders-updated'));
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao atualizar a encomenda.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro de ligação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Service Management handlers
  const handleOpenServiceModal = (prod: Produto | null = null) => {
    if (prod) {
      setEditingService(prod);
      setServiceNome(prod.nome);
      setServiceDescricao(prod.descricao || '');
      setServicePreco(String(prod.preco));
      setServiceFotoUrl(prod.foto_url || '');
    } else {
      setEditingService(null);
      setServiceNome('');
      setServiceDescricao('');
      setServicePreco('');
      setServiceFotoUrl('');
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const priceNum = parseFloat(servicePreco);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg('O preço deve ser um número válido superior ou igual a zero.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      nome: serviceNome,
      descricao: serviceDescricao,
      preco: priceNum,
      categoria: 'Serviços' as const,
      quantidade: 1, // standard placeholder for service listings
      foto_url: serviceFotoUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop'
    };

    try {
      const url = editingService ? `/api/produtos/${editingService.id}` : '/api/produtos';
      const method = editingService ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(editingService ? 'Serviço atualizado com sucesso!' : 'Novo serviço adicionado com sucesso!');
        setIsServiceModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao guardar serviço.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro na requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este serviço permanente?')) return;
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Serviço removido do inventário.');
        fetchData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao remover serviço.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao apagar.');
    }
  };

  const filteredOrders = encomendas.filter(order => {
    const matchesStatus = orderFilterStatus === 'all' || order.status === orderFilterStatus;
    const matchesSearch = order.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
                          (order.metodo_pagamento || '').toLowerCase().includes(orderSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const servicesOnly = produtos.filter(p => p.categoria === 'Serviços' && p.nome.toLowerCase().includes(serviceSearch.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar Layout */}
      <aside className="hidden lg:flex flex-col w-80 bg-[#0B1120] text-white p-8 shrink-0 relative overflow-hidden">
        {/* Aesthetic Gradients */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#008fcc]/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Brand Logo */}
          <div className="mb-12">
            <span className="text-[10px] font-black uppercase text-brand-cyan tracking-[0.25em] block mb-2">Painel de Operações</span>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-[#F8FAFC]">
              E&S <span className="text-brand-cyan">Engenharia</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-3xl mb-10">
            <div className="w-10 h-10 bg-[#008fcc] rounded-full flex items-center justify-center font-black text-white text-md">
              F
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-tight text-slate-200">Funcionário Activo</p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Gestão de Serviços & Tráfego</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="space-y-3 flex-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] uppercase font-black tracking-wider transition-all duration-300 text-left ${
                activeTab === 'orders' 
                  ? 'bg-[#008fcc] text-white shadow-lg shadow-[#008fcc]/15' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clipboard size={16} />
              <span>Encomendas</span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] uppercase font-black tracking-wider transition-all duration-300 text-left ${
                activeTab === 'services' 
                  ? 'bg-[#008fcc] text-white shadow-lg shadow-[#008fcc]/15' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings size={16} />
              <span>Serviços Técnico</span>
            </button>
          </nav>

          {/* Log Out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] uppercase font-black tracking-wider transition-all duration-300 text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 mt-auto"
          >
            <LogOut size={16} />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Frame */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-100 px-6 lg:px-12 py-6 flex items-center justify-between">
          <div className="lg:hidden">
            <h1 className="text-lg font-black uppercase tracking-tight text-[#0B1120]">E&S Portaria</h1>
          </div>
          <div className="hidden lg:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspace</p>
            <h2 className="text-xl font-black text-[#0B1120] uppercase tracking-tight">Área Técnica Funcionário</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile actions */}
            <div className="flex lg:hidden gap-2">
              <button 
                onClick={() => setActiveTab('orders')} 
                className={`p-3 rounded-xl border text-[9px] font-black uppercase ${activeTab === 'orders' ? 'bg-[#0B1120] text-white' : 'bg-white text-slate-500'}`}
              >
                Encomendas
              </button>
              <button 
                onClick={() => setActiveTab('services')} 
                className={`p-3 rounded-xl border text-[9px] font-black uppercase ${activeTab === 'services' ? 'bg-[#0B1120] text-white' : 'bg-white text-slate-500'}`}
              >
                Serviços
              </button>
              <button 
                onClick={handleLogout} 
                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"
                title="Sair"
              >
                <LogOut size={14} />
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-brand-cyan/10 border border-brand-cyan/20 rounded-full text-[9px] font-black text-[#008fcc] uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
              Sincronizado MZN
            </div>
          </div>
        </header>

        <section className="flex-1 p-6 lg:p-12">
          {errorMsg && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-wider mb-8">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-wider mb-8">
              ✓ {successMsg}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-[#0B1120] border-t-brand-cyan rounded-full animate-spin" />
              <p className="text-xs font-black text-[#0B1120] uppercase tracking-widest">Carregando painel de operações...</p>
            </div>
          ) : activeTab === 'orders' ? (
            /* Tab Orders: Encomendas */
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-100">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Filtrar encomendas por código ou método..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-6 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:border-brand-purple outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <select
                  value={orderFilterStatus}
                  onChange={(e) => setOrderFilterStatus(e.target.value)}
                  className="w-full sm:w-auto px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#0B1120] outline-none"
                >
                  <option value="all">Todos os Estados</option>
                  <option value="Pendente">Pendentes</option>
                  <option value="Processando">Processando</option>
                  <option value="Confirmado">Confirmados</option>
                  <option value="Em Trânsito">Em Trânsito</option>
                  <option value="Entregue">Entregues</option>
                  <option value="Rejeitado">Rejeitados</option>
                </select>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[40px] border border-slate-100">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">Nenhuma encomenda ativa localizada.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {filteredOrders.map(order => (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-[40px] border p-8 flex flex-col gap-6 relative transition-all ${
                        editingOrder?.id === order.id ? 'border-brand-purple ring-2 ring-brand-purple/20' : 'border-slate-100 hover:shadow-xl'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Código de Encomenda</span>
                          <h4 className="text-lg font-black text-[#0B1120] uppercase">#{order.id.slice(0, 12)}</h4>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          order.status === 'Confirmado' || order.status === 'Entregue'
                            ? 'bg-emerald-50 text-emerald-600'
                            : order.status === 'Rejeitado' || order.status === 'Cancelado'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600 animate-pulse'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-6">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-3">Activos Comprados</span>
                        <div className="space-y-2">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs font-semibold text-slate-700">
                              <span>{item.nome} (x{item.cartQuantity})</span>
                              <span>{(item.preco * item.cartQuantity).toLocaleString()} MT</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl text-[10px]">
                        <div>
                          <p className="text-slate-400 font-black uppercase tracking-wider mb-1">Pagamento</p>
                          <p className="font-bold text-[#0B1120] uppercase">{order.metodo_pagamento || 'M-Pesa'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-black uppercase tracking-wider mb-1">Montante Líquido</p>
                          <p className="font-black text-brand-purple text-xs">{order.total?.toLocaleString() || 0} MT</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-slate-200/50 mt-1">
                          <p className="text-slate-400 font-black uppercase tracking-wider mb-1">Tipo de Entrega</p>
                          <p className="font-bold text-[#0B1120] uppercase">
                            {order.tipo_entrega === 'delivery' ? `Delivery Regional (${order.distancia_km || 0} KM)` : 'Levantamento Próprio'}
                          </p>
                        </div>
                      </div>

                      {order.comprovante_url && order.comprovante_url !== 'PAGO_NA_ENTREGA' && (
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Comprovativo MZN</span>
                          <a 
                            href={order.comprovante_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[9px] font-black text-brand-cyan hover:underline uppercase tracking-wider"
                          >
                            Visualizar Recibo 👀
                          </a>
                        </div>
                      )}

                      {/* Display Location updates if in delivery mode */}
                      {(order.localizacao_atual || order.admin_feedback) && (
                        <div className="bg-brand-cyan/5 border border-brand-cyan/10 p-5 rounded-2xl text-[10px] space-y-1">
                          {order.localizacao_atual && (
                            <p className="text-[#008fcc] font-bold">
                              📍 <span className="uppercase text-[8px] tracking-wider text-slate-400 mr-1">Localização Operacional:</span> 
                              {order.localizacao_atual}
                            </p>
                          )}
                          {order.admin_feedback && (
                            <p className="text-slate-600 font-semibold">
                              💬 <span className="uppercase text-[8px] tracking-wider text-slate-400 mr-1">Feedback Técnico:</span> 
                              {order.admin_feedback}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Editing panel */}
                      {editingOrder?.id === order.id ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className="space-y-4 pt-4 border-t border-slate-100"
                        >
                          <h5 className="text-[10px] font-black text-[#0B1120] uppercase tracking-wider">Atualizar Rastreamento</h5>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-black uppercase text-[#0B1120]/40 tracking-wider block mb-1">Estado de Entrega</label>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as any)}
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:border-brand-purple outline-none"
                              >
                                <option value="Pendente">Pendente</option>
                                <option value="Processando">Processando</option>
                                <option value="Confirmado">Confirmar Pagamento</option>
                                <option value="Em Trânsito">Em Trânsito</option>
                                <option value="Entregue">Assinalar Entregue</option>
                                <option value="Rejeitado">Rejeitar</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[8px] font-black uppercase text-[#0B1120]/40 tracking-wider block mb-1">Localização Texto</label>
                              <input
                                type="text"
                                placeholder="Ex: Sede em Gondola"
                                value={editLocation}
                                onChange={(e) => setEditLocation(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:border-brand-purple outline-none placeholder:text-slate-300"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-black uppercase text-[#0B1120]/40 tracking-wider block mb-1">Latitude Técnica (E-W)</label>
                              <input
                                type="text"
                                value={latInput}
                                onChange={(e) => setLatInput(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:border-brand-purple outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black uppercase text-[#0B1120]/40 tracking-wider block mb-1">Longitude Técnica (N-S)</label>
                              <input
                                type="text"
                                value={lngInput}
                                onChange={(e) => setLngInput(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:border-brand-purple outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[8px] font-black uppercase text-[#0B1120]/40 tracking-wider block mb-1">Nota Técnica ao Cliente</label>
                            <textarea
                              placeholder="Fretamento verificado por nossa equipe operacional..."
                              value={editFeedback}
                              onChange={(e) => setEditFeedback(e.target.value)}
                              rows={2}
                              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:border-brand-purple outline-none placeholder:text-slate-300"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              disabled={isSubmitting}
                              onClick={() => {
                                const lat = parseFloat(latInput);
                                const lng = parseFloat(lngInput);
                                const coords = !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
                                handleUpdateOrderStatus(order.id, editStatus, editFeedback, editLocation, coords);
                              }}
                              className="flex-1 py-3 bg-[#0B1120] hover:bg-emerald-600 text-brand-cyan hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                            >
                              Confirmar Mudanças
                            </button>
                            <button
                              onClick={() => setEditingOrder(null)}
                              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                            >
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingOrder(order);
                            setEditStatus(order.status);
                            setEditFeedback(order.admin_feedback || '');
                            setEditLocation(order.localizacao_atual || '');
                            setLatInput(String(order.localizacao_coordenadas?.lat || -19.12));
                            setLngInput(String(order.localizacao_coordenadas?.lng || 33.48));
                          }}
                          className="w-full py-4 bg-[#0B1120] text-brand-cyan rounded-2xl text-[9px] font-black uppercase tracking-wider hover:bg-brand-purple hover:text-white transition-all duration-300"
                        >
                          Actualizar Rota & Estado Técnica
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Tab Services: Serviços Técnico */
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 rounded-[32px] border border-slate-100">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Filtrar serviços por nome..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="w-full pl-6 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:border-brand-purple outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <button
                  onClick={() => handleOpenServiceModal()}
                  className="w-full sm:w-auto px-6 py-4 bg-[#008fcc] text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-[#0B1120] transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Plus size={14} />
                  <span>Adicionar Serviço Técnico</span>
                </button>
              </div>

              {servicesOnly.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[40px] border border-slate-100">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">Nenhum serviço técnico localizado no catálogo.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {servicesOnly.map(s => (
                    <div key={s.id} className="bg-white rounded-[40px] border border-slate-100 p-8 flex flex-col gap-6 relative overflow-hidden group hover:shadow-2xl transition-all">
                      <div className="w-full aspect-video rounded-[24px] overflow-hidden bg-slate-100 relative">
                        <img 
                          src={s.foto_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600&auto=format&fit=crop'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute top-4 left-4 px-3 py-1 bg-brand-purple text-white rounded-full text-[8px] font-black uppercase tracking-wider">
                          Serviços
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <h4 className="text-lg font-black text-[#0B1120] uppercase tracking-tight leading-none truncate">{s.nome}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preço de Referência</p>
                        <p className="text-2xl font-black text-[#0B1120]">{s.preco.toLocaleString()} MT</p>
                        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed line-clamp-3 pt-3 border-t border-slate-100">
                          {s.descricao || 'Sem descrição operativa publicada.'}
                        </p>
                      </div>

                      <div className="flex gap-3 border-t border-slate-50 pt-6 mt-auto">
                        <button
                          onClick={() => handleOpenServiceModal(s)}
                          className="flex-1 py-3 bg-slate-100 hover:bg-[#008fcc]/10 text-[#008fcc] rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                        >
                          <Edit2 size={12} />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteService(s.id)}
                          className="px-4 py-3 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded-xl transition-all"
                          title="Excluir Serviço"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Dynamic Modal for adding/editing services */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <div className="fixed inset-0 bg-[#0B1120]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] border border-slate-100 shadow-2xl w-full max-w-xl p-8 lg:p-10 relative overflow-hidden"
            >
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <span className="text-[9px] font-black uppercase text-[#008fcc] tracking-[0.2em] block mb-1">Catálogo E&S</span>
                <h3 className="text-2xl font-black text-[#0B1120] uppercase tracking-tight">
                  {editingService ? 'Editar Serviço Técnico' : 'Adicionar Serviço Técnico'}
                </h3>
              </div>

              <form onSubmit={handleSaveService} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Nome Oficial do Serviço</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alinhamento de Motor Gerador"
                    value={serviceNome}
                    onChange={(e) => setServiceNome(e.target.value)}
                    className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:border-brand-purple outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Preço de Referência (MZN)</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 12500"
                      value={servicePreco}
                      onChange={(e) => setServicePreco(e.target.value)}
                      className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:border-brand-purple outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">URL da Imagem de Amostra</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash..."
                      value={serviceFotoUrl}
                      onChange={(e) => setServiceFotoUrl(e.target.value)}
                      className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:border-brand-purple outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Descrição Detalhada do Serviço</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Descreva o escopo técnico, estimativa de horas de trabalho e materiais mínimos..."
                    value={serviceDescricao}
                    onChange={(e) => setServiceDescricao(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:border-brand-purple outline-none placeholder:text-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#0B1120] text-brand-cyan hover:bg-[#008fcc] hover:text-white rounded-2xl font-black uppercase tracking-widest text-[9px] transition-colors duration-300 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando Informação técnica...' : 'Confirmar e Guardar Serviço'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
