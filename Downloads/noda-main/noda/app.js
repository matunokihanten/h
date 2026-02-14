const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const SHOP_EMAIL = process.env.SHOP_EMAIL || 'matunokihanten.yoyaku@gmail.com';
const GMAIL_USER = process.env.GMAIL_USER || 'matunokihanten.yoyaku@gmail.com'; 
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS || 'gphm kodc uzbp dcmh'; 
const DATA_FILE = path.join(__dirname, 'queue-data.json');

let queue = [];
let nextNumber = 1;
let isAccepting = true;
let stopTimer = null;
let stats = {
    totalToday: 0,
    completedToday: 0,
    averageWaitTime: 10 // 初期値（目安として10分を設定）
};
const pendingTimers = {}; // 不在キャンセルのタイマー管理用

// データ永続化：起動時に読み込み
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            queue = data.queue || [];
            nextNumber = data.nextNumber || 1;
            isAccepting = data.isAccepting !== undefined ? data.isAccepting : true;
            stats = data.stats || stats;
            console.log('✅ データを復元しました:', { queue: queue.length, nextNumber, isAccepting });
        }
    } catch (error) {
        console.error('❌ データ読み込みエラー:', error.message);
    }
}

// データ永続化：変更時に保存
function saveData() {
    try {
        const data = { queue, nextNumber, isAccepting, stats, lastUpdated: new Date().toISOString() };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ データ保存エラー:', error.message);
    }
}

const getJSTime = () => new Date().toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
});

const getFullDateTime = () => new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
});

let transporter;
try {
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }
    });
} catch (error) { console.error('❌ メール設定エラー:', error.message); }

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/api/stats', (req, res) => res.json({ queue: queue.length, totalToday: stats.totalToday, completedToday: stats.completedToday, averageWaitTime: stats.averageWaitTime, isAccepting }));

io.on('connection', (socket) => {
    socket.emit('init', { isAccepting, queue, stats });

        socket.on('register', (data) => {
        if (!isAccepting) return socket.emit('error', { message: '現在受付を停止しています' });
        
        try {
            // 番号の発行（店舗はS、ネットはW）
            const prefix = data.type === 'shop' ? 'S' : 'W';
            const displayId = `${prefix}-${nextNumber++}`;
            
            const newGuest = { 
                displayId, 
                ...data, 
                status: 'waiting', 
                time: getJSTime(), 
                fullDateTime: getFullDateTime(), 
                timestamp: Date.now()
            };
            
            queue.push(newGuest);
            stats.totalToday++;
            saveData();
            
            // 画面更新を通知
            io.emit('update', { queue, stats });
            socket.emit('registered', newGuest);
            console.log(`✅ 新規受付: ${displayId} (${data.type})`);

            // 【ここがポイント！】ネット受付(web)の時だけメールを送信する
            if (data.type === 'web' && transporter) {
                transporter.sendMail({
                    from: GMAIL_USER,
                    to: SHOP_EMAIL,
                    subject: `【松乃木飯店】ネット予約：${displayId}`,
                    text: `ネットから順番待ちが入りました。\n\n番号：${displayId}\n大人：${data.adults}名\n子供：${data.children}名\n幼児：${data.infants}名\n希望：${data.pref}\n時刻：${newGuest.fullDateTime}`
                }).then(() => {
                    console.log(`✉️ ネット予約メール送信完了: ${displayId}`);
                }).catch(err => {
                    console.error("❌ メール送信失敗:", err.message);
                });
            }
        } catch (error) {
            socket.emit('error', { message: '受付に失敗しました' });
        }
    });


    // 📣 呼び出し処理（特定のスマホを鳴らす＆画面切り替え）
    socket.on('callGuest', (displayId) => {
        const guest = queue.find(g => g.displayId === displayId);
        if (guest) {
            io.emit('calledNotice', { displayId }); // 全体に通知し、クライアント側でID一致判定
            console.log(`📢 呼出中: ${displayId}`);
        }
    });

    // 📍 来店チェックイン処理
    socket.on('checkIn', (displayId) => {
        const guest = queue.find(g => g.displayId === displayId);
        if (guest) {
            guest.status = 'checked-in';
            guest.checkInTime = getJSTime();
            // 不在タイマーが動いていたら解除する
            if (pendingTimers[displayId]) {
                clearTimeout(pendingTimers[displayId]);
                delete pendingTimers[displayId];
            }
            saveData();
            io.emit('update', { queue, stats });
            socket.emit('checkInSuccess', { displayId });
            console.log(`📍 来店確認: ${displayId}`);
        }
    });

    // ⚠️ 不在処理（10分タイマー開始）
    socket.on('setPending', (displayId) => {
        const guest = queue.find(g => g.displayId === displayId);
        if (guest) {
            guest.status = 'pending';
            guest.pendingStart = Date.now(); // タイマー開始時刻を記録
            io.emit('update', { queue, stats });

            // 既存のタイマーがあればリセット
            if (pendingTimers[displayId]) clearTimeout(pendingTimers[displayId]);
            
            // 10分（600000ミリ秒）後に自動削除
            pendingTimers[displayId] = setTimeout(() => {
                queue = queue.filter(g => g.displayId !== displayId);
                delete pendingTimers[displayId];
                saveData();
                io.emit('update', { queue, stats });
                console.log(`⏱️ 自動キャンセル実行: ${displayId}`);
            }, 600000);
            
            console.log(`⚠️ 不在保留(10分タイマー開始): ${displayId}`);
        }
    });

    // ステータス更新（完了・削除・セルフキャンセル）
    socket.on('updateStatus', ({ displayId, status }) => {
        if (status === 'delete' || status === 'completed') {
            const guest = queue.find(g => g.displayId === displayId);
            if (guest && status === 'completed') {
                stats.completedToday++;
                const waitTime = (Date.now() - guest.timestamp) / 1000 / 60;
                stats.averageWaitTime = Math.round((stats.averageWaitTime * (stats.completedToday - 1) + waitTime) / stats.completedToday);
            }
            queue = queue.filter(g => g.displayId !== displayId);
            if (pendingTimers[displayId]) {
                clearTimeout(pendingTimers[displayId]);
                delete pendingTimers[displayId];
            }
            saveData();
            console.log(status === 'completed' ? `✅ 案内完了: ${displayId}` : `🗑️ キャンセル/削除: ${displayId}`);
        }
        io.emit('update', { queue, stats });
    });

    socket.on('setAcceptance', (data) => {
        isAccepting = data.status;
        if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
        if (!isAccepting && data.duration > 0) {
            stopTimer = setTimeout(() => {
                isAccepting = true;
                io.emit('statusChange', { isAccepting, message: '受付を自動再開しました' });
                saveData(); stopTimer = null;
            }, data.duration * 60000);
        }
        saveData();
        io.emit('statusChange', { isAccepting });
    });

    socket.on('resetStats', () => {
        stats = { totalToday: 0, completedToday: 0, averageWaitTime: 10 };
        saveData();
        io.emit('update', { queue, stats });
    });
});

loadData();
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 松乃木飯店 受付システム起動 (Port:${PORT})`);
});
