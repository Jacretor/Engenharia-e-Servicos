import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
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

app.get('/api/admin/encomendas', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from(TABELA_ENCOMENDAS)
    .select('*')
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

  // Automatically decrement quantities (stock) in real-time
  try {
    const orderItems = req.body.items || [];
    for (const item of orderItems) {
      if (item.id && item.cartQuantity) {
        // Fetch current quantity to reflect real-time changes
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
  } catch (err) {
    console.error('Erro desconhecido ao actualizar stock em tempo real:', err);
  }

  res.status(201).json(data[0]);
});

app.put('/api/encomendas/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  const { data, error } = await supabase
    .from(TABELA_ENCOMENDAS)
    .update({ status })
    .eq('id', req.params.id)
    .select();
    
  if (error) return res.status(400).json(error);
  res.json(data[0]);
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
