const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// 設定：メール（必要に応じて変更してください）
const SHOP_EMAIL = 'matunokihanten.yoyaku@gmail.com';
const GMAIL_USER = 'matunokihanten.yoyaku@gmail.com'; 
const GMAIL_APP_PASS = 'gphm kodc uzbp dcmh'; 

// データ管理
let queue = [];
let nextNumber = 1;
let isAccepting = true;
let stopTimer = null;
let lastDate = new Date().toLocaleDateString('ja-JP'); // 日付リセット用

const getJSTime = () => new Date().toLocaleTimeString('ja-JP', {timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit'});

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }
});

// --- ルーティング設定 (ファイルを分けるための設定) ---
// 店舗用: /shop -> shop.html
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'shop.html')));
// 管理用: /admin -> admin.html
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
// QRチェックイン用: /checkin -> checkin.html
app.get('/checkin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'checkin.html')));
// ネット用（デフォルト）: / -> index.html

// --- 日付変更チェック関数 ---
function checkDateReset() {
    const today = new Date().toLocaleDateString('ja-JP');
    if (lastDate !== today) {
        console.log(`日付変更: ${lastDate} -> ${today}。キューをリセットします。`);
        // 必要ならここで昨日のデータをDBに保存する処理などを入れます
        queue = [];
        nextNumber = 1;
        lastDate = today;
        io.emit('update', { queue });
        return true;
    }
    return false;
}

io.on('connection', (socket) => {
    // 接続時にまず日付チェック
    checkDateReset();
    
    socket.emit('init', { isAccepting, queue });

    // 新規受付
    socket.on('register', (data) => {
        if (checkDateReset()) return; // 日付またぎ対応
        if (!isAccepting) return;

        const prefix = data.type === 'shop' ? 'S' : 'W';
        const displayId = `${prefix}-${nextNumber++}`;
        
        // status: 'waiting' (待ち), 'arrived' (到着済み)
        const newGuest = { displayId, ...data, status: 'waiting', time: getJSTime() };
        queue.push(newGuest);
        
        io.emit('update', { queue });
        socket.emit('registered', newGuest); // 本人に通知

        if (data.type === 'web') {
            const mailOptions = {
                from: GMAIL_USER, to: SHOP_EMAIL,
                subject: `【松乃木飯店】新規予約 ${displayId}`,
                text: `予約通知\n\n番号：${displayId}\nステータス：${newGuest.status}\n大人：${data.adults}\n子供：${data.children}\n幼児：${data.infants}\n希望：${data.pref}\n時間：${newGuest.time}`
            };
            transporter.sendMail(mailOptions).catch(console.error);
        }
    });

    // ステータス更新（削除や到着）
    socket.on('updateStatus', ({ displayId, status }) => {
        if (checkDateReset()) return;

        if (status === 'delete') {
            queue = queue.filter(g => g.displayId !== displayId);
        } else if (status === 'arrived') {
            const guest = queue.find(g => g.displayId === displayId);
            if (guest) {
                guest.status = 'arrived';
                // 到着通知メールを送るならここに記述
            }
        }
        io.emit('update', { queue });
    });

    // 管理画面設定
    socket.on('setAcceptance', (data) => {
        isAccepting = data.status;
        if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }

        if (!isAccepting && data.duration > 0) {
            stopTimer = setTimeout(() => {
                isAccepting = true;
                io.emit('statusChange', isAccepting);
                stopTimer = null;
            }, data.duration * 60000);
        }
        io.emit('statusChange', isAccepting);
    });

    // 強制リセット（管理画面用）
    socket.on('forceReset', () => {
        queue = [];
        nextNumber = 1;
        io.emit('update', { queue });
    });
});

server.listen(process.env.PORT || 10000, () => {
    console.log('Server running on port 10000');
});
