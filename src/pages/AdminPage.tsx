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
import { MozambiqueMapTrack } from '../components/MozambiqueMapTrack';

export const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'clients' | 'stats' | 'orders'>('stats');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Client filters
  const [clientFilterStatus, setClientFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [clientFilterRole, setClientFilterRole] = useState<'all' | 'client' | 'admin' | 'funcionario'>('all');
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
  const [tempUrl, setTempUrl] = useState('');
  const [descricao, setDescricao] = useState('');

  // Encomendas and Local File Upload States
  const [encomendas, setEncomendas] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Live order feedback tracking editor states
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editFeedback, setEditFeedback] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editCoords, setEditCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadProgress(true);
    const uploads = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          try {
            const res = await fetch('/api/upload-base64', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: file.name, data: base64 })
            });
            if (res.ok) {
              const resData = await res.json();
              resolve(resData.url);
            } else {
              resolve(base64);
            }
          } catch (err) {
            console.error(err);
            resolve(base64);
          }
        };
        reader.readAsDataURL(file);
      });
    });

    try {
      const urls = await Promise.all(uploads);
      setFotoUrl(prev => {
        const existing = prev ? prev.split(',').map(s => s.trim()).filter(Boolean) : [];
        const combined = [...existing, ...urls];
        return combined.join(',');
      });
    } catch (err) {
      console.error('Erro no upload de fotos:', err);
    } finally {
      setUploadProgress(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateOrderStatus = async (
    id: string, 
    status: string, 
    admin_feedback?: string, 
    localizacao_atual?: string,
    localizacao_coordenadas?: { lat: number; lng: number } | null
  ) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/encomendas/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          admin_feedback,
          localizacao_atual,
          localizacao_coordenadas
        })
      });
      if (res.ok) {
        fetchData();
        setEditingOrderId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch everything concurrently to ensure live stats and notification badges are always updated
      const [prodRes, cliRes, ordRes] = await Promise.all([
        fetch('/api/produtos'),
        fetch('/api/clientes'),
        fetch('/api/admin/encomendas')
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProdutos(Array.isArray(prodData) ? prodData : []);
      }
      if (cliRes.ok) {
        const cliData = await cliRes.json();
        setClientes(Array.isArray(cliData) ? cliData : []);
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setEncomendas(Array.isArray(ordData) ? ordData : []);
      }
    } catch (e) { 
      console.error('Error fetching admin data:', e); 
      setProdutos([]);
      setClientes([]);
      setEncomendas([]);
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

  const handleToggleRole = async (id: string) => {
    try {
      await fetch(`/api/clientes/${id}/toggle-role`, { method: 'PUT' });
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
    { id: 'inventory', label: 'Inventário / Stock', icon: Package },
    { id: 'clients', label: 'Clientes Registados', icon: Users },
    { id: 'orders', label: 'Encomendas / Pedidos', icon: FileText },
    { id: 'stats', label: 'Análise de Negócio', icon: TrendingUp }
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
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'orders' && (encomendas || []).filter(o => o?.status === 'Pendente' || o?.status === 'Processando').length > 0 && (
                <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center font-black text-[9px] shadow-sm animate-pulse">
                  {(encomendas || []).filter(o => o?.status === 'Pendente' || o?.status === 'Processando').length}
                </span>
              )}
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

        {/* Dynamic Client Order Notifications for Admin */}
        {(encomendas || []).filter(o => o?.status === 'Pendente' || o?.status === 'Processando').length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="mb-12 p-6 sm:p-8 bg-amber-50 rounded-3xl border border-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full translate-x-16 -translate-y-16 animate-pulse" />
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 animate-bounce">
                <FileText size={22} className="stroke-[2.5]" />
              </div>
              <div className="text-left font-sans">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-[0.25em] block mb-1">Alertas do Sistema Logístico</span>
                <h4 className="text-lg font-black text-slate-900 leading-tight">
                  Prezada Helena Garife, tem <span className="text-amber-600 underline font-black">{(encomendas || []).filter(o => o?.status === 'Pendente' || o?.status === 'Processando').length}</span> pedidos pendentes de validação técnica!
                </h4>
                <p className="text-xs text-slate-500 font-semibold mt-1">Verifique os comprovativos bancários em anexo no painel de encomendas para emitir a confirmação.</p>
              </div>
            </div>

            {activeTab !== 'orders' && (
              <button
                onClick={() => setActiveTab('orders')}
                className="px-6 py-3.5 bg-[#0B1120] hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2 relative z-10 cursor-pointer flex-shrink-0"
              >
                Auditar Encomendas <Plus size={14} className="rotate-45" />
              </button>
            )}
          </motion.div>
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
                <>Nossos & <span className="italic text-brand-purple underline decoration-brand-purple/20">Clientes</span></>
              ) : activeTab === 'orders' ? (
                <>Pedidos & <span className="italic text-brand-cyan underline decoration-brand-cyan/20">Encomendas</span></>
              ) : (
                <>Estatísticas & <span className="italic text-brand-cyan underline decoration-brand-cyan/20">Painel</span></>
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
                <Download size={22} /> <span className="hidden sm:inline">Exportar Relatório</span>
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
              
              {/* Responsive Mobile Layout (block md:hidden) */}
              <div className="grid grid-cols-1 gap-6 md:hidden p-4">
                {filteredProdutos.map(p => (
                  <div key={p.id} className="bg-slate-50 border border-slate-100/80 rounded-3xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden border border-black/5 flex-shrink-0 p-1 flex items-center justify-center">
                        {p.foto_url ? (
                          <img src={p.foto_url} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <div className="text-3xl">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block font-black text-[#0B1120] uppercase tracking-tighter text-base truncate">{p?.nome || 'Sem Nome'}</span>
                        <span className="block text-[9px] font-bold text-brand-purple/40 uppercase tracking-widest mt-0.5">REG: {p?.id ? String(p.id).slice(0, 8) : '---'}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-200/50 py-4">
                      <div>
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Setor Técnico</span>
                        <span className="inline-block px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-[#0B1120]/60">{p.categoria}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Unitário</span>
                        <span className="font-black text-sm tracking-tighter text-[#0B1120]">{p.preco ? p.preco.toLocaleString() : '0'} <span className="text-[9px] text-slate-400">MT</span></span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Disponível</span>
                        <div className="flex items-center gap-1.5">
                           <div className={`w-2 h-2 rounded-full ${p.quantidade < 5 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                           <span className={`text-[9px] font-black uppercase tracking-widest ${p.quantidade < 5 ? 'text-red-500' : 'text-slate-400'}`}>
                             {p.quantidade} Unidades
                           </span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Avaliação Física</span>
                        <span className="font-black text-sm tracking-tighter text-brand-purple">{((p.preco || 0) * (p.quantidade || 0)).toLocaleString()} <span className="text-[9px] text-slate-400">MT</span></span>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 justify-end pt-2">
                      <button onClick={() => openModal(p)} className="flex-1 py-3 bg-[#0B1120] text-white rounded-xl hover:bg-brand-cyan hover:text-[#0B1120] transition-all font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">Editar</button>
                      <button onClick={() => handleDelete(p.id)} className="py-3 px-5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
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
                          {p.preco.toLocaleString()} <span className="text-xs text-slate-300 font-bold ml-1">MT</span>
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
              </div>
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
                   <option value="funcionario">Funcionários</option>
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
                     <div className="flex items-center gap-2">
                       <span className="px-3 py-1 bg-brand-purple/10 text-brand-purple rounded-md text-[9px] font-black uppercase">
                         {c.role === 'funcionario' ? 'Funcionário' : c.role === 'admin' ? 'Admin' : 'Cliente'}
                       </span>
                       {c.email !== 'helenagarife@gmail.com' && c.role !== 'admin' && (
                         <button
                           onClick={() => handleToggleRole(c.id)}
                           className="px-2.5 py-1 bg-brand-cyan/15 hover:bg-brand-cyan text-[#008fcc] hover:text-white rounded-md text-[8px] font-black uppercase tracking-wider transition-colors focus:outline-none"
                           title="Alternar entre Cliente e Funcionário"
                         >
                           Alterar
                         </button>
                       )}
                     </div>
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
      ) : activeTab === 'orders' ? (
        <div className="space-y-10 font-sans">
          {/* Header Indicator */}
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm font-sans">
             <div className="flex items-center gap-4 w-full lg:w-auto font-sans">
                <div className="w-12 h-12 bg-brand-cyan/10 rounded-2xl flex items-center justify-center text-brand-cyan">
                   <FileText size={24} />
                </div>
                <div className="font-sans">
                  <h3 className="text-sm font-black uppercase text-[#0B1120] tracking-widest leading-none mb-1 font-sans">Pedidos & Encomendas Realizadas</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-sans">{encomendas.length} Registos no Sistema</p>
                </div>
             </div>
             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-right font-sans">
                Gestão de Documentos & Transferências
             </div>
          </div>

          <MozambiqueMapTrack />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 font-sans">
            {encomendas.map((order) => (
              <div key={order.id} className="bg-white rounded-[40px] border border-slate-100 p-8 flex flex-col gap-6 hover:shadow-2xl transition-all relative overflow-hidden group font-sans">
                <div className="flex justify-between items-start font-sans">
                  <div className="font-sans">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 font-sans">ID da Encomenda</span>
                    <span className="text-xs font-black text-[#0B1120] uppercase font-sans">#{order.id ? String(order.id).slice(0, 8) : '---'}</span>
                  </div>
                  <div className="font-sans">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest font-sans ${
                      order.status === 'Confirmado' || order.status === 'Aprovado' || order.status === 'Entregue'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : order.status === 'Cancelado' || order.status === 'Rejeitado'
                        ? 'bg-red-50 text-red-600 border border-red-100 font-sans'
                        : 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                    }`}>
                      {order.status || 'Pendente'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-4 space-y-3 font-sans">
                  <div className="font-sans">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block mb-1 font-sans">Cliente / Contacto</span>
                    <span className="text-xs font-black text-[#0B1120] block font-sans">{order.user_id || 'Cliente Registado'}</span>
                  </div>
                  <div className="font-sans">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block mb-1 font-sans">Método de Liquidação</span>
                    <span className="text-xs font-black text-brand-purple uppercase flex items-center gap-1.5 font-sans">
                      <span className={`w-1.5 h-1.5 rounded-full ${order.metodo_pagamento === 'Dinheiro' ? 'bg-emerald-500' : 'bg-brand-cyan'}`} />
                      {order.metodo_pagamento === 'Dinheiro' ? 'Dinheiro (Na Entrega)' : order.metodo_pagamento || 'M-Pesa'}
                    </span>
                  </div>
                  <div className="font-sans">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block mb-1 font-sans">Valor do Pedido</span>
                    <span className="text-xl font-black text-[#0B1120] tracking-tighter font-sans">{(order.total || 0).toLocaleString()} <span className="text-[10px] text-slate-300">MT</span></span>
                  </div>
                </div>

                {/* Purchased Items List */}
                <div className="border-t border-slate-50 pt-4 flex-1 font-sans">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block mb-3 font-sans font-sans">Produtos Solicitados</span>
                  <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide py-1 font-sans">
                    {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 font-sans">
                        <span className="font-bold text-[#0B1120] truncate max-w-[150px] font-sans">{item.nome}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-sans font-sans">x{item.cartQuantity || 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Receipt Confirmation Photo */}
                {order.metodo_pagamento !== 'Dinheiro' && order.comprovante_url && (
                  <div className="border-t border-slate-50 pt-4 font-sans">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block mb-2 font-sans">Comprovativo de Pagamento</span>
                    <div className="w-full h-32 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 p-1 group relative font-sans">
                      {order.comprovante_url.startsWith('data:') || order.comprovante_url.startsWith('http') || order.comprovante_url.startsWith('/') ? (
                        <img 
                          src={order.comprovante_url} 
                          alt="Comprovativo" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-xl cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => {
                            const win = window.open();
                            if (win) win.document.write(`<img src="${order.comprovante_url}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                          }} 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-300 font-sans">Sem Imagem</div>
                      )}
                      <div className="absolute inset-0 bg-[#0B1120]/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-xl font-sans">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white font-sans">Clique para Ver Ampliado</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Delivery Logistics info breakdown with premium badges */}
                <div className="border-t border-slate-50 pt-4 space-y-2 font-sans text-xs">
                  <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[8px] font-black uppercase text-slate-400">Modalidade:</span>
                    <span className="font-black text-[#0B1120] uppercase text-[9px]">
                      {order.tipo_entrega === 'delivery' ? '🚚 Ao Encontro (Delivery)' : '🏢 Levantamento Local'}
                    </span>
                  </div>
                  {order.tipo_entrega === 'delivery' && (
                    <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-black uppercase text-slate-400">Raio Metical:</span>
                      <span className="font-semibold text-slate-500 uppercase text-[9px]">
                        {order.distancia_km || 0} KM • {order.custo_delivery ? `${order.custo_delivery.toLocaleString()} MT` : '0 MT'}
                      </span>
                    </div>
                  )}
                  {order.localizacao_atual && (
                    <div className="bg-brand-cyan/5 border border-brand-cyan/10 p-3 rounded-xl">
                      <span className="text-[7px] font-black uppercase text-brand-purple tracking-widest block mb-0.5">Rastreamento Live</span>
                      <p className="font-black text-[#0B1120] text-[10px] uppercase truncate">📍 {order.localizacao_atual}</p>
                    </div>
                  )}
                  {order.admin_feedback && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                      <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Nota Administrativa</span>
                      <p className="text-[9px] text-[#0B1120] italic font-medium">"{order.admin_feedback}"</p>
                    </div>
                  )}
                </div>

                {/* Confirm / Deny control tracking dashboard panel */}
                {editingOrderId === order.id ? (
                  <div className="border-t-2 border-slate-100 pt-5 space-y-4 bg-slate-50 p-5 rounded-2xl relative z-30">
                    <p className="text-[9px] font-black text-brand-purple uppercase tracking-widest">Painel Despachante & Comunicação</p>
                    
                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Estado Operativo</label>
                      <select 
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#0B1120]"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Processando">Processando</option>
                        <option value="Confirmado">Confirmado / Aprovado</option>
                        <option value="Em Trânsito">Em Trânsito / Expedido</option>
                        <option value="Entregue">Entregue</option>
                        <option value="Rejeitado">Rejeitado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Mensagem de Resposta (Feedback)</label>
                      <textarea
                        rows={2}
                        value={editFeedback}
                        onChange={(e) => setEditFeedback(e.target.value)}
                        placeholder="Ex: Recebemos o pagamento. Encomenda no camião..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-[#0B1120]"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Coordenadas & Nó da Localização</label>
                      <select 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'chimoio') {
                            setEditLocation('Sede Operacional de Chimoio');
                            setEditCoords({ lat: -19.12, lng: 33.48 });
                          } else if (val === 'maputo_porto') {
                            setEditLocation('Porto de Maputo - Desembarque aduaneiro');
                            setEditCoords({ lat: -25.97, lng: 32.58 });
                          } else if (val === 'inchope') {
                            setEditLocation('Estrada Nacional N6 - Trânsito no Posto de Inchope');
                            setEditCoords({ lat: -19.49, lng: 34.02 });
                          } else if (val === 'beira_porto') {
                            setEditLocation('Porto da Beira - Cargas Internacionais');
                            setEditCoords({ lat: -19.83, lng: 34.84 });
                          } else if (val === 'nampula') {
                            setEditLocation('Norte Nampula Hub - Distribuição Regional');
                            setEditCoords({ lat: -15.11, lng: 39.26 });
                          } else if (val === 'tete') {
                            setEditLocation('Tete Hub - Centro de Operação');
                            setEditCoords({ lat: -16.15, lng: 33.58 });
                          } else {
                            setEditLocation('');
                            setEditCoords(null);
                          }
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#0B1120] mb-2"
                      >
                        <option value="">Selecione um ponto estratégico...</option>
                        <option value="chimoio">Sede Chimoio (Chimoio Hub)</option>
                        <option value="maputo_porto">Porto de Maputo</option>
                        <option value="inchope">Inchope EN6/EN1</option>
                        <option value="beira_porto">Porto da Beira</option>
                        <option value="nampula">Nampula Hub</option>
                        <option value="tete">Tete Hub</option>
                      </select>
                      
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Ou escreva localização customizada..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#0B1120]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, editStatus, editFeedback, editLocation, editCoords)}
                        className="flex-1 py-2 bg-[#0B1120] text-brand-cyan hover:bg-emerald-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                      >
                        Submeter Mudança
                      </button>
                      <button
                        onClick={() => setEditingOrderId(null)}
                        className="py-2 px-3 bg-white text-slate-500 hover:text-red-500 rounded-lg text-[9px] font-black uppercase border border-slate-200"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-50 pt-4 flex gap-2 mt-auto relative z-20">
                    <button
                      onClick={() => {
                        setEditingOrderId(order.id);
                        setEditStatus(order.status || 'Pendente');
                        setEditFeedback(order.admin_feedback || '');
                        setEditLocation(order.localizacao_atual || '');
                        setEditCoords(order.localizacao_coordenadas || null);
                      }}
                      className="flex-1 py-3 bg-[#0B1120] text-white hover:bg-brand-purple rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                    >
                      Gerir Rastreamento & Status
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {encomendas.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[40px] border border-slate-100 font-sans">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                <FileText size={32} />
              </div>
              <p className="text-slate-300 font-black uppercase tracking-[0.5em] text-[10px] font-sans">Não há registo de encomendas no sistema</p>
            </div>
          )}
        </div>
      ) : (
          <div className="space-y-12 pb-20">
             {/* Key Metrics Bento */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="bg-[#0B1120] p-6 sm:p-10 lg:p-12 rounded-3xl sm:rounded-[40px] lg:rounded-[48px] text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-8 sm:mb-10">Valor Total em Stock</p>
                  <div className="text-3xl lg:text-4xl font-black mb-8 sm:mb-10 text-brand-cyan tracking-tighter">
                     {stats.totalValue.toLocaleString()} <span className="text-xs text-brand-cyan/40">MZN/MT</span>
                  </div>
                  <BarChart3 className="text-white/5 absolute bottom-8 right-8" size={80} />
               </div>
               
               <div className="bg-white p-6 sm:p-10 lg:p-12 rounded-3xl sm:rounded-[40px] lg:rounded-[48px] border border-slate-100 overflow-hidden relative group">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-8 sm:mb-10">Avisos de Stock Baixo</p>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-black mb-8 sm:mb-10 text-red-500 tracking-tighter">
                     {stats.lowStock} <span className="text-xs text-slate-200 uppercase tracking-widest ml-2">Itens</span>
                  </div>
                  <Package className="text-slate-50 absolute bottom-8 right-8" size={80} />
               </div>

               <div className="bg-white p-6 sm:p-10 lg:p-12 rounded-3xl sm:rounded-[40px] lg:rounded-[48px] border border-slate-100 overflow-hidden relative group">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-8 sm:mb-10">Total de Clientes Ativos</p>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-black mb-8 sm:mb-10 text-brand-purple tracking-tighter">
                     {stats.clients} <span className="text-xs text-slate-200 uppercase tracking-widest ml-2">Validados</span>
                  </div>
                  <Users className="text-slate-50 absolute bottom-8 right-8" size={80} />
               </div>
             </div>

             {/* Intelligence Mapping */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 sm:p-10 rounded-3xl sm:rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                   <div className="flex items-center justify-between mb-8 sm:mb-10">
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#0B1120]">Produtos por Categoria</h3>
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

                 <div className="bg-[#0B1120] p-6 sm:p-10 rounded-3xl sm:rounded-[40px] text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-brand-purple/5 rounded-full blur-[40px]"></div>
                   <div className="flex items-center justify-between mb-8 sm:mb-10">
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Quantidade Total de Itens</h3>
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

             <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 lg:p-16 border border-slate-100 flex flex-col md:flex-row items-center gap-12 relative group shadow-2xl shadow-[#0B1120]/5">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#0B1120] rounded-[30px] sm:rounded-[36px] flex items-center justify-center text-brand-cyan shrink-0 border-4 border-slate-50 group-hover:rotate-6 transition-transform">
                   <FileText size={44} className="sm:w-12 sm:h-12" />
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h3 className="text-2xl sm:text-3xl font-black text-[#0B1120] uppercase tracking-tighter mb-4">Exportar Relatório em PDF</h3>
                   <p className="text-xs sm:text-sm font-medium text-slate-400 leading-relaxed mb-6 sm:mb-8 max-w-2xl">O sistema reuniu todos os detalhes do stock e clientes. Pressione o botão abaixo para descarregar o relatório oficial em PDF pronto para ver ou imprimir.</p>
                   <button onClick={exportPDF} className="bg-[#0B1120] text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl sm:rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-brand-cyan hover:text-[#0B1120] transition-all flex items-center justify-center sm:justify-start gap-4 mx-auto md:mx-0 shadow-xl active:scale-95 shadow-[#0B1120]/20 w-full sm:w-auto">
                      <Download size={20} /> Descarregar Relatório Completo (PDF)
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
                <form id="productForm" onSubmit={handleSubmit} className="space-y-6 lg:space-y-10 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-12">
                    <div className="md:col-span-2">
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 lg:mb-4 ml-4">Designação Comercial do Equipamento</label>
                       <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Transformador..." className="w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-5 lg:py-6 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl lg:rounded-3xl text-sm sm:text-lg lg:text-2xl font-black uppercase tracking-tighter outline-none focus:border-brand-cyan focus:ring-8 focus:ring-brand-cyan/5 transition-all text-[#0B1120]" />
                    </div>
                    
                    <div>
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 lg:mb-4 ml-4">Sector Técnico</label>
                       <select value={categoria} onChange={e => setCategory(e.target.value as any)} className="w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-5 lg:py-6 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl lg:rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-brand-cyan text-[#0B1120]">
                         <option>Materiais</option>
                         <option>Peças</option>
                         <option>Serviços</option>
                         <option>Equipamentos</option>
                       </select>
                    </div>
                    
                    <div>
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 lg:mb-4 ml-4">Preço (MZN)</label>
                       <input type="number" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} required placeholder="0.00" className="w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-5 lg:py-6 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl lg:rounded-3xl text-sm sm:text-xl lg:text-2xl font-black tracking-tighter outline-none text-[#0B1120]" />
                    </div>
                    
                    <div>
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 lg:mb-4 ml-4">Stock</label>
                       <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} required placeholder="0" className="w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-5 lg:py-6 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl lg:rounded-3xl text-sm sm:text-xl lg:text-2xl font-black tracking-tighter outline-none text-[#0B1120]" />
                    </div>

                     <div className="md:col-span-2 flex flex-col gap-3 font-sans">
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Imagens do Ativo (Pode adicionar várias fotos!)</label>
                       
                       <input 
                         type="file" 
                         ref={fileInputRef} 
                         onChange={handleProductUpload}
                          multiple
                          accept="image/*"
                          className="hidden" />

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         {/* Upload Dropzone option */}
                         <div 
                           onClick={() => fileInputRef.current?.click()}
                           className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                             uploadProgress ? 'border-brand-cyan/40 bg-slate-50' : 'border-slate-200 hover:border-brand-cyan bg-slate-50/50 hover:bg-brand-cyan/5'
                           }`}
                         >
                           {uploadProgress ? (
                             <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
                           ) : (
                             <>
                               <Camera size={24} className="text-slate-400" />
                               <div className="text-center">
                                 <span className="block text-[10px] font-black uppercase tracking-widest text-[#0B1120]">Upload de Foto(s)</span>
                                 <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Selecione uma ou mais fotos para o carrossel</span>
                               </div>
                             </>
                           )}
                         </div>

                         {/* URL Input option as manual backup */}
                         <div className="flex flex-col justify-between bg-slate-50/50 border border-slate-100 p-6 rounded-2xl">
                           <div>
                             <span className="block text-[10px] font-black uppercase tracking-widest text-[#0B1120] mb-2">Ou adicione por link URL:</span>
                             <div className="flex gap-2">
                               <input 
                                 value={tempUrl} 
                                 onChange={e => setTempUrl(e.target.value)} 
                                 placeholder="https://exemplo.com/foto.jpg" 
                                 className="flex-1 px-4 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-[#0B1120] outline-none focus:border-brand-cyan" 
                               />
                               <button
                                 type="button"
                                 onClick={() => {
                                   if (tempUrl.trim()) {
                                     setFotoUrl(prev => {
                                       const existing = prev ? prev.split(',').map(s => s.trim()).filter(Boolean) : [];
                                       return [...existing, tempUrl.trim()].join(',');
                                     });
                                     setTempUrl('');
                                   }
                                 }}
                                 className="px-4 bg-[#0B1120] hover:bg-brand-cyan hover:text-[#0B1120] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                               >
                                 Adicionar
                               </button>
                             </div>
                           </div>
                           <p className="text-[9px] text-slate-400 font-medium opacity-80">Insira o link direto de uma imagem externa e clique em Adicionar.</p>
                         </div>
                       </div>

                       {/* Interactive Gallery visualizer */}
                       {fotoUrl ? (
                         <div className="mt-4 bg-slate-50 border border-slate-150 rounded-2xl p-6">
                           <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 font-sans">Galeria do Equipamento ({fotoUrl.split(',').filter(Boolean).length} fotos):</span>
                           
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                             {fotoUrl.split(',').map((url, idx) => {
                               const cleanUrl = url.trim();
                               if (!cleanUrl) return null;
                               const isMain = idx === 0;
                               return (
                                 <div key={idx} className="relative group aspect-square bg-white border border-slate-200 rounded-xl overflow-hidden p-1 shadow-sm flex flex-col justify-between">
                                   <div className="relative flex-1 rounded-sm overflow-hidden bg-slate-100">
                                     <img src={cleanUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                                     {isMain && (
                                       <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#4285F4] text-white text-[8px] font-bold uppercase tracking-wider rounded shadow">
                                         Principal
                                       </div>
                                     )}
                                   </div>
                                   <div className="mt-2 flex flex-col gap-1">
                                     {!isMain ? (
                                       <button
                                         type="button"
                                         onClick={() => {
                                           const arr = fotoUrl.split(',').map(s => s.trim()).filter(Boolean);
                                           const item = arr.splice(idx, 1)[0];
                                           arr.unshift(item);
                                           setFotoUrl(arr.join(','));
                                         }}
                                         title="Definir como Principal"
                                         className="w-full py-1 text-slate-500 bg-slate-100 hover:bg-brand-cyan hover:text-[#0B1120] rounded text-[8px] font-bold uppercase transition-colors text-center"
                                       >
                                         Principal
                                       </button>
                                     ) : (
                                       <div className="w-full py-1 text-emerald-600 rounded text-[8px] font-bold uppercase text-center bg-emerald-50 border border-emerald-100">
                                         Ativo
                                       </div>
                                     )}
                                     <button
                                       type="button"
                                       onClick={() => {
                                         const arr = fotoUrl.split(',').map(s => s.trim()).filter(Boolean);
                                         arr.splice(idx, 1);
                                         setFotoUrl(arr.join(','));
                                       }}
                                       title="Eliminar Foto"
                                       className="w-full py-1 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded text-[8px] font-bold uppercase tracking-wide transition-colors text-center"
                                     >
                                       Remover
                                     </button>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                           
                           <div className="mt-4 flex gap-2">
                             <button
                               type="button"
                               onClick={() => {
                                 if (confirm('Tem a certeza que deseja limpar todas as fotos?')) {
                                   setFotoUrl('');
                                 }
                               }}
                               className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors ml-auto"
                             >
                               Limpar Todas
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div className="mt-2 text-center py-6 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           Nenhuma foto associada a este ativo
                         </div>
                       )}
                    </div>

                    <div className="md:col-span-2">
                       <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 lg:mb-4 ml-4">Descrição Técnica</label>
                       <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} className="w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl text-xs font-medium outline-none resize-none text-[#0B1120]" />
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
