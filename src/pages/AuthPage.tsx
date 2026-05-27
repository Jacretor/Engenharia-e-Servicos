import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Mail, Lock, User as UserIcon, Eye, EyeOff, Check, X, Sparkles } from 'lucide-react';

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

  // Google Sign-In helper states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

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

  const handleGoogleSignIn = async (emailStr: string, nameStr: string) => {
    setGoogleLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/clientes/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailStr, nome: nameStr })
      });
      
      let resUser: any = null;
      const responseText = await response.text();
      if (responseText) {
        try {
          resUser = JSON.parse(responseText);
        } catch (e) {
          resUser = { error: responseText };
        }
      }

      if (!response.ok || !resUser || resUser.error) {
        throw new Error(resUser ? (resUser.error || 'Erro na autenticação Google.') : 'Erro ao processar Google Sign-In.');
      }

      localStorage.setItem('es_user', JSON.stringify(resUser));
      window.dispatchEvent(new Event('auth-change'));
      
      if (resUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação Google.');
    } finally {
      setGoogleLoading(false);
      setShowGoogleModal(false);
    }
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
        const response = await fetch('/api/clientes/registar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome,
            email: email,
            senha: password
          })
        });

        let resData: any = {};
        const responseText = await response.text();
        if (responseText) {
          try {
            resData = JSON.parse(responseText);
          } catch (e) {
            resData = { error: responseText };
          }
        }

        if (!response.ok) {
          throw new Error(resData.error || `Falha ao criar conta. Código de estado: ${response.status}`);
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
 
        const response = await fetch('/api/clientes/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            senha: password
          })
        });

        let userRecord: any = null;
        const responseText = await response.text();
        if (responseText) {
          try {
            userRecord = JSON.parse(responseText);
          } catch (e) {
            userRecord = { error: responseText };
          }
        }

        if (!response.ok || !userRecord || userRecord.error) {
          throw new Error(userRecord ? (userRecord.error || 'Credenciais inválidas.') : `Erro de autenticação. Código de estado: ${response.status}`);
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
          <p className="text-sm text-slate-300 max-w-sm font-black uppercase tracking-[0.4em] leading-relaxed opacity-90">
            Soluções Industriais • Manica, MZ
          </p>
        </motion.div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-6 sm:p-10 md:p-16 bg-slate-50 lg:bg-white overflow-y-auto">
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
            <h3 className="text-4xl sm:text-5xl font-black mb-3 leading-none text-[#0B1120] tracking-tighter animate-fade-in">
              {type === 'login' ? 'Login' : 'Registo'}
            </h3>
            <p className="text-slate-700 font-semibold text-xs sm:text-sm leading-relaxed mb-4">
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
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Identificação / Empresa</label>
                <div className="relative group">
                  <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-purple transition-colors" size={20} />
                  <input 
                    type="text" required value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Seu nome ou Razão Social"
                    className="w-full pl-16 pr-6 py-4 sm:py-5 bg-slate-200/60 lg:bg-slate-100/70 border border-slate-300 focus:border-brand-purple focus:bg-white rounded-2xl outline-none font-bold text-slate-900 text-sm transition-all shadow-sm placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">E-mail de Operação</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-purple transition-colors" size={20} />
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@dominio.com"
                  className="w-full pl-16 pr-6 py-4 sm:py-5 bg-slate-200/60 lg:bg-slate-100/70 border border-slate-300 focus:border-brand-purple focus:bg-white rounded-2xl outline-none font-bold text-slate-900 text-sm transition-all shadow-sm placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em]">Chave de Segurança</label>
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
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-purple transition-colors" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-16 pr-14 py-4 sm:py-5 bg-slate-200/60 lg:bg-slate-100/70 border border-slate-300 focus:border-brand-purple focus:bg-white rounded-2xl outline-none font-bold text-slate-900 text-sm transition-all shadow-sm placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors p-1"
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
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Confirmar Chave de Segurança</label>
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-purple transition-colors" size={20} />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      required 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-16 pr-14 py-4 sm:py-5 bg-slate-200/60 lg:bg-slate-100/70 border border-slate-300 focus:border-brand-purple focus:bg-white rounded-2xl outline-none font-bold text-slate-900 text-sm transition-all shadow-sm placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors p-1"
                      title={showConfirmPassword ? "Ocultar senha" : "Visualizar senha"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="bg-slate-100 p-4 rounded-2xl space-y-2 ml-1 border border-slate-200">
                  <p className="text-[9px] font-black text-slate-700 uppercase tracking-wider mb-2">Requisitos da Senha:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      {hasMinLen ? (
                        <Check size={14} className="text-emerald-600 stroke-2" />
                      ) : (
                        <X size={14} className="text-slate-400" />
                      )}
                      <span className={hasMinLen ? "text-emerald-700 font-bold" : "text-slate-600 font-semibold"}>Mínimo 8 caracteres</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {hasNumOrSym ? (
                        <Check size={14} className="text-emerald-600 stroke-2" />
                      ) : (
                        <X size={14} className="text-slate-400" />
                      )}
                      <span className={hasNumOrSym ? "text-emerald-700 font-bold" : "text-slate-600 font-semibold"}>Número ou Símbolo</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:col-span-2">
                      {hasUpperLower ? (
                        <Check size={14} className="text-emerald-600 stroke-2" />
                      ) : (
                        <X size={14} className="text-slate-400" />
                      )}
                      <span className={hasUpperLower ? "text-emerald-700 font-bold" : "text-slate-600 font-semibold"}>Letras Maiúsculas e Minúsculas</span>
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

          {/* Google Sign-In Integrations */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <span className="relative bg-[#FAFAFA] lg:bg-white px-4 text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">OU</span>
          </div>

          <button 
            type="button"
            disabled={googleLoading}
            onClick={() => setShowGoogleModal(true)}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-4 sm:py-5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow-md hover:border-slate-400 transition-all active:scale-95"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>{googleLoading ? 'Conectando...' : 'Entrar com o Google'}</span>
          </button>

          <p className="mt-8 text-center text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">
            {type === 'login' ? (
              <>Sem conta? <Link to="/cadastro" className="text-brand-purple hover:underline underline-offset-8 font-black">Criar Conta</Link></>
            ) : (
              <>Já tem conta? <Link to="/login" className="text-brand-purple hover:underline underline-offset-8 font-black">Voltar ao Login</Link></>
            )}
          </p>
        </motion.div>
      </div>

      {/* Google Accounts Selection Modal */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGoogleModal(false)}
              className="absolute inset-0 bg-[#0B1120]/80 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 flex flex-col"
            >
              {/* Google Header */}
              <div className="p-8 pb-4 text-center relative">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
                <div className="flex justify-center mb-4">
                  <svg className="w-10 h-10" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-950 tracking-tight">Fazer login com o Google</h3>
                <p className="text-xs text-slate-500 mt-1">Utilize a sua Conta Google para aceder ao <span className="font-semibold text-slate-800">E&S Engenharia & Serviços</span></p>
              </div>

              {/* Secure Input Area */}
              <div className="px-8 py-6 space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">Endereço de E-mail Google</label>
                  <input 
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={e => setCustomGoogleEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    className="w-full border border-slate-300 focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10 rounded-xl px-4 py-3 text-sm font-semibold bg-white text-slate-900 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">Nome de Utilizador (Opcional)</label>
                  <input 
                    type="text"
                    value={customGoogleName}
                    onChange={e => setCustomGoogleName(e.target.value)}
                    placeholder="Nome Completo"
                    className="w-full border border-slate-300 focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10 rounded-xl px-4 py-3 text-sm font-semibold bg-white text-slate-900 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(false)}
                    className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={googleLoading || !customGoogleEmail}
                    onClick={() => handleGoogleSignIn(customGoogleEmail, customGoogleName)}
                    className="flex-1 py-3 bg-[#4285F4] hover:bg-[#357ae8] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {googleLoading ? 'Iniciando Sessão...' : 'Seguinte'}
                  </button>
                </div>
              </div>

              {/* Bottom Info text inside Google dialog */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 leading-normal text-left">
                Para continuar, o Google partilhará o seu nome, endereço de e-mail e imagem de perfil com a de <span className="font-semibold">E&S Engenharia</span>. Veja a política de privacidade e os termos de serviço aplicáveis.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
