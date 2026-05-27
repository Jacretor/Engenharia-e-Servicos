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
  status: 'Pendente' | 'Processando' | 'Confirmado' | 'Em Trânsito' | 'Entregue' | 'Rejeitado' | 'Cancelado';
  created_at: string;
  comprovante_url?: string;
  metodo_pagamento?: string;
  tipo_entrega?: 'levantamento' | 'delivery';
  distancia_km?: number;
  custo_delivery?: number;
  admin_feedback?: string;
  localizacao_atual?: string;
  localizacao_coordenadas?: { lat: number; lng: number };
}
