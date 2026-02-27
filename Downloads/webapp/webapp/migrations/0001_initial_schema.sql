-- 松乃木飯店 出勤簿システム データベーススキーマ

-- スタッフテーブル
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  emp_id TEXT,
  break_start TEXT,
  break_end TEXT,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 打刻ログテーブル
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER NOT NULL,
  staff_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
  timestamp DATETIME NOT NULL,
  updated_at INTEGER,
  deleted INTEGER DEFAULT 0,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- システム設定テーブル
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- バックアップテーブル
CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_logs_staff_id ON logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_deleted ON logs(deleted);
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);

-- 初期設定データ
INSERT OR IGNORE INTO settings (key, value) VALUES ('closingDay', '20');
INSERT OR IGNORE INTO settings (key, value) VALUES ('roundUnit', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shopCloseTime', '23:00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('workStartTime', '09:00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('breakStart', '14:15');
INSERT OR IGNORE INTO settings (key, value) VALUES ('breakEnd', '17:15');
INSERT OR IGNORE INTO settings (key, value) VALUES ('adminPassword', '1234');
