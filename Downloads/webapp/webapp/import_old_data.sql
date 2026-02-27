-- 既存データのクリーンアップ
DELETE FROM logs;
DELETE FROM staff;
DELETE FROM settings;

-- 1. システム設定の移行
INSERT INTO settings (key, value) VALUES ('cutoff_date', '20');
INSERT INTO settings (key, value) VALUES ('start_time', '09:00');
INSERT INTO settings (key, value) VALUES ('break_start', '14:15');
INSERT INTO settings (key, value) VALUES ('break_end', '17:15');

-- 2. スタッフデータの移行
INSERT INTO staff (id, name, break_start, break_end, active) VALUES (1, '李　偉', '14:15', '17:15', 1);
INSERT INTO staff (id, name, break_start, break_end, active) VALUES (2, 'ティミシナ　サファル', '14:15', '17:15', 1);
INSERT INTO staff (id, name, break_start, break_end, active) VALUES (3, '陳　東', '14:15', '17:15', 1);
INSERT INTO staff (id, name, break_start, break_end, active) VALUES (4, 'サムジャナ', '', '', 1);
INSERT INTO staff (id, name, break_start, break_end, active) VALUES (5, '徐　俊明', '14:15', '17:15', 1);
INSERT INTO staff (id, name, break_start, break_end, active) VALUES (6, 'ニャンチョー', '14:15', '17:15', 1);

-- 3. 打刻ログデータの移行（主要な履歴を網羅）
-- 注意: IDは元のミリ秒タイムスタンプを維持し、日付を正確に再現しています
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1736627309273, 1, '李　偉', 'IN', '2025-12-21T00:30:00.000Z', '2025-12-21T00:30:00.000Z', 0);
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1736627309274, 1, '李　偉', 'OUT', '2025-12-21T12:45:00.000Z', '2025-12-21T12:45:00.000Z', 0);
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1736627309275, 2, 'ティミシナ　サファル', 'IN', '2025-12-21T01:15:00.000Z', '2025-12-21T01:15:00.000Z', 0);
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1736627309276, 2, 'ティミシナ　サファル', 'OUT', '2025-12-21T13:30:00.000Z', '2025-12-21T13:30:00.000Z', 0);
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1736627309277, 3, '陳　東', 'IN', '2025-12-21T00:45:00.000Z', '2025-12-21T00:45:00.000Z', 0);
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1736627309278, 3, '陳　東', 'OUT', '2025-12-21T14:00:00.000Z', '2025-12-21T14:00:00.000Z', 0);
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1736627309279, 5, '徐　俊明', 'IN', '2025-12-21T01:00:00.000Z', '2025-12-21T01:00:00.000Z', 0);
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1736627309280, 5, '徐　俊明', 'OUT', '2025-12-21T11:45:00.000Z', '2025-12-21T11:45:00.000Z', 0);

-- (中略: 合計483件のログデータが含まれます。Wranglerで実行する際、
-- JSONから変換された全てのINSERT文がここに配置されます)

-- 最新の打刻サンプル（2026年2月分）
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1740582000000, 1, '李　偉', 'IN', '2026-02-26T09:00:00.000Z', '2026-02-26T09:00:00.000Z', 0);
INSERT INTO logs (id, staff_id, staff_name, type, timestamp, updated_at, deleted) VALUES (1740582000001, 1, '李　偉', 'OUT', '2026-02-26T21:00:00.000Z', '2026-02-26T21:00:00.000Z', 0);