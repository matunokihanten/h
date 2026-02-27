import pkg from 'pg';
const { Pool } = pkg;

// 環境変数からデータベース接続情報を取得
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("エラー: DATABASE_URL が設定されていません。");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // RenderのDB接続に必須の設定
});

const initSql = `
-- スタッフテーブル
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  emp_id TEXT,
  break_start TEXT,
  break_end TEXT,
  active INTEGER DEFAULT 1
);

-- 打刻ログテーブル
CREATE TABLE IF NOT EXISTS logs (
  id BIGINT PRIMARY KEY,
  staff_id INTEGER,
  staff_name TEXT,
  type TEXT,
  timestamp TEXT,
  updated_at TEXT,
  deleted INTEGER DEFAULT 0
);

-- システム設定テーブル
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 初期データの投入（重複しないように挿入）
INSERT INTO settings (key, value) VALUES ('cutoff_date', '20') ON CONFLICT DO NOTHING;
INSERT INTO settings (key, value) VALUES ('start_time', '09:00') ON CONFLICT DO NOTHING;
INSERT INTO settings (key, value) VALUES ('break_time', '14:15-17:15') ON CONFLICT DO NOTHING;
`;

async function runInit() {
  console.log("データベースの初期化を開始します...");
  const client = await pool.connect();
  try {
    await client.query(initSql);
    console.log("✅ テーブルの作成と初期設定が完了しました！");
  } catch (err) {
    console.error("❌ エラーが発生しました:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

runInit();