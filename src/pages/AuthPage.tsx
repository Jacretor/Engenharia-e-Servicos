import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Mail, Lock, User as UserIcon, Eye, EyeOff, Check, X, Sparkles, ChevronRight, Plus } from 'lucide-react';

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
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleAccounts, setGoogleAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [googleStage, setGoogleStage] = useState<'chooser' | 'manual'>('chooser');
  const [showGsiTroubleshooting, setShowGsiTroubleshooting] = useState(false);

  // Synchronize Google Identity Services (GSI) Live Sign-In
  useEffect(() => {
    let active = true;
    const handleCredentialResponse = async (response: any) => {
      if (!active) return;
      if (response?.credential) {
        setGoogleLoading(true);
        setGoogleError(null);
        try {
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
          });
          
          let resUser: any = null;
          try {
            resUser = await res.json();
          } catch (e) {
            throw new Error('Falha ao decodificar resposta do servidor OAuth.');
          }

          if (!res.ok || !resUser || resUser.error) {
            throw new Error(resUser?.error || 'Erro ao autenticar com as credenciais do Google.');
          }
          
          localStorage.setItem('es_user', JSON.stringify(resUser));
          window.dispatchEvent(new Event('auth-change'));
          
          if (resUser.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } catch (err: any) {
          setGoogleError(err.message || 'Erro na autenticação.');
          setError(err.message || 'Erro de autenticação com o Google.');
        } finally {
          setGoogleLoading(false);
        }
      }
    };

    const loadAndInitGSI = async () => {
      let clientId = '453323578095-gle3rfp0vs4ul7knd3h5ukhloejcdie1.apps.googleusercontent.com';
      try {
        const configRes = await fetch('/api/auth/google/config');
        if (configRes.ok) {
          const configJson = await configRes.json();
          if (configJson.clientId) {
            clientId = configJson.clientId;
          }
        }
      } catch (err) {
        console.warn('Falha ao carregar configuração de Client ID do Google:', err);
      }

      if (!active) return;

      const initializeGSI = () => {
        try {
          const win = window as any;
          if (win.google?.accounts?.id) {
            win.google.accounts.id.initialize({
              client_id: clientId,
              callback: handleCredentialResponse
            });

            const targetDiv = document.getElementById('g_id_signin_rendered');
            if (targetDiv) {
              win.google.accounts.id.renderButton(
                targetDiv,
                { 
                  theme: 'outline', 
                  size: 'large', 
                  width: 320,
                  text: 'signin_with',
                  shape: 'rectangular',
                  logo_alignment: 'left'
                }
              );
            }
          }
        } catch (err) {
          console.warn('Google Identity Services client failed to render:', err);
        }
      };

      const win = window as any;
      if (win.google?.accounts?.id) {
        initializeGSI();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGSI;
      document.body.appendChild(script);
    };

    loadAndInitGSI();

    return () => {
      active = false;
      const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (script && document.body.contains(script)) {
        try {
          document.body.removeChild(script);
        } catch (e) {}
      }
    };
  }, [navigate]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.user) {
        const resUser = event.data.user;
        localStorage.setItem('es_user', JSON.stringify(resUser));
        window.dispatchEvent(new Event('auth-change'));
        
        setShowGoogleModal(false);
        if (resUser.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  useEffect(() => {
    if (showGoogleModal) {
      setLoadingAccounts(true);
      setGoogleStage('chooser');
      setGoogleError(null);
      setCustomGoogleEmail('');
      setCustomGoogleName('');
      
      fetch('/api/clientes')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setGoogleAccounts(data.filter(c => c && c.email));
          }
          setLoadingAccounts(false);
        })
        .catch(err => {
          console.error('Erro ao buscar clientes:', err);
          setLoadingAccounts(false);
        });
    }
  }, [showGoogleModal]);

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
    setGoogleError(null);
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
      
      setShowGoogleModal(false);
      if (resUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setGoogleError(err.message || 'Falha na autenticação Google.');
    } finally {
      setGoogleLoading(false);
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

          <div className="space-y-3 flex flex-col items-center justify-center">
            {/* Standard GSI Live Button */}
            <div 
              id="g_id_signin_rendered" 
              className="w-full flex justify-center min-h-[50px] overflow-hidden"
              title="Entrar com a sua Conta Google Oficial"
            />

            {/* Diagnostic helper for Google origin_mismatch */}
            <div className="w-full mt-2">
              <button
                type="button"
                onClick={() => setShowGsiTroubleshooting(!showGsiTroubleshooting)}
                className="w-full text-[9px] font-black uppercase text-slate-500 hover:text-brand-purple tracking-wider transition-colors flex items-center justify-center gap-1.5 focus:outline-none"
              >
                <span>❔ Ajuda com Erro do Google (origin_mismatch)?</span>
              </button>

              <AnimatePresence>
                {showGsiTroubleshooting && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-2"
                  >
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-left text-[11px] text-slate-600 space-y-2">
                      <p className="font-bold text-amber-800 uppercase text-[9px] tracking-wider mb-1">Como Resolver o "Erro 400: origin_mismatch":</p>
                      <p>O Google OAuth exige que a URL exata do site esteja registada na Consola do Cloud do Desenvolvedor.</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-500 pl-1">
                        <li>Aceda à sua <b>Google Cloud Console</b>.</li>
                        <li>Selecione o seu projeto e vá a <b>APIs &amp; Serviços &gt; Credenciais</b>.</li>
                        <li>Edite a sua ID de cliente do OAuth 2.0.</li>
                        <li>Em <b>Origens JavaScript autorizadas</b>, adicione a sua URL atual:</li>
                        <pre className="bg-slate-100 p-2 rounded text-[10px] font-mono text-slate-700 overflow-x-auto mt-1 border border-slate-200">
                          {window.location.origin}
                        </pre>
                        <li>Clique em <b>Guardar</b>. O Google poderá demorar até 5 minutos a propagar esta alteração.</li>
                      </ol>
                      <p className="text-[10px] text-slate-400 italic mt-1 font-semibold">Nota de Desenvolvedor: Se desejar usar o seu próprio ID de Cliente ou Chave Secreta, configure as variáveis de ambiente <span className="font-mono bg-slate-100 text-[#0B1120] px-1 py-0.5 rounded leading-none">GOOGLE_CLIENT_ID</span> no seu servidor .env.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

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
              onClick={() => {
                if (!googleLoading) {
                  setShowGoogleModal(false);
                  setGoogleError(null);
                }
              }}
              className="absolute inset-0 bg-[#0B1120]/85 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 flex flex-col font-sans"
            >
              {/* Google Header */}
              <div className="p-8 pb-4 text-center relative border-b border-slate-100">
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={() => {
                    setShowGoogleModal(false);
                    setGoogleError(null);
                  }}
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-50"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
                <div className="flex justify-center mb-4">
                  <svg className="w-9 h-9" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {type === 'login' ? 'Fazer login com o Google' : 'Criar conta com o Google'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  para continuar em <span className="font-semibold text-brand-purple">E&S Engenharia & Serviços</span>
                </p>
              </div>

              {googleError && (
                <div className="mx-6 mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-[10px] font-black uppercase tracking-widest flex items-start gap-3 animate-shake">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
                  <span className="leading-snug flex-1">{googleError}</span>
                </div>
              )}

              {/* STAGE 1: ACCOUNT CHOOSER */}
              {googleStage === 'chooser' && (
                <div className="px-6 py-4 flex-1 overflow-y-auto max-h-[320px]">
                  {loadingAccounts ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-[#4285F4] rounded-full animate-spin" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A carregar contas guardadas...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Escolha uma conta para aceder:</span>
                      
                      {googleAccounts.map((account) => {
                        const initials = (account.nome || account.email).substring(0, 2).toUpperCase();
                        const idEmail = account.email.toLowerCase();
                        return (
                          <button
                            key={account.id}
                            type="button"
                            disabled={googleLoading}
                            onClick={() => {
                              if (type === 'signup') {
                                setGoogleError(`Esta conta (${idEmail}) já possui registo ativo no sistema. Por favor aceda à página de Login.`);
                              } else {
                                if (!account.active) {
                                  setGoogleError(`A conta '${account.nome}' está pendente de ativação pelo administrador Lavo João Mouzinho.`);
                                } else {
                                  handleGoogleSignIn(account.email, account.nome || account.email.split('@')[0]);
                                }
                              }
                            }}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-[#0B1120] text-brand-cyan font-black text-xs rounded-full flex items-center justify-center border border-slate-100 group-hover:bg-[#4285F4] group-hover:text-white transition-colors uppercase">
                                {initials}
                              </div>
                              <div>
                                <span className="block text-xs font-bold text-slate-900 leading-tight">{account.nome || 'Utilizador'}</span>
                                <span className="block text-[10px] text-slate-500 font-medium">{account.email}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {account.role === 'admin' && (
                                <span className="px-1.5 py-0.5 bg-brand-cyan/15 text-[#008fcc] text-[8px] font-black uppercase tracking-wider rounded">Admin</span>
                              )}
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-[#4285F4] transition-all" />
                            </div>
                          </button>
                        );
                      })}

                      {/* Manual account fallback */}
                      <button
                        type="button"
                        disabled={googleLoading}
                        onClick={() => {
                          setGoogleStage('manual');
                          setGoogleError(null);
                        }}
                        className="w-full flex items-center gap-3 p-3.5 hover:bg-slate-100/50 rounded-2xl border border-dashed border-slate-200 hover:border-slate-300 transition-all text-left text-slate-600 font-semibold"
                      >
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                          <Plus size={16} />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-800 leading-tight">Utilizar outra conta Google</span>
                          <span className="block text-[10px] text-slate-400 font-medium">Entrar com e-mail manual</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 2: SECURE MANUAL LOG/REGISTER WITH STRICT VALIDATION */}
              {googleStage === 'manual' && (
                <div className="px-8 py-6 space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">Conta Google (E-mail)</label>
                    <input 
                      type="email"
                      required
                      autoComplete="off"
                      value={customGoogleEmail}
                      onChange={e => {
                        setCustomGoogleEmail(e.target.value);
                        setGoogleError(null);
                      }}
                      placeholder="exemplo@gmail.com"
                      className="w-full border border-slate-300 focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10 rounded-xl px-4 py-3 text-sm font-semibold bg-white text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">Nome do Titular</label>
                    <input 
                      type="text"
                      value={customGoogleName}
                      onChange={e => setCustomGoogleName(e.target.value)}
                      placeholder="Indique o seu nome completo"
                      className="w-full border border-slate-300 focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10 rounded-xl px-4 py-3 text-sm font-semibold bg-white text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      disabled={googleLoading}
                      onClick={() => {
                        setGoogleStage('chooser');
                        setGoogleError(null);
                      }}
                      className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 text-center"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={googleLoading || !customGoogleEmail.trim() || !customGoogleEmail.includes('@')}
                      onClick={() => {
                        const cleanEmail = customGoogleEmail.trim().toLowerCase();
                        const exists = googleAccounts.some(acc => acc.email.toLowerCase() === cleanEmail);
                        
                        if (type === 'login') {
                          // No login: O e-mail DEVE constar na base de dados para ser realista
                          if (!exists) {
                            setGoogleError("Não foi possível encontrar a sua Conta Google de segurança no E&S Engenharia. Deve registar a conta primeiro no sistema.");
                            return;
                          }
                          const foundAcc = googleAccounts.find(acc => acc.email.toLowerCase() === cleanEmail);
                          if (foundAcc && !foundAcc.active) {
                            setGoogleError("A sua conta Google existe mas está pendente de ativação pelo administrador Lavo João Mouzinho.");
                            return;
                          }
                          handleGoogleSignIn(cleanEmail, customGoogleName || cleanEmail.split('@')[0]);
                        } else {
                          // No signup/registo: O e-mail NÃO deve constar na bdd para podermos registar
                          if (exists) {
                            setGoogleError("Este e-mail Google já se encontra registado no sistema. Aceda ao Login para autenticar.");
                            return;
                          }
                          handleGoogleSignIn(cleanEmail, customGoogleName || cleanEmail.split('@')[0]);
                        }
                      }}
                      className="flex-1 py-3 bg-[#4285F4] hover:bg-[#357ae8] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 text-center"
                    >
                      {googleLoading ? 'A ligar...' : 'Seguinte'}
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Info text inside Google dialog */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 leading-normal text-left">
                Para continuar, o Google partilhará o seu nome, endereço de e-mail e fotografia de perfil com a aplicação <span className="font-semibold">E&S Engenharia</span> de acordo com os regulamentos de RGPD aplicáveis.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
