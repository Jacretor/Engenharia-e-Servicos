import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, Lock, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthPage = ({ type }: { type: 'login' | 'signup' }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'signup') {
        const { error: dbError } = await supabase
          .from('Clientes')
          .insert([{ 
            nome: nome, 
            email: email.toLowerCase(), 
            senha: password, // Usando campo senha na tabela local
            active: true,
            role: 'client'
          }]);
        
            if (dbError) {
              if (dbError.message.includes('rate limit')) {
                 throw new Error('Limite de segurança excedido no Supabase. Por favor, aguarde ou desative confirmação de e-mail.');
              }
              throw dbError;
            }
    
            alert('A sua conta foi criada com sucesso! Solicite ao administrador a ativação para aceder ao dashboard.');
            navigate('/login');
          } else {
            // Login Manual
            const normalizedEmail = email.toLowerCase();
            if (normalizedEmail === 'helenagarife@gmail.com' && password === 'admin123') {
               const adminUser = { 
                 id: 'admin-root', 
                 email: 'helenagarife@gmail.com', 
                 nome: 'Root Admin', 
                 role: 'admin',
                 active: true 
               };
               localStorage.setItem('es_user', JSON.stringify(adminUser));
               window.dispatchEvent(new Event('auth-change'));
               navigate('/admin');
               return;
            }
    
            const { data: userRecord, error: loginError } = await supabase
              .from('Clientes')
              .select('*')
              .eq('email', normalizedEmail)
              .eq('senha', password)
              .single();
    
            if (loginError || !userRecord) {
              throw new Error('Credenciais inválidas ou acesso não autorizado.');
            }
    
            if (!userRecord.active) {
              throw new Error('A sua conta ainda não foi validada pelo administrador Lavo João Mouzinho.');
            }
    
            localStorage.setItem('es_user', JSON.stringify(userRecord));
            window.dispatchEvent(new Event('auth-change'));
            navigate('/dashboard');
          }
    } catch (err: any) {
      setError(err.message || 'Falha crítica na autenticação de segurança.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white selection:bg-brand-cyan selection:text-[#0B1120]">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col items-center justify-center p-20 bg-[#0B1120] text-white relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80')] bg-cover opacity-20 mix-blend-overlay" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[160px] animate-pulse" />
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-center"
        >
          <div className="w-64 h-64 bg-white/5 rounded-[60px] flex items-center justify-center p-12 mb-16 border border-white/10 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <img src="/LogoTipo.png" className="w-full h-full object-contain relative z-10" alt="E&S Logo" onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ES&background=0B1120&color=00D2FF&bold=true&size=512';
             }} />
          </div>
          <h2 className="text-6xl font-black leading-tight tracking-tighter mb-6 uppercase">
            Engenharia <br />
            <span className="text-brand-cyan italic">&</span> Serviços
          </h2>
          <div className="w-20 h-1 bg-brand-cyan/50 mb-10 rounded-full" />
          <p className="text-sm text-slate-400 max-w-sm font-black uppercase tracking-[0.4em] leading-relaxed opacity-60">
            Soluções Industriais • Manica, MZ
          </p>
        </motion.div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-10 bg-slate-50 lg:bg-white">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-16 lg:hidden flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-[#0B1120] rounded-[24px] flex items-center justify-center p-3 mb-6">
               <img src="/LogoTipo.png" className="w-full h-full object-contain" alt="E&S Logo" onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ES&background=0B1120&color=00D2FF&bold=true';
               }} />
            </div>
            <h1 className="text-2xl font-black text-[#0B1120] uppercase tracking-tighter">Engenharia & Serviços</h1>
          </div>

          <div className="mb-12">
            <span className="text-brand-purple font-black uppercase tracking-[0.5em] text-[10px] mb-4 block">Portal Corporativo</span>
            <h3 className="text-5xl font-black mb-4 leading-none text-[#0B1120] tracking-tighter">
              {type === 'login' ? 'Login' : 'Registo'}
            </h3>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">
              {type === 'login' ? 'Aceda à sua infraestrutura de gestão.' : 'Inicie o seu acesso ao ecossistema industrial.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-4">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                {error}
              </div>
            )}

            {type === 'signup' && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Identificação / Empresa</label>
                <div className="relative group">
                  <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors" size={20} />
                  <input 
                    type="text" required value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Seu nome ou Razão Social"
                    className="w-full pl-16 pr-8 py-6 bg-slate-50 lg:bg-white border border-slate-100 rounded-3xl outline-none focus:border-brand-purple font-bold text-sm transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">E-mail de Operação</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors" size={20} />
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@dominio.com"
                  className="w-full pl-16 pr-8 py-6 bg-slate-50 lg:bg-white border border-slate-100 rounded-3xl outline-none focus:border-brand-purple font-bold text-sm transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Chave de Segurança</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors" size={20} />
                <input 
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-16 pr-8 py-6 bg-slate-50 lg:bg-white border border-slate-100 rounded-3xl outline-none focus:border-brand-purple font-bold text-sm transition-all shadow-sm"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-[#0B1120] text-white py-7 rounded-3xl font-black uppercase tracking-widest text-[10px] mt-8 hover:bg-brand-purple transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck size={20} />
              {loading ? 'Validando...' : (type === 'login' ? 'Autenticar' : 'Solicitar Registo')}
            </button>
          </form>

          <p className="mt-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
            {type === 'login' ? (
              <>Sem acesso? <Link to="/cadastro" className="text-brand-cyan hover:underline underline-offset-8">Solicitar Registo</Link></>
            ) : (
              <>Com protocolo? <Link to="/login" className="text-brand-cyan hover:underline underline-offset-8">Voltar ao Login</Link></>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
};
