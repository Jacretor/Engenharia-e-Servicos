import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Produto, CartItem } from './types';

// Components
import { Navigation } from './components/Navigation';
import { CartDrawer } from './components/CartDrawer';

// Pages
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { AdminPage } from './pages/AdminPage';
import { ClientPage } from './pages/ClientPage';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('es_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Auth sync error:', e);
        localStorage.removeItem('es_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  const handleAddToCart = (product: Produto) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, cartQuantity: item.cartQuantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.cartQuantity + delta);
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = async () => {
    if (!user || cartItems.length === 0) return;

    const total = cartItems.reduce((acc, i) => acc + i.preco * i.cartQuantity, 0);
    const orderData = {
      user_id: user.id,
      items: cartItems,
      total: total,
      status: 'Pendente',
      created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/encomendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) throw new Error('Falha ao registar encomenda');

      // Now open WhatsApp
      const adminPhone = '+258844821126'; // Lavo Joao Mouzinho
      const message = `*Nova Encomenda E&S Engenharia*\n` + 
        `Cliente: ${user.nome || user.email}\n\n` +
        cartItems.map(item => `- ${item.nome} (${item.cartQuantity}x): ${ (item.preco * item.cartQuantity).toLocaleString() } Kz/MT`).join('\n') +
        `\n\n*Total:* ${ total.toLocaleString() } Kz/MT`;
      
      const url = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');

      // Clear cart and close drawer
      setCartItems([]);
      setIsCartOpen(false);
      
      // Notify components that orders might have changed
      window.dispatchEvent(new Event('orders-updated'));

    } catch (e) {
      console.error(e);
      alert('Erro ao processar checkout. Verifique sua conexão.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-ink/20">A Carregar E&S Global</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppContent 
        user={user} 
        cartItems={cartItems} 
        setIsCartOpen={setIsCartOpen} 
        isCartOpen={isCartOpen}
        handleUpdateQuantity={handleUpdateQuantity}
        handleRemoveFromCart={handleRemoveFromCart}
        handleCheckout={handleCheckout}
        handleAddToCart={handleAddToCart}
      />
    </Router>
  );
}

function AppContent({ 
  user, 
  cartItems, 
  setIsCartOpen, 
  isCartOpen, 
  handleUpdateQuantity, 
  handleRemoveFromCart, 
  handleCheckout,
  handleAddToCart
}: any) {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-paper">
      {!isAdminPath && (
        <>
          <Navigation 
            user={user} 
            cartCount={cartItems.reduce((acc: number, i: any) => acc + i.cartQuantity, 0)} 
            onOpenCart={() => setIsCartOpen(true)} 
          />
          
          <CartDrawer 
            isOpen={isCartOpen} 
            onClose={() => setIsCartOpen(false)} 
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveFromCart}
            onCheckout={handleCheckout}
          />
        </>
      )}

      <Routes>
          <Route path="/" element={
            user ? (
              <Navigate to={user.email === 'helenagarife@gmail.com' ? "/admin" : "/dashboard"} replace />
            ) : (
              <HomePage user={user} />
            )
          } />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage type="login" />} />
          <Route path="/cadastro" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage type="signup" />} />
          
          <Route 
            path="/dashboard" 
            element={user ? (
              <ClientPage 
                user={user} 
                onAddToCart={handleAddToCart}
                cart={cartItems}
                onOpenCart={() => setIsCartOpen(true)}
              />
            ) : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/admin" 
            element={user?.email === 'helenagarife@gmail.com' ? <AdminPage /> : <Navigate to="/" />} 
          />
        </Routes>
      </div>
  );
}
