import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import pkg from 'pg';
const { Pool } = pkg;

// Renderのデータベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = new Hono()

// --- 共通のAPIロジック (中身は以前と同じですが、SQL実行部分をpool.queryに変えます) ---

app.get('/api/sync', async (c) => {
  const staff = await pool.query('SELECT * FROM staff WHERE active = 1 ORDER BY id ASC');
  const logs = await pool.query('SELECT * FROM logs WHERE deleted = 0 ORDER BY timestamp DESC');
  const settingsRaw = await pool.query('SELECT * FROM settings');
  
  const settings = {};
  settingsRaw.rows.forEach(row => { settings[row.key] = row.value; });

  return c.json({
    success: true,
    data: { staff: staff.rows, logs: logs.rows, settings: settings }
  });
});

// --- 静的ファイルの配信設定 ---
import { serveStatic } from '@hono/node-server/serve-static'
app.use('/static/*', serveStatic({ root: './public' }))
app.get('/', (c) => c.redirect('/static/index.html'))
app.get('/admin', (c) => c.redirect('/static/admin.html'))

// ポート指定（Renderは自動でPORT環境変数を割り当てます）
const port = Number(process.env.PORT) || 3000;
console.log(`Server is running on port ${port}`);

serve({ fetch: app.fetch, port });

export default app