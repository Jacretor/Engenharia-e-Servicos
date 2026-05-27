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
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    // Check for payment success from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      setCartItems([]);
      // Maybe show a success message here or handled in the page
    }

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

  const handleCheckout = async (paymentData: { 
    method: 'M-Pesa' | 'e-Mola' | 'Dinheiro'; 
    receipt: string;
    tipo_entrega: 'levantamento' | 'delivery';
    distancia_km: number;
    custo_delivery: number;
  }) => {
    if (!user || cartItems.length === 0 || isProcessingCheckout) return;

    setIsProcessingCheckout(true);
    const totalItems = cartItems.reduce((acc, i) => acc + i.preco * i.cartQuantity, 0);
    const grandTotal = totalItems + (paymentData.custo_delivery || 0);
    const isDinheiro = paymentData.method === 'Dinheiro';
    
    try {
      // Create order in database with payment info
      const orderData = {
        user_id: user.nome || user.email,
        items: cartItems,
        total: grandTotal,
        status: isDinheiro ? 'Pendente' : 'Processando',
        metodo_pagamento: paymentData.method,
        comprovante_url: paymentData.receipt,
        tipo_entrega: paymentData.tipo_entrega,
        distancia_km: paymentData.distancia_km,
        custo_delivery: paymentData.custo_delivery,
        created_at: new Date().toISOString(),
      };

      const orderRes = await fetch('/api/encomendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!orderRes.ok) throw new Error('Falha ao registar encomenda');

      // Notify admin via WhatsApp about the new payment for confirmation
      const adminPhone = '+258844821126';
      const deliveryInfoMsg = paymentData.tipo_entrega === 'delivery' 
        ? `Modo Entrega: Delivery Regional (${paymentData.distancia_km} km) - Portes: ${paymentData.custo_delivery.toLocaleString()} MT\n`
        : `Modo Entrega: Levantamento na Sede (Chimoio) - Grátis\n`;

      const message = `*Nova Encomenda E&S Engenharia*\n\n` + 
        `Cliente: ${user.nome || user.email}\n` +
        `Método de Pagamento: ${paymentData.method}\n` +
        deliveryInfoMsg +
        `Valor dos Artigos: ${totalItems.toLocaleString()} MT\n` +
        `Total Geral: ${ grandTotal.toLocaleString() } MT\n\n` +
        `Por favor, prepare e valide a operação e envie o feedback de localização no painel administrativo.`;
      
      const waUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      // Clear cart and close drawer
      setCartItems([]);
      setIsCartOpen(false);
      
      // Notify components that orders might have changed
      window.dispatchEvent(new Event('orders-updated'));
      alert(isDinheiro 
        ? 'Pedido submetido com sucesso! O pagamento será feito no ato da entrega.' 
        : 'Requisição de pagamento enviada com sucesso! O comprovativo já está anexado para avaliação da Engenheira Helena Garife.'
      );

    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Erro ao processar checkout. Verifique sua conexão.');
    } finally {
      setIsProcessingCheckout(false);
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
        isProcessingCheckout={isProcessingCheckout}
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
  handleAddToCart,
  isProcessingCheckout
}: any) {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const isDashboardPath = location.pathname.startsWith('/dashboard');

  return (
    <div className="min-h-screen bg-paper">
      {!isAdminPath && !isDashboardPath && (
        <Navigation 
          user={user} 
          cartCount={cartItems.reduce((acc: number, i: any) => acc + i.cartQuantity, 0)} 
          onOpenCart={() => setIsCartOpen(true)} 
        />
      )}
      
      {!isAdminPath && (
        <CartDrawer 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemoveFromCart}
          onCheckout={handleCheckout}
          isProcessing={isProcessingCheckout}
        />
      )}

      <Routes>
          <Route path="/" element={
            user ? (
              <Navigate to={user.email === 'helenagarife@gmail.com' ? "/admin" : "/dashboard"} replace />
            ) : (
              <HomePage />
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
