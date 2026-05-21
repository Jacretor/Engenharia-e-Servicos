import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, LogOut, LayoutDashboard, Menu, X, Home, Package, Zap } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface NavigationProps {
  user: any;
  cartCount: number;
  onOpenCart: () => void;
}

export const Navigation = ({ user, cartCount, onOpenCart }: NavigationProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('es_user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const isHome = location.pathname === '/';
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin');

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-black/5">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-4 md:gap-6 group">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-[#0B1120] rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl group-hover:border-brand-cyan/50 transition-all duration-500 p-1">
               <img src="/LogoTipo.png" className="w-full h-full object-contain" alt="E&S Logo" onError={(e) => {
                 (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=ES&background=0B1120&color=00D2FF&bold=true';
               }} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-brand-cyan rounded-full border-2 border-white animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-base md:text-xl font-black text-[#0B1120] tracking-tighter uppercase leading-none block">
              Engenharia & Serviços
            </span>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] sm:tracking-[0.4em] block mt-0.5 sm:mt-1">
              SU, LDA • Moçambique
            </span>
          </div>
        </Link>

        {/* Desktop Links - Visible only on landing page and not on dashboard */}
        {!isDashboard && (
          <div className="hidden md:flex items-center gap-10">
            <button 
              onClick={() => isHome ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigate('/')}
              className="text-[10px] font-black text-[#0B1120]/40 hover:text-brand-cyan uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Home size={14} /> Início
            </button>
            <button 
              onClick={() => isHome ? scrollToSection('catalog') : navigate('/#catalog')}
              className="text-[10px] font-black text-[#0B1120]/40 hover:text-brand-cyan uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Package size={14} /> Produtos
            </button>
            <button 
              onClick={() => isHome ? scrollToSection('services') : navigate('/#services')}
              className="text-[10px] font-black text-[#0B1120]/40 hover:text-brand-cyan uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Zap size={14} /> Serviços
            </button>
          </div>
        )}

        <div className="flex items-center gap-4">
          {user?.email === 'helenagarife@gmail.com' && (
            <Link 
              to="/admin" 
              className="hidden lg:flex items-center gap-2 px-6 py-2.5 bg-paper rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-ink/40 hover:text-accent transition-all border border-ink/5"
            >
              Master Admin
            </Link>
          )}
          
          {/* Shopping Cart - Only visible for clients on dashboard/product related views */}
          {(isDashboard && user?.role === 'client') && (
            <button 
              onClick={onOpenCart}
              className="p-4 hover:bg-slate-100 rounded-full relative transition-all border border-transparent hover:border-slate-200"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-6 h-6 bg-brand-purple text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3 border-l border-ink/5 pl-4 ml-2">
              <Link to="/dashboard" className="w-12 h-12 bg-paper rounded-full flex items-center justify-center text-ink/40 hover:text-accent transition-all border border-ink/5">
                <LayoutDashboard size={18} />
              </Link>
              <button 
                onClick={handleLogout}
                className="w-12 h-12 bg-paper rounded-full flex items-center justify-center text-red-300 hover:text-red-500 transition-all border border-ink/5"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="px-4 py-2 sm:px-6 sm:py-2.5 md:px-10 md:py-3 bg-ink text-white rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest hover:bg-accent transition-all shadow-lg active:scale-95"
            >
              Fazer Login
            </Link>
          )}

          <button 
            className="md:hidden p-3 hover:bg-black/5 rounded-full"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-b border-black/5 p-6 flex flex-col gap-6"
        >
          {!isDashboard && (
            <>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  if (isHome) window.scrollTo({ top: 0, behavior: 'smooth' });
                  else navigate('/');
                }} 
                className="text-sm font-black text-[#0B1120] uppercase tracking-widest flex items-center gap-4"
              >
                <Home size={18} /> Início
              </button>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  if (isHome) scrollToSection('catalog');
                  else navigate('/#catalog');
                }} 
                className="text-sm font-black text-[#0B1120] uppercase tracking-widest flex items-center gap-4"
              >
                <Package size={18} /> Produtos
              </button>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  if (isHome) scrollToSection('services');
                  else navigate('/#services');
                }} 
                className="text-sm font-black text-[#0B1120] uppercase tracking-widest flex items-center gap-4"
              >
                <Zap size={18} /> Serviços
              </button>
            </>
          )}
          {!user && (
            <Link to="/login" onClick={() => setIsOpen(false)} className="text-sm font-black text-brand-cyan uppercase tracking-widest flex items-center gap-4">
              <LogOut size={18} /> Entrar no Sistema
            </Link>
          )}
        </motion.div>
      )}
    </nav>
  );
};
