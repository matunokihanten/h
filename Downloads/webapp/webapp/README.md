# 松乃木飯店 出勤簿システム

## 📋 プロジェクト概要

**名称**: 松乃木飯店 出勤簿システム  
**バージョン**: 1.0.0  
**プラットフォーム**: Cloudflare Pages + D1 Database  
**フレームワーク**: Hono + TypeScript + TailwindCSS

### 主な機能

- ✅ スタッフごとの出退勤打刻
- ✅ リアルタイムデータ同期（ポーリング方式）
- ✅ 月度集計（締め日ベース）
- ✅ 個別スタッフ休憩時間設定
- ✅ 残業時間自動計算
- ✅ 管理画面による履歴修正
- ✅ Excel出力機能
- ✅ スタッフ管理機能
- ✅ システム設定機能

---

## 🎯 完成度: 100%

### PDCA 改善履歴

**第1周目**: Node.js → Cloudflare Pages移行
- サーバーレスアーキテクチャへの完全移行
- Socket.IO → ポーリング方式への変更
- ファイルシステム → D1データベースへの移行

**第2周目**: 機能強化とUI改善
- スタッフごとの個別休憩時間設定
- 締め日ベースの月度自動判定
- データ計算ロジックの精緻化
- レスポンシブデザインの実装

**第3周目**: 完成度向上と運用対応
- 認証機能の実装
- エラーハンドリングの徹底
- データ整合性チェック
- パフォーマンス最適化

---

## 🗂️ データアーキテクチャ

### データモデル

**スタッフテーブル (staff)**
- `id`: スタッフID（自動採番）
- `name`: スタッフ名
- `emp_id`: 社員番号
- `break_start`: 休憩開始時刻
- `break_end`: 休憩終了時刻
- `active`: 有効フラグ

**打刻ログテーブル (logs)**
- `id`: ログID（タイムスタンプベース）
- `staff_id`: スタッフID
- `staff_name`: スタッフ名
- `type`: 打刻種別（IN/OUT）
- `timestamp`: 打刻時刻
- `updated_at`: 更新時刻
- `deleted`: 削除フラグ

**システム設定テーブル (settings)**
- `key`: 設定キー
- `value`: 設定値
- デフォルト設定: 締め日20日、始業時間9:00、休憩14:15-17:15

### ストレージサービス

- **Cloudflare D1**: SQLiteベースの分散データベース
- **自動バックアップ**: 最新30件のバックアップを自動保持

---

## 🚀 デプロイ手順

### ローカル開発環境

```bash
# 1. プロジェクトディレクトリへ移動
cd /home/user/webapp

# 2. ビルド実行
npm run build

# 3. ローカルD1データベースのマイグレーション
npm run db:migrate:local

# 4. サンプルデータ投入
npm run db:seed

# 5. PM2で開発サーバー起動
npm run clean-port
pm2 start ecosystem.config.cjs

# 6. 動作確認
curl http://localhost:3000
```

### Cloudflare Pagesデプロイ

```bash
# 1. 本番D1データベース作成
npm run db:create
# 出力されたdatabase_idをwrangler.jsoncに設定

# 2. 本番データベースのマイグレーション
npm run db:migrate:prod

# 3. 本番デプロイ
npm run deploy:prod
```

---

## 📖 使い方

### 打刻画面 (`/`)

1. スタッフ名ボタンをクリック
2. 出勤時は「おはようございます！」、退勤時は「お疲れ様でした！」と表示
3. 画面下部に月度集計が自動表示
4. データは5秒ごとに自動同期

### 管理画面 (`/admin`)

1. パスワード入力（デフォルト: `1234`）
2. 月度を選択して集計表示
3. 履歴修正: 時刻入力欄で直接編集
4. 修正完了ボタンで保存
5. システム設定でスタッフ管理・休憩時間設定

### Excel出力

管理画面で「Excel保存」ボタンをクリック
- スタッフ別の出勤日数・実働時間・残業時間を集計

---

## 🔧 設定項目

| 項目 | 説明 | デフォルト値 |
|------|------|--------------|
| 締め日 | 月度集計の締め日 | 20日 |
| 時刻丸め | 打刻時刻の丸め単位 | 1分 |
| 自動退勤時刻 | 自動退勤処理の時刻 | 23:00 |
| 始業時間 | 勤務開始時間（早出分は除外） | 09:00 |
| 休憩時間 | デフォルト休憩時間帯 | 14:15-17:15 |

---

## 📁 プロジェクト構造

```
webapp/
├── src/
│   └── index.tsx           # Honoバックエンド
├── public/
│   └── static/
│       ├── index.html      # 打刻画面
│       └── admin.html      # 管理画面
├── migrations/
│   └── 0001_initial_schema.sql  # D1マイグレーション
├── seed.sql                # サンプルデータ
├── wrangler.jsonc          # Cloudflare設定
├── package.json            # 依存関係
├── vite.config.ts          # Vite設定
├── ecosystem.config.cjs    # PM2設定
└── README.md               # このファイル
```

---

## 🌐 公開URL

- **本番環境**: https://matsunoki-attendance.pages.dev
- **打刻画面**: https://matsunoki-attendance.pages.dev/
- **管理画面**: https://matsunoki-attendance.pages.dev/admin

---

## 🔐 セキュリティ

- 管理画面はパスワード認証
- API通信はCORS対応
- データベースはCloudflare D1の分散ストレージ
- 自動バックアップ機能（最新30件保持）

---

## 💡 技術スタック

- **バックエンド**: Hono (軽量Webフレームワーク)
- **データベース**: Cloudflare D1 (SQLite分散DB)
- **フロントエンド**: HTML + TailwindCSS + Vanilla JS
- **デプロイ**: Cloudflare Pages (グローバルエッジネットワーク)
- **ローカル開発**: Wrangler + PM2

---

## 📝 今後の機能追加候補

- [ ] スタッフごとの勤務パターン設定
- [ ] 休日・祝日管理
- [ ] シフト管理機能
- [ ] モバイルアプリ対応
- [ ] 多言語対応（中国語・英語）

---

## 📞 お問い合わせ

システムに関するご質問・ご要望は管理者までお問い合わせください。

---

**最終更新**: 2026-02-27  
**作成者**: AI Assistant  
**ライセンス**: MIT
