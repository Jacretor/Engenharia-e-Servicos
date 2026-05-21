import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Package, 
  Users, 
  TrendingUp, 
  BarChart3,
  X,
  Camera,
  Menu,
  Download,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Produto, Category, User } from '../types';

export const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'clients' | 'stats'>('stats');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Client filters
  const [clientFilterStatus, setClientFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [clientFilterRole, setClientFilterRole] = useState<'all' | 'client' | 'admin'>('all');
  const [clientSearch, setClientSearch] = useState('');

  // Inventory filters
  const [inventorySearchName, setInventorySearchName] = useState('');
  const [inventorySearchCategory, setInventorySearchCategory] = useState<Category | 'all'>('all');

  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Memoized stats for performance and safety
  const stats = React.useMemo(() => {
    const validProdutos = (produtos || []);
    const totalValue = validProdutos.reduce((acc, p) => acc + ((Number(p?.preco) || 0) * (Number(p?.quantidade) || 0)), 0);
    const lowStock = validProdutos.filter(p => (Number(p?.quantidade) || 0) <= 5).length;
    const clients = (clientes || []).filter(c => c?.active).length;
    
    // Aggregate category values for charts
    const categoryDataValue = validProdutos.reduce((acc: any, p) => {
      const cat = p.categoria || 'Outros';
      acc[cat] = (acc[cat] || 0) + (Number(p.preco) * Number(p.quantidade));
      return acc;
    }, {});

    const chartData = Object.keys(categoryDataValue).map(cat => ({
      name: cat,
      valor: categoryDataValue[cat]
    }));

    const categoryVolumeData = validProdutos.reduce((acc: any, p) => {
      const cat = p.categoria || 'Outros';
      acc[cat] = (acc[cat] || 0) + (Number(p.quantidade) || 0);
      return acc;
    }, {});
    
    const volumeChartData = Object.keys(categoryVolumeData).map(cat => ({
      name: cat,
      volume: categoryVolumeData[cat]
    }));

    return { 
      totalValue, 
      lowStock, 
      clients, 
      chartData: chartData.length > 0 ? chartData : [{ name: 'Sem Dados', valor: 0 }],
      volumeChartData: volumeChartData.length > 0 ? volumeChartData : [{ name: 'Sem Dados', volume: 0 }]
    };
  }, [produtos, clientes]);

  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [categoria, setCategory] = useState<Category>('Materiais');
  const [preco, setPreco] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    const endpoint = activeTab === 'inventory' || activeTab === 'stats' ? '/api/produtos' : '/api/clientes';
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (activeTab === 'inventory' || activeTab === 'stats') {
        const prods = Array.isArray(data) ? data : [];
        setProdutos(prods);
        // Also ensure we have clients for the community count in stats
        if (activeTab === 'stats') {
          const clientRes = await fetch('/api/clientes');
          const clientData = await clientRes.json();
          setClientes(Array.isArray(clientData) ? clientData : []);
        }
      } else {
        setClientes(Array.isArray(data) ? data : []);
      }
    } catch (e) { 
      console.error(e); 
      if (activeTab === 'inventory') setProdutos([]);
      else setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClient = async (id: string) => {
    try {
      await fetch(`/api/clientes/${id}/toggle`, { method: 'PUT' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const numPreco = parseFloat(preco);
    const numQuantidade = parseInt(quantidade);

    if (isNaN(numPreco) || numPreco < 0) {
      setErrorMsg('O preço deve ser um valor numérico válido.');
      setIsSubmitting(false);
      return;
    }
    if (isNaN(numQuantidade) || numQuantidade < 0) {
      setErrorMsg('A quantidade deve ser um número inteiro válido.');
      setIsSubmitting(false);
      return;
    }

    const payload = { 
      nome, 
      categoria, 
      preco: numPreco, 
      quantidade: numQuantidade, 
      foto_url: fotoUrl,
      descricao
    };
    
    const url = editingProduto ? `/api/produtos/${editingProduto.id}` : '/api/produtos';
    try {
      const res = await fetch(url, {
        method: editingProduto ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseData = await res.json();

      if (res.ok) {
        setSuccessMsg(editingProduto ? 'Ativo atualizado com sucesso!' : 'Novo ativo adicionado ao sistema!');
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccessMsg(null);
        }, 1500);
        fetchData();
      } else {
        const errorDetail = responseData?.message || responseData?.error_description || 'Erro na base de dados.';
        setErrorMsg(`Erro ao guardar: ${errorDetail}`);
      }
    } catch (e: any) { 
      console.error(e); 
      setErrorMsg('Erro de sistema. Verifique os segredos SUPABASE no painel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (p?: Produto) => {
    if (p) {
      setEditingProduto(p); 
      setNome(p?.nome || ''); 
      setCategory(p?.categoria || 'Materiais'); 
      setPreco(p?.preco?.toString() || '0'); 
      setQuantidade(p?.quantidade?.toString() || '0'); 
      setFotoUrl(p?.foto_url || ''); 
      setDescricao(p?.descricao || '');
    } else {
      setEditingProduto(null); setNome(''); setCategory('Materiais'); setPreco(''); setQuantidade(''); setFotoUrl(''); setDescricao('');
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar permanentemente este ativo?')) return;
    try {
      await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(11, 17, 32);
    doc.text('E&S ENGENHARIA', 14, 22);
    doc.setFontSize(14);
    doc.text('Relatório Consolidado de Inventário', 14, 32);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-MZ')}`, 14, 40);
    
    const tableData = produtos.map((p, idx) => [
      idx + 1,
      p.nome,
      p.categoria,
      p.preco.toLocaleString() + ' MZN',
      p.quantidade,
      (p.preco * p.quantidade).toLocaleString() + ' MZN'
    ]);

    autoTable(doc, {
      head: [['ID', 'Equipamento', 'Sector', 'P. Unitário', 'Stock', 'Avaliação Total']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [11, 17, 32], fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 5 }
    });

    doc.save(`ES_Business_Report_${Date.now()}.pdf`);
  };

  const sidebarItems = [
    { id: 'inventory', label: 'Inventário', icon: Package },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'stats', label: 'Dashboard', icon: TrendingUp }
  ];

  const filteredProdutos = React.useMemo(() => {
    return (produtos || []).filter(p => {
      const matchesName = (p.nome || '').toLowerCase().includes(inventorySearchName.toLowerCase());
      const matchesCategory = inventorySearchCategory === 'all' || p.categoria === inventorySearchCategory;
      return matchesName && matchesCategory;
    });
  }, [produtos, inventorySearchName, inventorySearchCategory]);

  const filteredClientes = React.useMemo(() => {
    return (clientes || []).filter(c => {
      const matchesStatus = clientFilterStatus === 'all' || 
                            (clientFilterStatus === 'active' ? c.active : !c.active);
      const matchesRole = clientFilterRole === 'all' || c.role === clientFilterRole;
      const matchesSearch = (c.nome || '').toLowerCase().includes(clientSearch.toLowerCase()) || 
                            (c.email || '').toLowerCase().includes(clientSearch.toLowerCase());
      return matchesStatus && matchesRole && matchesSearch;
    });
  }, [clientes, clientFilterStatus, clientFilterRole, clientSearch]);

  return (
    <div className="flex min-h-screen bg-[#f9fafb]">
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-[#0B1120] flex items-center justify-between px-6 z-[60] border-b border-white/5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center p-1 border border-white/10">
             <img src="/LogoTipo.png" className="w-full h-full object-contain" alt="Logo" />
          </div>
          <span className="text-white font-black uppercase tracking-tighter text-sm">Gestor E&S</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-3 text-brand-cyan bg-white/5 rounded-xl active:scale-95 transition-all"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Admin Sidebar (Desktop & Mobile Panel) */}
      <aside className={`
        w-80 bg-[#0B1120] border-r border-white/5 fixed top-0 bottom-0 z-50 p-10 flex flex-col pt-32 text-white
        transition-transform duration-500 ease-in-out lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full shadow-[0_0_50px_rgba(0,0,0,0.5)] lg:shadow-none'}
      `}>
        <div className="flex items-center gap-4 mb-16 border-b border-white/5 pb-10">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center p-2 border border-white/10 overflow-hidden">
             <img src="/LogoTipo.png" className="w-full h-full object-contain" alt="Logo" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Gestor E&S</h1>
            <span className="text-[9px] font-black text-brand-cyan uppercase tracking-widest mt-1 block">Logística de Elite</span>
          </div>
        </div>

        <nav className="flex-1 space-y-3">
          {sidebarItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === item.id ? 'bg-brand-cyan text-[#0B1120] shadow-xl shadow-brand-cyan/20' : 'text-white/40 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-10 border-t border-white/5">
          <button 
            onClick={() => {
              localStorage.removeItem('es_user');
              window.dispatchEvent(new Event('auth-change'));
            }}
            className="w-full py-5 bg-white/5 hover:bg-red-500 hover:text-white transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 border border-white/10"
          >
            Encerrar Sessão
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-80 p-6 lg:p-16 pt-28 lg:pt-32">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm lg:ml-80">
            <div className="w-12 h-12 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <header className="flex flex-col md:flex-row justify-between md:items-end gap-12 mb-16 lg:mb-24">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <span className="w-8 h-px bg-brand-purple/30"></span>
               <span className="text-brand-purple font-black uppercase tracking-[0.4em] text-[10px] lg:text-[11px]">Sistema Operativo v4.2</span>
            </div>
            <h1 className="text-4xl lg:text-8xl font-black leading-tight lg:leading-none tracking-tighter text-[#0B1120]">
              {activeTab === 'inventory' ? (
                <>Logística & <span className="italic text-brand-cyan underline decoration-brand-cyan/20">Stock</span></>
              ) : activeTab === 'clients' ? (
                <>Comunidade & <span className="italic text-brand-purple underline decoration-brand-purple/20">CRM</span></>
              ) : (
                <>Business & <span className="italic text-brand-cyan underline decoration-brand-cyan/20">Growth</span></>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'inventory' && (
              <button 
                onClick={() => openModal()}
                className="px-10 py-5 bg-[#0B1120] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-4 hover:bg-brand-cyan hover:text-[#0B1120] transition-all shadow-2xl shadow-[#0B1120]/10 border border-white/5 active:scale-95"
              >
                <Plus size={24} /> <span className="hidden sm:inline">Adicionar Produto</span>
              </button>
            )}
            {activeTab === 'stats' && (
              <button 
                onClick={exportPDF}
                className="px-8 lg:px-10 py-5 bg-brand-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-4 hover:bg-[#0B1120] transition-all shadow-2xl active:scale-95"
              >
                <Download size={22} /> <span className="hidden sm:inline">Exportar Inteligência</span>
              </button>
            )}
          </div>
        </header>

        {activeTab === 'inventory' ? (
          <div className="space-y-10">
            {/* Inventory Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
               <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className="w-12 h-12 bg-brand-cyan/10 rounded-2xl flex items-center justify-center text-brand-cyan">
                     <Package size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-[#0B1120] tracking-widest leading-none mb-1">Filtros de Ativos</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{filteredProdutos.length} Equipamentos em canais activos</p>
                  </div>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                 <input 
                   type="text"
                   placeholder="Pesquisar equipamento..."
                   value={inventorySearchName}
                   onChange={(e) => setInventorySearchName(e.target.value)}
                   className="flex-1 lg:w-64 px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0B1120] outline-none focus:border-brand-cyan transition-all"
                 />
                 <select 
                   value={inventorySearchCategory} 
                   onChange={(e) => setInventorySearchCategory(e.target.value as any)}
                   className="flex-1 sm:flex-none px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0B1120] outline-none focus:border-brand-cyan transition-all"
                 >
                   <option value="all">Todas as Áreas</option>
                   <option value="Materiais">Materiais</option>
                   <option value="Peças">Peças</option>
                   <option value="Serviços">Serviços</option>
                   <option value="Equipamentos">Equipamentos</option>
                 </select>
               </div>
            </div>

            <div className="bg-white rounded-[32px] lg:rounded-[40px] border border-slate-100 overflow-hidden shadow-2xl shadow-[#0B1120]/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-black/5 text-[10px] font-black uppercase tracking-widest text-[#0B1120]/30">
                    <tr>
                      <th className="p-8 lg:p-10">Ativo Comercial</th>
                      <th className="p-8 lg:p-10">Sector Técnico</th>
                      <th className="p-8 lg:p-10">Avaliação Unitária</th>
                      <th className="p-8 lg:p-10">Stock Disponível</th>
                      <th className="p-8 lg:p-10 text-right">Controlo Operativo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filteredProdutos.map(p => (
                    <tr key={p.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="p-8 lg:p-10 flex items-center gap-6">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-white overflow-hidden border border-black/5 flex-shrink-0 p-1">
                          {p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full flex items-center justify-center text-[#0B1120]/10 bg-slate-50 rounded-xl text-3xl">📦</div>}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-[#0B1120] uppercase tracking-tighter text-lg lg:text-xl group-hover:text-brand-purple transition-colors leading-none mb-1">{p?.nome || 'Sem Nome'}</span>
                          <span className="text-[10px] font-bold text-brand-purple/40 uppercase tracking-widest">REG: {p?.id ? String(p.id).slice(0, 8) : '---'}</span>
                        </div>
                      </td>
                      <td className="p-8 lg:p-10">
                        <span className="px-5 py-2 bg-white border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:border-brand-purple/20 transition-all">{p.categoria}</span>
                      </td>
                      <td className="p-8 lg:p-10 font-black text-xl lg:text-2xl tracking-tighter text-[#0B1120]">
                        {p.preco.toLocaleString()} <span className="text-xs text-slate-300 font-bold ml-1">Kz/MT</span>
                      </td>
                      <td className="p-8 lg:p-10">
                        <div className="flex items-center gap-3">
                           <div className={`w-3 h-3 rounded-full ${p.quantidade < 5 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${p.quantidade < 5 ? 'text-red-500' : 'text-slate-400'}`}>
                             {p.quantidade} Unidades
                           </span>
                        </div>
                      </td>
                      <td className="p-8 lg:p-10 text-right">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <button onClick={() => openModal(p)} className="p-4 bg-[#0B1120] text-white rounded-xl hover:bg-brand-cyan hover:text-[#0B1120] transition-all shadow-lg active:scale-90"><Edit3 size={18} /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-90"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProdutos.length === 0 && (
                <div className="py-40 text-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                      <Package size={40} />
                   </div>
                   <p className="text-slate-300 font-black uppercase tracking-[0.5em] text-[10px]">Nenhum ativo corresponde aos filtros</p>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : activeTab === 'clients' ? (
          <div className="space-y-10">
            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
               <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className="w-12 h-12 bg-brand-purple/10 rounded-2xl flex items-center justify-center text-brand-purple">
                     <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-[#0B1120] tracking-widest leading-none mb-1">Filtros de Comunidade</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{filteredClientes.length} Parceiros Encontrados</p>
                  </div>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                 <input 
                   type="text"
                   placeholder="Pesquisar por nome ou e-mail..."
                   value={clientSearch}
                   onChange={(e) => setClientSearch(e.target.value)}
                   className="flex-1 lg:w-64 px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0B1120] outline-none focus:border-brand-purple transition-all"
                 />
                 <select 
                   value={clientFilterStatus} 
                   onChange={(e) => setClientFilterStatus(e.target.value as any)}
                   className="flex-1 sm:flex-none px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0B1120] outline-none focus:border-brand-purple transition-all"
                 >
                   <option value="all">Todos os Estados</option>
                   <option value="active">Apenas Ativos</option>
                   <option value="inactive">Apenas Inativos</option>
                 </select>

                 <select 
                   value={clientFilterRole} 
                   onChange={(e) => setClientFilterRole(e.target.value as any)}
                   className="flex-1 sm:flex-none px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0B1120] outline-none focus:border-brand-purple transition-all"
                 >
                   <option value="all">Todas as Funções</option>
                   <option value="client">Clientes</option>
                   <option value="admin">Administradores</option>
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {filteredClientes.map(c => (
              <div key={c.id} className="bg-white rounded-[40px] border border-slate-100 p-8 lg:p-10 flex flex-col gap-8 group hover:shadow-2xl hover:shadow-[#0B1120]/5 transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-[#0B1120] rounded-full flex items-center justify-center font-black text-brand-cyan text-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-brand-cyan/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <span className="relative z-10">{c.nome ? c.nome[0].toUpperCase() : (c.email ? c.email[0].toUpperCase() : '?')}</span>
                  </div>
                  <div className="flex-1 truncate">
                    <h3 className="text-xl font-black text-[#0B1120] uppercase tracking-tighter leading-none mb-1 truncate">{c.nome || 'Parceiro E&S'}</h3>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate">{c.email}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                   <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl">
                     <span className="text-[9px] font-black uppercase text-[#0B1120]/30 tracking-widest">Licença Digital</span>
                     <span className="text-[10px] font-black text-[#0B1120]/60 uppercase">#{c?.id ? String(c.id).slice(0, 8) : '---'}</span>
                   </div>
                   <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl">
                     <span className="text-[9px] font-black uppercase text-[#0B1120]/30 tracking-widest">Nível Operativo</span>
                     <span className="px-3 py-1 bg-brand-purple/10 text-brand-purple rounded-md text-[9px] font-black uppercase">{c.role || 'Associado'}</span>
                   </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-8 mt-auto">
                   <div className="flex items-center gap-3">
                     <div className={`w-3 h-3 rounded-full ${c.active ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]'}`} />
                     <span className={`text-[10px] font-black uppercase tracking-widest ${c.active ? 'text-emerald-500' : 'text-red-500'}`}>
                       {c.active ? 'Acesso Validado' : 'Acesso Interrompido'}
                     </span>
                   </div>
                   <button 
                     onClick={() => handleToggleClient(c.id)}
                     className={`w-14 h-7 rounded-full flex items-center px-1.5 transition-all ${c.active ? 'bg-brand-cyan' : 'bg-slate-200'}`}
                   >
                     <motion.div 
                        animate={{ x: c.active ? 28 : 0 }} 
                        className="w-5 h-5 bg-white rounded-full shadow-md" 
                     />
                   </button>
                </div>
              </div>
            ))}
          </div>
          {filteredClientes.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[40px] border border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                <Package size={32} />
              </div>
              <p className="text-slate-300 font-black uppercase tracking-[0.5em] text-[10px]">Nenhum parceiro corresponde aos critérios</p>
            </div>
          )}
        </div>
      ) : (
          <div className="space-y-12 pb-20">
             {/* Key Metrics Bento */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="bg-[#0B1120] p-10 lg:p-12 rounded-[40px] lg:rounded-[48px] text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-10">Valorização de Ativos</p>
                  <div className="text-3xl lg:text-4xl font-black mb-10 text-brand-cyan tracking-tighter">
                     {stats.totalValue.toLocaleString()} <span className="text-xs text-brand-cyan/40">MZN/MT</span>
                  </div>
                  <BarChart3 className="text-white/5 absolute bottom-8 right-8" size={80} />
               </div>
               
               <div className="bg-white p-10 lg:p-12 rounded-[40px] lg:rounded-[48px] border border-slate-100 overflow-hidden relative group">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-10">Urgência de Suprimentos</p>
                  <div className="text-5xl lg:text-6xl font-black mb-10 text-red-500 tracking-tighter">
                     {stats.lowStock} <span className="text-xs text-slate-200 uppercase tracking-widest ml-2">Críticos</span>
                  </div>
                  <Package className="text-slate-50 absolute bottom-8 right-8" size={80} />
               </div>

               <div className="bg-white p-10 lg:p-12 rounded-[40px] lg:rounded-[48px] border border-slate-100 overflow-hidden relative group">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-10">Parceiros Estratégicos</p>
                  <div className="text-5xl lg:text-6xl font-black mb-10 text-brand-purple tracking-tighter">
                     {stats.clients} <span className="text-xs text-slate-200 uppercase tracking-widest ml-2">Validados</span>
                  </div>
                  <Users className="text-slate-50 absolute bottom-8 right-8" size={80} />
               </div>
             </div>

             {/* Intelligence Mapping */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                   <div className="flex items-center justify-between mb-10">
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#0B1120]">Densidade de Ativos por Sector</h3>
                      <div className="w-8 h-8 rounded-full bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                         <TrendingUp size={14} />
                      </div>
                   </div>
                   <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={stats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }} 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }}
                            />
                            <Tooltip 
                               contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900', background: '#0B1120', color: '#fff' }}
                               itemStyle={{ color: '#00D2FF' }}
                            />
                            <Bar dataKey="valor" fill="#00D2FF" radius={[12, 12, 12, 12]} barSize={32} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-[#0B1120] p-10 rounded-[40px] text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-brand-purple/5 rounded-full blur-[40px]"></div>
                   <div className="flex items-center justify-between mb-10">
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Volume Físico de Stock (Unidades)</h3>
                      <div className="flex gap-2">
                         <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></div>
                      </div>
                   </div>
                   <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={stats.volumeChartData}>
                            <defs>
                               <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#00D2FF" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <XAxis dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fontWeight: 900, fill: 'rgba(255,255,255,0.2)' }}
                            />
                            <Tooltip 
                               contentStyle={{ backgroundColor: '#1E293B', borderRadius: '24px', border: 'none', color: '#fff', fontSize: '10px', fontWeight: '900' }}
                               itemStyle={{ color: '#00D2FF' }}
                            />
                            <Area type="stepAfter" dataKey="volume" stroke="#00D2FF" fillOpacity={1} fill="url(#colorVolume)" strokeWidth={4} />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-[40px] p-10 lg:p-16 border border-slate-50 flex flex-col md:flex-row items-center gap-12 relative group shadow-2xl shadow-[#0B1120]/5">
                <div className="w-28 h-28 bg-[#0B1120] rounded-[36px] flex items-center justify-center text-brand-cyan shrink-0 border-4 border-slate-50 group-hover:rotate-6 transition-transform">
                   <FileText size={48} />
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h3 className="text-3xl font-black text-[#0B1120] uppercase tracking-tighter mb-4">Exportar Arquivo de Inteligência</h3>
                   <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8 max-w-2xl">O sistema compilou todos os dados de logística, CRM e performance financeira. Pressione o comando abaixo para extrair o dossiê oficial em PDF de alta qualidade.</p>
                   <button onClick={exportPDF} className="bg-[#0B1120] text-white px-10 py-5 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-brand-cyan hover:text-[#0B1120] transition-all flex items-center gap-4 mx-auto md:mx-0 shadow-xl active:scale-95 shadow-[#0B1120]/20">
                      <Download size={20} /> Descarregar Protocolo executivo (PDF)
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Modal for Product CRUD (Enhanced Responsiveness & UI) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[#0B1120]/95 backdrop-blur-2xl" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="bg-white rounded-[32px] lg:rounded-[60px] max-w-4xl w-full relative z-10 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.6)] flex flex-col max-h-[95vh]"
            >
              <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-brand-cyan/10 -rotate-12 translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] pointer-events-none" />
              
              {/* Modal Header */}
              <div className="p-8 lg:p-14 border-b border-slate-50 flex items-center justify-between shrink-0 relative z-20 bg-white/50 backdrop-blur-md">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                     <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                        <Package size={16} />
                     </div>
                     <span className="text-brand-purple font-black uppercase tracking-[0.4em] text-[10px] lg:text-[11px]">Interface de Inventário</span>
                  </div>
                  <h2 className="text-3xl lg:text-5xl font-black text-[#0B1120] uppercase tracking-tighter">
                    {editingProduto ? (
                      <>Editar <span className="italic text-brand-purple underline decoration-brand-purple/20">Protocolo</span></>
                    ) : (
                      <>Novo <span className="italic text-brand-cyan underline decoration-brand-cyan/20">Ativo</span></>
                    )}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-5 bg-slate-50 text-slate-300 hover:text-[#0B1120] hover:bg-slate-100 rounded-full transition-all active:scale-90"
                >
                  <X size={28} />
                </button>
              </div>

              {/* Form Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-14 scrollbar-hide">
                {errorMsg && (
                   <div className="mb-10 p-6 bg-red-50 border border-red-100 rounded-[24px] flex items-center gap-4 text-red-600 animate-shake">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                         <X size={20} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest">{errorMsg}</p>
                   </div>
                )}
                {successMsg && (
                   <div className="mb-10 p-6 bg-emerald-50 border border-emerald-100 rounded-[24px] flex items-center gap-4 text-emerald-600 animate-bounce">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                         <TrendingUp size={20} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest">{successMsg}</p>
                   </div>
                )}
                <form id="productForm" onSubmit={handleSubmit} className="space-y-8 lg:space-y-10 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12">
                    <div className="md:col-span-2">
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-4">Designação Comercial do Equipamento</label>
                       <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Transformador..." className="w-full px-6 lg:px-10 py-5 lg:py-6 bg-slate-50 border border-slate-100 rounded-2xl lg:rounded-3xl text-lg lg:text-2xl font-black uppercase tracking-tighter outline-none focus:border-brand-cyan focus:ring-8 focus:ring-brand-cyan/5 transition-all text-[#0B1120]" />
                    </div>
                    
                    <div>
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-4">Sector Técnico</label>
                       <select value={categoria} onChange={e => setCategory(e.target.value as any)} className="w-full px-6 lg:px-10 py-5 lg:py-6 bg-slate-50 border border-slate-100 rounded-2xl lg:rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-brand-cyan text-[#0B1120]">
                         <option>Materiais</option>
                         <option>Peças</option>
                         <option>Serviços</option>
                         <option>Equipamentos</option>
                       </select>
                    </div>
                    
                    <div>
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-4">Preço (MZN)</label>
                       <input type="number" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} required placeholder="0.00" className="w-full px-6 lg:px-10 py-5 lg:py-6 bg-slate-50 border border-slate-100 rounded-2xl lg:rounded-3xl text-xl lg:text-2xl font-black tracking-tighter outline-none text-[#0B1120]" />
                    </div>
                    
                    <div>
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-4">Stock</label>
                       <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} required placeholder="0" className="w-full px-6 lg:px-10 py-5 lg:py-6 bg-slate-50 border border-slate-100 rounded-2xl lg:rounded-3xl text-xl lg:text-2xl font-black tracking-tighter outline-none text-[#0B1120]" />
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-4">
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-4">Imagem (URL)</label>
                       <div className="flex gap-4 items-center">
                         <input value={fotoUrl} onChange={e => setFotoUrl(e.target.value)} placeholder="https://..." className="flex-1 px-6 lg:px-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold text-[#0B1120]" />
                         <div className="w-16 h-16 bg-slate-50 rounded-2xl border flex items-center justify-center p-1 shrink-0 overflow-hidden">
                           {fotoUrl ? <img src={fotoUrl} className="w-full h-full object-cover rounded-xl" /> : <Camera size={20} className="text-slate-200" />}
                         </div>
                       </div>
                    </div>

                    <div className="md:col-span-2">
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-4">Descrição Técnica</label>
                       <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} className="w-full px-6 lg:px-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium outline-none resize-none text-[#0B1120]" />
                    </div>
                  </div>
                  
                  {/* Action Footer INSIDE the form area but visually at bottom */}
                  <div className="pt-10 flex flex-col sm:flex-row gap-4">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={`flex-[2] py-5 lg:py-7 bg-[#0B1120] text-white rounded-2xl lg:rounded-3xl font-black uppercase tracking-widest text-[10px] lg:text-[11px] shadow-xl hover:bg-brand-cyan hover:text-[#0B1120] transition-all active:scale-[0.98] flex items-center justify-center gap-4 ${isSubmitting ? 'opacity-50' : ''}`}
                    >
                      {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <TrendingUp size={18} />}
                      {editingProduto ? 'Validar Alterações' : 'Adicionar ao Sistema'}
                    </button>
                    <button 
                       type="button" 
                       onClick={() => setIsModalOpen(false)} 
                       className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl lg:rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                       Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
