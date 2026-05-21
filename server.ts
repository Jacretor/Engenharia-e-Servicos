import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Supabase credentials missing in environment.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());

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

// Orders CRUD
app.get('/api/encomendas/:userId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from(TABELA_ENCOMENDAS)
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.post('/api/encomendas', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from(TABELA_ENCOMENDAS)
    .insert([req.body])
    .select();
    
  if (error) return res.status(400).json(error);
  res.status(201).json(data[0]);
});

app.get('/api/produtos', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from(TABELA_PRODUTOS)
    .select('*')
    .order('id', { ascending: false });
  
  if (error) return res.status(400).json(error);
  res.json(data);
});

// Clients CRUD
app.get('/api/clientes', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from(TABELA_CLIENTES)
    .select('*')
    .order('nome', { ascending: true });
  
  if (error) {
    // Fallback if table doesn't exist yet for demo purposes
    return res.json([
      { id: '1', nome: 'João Silva', email: 'joao@example.com', active: true },
      { id: '2', nome: 'Maria Santos', email: 'maria@example.com', active: false },
    ]);
  }
  res.json(data);
});

app.put('/api/clientes/:id/toggle', async (req: Request, res: Response) => {
  const { data: client, error: getError } = await supabase
    .from(TABELA_CLIENTES)
    .select('active')
    .eq('id', req.params.id)
    .single();

  if (getError) return res.status(400).json(getError);

  const { data, error } = await supabase
    .from(TABELA_CLIENTES)
    .update({ active: !client.active })
    .eq('id', req.params.id)
    .select();
    
  if (error) return res.status(400).json(error);
  res.json(data[0]);
});

app.post('/api/produtos', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from(TABELA_PRODUTOS)
    .insert([req.body])
    .select();
    
  if (error) {
    console.error('Database Error (Insert Product):', error);
    return res.status(400).json(error);
  }
  res.status(201).json(data[0]);
});

app.put('/api/produtos/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from(TABELA_PRODUTOS)
    .update(req.body)
    .eq('id', req.params.id)
    .select();
    
  if (error) return res.status(400).json(error);
  res.json(data[0]);
});

app.delete('/api/produtos/:id', async (req: Request, res: Response) => {
  const { error } = await supabase
    .from(TABELA_PRODUTOS)
    .delete()
    .eq('id', req.params.id);
    
  if (error) return res.status(400).json(error);
  res.json({ message: 'Produto removido com sucesso' });
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
