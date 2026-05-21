export type Category = 'Materiais' | 'Peças' | 'Serviços' | 'Equipamentos';

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  categoria: Category;
  preco: number;
  quantidade: number;
  foto_url?: string;
  created_at?: string;
}

export interface CartItem extends Produto {
  cartQuantity: number;
}

export interface User {
  id: string;
  email: string;
  nome?: string;
  role: 'client' | 'admin';
  active: boolean;
}

export interface Encomenda {
  id: string;
  user_id: string;
  items: CartItem[];
  total: number;
  status: 'Pendente' | 'Processando' | 'Enviado' | 'Entregue';
  created_at: string;
}
