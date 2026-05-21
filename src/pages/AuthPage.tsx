import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, Lock, User as UserIcon, Eye, EyeOff, Check, X, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthPage = ({ type }: { type: 'login' | 'signup' }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle show/hide password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password criteria helper
  const hasMinLen = password.length >= 8;
  const hasNumOrSym = /[0-9!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/~`-]/.test(password);
  const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);

  const generateStrongPassword = () => {
    const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowers = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=";
    
    // Ensure we have at least one of each to start
    let pass = "";
    pass += uppers[Math.floor(Math.random() * uppers.length)];
    pass += lowers[Math.floor(Math.random() * lowers.length)];
    pass += numbers[Math.floor(Math.random() * numbers.length)];
    pass += symbols[Math.floor(Math.random() * symbols.length)];

    const allChars = uppers + lowers + numbers + symbols;
    for (let i = 0; i < 8; i++) {
      pass += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle
    const shuffled = pass.split('').sort(() => 0.5 - Math.random()).join('');
    
    setPassword(shuffled);
    setConfirmPassword(shuffled);
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation for registration
    if (type === 'signup') {
      if (!hasMinLen) {
        setError('A senha deve ter no mínimo 8 caracteres.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem. Digite a mesma senha no campo de confirmação.');
        setLoading(false);
        return;
      }
    }

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
      <div className="flex items-center justify-center p-6 sm:p-10 md:p-16 bg-slate-55 lg:bg-white overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md my-auto"
        >
          <div className="mb-10 lg:hidden flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0B1120] rounded-[24px] flex items-center justify-center p-3 mb-4">
               <img src="/LogoTipo.png" className="w-full h-full object-contain" alt="E&S Logo" onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ES&background=0B1120&color=00D2FF&bold=true';
               }} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0B1120] uppercase tracking-tighter">Engenharia & Serviços</h1>
          </div>

          <div className="mb-8">
            <span className="text-brand-purple font-black uppercase tracking-[0.5em] text-[10px] mb-2 sm:mb-3 block">Portal Corporativo</span>
            <h3 className="text-4xl sm:text-5xl font-black mb-3 leading-none text-[#0B1120] tracking-tighter">
              {type === 'login' ? 'Login' : 'Registo'}
            </h3>
            <p className="text-slate-400 font-medium text-xs sm:text-sm leading-relaxed">
              {type === 'login' ? 'Aceda à sua infraestrutura de gestão.' : 'Crie a sua conta de acesso ao ecossistema industrial.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-5 sm:p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-4 animate-shake">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse flex-shrink-0" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {type === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Identificação / Empresa</label>
                <div className="relative group">
                  <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors" size={20} />
                  <input 
                    type="text" required value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Seu nome ou Razão Social"
                    className="w-full pl-16 pr-6 py-4 sm:py-5 bg-slate-100 lg:bg-slate-50 border border-transparent focus:border-brand-purple focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">E-mail de Operação</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors" size={20} />
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@dominio.com"
                  className="w-full pl-16 pr-6 py-4 sm:py-5 bg-slate-100 lg:bg-slate-50 border border-transparent focus:border-brand-purple focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Chave de Segurança</label>
                {type === 'signup' && (
                  <button 
                    type="button" 
                    onClick={generateStrongPassword}
                    className="text-[9px] font-black text-brand-purple uppercase tracking-wider flex items-center gap-1 hover:text-brand-cyan transition-colors"
                    title="Gera uma senha forte segura automaticamente"
                  >
                    <Sparkles size={12} /> Sugerir Senha Forte
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-16 pr-14 py-4 sm:py-5 bg-slate-100 lg:bg-slate-50 border border-transparent focus:border-brand-purple focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title={showPassword ? "Ocultar senha" : "Visualizar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {type === 'signup' && (
              <>
                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Confirmar Chave de Segurança</label>
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors" size={20} />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      required 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-16 pr-14 py-4 sm:py-5 bg-slate-100 lg:bg-slate-50 border border-transparent focus:border-brand-purple focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      title={showConfirmPassword ? "Ocultar senha" : "Visualizar senha"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="bg-slate-100 p-4 rounded-2xl space-y-2 ml-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Requisitos da Senha:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      {hasMinLen ? (
                        <Check size={14} className="text-emerald-500 stroke-2" />
                      ) : (
                        <X size={14} className="text-slate-300" />
                      )}
                      <span className={hasMinLen ? "text-emerald-600 font-bold" : "text-slate-500"}>Mínimo 8 caracteres</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {hasNumOrSym ? (
                        <Check size={14} className="text-emerald-500 stroke-2" />
                      ) : (
                        <X size={14} className="text-slate-300" />
                      )}
                      <span className={hasNumOrSym ? "text-emerald-600 font-bold" : "text-slate-500"}>Número ou Símbolo</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:col-span-2">
                      {hasUpperLower ? (
                        <Check size={14} className="text-emerald-500 stroke-2" />
                      ) : (
                        <X size={14} className="text-slate-300" />
                      )}
                      <span className={hasUpperLower ? "text-emerald-600 font-bold" : "text-slate-500"}>Letras Maiúsculas e Minúsculas</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-[#0B1120] text-white py-5 sm:py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] mt-6 hover:bg-brand-purple transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck size={20} />
              {loading ? 'Validando...' : (type === 'login' ? 'Autenticar' : 'Criar Conta')}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
            {type === 'login' ? (
              <>Sem conta? <Link to="/cadastro" className="text-brand-cyan hover:underline underline-offset-8 font-black">Criar Conta</Link></>
            ) : (
              <>Já tem conta? <Link to="/login" className="text-brand-cyan hover:underline underline-offset-8 font-black">Voltar ao Login</Link></>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
};
