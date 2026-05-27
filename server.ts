import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { runDatabaseDiagnostics } from './database-diagnostics';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Supabase
const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

console.log('🌍 Environment checks:');
console.log(`   - SUPABASE_URL: ${supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'not set/empty'}`);
console.log(`   - SUPABASE_ANON_KEY: ${supabaseKey ? `${supabaseKey.substring(0, 10)}... [Length: ${supabaseKey.length}]` : 'not set/empty'}`);

let isSupabaseOnline = false;
let supabase: any;

try {
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    throw new Error('Supabase URL or Key is missing or set to placeholder.');
  }
  // Check if URL syntax is valid
  new URL(supabaseUrl);
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('🔌 Supabase client securely instantiated.');
} catch (err: any) {
  console.warn('🔌 Supabase credentials invalid or missing. Initializing in Offline Fallback Mode. Erro:', err.message || err);
  isSupabaseOnline = false;
  supabase = createClient('https://placeholder.supabase.co', 'placeholder');
}

// Helper to identify offline/network/address errors
function isConnectionError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const desc = (err.description || '').toLowerCase();
  const details = typeof err.details === 'string' ? err.details.toLowerCase() : '';
  const code = (err.code || '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('enotfound') ||
    msg.includes('getaddrinfo') ||
    msg.includes('connection') ||
    msg.includes('timeout') ||
    desc.includes('fetch failed') ||
    details.includes('fetch failed') ||
    details.includes('enotfound') ||
    details.includes('getaddrinfo') ||
    code.includes('enotfound')
  );
}

// Increase limit to allow direct base64 image uploads from admin device and clients
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploads folder publicly
app.use('/uploads', express.static(UPLOADS_DIR));

// Base64 upload endpoint
app.post('/api/upload-base64', async (req: Request, res: Response) => {
  const { name, data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Nenhuma informação de imagem recebida' });
  }
  try {
    const matches = data.match(/^data:image\/([A-Za-z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Formato de carregamento inválido' });
    }
    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `${Date.now()}_${(name || 'upload').replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    fs.writeFileSync(filePath, buffer);
    res.json({ url: `/uploads/${fileName}` });
  } catch (err: any) {
    console.error('Erro de upload de ficheiro local:', err);
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'E&S API',
    database_configured: !!supabaseUrl && !!supabaseKey
  });
});

// Products CRUD
// Check for common table name variations
const TABELA_PRODUTOS = 'Produto'; 
const TABELA_CLIENTES = 'Clientes';
const TABELA_ENCOMENDAS = 'Encomenda';

// File system paths for local fallback database
const FALLBACK_PRODUTOS_PATH = path.join(UPLOADS_DIR, 'fallback_produtos.json');
const FALLBACK_ENCOMENDAS_PATH = path.join(UPLOADS_DIR, 'fallback_encomendas.json');
const FALLBACK_CLIENTES_PATH = path.join(UPLOADS_DIR, 'fallback_clientes.json');

// Initialize default mock engineering products
const initialProducts = [
  {
    id: 1,
    nome: "Transformador Trifásico de Distribuição 50kVA",
    descricao: "Transformador trifásico de alta fiabilidade para redes de distribuição industrial de média tensão, classe 15kV.",
    preco: 380000,
    quantidade: 4,
    categoria: "Equipamentos",
    foto_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    nome: "Cabo de Cobre Isolado XLPE 70mm²",
    descricao: "Cabo elétrico de alta resistência para instalações subterrâneas e de alta potência. Preço por metro.",
    preco: 1850,
    quantidade: 500,
    categoria: "Materiais",
    foto_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    nome: "Motor Elétrico Trifásico Siemens 15HP",
    descricao: "Motor de indução trifásico de alto rendimento para bombas, ventiladores e compressores industriais.",
    preco: 145000,
    quantidade: 3,
    categoria: "Peças",
    foto_url: "https://images.unsplash.com/photo-1513828583848-77501a35a60b?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    nome: "Disjuntor Caixa Moldada Triplo 100A",
    descricao: "Disjuntor de proteção contra sobrecargas e curto-circuitos para quadros industriais elétricos.",
    preco: 8200,
    quantidade: 25,
    categoria: "Materiais",
    foto_url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString()
  },
  {
    id: 5,
    nome: "Serviço de Auditoria de Eficiência Energética",
    descricao: "Auditoria técnica detalhada de consumo de energia em instalações industriais com emissão de relatórios oficiais.",
    preco: 75000,
    quantidade: 100,
    categoria: "Serviços",
    foto_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
    created_at: new Date().toISOString()
  }
];

const initialClients = [
  { id: "1", nome: "João Silva", email: "joao@example.com", senha: "cliente123", active: true, created_at: new Date().toISOString() },
  { id: "2", nome: "Maria Santos", email: "maria@example.com", senha: "cliente123", active: false, created_at: new Date().toISOString() },
  { id: "3", nome: "Helena Garife", email: "helenagarife@gmail.com", senha: "cliente123", active: true, created_at: new Date().toISOString() }
];

const initialOrders = [
  {
    id: "ord_1001",
    user_id: "user-1",
    nome_cliente: "Helena Garife",
    email_cliente: "helenagarife@gmail.com",
    items: [
      { id: 1, nome: "Transformador Trifásico de Distribuição 50kVA", preco: 380000, cartQuantity: 1 }
    ],
    nuit: "402153571",
    total: 380000,
    status: "Em Trânsito",
    tipo_entrega: "delivery",
    distancia_km: 15,
    custo_delivery: 450,
    localizacao_atual: "Estrada Nacional N6 - Trânsito no Posto de Inchope",
    localizacao_coordenadas: { lat: -19.49, lng: 34.02 },
    admin_feedback: "O vosso transformador já foi carregado e está em trânsito pela EN6 liderado pela nossa equipa de Manica.",
    created_at: new Date().toISOString()
  }
];

// Helper to write/read fallback files safely
if (!fs.existsSync(FALLBACK_PRODUTOS_PATH)) {
  fs.writeFileSync(FALLBACK_PRODUTOS_PATH, JSON.stringify(initialProducts, null, 2), 'utf-8');
}
if (!fs.existsSync(FALLBACK_ENCOMENDAS_PATH)) {
  fs.writeFileSync(FALLBACK_ENCOMENDAS_PATH, JSON.stringify(initialOrders, null, 2), 'utf-8');
}
if (!fs.existsSync(FALLBACK_CLIENTES_PATH)) {
  fs.writeFileSync(FALLBACK_CLIENTES_PATH, JSON.stringify(initialClients, null, 2), 'utf-8');
}

function readFallback(filePath: string, defaultData: any) {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(parsed) && filePath.endsWith('fallback_clientes.json')) {
        let hasChanges = false;
        const processed = parsed.map((c: any) => {
          if (c && typeof c === 'object' && !c.senha) {
            hasChanges = true;
            return { ...c, senha: 'cliente123' };
          }
          return c;
        });
        if (hasChanges) {
          console.log('🔄 Migrando contas antigas em fallback_clientes.json para incluir senhas padrão.');
          fs.writeFileSync(filePath, JSON.stringify(processed, null, 2), 'utf-8');
          return processed;
        }
      }
      return parsed;
    }
  } catch (err) {
    console.error('Erro ao ler base de dados fallback:', err);
  }
  return defaultData;
}

function writeFallback(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao gravar base de dados fallback:', err);
  }
}

// Background startup connectivity verification with robust exponential backoff retry and deep diagnostics
async function verifySupabaseConnection(retriesLeft = 3, delayMs = 1500): Promise<boolean> {
  const diagnostic = await runDatabaseDiagnostics(supabaseUrl, supabaseKey);
  
  if (diagnostic.isOnline) {
    console.log(`✅ [verifySupabaseConnection] Supabase online e validado. Modo em tempo real activo.`);
    isSupabaseOnline = true;
    return true;
  }

  // If we have retries left and it failed, we can wait and try again
  if (retriesLeft > 1) {
    console.warn(`⚠️ [verifySupabaseConnection] Falha ao ligar ao Supabase: ${diagnostic.reason}. A tentar novamente em ${delayMs}ms (Tentativas restantes: ${retriesLeft - 1})...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return verifySupabaseConnection(retriesLeft - 1, delayMs * 2);
  } else {
    console.error(`⚠️ [verifySupabaseConnection] Não foi possível ligar ao Supabase de forma fiável. Ativando MODO FALLBACK LOCAL.`);
    console.error(`📝 Motivo diagnosticado: ${diagnostic.reason}`);
    if (diagnostic.errorCode) console.error(`💻 Código de Erro: ${diagnostic.errorCode}`);
    if (diagnostic.errorDetails) console.error(`🔍 Detalhes adicionais:`, diagnostic.errorDetails);
    
    isSupabaseOnline = false;
    return false;
  }
}

// Initial check on startup
verifySupabaseConnection();

// Periodic background check to retry/reconnect if Supabase goes back online or credentials get configured at runtime
setInterval(async () => {
  if (!isSupabaseOnline) {
    console.log('🔄 Monitorização em segundo plano: A tentar restabelecer ligação ao Supabase...');
    const reconnected = await verifySupabaseConnection(1, 1000);
    if (reconnected) {
      console.log('🟢 Supabase em linha! Transição automática de volta para o modo em tempo real.');
    }
  }
}, 30000); // Check every 30 seconds

// Orders CRUD
app.get('/api/encomendas/:userId', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data, error } = await supabase
      .from(TABELA_ENCOMENDAS)
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Usando base de dados local fallback:', err.message || err);
    const orders = readFallback(FALLBACK_ENCOMENDAS_PATH, initialOrders);
    const userOrders = orders.filter((o: any) => o.user_id === req.params.userId);
    res.json(userOrders);
  }
});

app.get('/api/admin/encomendas', async (_req: Request, res: Response) => {
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data, error } = await supabase
      .from(TABELA_ENCOMENDAS)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Usando base de dados local fallback:', err.message || err);
    const orders = readFallback(FALLBACK_ENCOMENDAS_PATH, initialOrders);
    res.json(orders);
  }
});

app.post('/api/encomendas', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data, error } = await supabase
      .from(TABELA_ENCOMENDAS)
      .insert([req.body])
      .select();
      
    if (error) throw error;

    // decrement quantity in Supabase
    try {
      const orderItems = req.body.items || [];
      for (const item of orderItems) {
        if (item.id && item.cartQuantity) {
          const { data: prodData, error: prodErr } = await supabase
            .from(TABELA_PRODUTOS)
            .select('quantidade')
            .eq('id', item.id)
            .single();
          
          if (!prodErr && prodData) {
            const currentQty = Number(prodData.quantidade) || 0;
            const boughtQty = Number(item.cartQuantity) || 0;
            const newQty = Math.max(0, currentQty - boughtQty);
            
            await supabase
              .from(TABELA_PRODUTOS)
              .update({ quantidade: newQty })
              .eq('id', item.id);
          }
        }
      }
    } catch (stockErr) {
      console.error('Erro real-time stock update em Supabase:', stockErr);
    }

    res.status(201).json(data[0]);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Gravando encomenda em fallback local:', err.message || err);
    const orders = readFallback(FALLBACK_ENCOMENDAS_PATH, initialOrders);
    
    // Create new local order object
    const newOrder = {
      ...req.body,
      id: req.body.id || `ord_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    orders.unshift(newOrder); // Add to beginning
    writeFallback(FALLBACK_ENCOMENDAS_PATH, orders);

    // Update stock locally
    const products = readFallback(FALLBACK_PRODUTOS_PATH, initialProducts);
    const orderItems = req.body.items || [];
    for (const item of orderItems) {
      const prod = products.find((p: any) => p.id === item.id || String(p.id) === String(item.id));
      if (prod) {
        prod.quantidade = Math.max(0, (Number(prod.quantidade) || 0) - (Number(item.cartQuantity) || 0));
      }
    }
    writeFallback(FALLBACK_PRODUTOS_PATH, products);

    res.status(201).json(newOrder);
  }
});

app.put('/api/encomendas/:id/status', async (req: Request, res: Response) => {
  const { status, admin_feedback, localizacao_atual, localizacao_coordenadas } = req.body;
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data, error } = await supabase
      .from(TABELA_ENCOMENDAS)
      .update({ 
        status, 
        admin_feedback, 
        localizacao_atual, 
        localizacao_coordenadas 
      })
      .eq('id', req.params.id)
      .select();
      
    if (error) throw error;
    res.json(data[0]);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Actualizando status em fallback local:', err.message || err);
    const orders = readFallback(FALLBACK_ENCOMENDAS_PATH, initialOrders);
    const idx = orders.findIndex((o: any) => o.id === req.params.id || String(o.id) === String(req.params.id));
    if (idx !== -1) {
      orders[idx] = {
        ...orders[idx],
        status,
        admin_feedback,
        localizacao_atual,
        localizacao_coordenadas
      };
      writeFallback(FALLBACK_ENCOMENDAS_PATH, orders);
      res.json(orders[idx]);
    } else {
      res.status(404).json({ error: 'Encomenda não encontrada' });
    }
  }
});

app.get('/api/produtos', async (_req: Request, res: Response) => {
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data, error } = await supabase
      .from(TABELA_PRODUTOS)
      .select('*')
      .order('id', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Carregando produtos do fallback local:', err.message || err);
    const products = readFallback(FALLBACK_PRODUTOS_PATH, initialProducts);
    res.json(products);
  }
});

// Clients CRUD
app.post('/api/clientes/registar', async (req: Request, res: Response) => {
  const { nome, email, senha } = req.body;
  if (!email || typeof email !== 'string' || !senha || typeof senha !== 'string') {
    return res.status(400).json({ error: 'E-mail e senha são dados de preenchimento obrigatório.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data, error } = await supabase
      .from(TABELA_CLIENTES)
      .insert([{
        nome: nome || 'Utilizador',
        email: normalizedEmail,
        senha,
        active: true,
        role: 'client'
      }])
      .select();
      
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Registando cliente em fallback local:', err.message || err);
    const clients = readFallback(FALLBACK_CLIENTES_PATH, initialClients);
    
    const exists = clients.find((c: any) => c && c.email && typeof c.email === 'string' && c.email.toLowerCase() === normalizedEmail);
    if (exists) {
      return res.status(400).json({ error: 'Já existe um utilizador registado com este e-mail.' });
    }

    const newClient = {
      id: `client_${Date.now()}`,
      nome: nome || 'Utilizador',
      email: normalizedEmail,
      senha,
      active: true,
      role: 'client',
      created_at: new Date().toISOString()
    };
    clients.push(newClient);
    writeFallback(FALLBACK_CLIENTES_PATH, clients);
    res.status(201).json(newClient);
  }
});

app.post('/api/clientes/google-login', async (req: Request, res: Response) => {
  const { email, nome } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'E-mail é de preenchimento obrigatório para autenticação Google.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const userName = nome || normalizedEmail.split('@')[0];

  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    
    // 1. Verificar explicitamente se o utilizador já existe no Supabase antes de tentar inserir
    const { data: existingUser, error: findError } = await supabase
      .from(TABELA_CLIENTES)
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (findError) {
      console.error('❌ Erro Supabase ao procurar utilizador:', findError);
      throw findError;
    }

    // 2. Se o utilizador já existe, reativá-lo se necessário e devolvê-lo, evitando novas inserções
    if (existingUser) {
      if (!existingUser.active) {
        const { data: updatedUser, error: updateError } = await supabase
          .from(TABELA_CLIENTES)
          .update({ active: true })
          .eq('id', existingUser.id)
          .select()
          .single();
        if (updateError) {
          console.error('❌ Erro Supabase ao reativar utilizador:', updateError);
          throw updateError;
        }
        return res.json(updatedUser);
      }
      return res.json(existingUser);
    }

    // 3. Tentar inserir apenas se não existir. Tratamos possíveis erros de conflito (unique constraint 23505) de forma graciosa
    const { data: newUser, error: insertError } = await supabase
      .from(TABELA_CLIENTES)
      .insert([{
        nome: userName,
        email: normalizedEmail,
        senha: `google_oauth_${Date.now()}`,
        active: true,
        role: normalizedEmail === 'helenagarife@gmail.com' ? 'admin' : 'client'
      }])
      .select();

    if (insertError) {
      // Se houver conflito de violação de chave única devido a acessos concorrentes (código 23505)
      if (insertError.code === '23505') {
        const { data: retryUser, error: retryError } = await supabase
          .from(TABELA_CLIENTES)
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();
        if (!retryError && retryUser) {
          return res.json(retryUser);
        }
      }
      console.error('❌ Erro Supabase ao registar novo utilizador Google:', insertError);
      throw insertError;
    }

    if (!newUser || newUser.length === 0) {
      throw new Error('Retorno vazio após registo no Supabase.');
    }

    res.json(newUser[0]);

  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Fallback Google Login local devido a falha ou modo offline:', err.message || err);
    
    const clients = readFallback(FALLBACK_CLIENTES_PATH, initialClients);
    let existingUser = clients.find((c: any) => c && c.email && typeof c.email === 'string' && c.email.toLowerCase() === normalizedEmail);

    if (existingUser) {
      if (!existingUser.active) {
        existingUser.active = true;
      }
      // Garantir que a Helena Garife tem papel de admin no fallback local
      if (normalizedEmail === 'helenagarife@gmail.com') {
        existingUser.role = 'admin';
      }
      writeFallback(FALLBACK_CLIENTES_PATH, clients);
      return res.json(existingUser);
    }

    const newClient = {
      id: `client_${Date.now()}`,
      nome: userName,
      email: normalizedEmail,
      senha: `google_oauth_${Date.now()}`,
      active: true,
      role: normalizedEmail === 'helenagarife@gmail.com' ? 'admin' : 'client',
      created_at: new Date().toISOString()
    };
    clients.push(newClient);
    writeFallback(FALLBACK_CLIENTES_PATH, clients);
    res.status(200).json(newClient);
  }
});

app.post('/api/clientes/login', async (req: Request, res: Response) => {
  const { email, senha } = req.body;
  if (!email || typeof email !== 'string' || !senha || typeof senha !== 'string') {
    return res.status(400).json({ error: 'E-mail e senha são dados de preenchimento obrigatório.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data: userRecord, error } = await supabase
      .from(TABELA_CLIENTES)
      .select('*')
      .eq('email', normalizedEmail)
      .eq('senha', senha)
      .single();
      
    if (error) throw error;
    if (!userRecord) {
      return res.status(401).json({ error: 'Credenciais inválidas ou acesso não autorizado.' });
    }
    res.json(userRecord);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Validando login em fallback local:', err.message || err);
    const clients = readFallback(FALLBACK_CLIENTES_PATH, initialClients);
    const userRecord = clients.find((c: any) => c && c.email && typeof c.email === 'string' && c.email.toLowerCase() === normalizedEmail && c.senha === senha);
    
    if (!userRecord) {
      return res.status(401).json({ error: 'Credenciais inválidas ou acesso não autorizado (fallback local).' });
    }
    res.json(userRecord);
  }
});

app.get('/api/clientes', async (_req: Request, res: Response) => {
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data, error } = await supabase
      .from(TABELA_CLIENTES)
      .select('*')
      .order('nome', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Carregando clientes do fallback local:', err.message || err);
    const clients = readFallback(FALLBACK_CLIENTES_PATH, initialClients);
    res.json(clients);
  }
});

app.put('/api/clientes/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data: client, error: getError } = await supabase
      .from(TABELA_CLIENTES)
      .select('active')
      .eq('id', req.params.id)
      .single();

    if (getError) throw getError;

    const { data, error } = await supabase
      .from(TABELA_CLIENTES)
      .update({ active: !client.active })
      .eq('id', req.params.id)
      .select();
      
    if (error) throw error;
    res.json(data[0]);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Toggling status do cliente no fallback local:', err.message || err);
    const clients = readFallback(FALLBACK_CLIENTES_PATH, initialClients);
    const idx = clients.findIndex((c: any) => c.id === req.params.id || String(c.id) === String(req.params.id));
    if (idx !== -1) {
      clients[idx].active = !clients[idx].active;
      writeFallback(FALLBACK_CLIENTES_PATH, clients);
      res.json(clients[idx]);
    } else {
      res.status(404).json({ error: 'Cliente não encontrado' });
    }
  }
});

app.post('/api/produtos', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data, error } = await supabase
      .from(TABELA_PRODUTOS)
      .insert([req.body])
      .select();
      
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Inserindo produto no fallback local:', err.message || err);
    const products = readFallback(FALLBACK_PRODUTOS_PATH, initialProducts);
    
    const newProduct = {
      ...req.body,
      id: req.body.id || (products.length > 0 ? Math.max(...products.map((p: any) => Number(p.id) || 0)) + 1 : 1),
      created_at: new Date().toISOString()
    };
    products.unshift(newProduct);
    writeFallback(FALLBACK_PRODUTOS_PATH, products);
    res.status(201).json(newProduct);
  }
});

app.put('/api/produtos/:id', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { data, error } = await supabase
      .from(TABELA_PRODUTOS)
      .update(req.body)
      .eq('id', req.params.id)
      .select();
      
    if (error) throw error;
    res.json(data[0]);
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Editando produto no fallback local:', err.message || err);
    const products = readFallback(FALLBACK_PRODUTOS_PATH, initialProducts);
    const idx = products.findIndex((p: any) => p.id === req.params.id || String(p.id) === String(req.params.id));
    if (idx !== -1) {
      products[idx] = {
        ...products[idx],
        ...req.body
      };
      writeFallback(FALLBACK_PRODUTOS_PATH, products);
      res.json(products[idx]);
    } else {
      res.status(404).json({ error: 'Produto não encontrado' });
    }
  }
});

app.delete('/api/produtos/:id', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseOnline) throw new Error('Supabase is configured in OFFLINE mode.');
    const { error } = await supabase
      .from(TABELA_PRODUTOS)
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    res.json({ message: 'Produto removido com sucesso' });
  } catch (err: any) {
    if (isConnectionError(err)) isSupabaseOnline = false;
    console.warn('⚠️ Supabase offline/unreachable. Removendo produto do fallback local:', err.message || err);
    const products = readFallback(FALLBACK_PRODUTOS_PATH, initialProducts);
    const newProducts = products.filter((p: any) => p.id !== req.params.id && String(p.id) !== String(req.params.id));
    writeFallback(FALLBACK_PRODUTOS_PATH, newProducts);
    res.json({ message: 'Produto removido com sucesso (fallback local)' });
  }
});

// Vite middleware setup
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

setupVite();
