import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import pkg from 'pg';
const { Pool } = pkg;

// Renderのデータベース(PostgreSQL)接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = new Hono()

// --- 静的ファイルの配信設定 ---
app.use('/static/*', serveStatic({ root: './public' }))
app.get('/', (c) => c.redirect('/static/index.html'))
app.get('/admin', (c) => c.redirect('/static/admin.html'))

// --- 認証 API (管理画面用) ---
app.post('/api/auth', async (c) => {
  return c.json({ success: true, token: 'bypass' })
})

// --- データ同期 API (PostgreSQL版) ---
app.get('/api/sync', async (c) => {
  try {
    const staff = await pool.query('SELECT * FROM staff WHERE active = 1 ORDER BY id ASC');
    const logs = await pool.query('SELECT * FROM logs WHERE deleted = 0 ORDER BY timestamp DESC');
    const settingsRes = await pool.query('SELECT * FROM settings');
    
    const settings: Record<string, string> = {};
    settingsRes.rows.forEach(row => { settings[row.key] = row.value; });

    return c.json({
      success: true,
      data: { staff: staff.rows, logs: logs.rows, settings: settings }
    });
  } catch (err) {
    console.error(err);
    return c.json({ success: false });
  }
})

// --- 打刻 API ---
app.post('/api/stamp', async (c) => {
  const { staff_id, staff_name, type } = await c.req.json();
  const now = new Date();
  const timestamp = now.toISOString();
  
  await pool.query(
    'INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES ($1, $2, $3, $4, $5, $5, 0)',
    [now.getTime(), staff_id, staff_name, type, timestamp]
  );
  return c.json({ success: true });
})

// ポート設定（Renderが自動で割り当てます）
const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });

export default app