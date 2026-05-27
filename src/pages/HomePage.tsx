import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, ShieldCheck, Wrench, Cpu, Plus, Zap, Search } from 'lucide-react';
import { Produto, Category } from '../types';
import { useNavigate, Link } from 'react-router-dom';

export const HomePage = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos');
  const navigate = useNavigate();

  // Sliding beautiful background images carousel
  const backgroundImages = [
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=80", // Industrial Precision
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80", // Factory Machine Welding Sparks
    "https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?auto=format&fit=crop&w=1600&q=80", // Precision Machining tool
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80"  // Industrial electrical infrastructure
  ];
  const [currentBgIdx, setCurrentBgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIdx((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle hash scroll on mount
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, []);

  useEffect(() => {
    fetch('/api/produtos')
      .then(r => r.json())
      .then(d => setProdutos(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories: (Category | 'Todos')[] = ['Todos', 'Materiais', 'Peças', 'Serviços', 'Equipamentos'];

  const filteredItems = activeCategory === 'Todos' 
    ? produtos 
    : produtos.filter(p => p.categoria === activeCategory);

  const [serviceSearch, setServiceSearch] = useState('');

  const services = [
    { name: 'Engenharia Elétrica', desc: 'Sistemas de alta potência, quadros industriais e automação.', icon: Zap },
    { name: 'Manutenção Mecânica', desc: 'Bombas, geradores, motobombas e linhas de montagem.', icon: Wrench },
    { name: 'Logística de Peças', desc: 'Importação e distribuição estratégica de ativos críticos.', icon: Package },
    { name: 'Hardware Avançado', desc: 'Instalação e configuração de infraestruturas de computação.', icon: Cpu }
  ].filter(s => 
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || 
    s.desc.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  return (
    <div className="bg-[#f9fafb] selection:bg-brand-cyan selection:text-[#0B1120]">
      {/* Hero Section - High Tech Reveal */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-[#0B1120]">
        {/* Abstract Tech Grid Background */}
        <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        {/* Sliding background container */}
        <div className="absolute top-0 right-0 w-full lg:w-3/4 h-full overflow-hidden opacity-30 lg:opacity-60 transition-all duration-1000">
           <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120] via-transparent to-transparent z-10" />
           {backgroundImages.map((img, idx) => (
             <img 
               key={img}
               src={img} 
               className={`absolute inset-0 w-full h-full object-cover scale-110 blur-[1px] transition-opacity duration-[1500ms] ${
                 idx === currentBgIdx ? 'opacity-100 z-0' : 'opacity-0 -z-10'
               }`} 
               alt={`Engineering background slide ${idx + 1}`}
             />
           ))}
           <div className="absolute inset-0 bg-[#0B1120]/40 mix-blend-multiply" />
        </div>

        {/* Floating Gradient Orbs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-brand-cyan/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-brand-purple/10 rounded-full blur-[150px]" />

        <div className="container max-w-7xl mx-auto px-6 relative z-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-4 mb-10">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: 40 }}
                 transition={{ delay: 0.5, duration: 0.8 }}
                 className="h-[2px] bg-brand-cyan" 
               />
               <span className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-cyan">Sede Operacional: Manica, Moçambique</span>
            </div>
            
            <h1 className="text-[clamp(3rem,10vw,8rem)] font-black leading-[0.85] tracking-tighter text-white mb-12">
              PRECISÃO <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-cyan bg-[length:200%_auto] animate-gradient-x italic font-medium">INDUSTRIAL</span>.
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 max-w-2xl font-medium leading-relaxed mb-16 tracking-tight">
              A <span className="text-white">Engenharia & Serviços SU, LDA</span> liderada por Lavo João Mouzinho, redefine a infraestrutura industrial com tecnologia de vanguarda e logística de elite.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 items-center w-full sm:w-auto">
              <button 
                onClick={() => navigate('/cadastro')}
                className="w-full sm:w-auto px-10 py-5 sm:py-6 bg-brand-cyan text-[#0B1120] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_40px_rgba(0,210,255,0.3)] active:scale-95 text-center"
              >
                Criar Conta
              </button>
              <button 
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-10 py-5 sm:py-6 bg-white/5 text-white border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-md active:scale-95 text-center"
              >
                Serviços Técnicos
              </button>
            </div>

            <div className="mt-24 grid grid-cols-2 md:grid-cols-3 gap-12 pt-12 border-t border-white/5">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Technical Lead</p>
                  <p className="text-sm font-black text-white/80">Lavo João Mouzinho</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Jurisdição</p>
                  <p className="text-sm font-black text-white/80">Chimoio, Província de Manica</p>
               </div>
               <div className="hidden md:block">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tax ID (NUIT)</p>
                  <p className="text-sm font-black text-white/80">402153571</p>
               </div>
            </div>
          </motion.div>
        </div>
        
        {/* Animated Background Line */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent" />
      </section>

      {/* Industrial Advantage Grid */}
      <section className="py-32 bg-white relative">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
             <div className="p-12 bg-white rounded-[40px] border border-slate-200 hover:border-brand-cyan/20 transition-all duration-500 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 rounded-full -translate-x-12 -translate-y-12 transition-transform group-hover:scale-150" />
                <ShieldCheck className="mb-8 text-brand-cyan" size={40} />
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-[#0B1120]">Protocolos de Elite</h3>
                <p className="text-sm text-slate-700 font-bold leading-relaxed">Materiais certificados sob os mais rigorosos testes de qualidade industrial em Moçambique.</p>
             </div>
             <div className="p-12 bg-[#0B1120] rounded-[40px] border border-white/5 transition-all duration-500 group relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/10 rounded-full -translate-x-12 -translate-y-12" />
                <Cpu className="mb-8 text-brand-purple" size={40} />
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-white">Ecossistema TI</h3>
                <p className="text-sm text-slate-200 font-bold leading-relaxed">Integração digital imediata via WhatsApp Direct para gestão de ativos e suporte remoto.</p>
             </div>
             <div className="p-12 bg-white rounded-[40px] border border-slate-200 hover:border-brand-purple/20 transition-all duration-500 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/5 rounded-full -translate-x-12 -translate-y-12 transition-transform group-hover:scale-150" />
                <Wrench className="mb-8 text-brand-purple" size={40} />
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-[#0B1120]">Expertise Técnica</h3>
                <p className="text-sm text-slate-700 font-bold leading-relaxed">Assistência especializada de Lavo João Mouzinho em sistemas mecânicos e alta potência elétrica.</p>
             </div>
          </div>
        </div>
      </section>

      {/* Services Hub - Search Integrated */}
      <section id="services" className="py-32 bg-slate-50 relative overflow-hidden">
        <div className="container max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-20">
            <div className="max-w-2xl">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-purple mb-6 block">Operações de Engenharia</span>
              <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-[#0B1120] leading-none">
                Hub de <br /><span className="text-brand-purple italic font-medium">Serviços</span>.
              </h2>
            </div>
            <div className="relative w-full lg:w-[450px]">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="text" 
                placeholder="Pesquisar especialidade técnica..."
                className="w-full bg-white border border-slate-200 rounded-[28px] py-6 pl-16 pr-8 text-sm focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/5 transition-all outline-none shadow-sm"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, idx) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-10 rounded-[40px] bg-white border border-slate-100 hover:border-brand-purple/30 group transition-all duration-700 hover:shadow-[0_20px_50px_rgba(112,72,232,0.08)]"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 font-bold mb-8 group-hover:bg-brand-purple group-hover:text-white transition-all duration-500">
                  <s.icon size={28} />
                </div>
                <h3 className="text-xl font-black text-[#0B1120] uppercase tracking-tighter mb-4">{s.name}</h3>
                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-10">{s.desc}</p>
                <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#0B1120] group-hover:text-brand-purple transition-all">
                  Consultar Protocolo <Plus size={14} />
                </button>
              </motion.div>
            ))}
          </div>

          {services.length === 0 && (
            <div className="py-32 text-center bg-white border-2 border-dashed border-slate-200 rounded-[50px]">
              <div className="mb-6 flex justify-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-500">
                   <Search size={32} />
                 </div>
              </div>
              <p className="text-xs font-black text-slate-700 uppercase tracking-[0.3em]">Nenhum serviço mapeado para "{serviceSearch}"</p>
            </div>
          )}
        </div>
      </section>

      {/* Industrial Catalog */}
      <section id="catalog" className="py-40 bg-white">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-24">
             <div className="max-w-2xl">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-purple mb-6 block">Supply Chain</span>
                <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-[#0B1120] mb-6 leading-[0.9]">Inventário <span className="text-slate-500 font-bold">&</span> Stock.</h2>
             </div>
             <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-[28px]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-8 py-4 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeCategory === cat 
                      ? 'bg-brand-cyan text-[#0B1120] shadow-xl shadow-brand-cyan/20' 
                      : 'text-slate-600 font-bold hover:text-[#0B1120]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
             </div>
          </div>

          {loading ? (
            <div className="py-40 flex flex-col items-center gap-8">
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                 <div className="absolute inset-0 bg-brand-cyan animate-slide" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.6em] text-slate-300">Sincronizando Base de Dados...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredItems.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group"
                >
                  <div className="relative aspect-[4/5] bg-slate-50 rounded-[48px] overflow-hidden mb-8 border border-slate-100 group-hover:border-brand-cyan/30 transition-all duration-700 hover:shadow-2xl hover:shadow-brand-cyan/5">
                    {p.foto_url ? (
                      <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <Package size={100} strokeWidth={0.5} />
                      </div>
                    )}
                    <div className="absolute top-8 left-8">
                       <span className="px-5 py-2.5 bg-white/90 backdrop-blur rounded-full text-[9px] font-black uppercase tracking-widest text-[#0B1120] shadow-sm">
                         {p.categoria}
                       </span>
                    </div>
                  </div>
                  
                  <div className="px-4">
                    <h3 className="text-xl font-black text-[#0B1120] tracking-tighter mb-2 group-hover:text-brand-purple transition-colors">{p.nome}</h3>
                    <div className="flex items-center justify-between">
                       <p className="text-lg font-black text-[#0B1120]">
                         {p.preco.toLocaleString()} <span className="text-[10px] text-slate-600 font-black ml-1">Kz/MT</span>
                       </p>
                       <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.quantidade > 5 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                             {p.quantidade > 0 ? `${p.quantidade} un` : 'Esgotado'}
                          </span>
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CEO Message Section - Immersive */}
      <section className="py-40 bg-[#0B1120] text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] translate-x-1/2 -translate-y-1/2" />
         <div className="container max-w-7xl mx-auto px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-14 border border-white/10 group overflow-hidden">
                 <div className="w-16 h-16 bg-[#0B1120] rounded-2xl flex items-center justify-center p-2">
                    <img src="/LogoTipo.png" className="w-full h-full object-contain opacity-50 group-hover:opacity-100 transition-opacity" alt="Logo" onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ES&background=0B1120&color=00D2FF&bold=true';
                    }} />
                 </div>
              </div>
              <blockquote className="text-[clamp(1.8rem,5vw,3.5rem)] font-black leading-[1.1] tracking-tighter max-w-5xl mx-auto mb-16 italic text-white/90">
                “Nossa missão é robustecer a produção local em Chimoio com tecnologia de ponta e suporte incondicional. Engenharia não é apenas sobre máquinas, é sobre <span className="text-brand-cyan">integridade operativa</span>.”
              </blockquote>
              <div className="inline-flex flex-col items-center">
                 <p className="text-base font-black uppercase tracking-[0.4em] text-brand-cyan mb-2">Lavo João Mouzinho</p>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fundador & CEO Técnicos</p>
              </div>
            </motion.div>
         </div>
         {/* Bottom Fade */}
         <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* Global Footer */}
      <footer className="py-32 bg-white border-t border-slate-100">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row justify-between gap-24">
             <div className="max-w-md">
                <div className="flex items-center gap-4 mb-10">
                   <div className="w-14 h-14 bg-[#0B1120] rounded-2xl flex items-center justify-center p-2">
                      <img src="/LogoTipo.png" className="w-full h-full object-contain" alt="Logo" onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ES&background=0B1120&color=00D2FF&bold=true';
                      }} />
                   </div>
                   <div>
                      <h4 className="text-2xl font-black text-[#0B1120] uppercase tracking-tighter leading-none">
                        Engenharia & Serviços
                      </h4>
                      <p className="text-[10px] font-black text-brand-purple uppercase tracking-[0.5em] mt-1">SU, LDA • Manica</p>
                   </div>
                </div>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-10 italic">
                   Excelência técnica em sistemas críticos. Pioneiros em Chimoio, Moçambique. Infraestruturas blindadas, performance garantida.
                </p>
                <div className="flex gap-4">
                   <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="px-6 py-3 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0B1120] hover:bg-[#0B1120] hover:text-white transition-all cursor-pointer">
                      LinkedIn
                   </a>
                   <a href="https://wa.me/258844821126" target="_blank" rel="noopener noreferrer" className="px-6 py-3 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0B1120] hover:bg-[#0B1120] hover:text-white transition-all cursor-pointer">
                      WhatsApp
                   </a>
                   <a href="mailto:admin@engservicos.co.mz" className="px-6 py-3 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0B1120] hover:bg-[#0B1120] hover:text-white transition-all cursor-pointer">
                      Email
                   </a>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-2 gap-20">
                <div>
                   <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mb-10">Navegação</h5>
                   <ul className="space-y-6">
                      <li><a href="#catalog" className="text-xs font-black uppercase tracking-widest text-[#0B1120] hover:text-brand-purple transition-colors">Produtos</a></li>
                      <li><a href="#services" className="text-xs font-black uppercase tracking-widest text-[#0B1120] hover:text-brand-purple transition-colors">Serviços Técnicos</a></li>
                      <li><Link to="/login" className="text-xs font-black uppercase tracking-widest bg-[#0B1120] hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg transition-all">Painel Privado</Link></li>
                   </ul>
                </div>
                <div>
                   <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mb-10">Contactos Oficiais</h5>
                   <ul className="space-y-6">
                      <li className="text-xs font-black uppercase tracking-widest text-[#0B1120]">+258 844 821 126</li>
                      <li className="text-xs font-black uppercase tracking-widest text-[#0B1120]">admin@engservicos.co.mz</li>
                      <li className="text-xs font-black uppercase tracking-widest text-[#0B1120]">Chimoio, Moçambique</li>
                   </ul>
                </div>
             </div>
          </div>
          
          <div className="mt-32 pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-10">
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">© 2020-2026 E&S Engenharia & Serviços SU, LDA. Registro Moçambique.</p>
             <div className="flex gap-10">
                <span 
                  onClick={() => setShowTerms(true)} 
                  className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-[#0B1120] hover:underline cursor-pointer transition-colors duration-300"
                >
                  Termos de Operação
                </span>
                <span className="text-[10px] font-black text-brand-purple uppercase tracking-[0.4em]">NUIT: 402153571</span>
             </div>
          </div>
        </div>
      </footer>

      {/* Terms of Operation Modal */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTerms(false)}
              className="absolute inset-0 bg-[#0B1120]/80 backdrop-blur-sm"
            />
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] z-10"
            >
              {/* Top Banner Accent */}
              <div className="h-2 bg-gradient-to-r from-brand-cyan to-brand-purple w-full" />
              
              <div className="p-8 sm:p-10 flex-1 overflow-y-auto font-sans">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black text-brand-purple uppercase tracking-[0.3em] block mb-1">E&S Engenharia & Serviços</span>
                    <h3 className="text-3xl font-black text-[#0B1120] tracking-tighter uppercase leading-none">Termos de Operação</h3>
                  </div>
                  <button 
                    onClick={() => setShowTerms(false)}
                    className="p-2 hover:bg-slate-50 rounded-full transition-colors font-black text-slate-400 hover:text-slate-900"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                  <p className="font-semibold text-slate-800">
                    Bem-vindo aos Termos de Operação da E&S Engenharia & Serviços SU, LDA. Estes termos regem a nossa mecânica comercial, fornecimento de materiais e serviços industriais em todo o território nacional de Moçambique.
                  </p>
                  
                  <div className="border-l-2 border-brand-cyan pl-4 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">1. Objecto e Âmbito</h4>
                    <p>
                      Comercialização, fornecimento prático e distribuição de materiais elétricos de alta e média tensão (XLPE), transformadores trifásicos de distribuição, motores industriais do fabricante Siemens e serviços oficiais de engenharia de infraestruturas.
                    </p>
                  </div>

                  <div className="border-l-2 border-brand-cyan pl-4 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">2. Protocolo de Requisição de Stock</h4>
                    <p>
                      Todas as mercadorias adicionadas ao protocolo de carrinho constituem solicitações de cotação corporativa formais. As faturas proforma emitidas pelo Lavo João Mouzinho estão asseguradas legalmente sob o NUIT organizacional 402153571.
                    </p>
                  </div>

                  <div className="border-l-2 border-brand-cyan pl-4 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">3. Logística e Rastreamento Nacional</h4>
                    <p>
                      O cliente pode optar por Levantamento Prático nos armazéns oficiais (Manica/Chimoio) ou entrega rodoviária via transportadoras parceiras na EN6 ou EN1. O trânsito de transformadores e grandes ativos de infraestrutura é rastreável em tempo real no nosso mapa integrado de rotas.
                    </p>
                  </div>

                  <div className="border-l-2 border-brand-cyan pl-4 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">4. Garantias Tecnológicas</h4>
                    <p>
                      Todos os transformadores e motores faturados gozam de garantia de fabricante estendida para 12 meses a contar do ato de entrega certificado, desde que instalados e parametrizados por técnicos qualificados homologados de acordo com os regulamentos de segurança locais.
                    </p>
                  </div>

                  <div className="border-l-2 border-brand-cyan pl-4 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">5. Condições Legais e de Pagamento</h4>
                    <p>
                      Sujeito a regulamentações de comércio da República de Moçambique, os pagamentos são liquidados por canal bancário (M-Pesa corporativo ou transferência bancária registada) antes do desalfandegamento ou carregamento dos materiais nas instalações da E&S.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowTerms(false)}
                  className="px-6 py-3 bg-[#0B1120] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  Confirmar e Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
