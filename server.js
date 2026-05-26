const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const QRCode = require('qrcode');
const localtunnel = require('localtunnel');

const app = express();
const PORT = 3333;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `screenshot-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// SSE clients (máy tính đang mở trang web)
const sseClients = new Set();

let publicUrl = null;

app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function getLocalIP() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

app.get('/', async (req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(png|jpg|jpeg|gif|webp|heic)$/i.test(f))
    .sort()
    .reverse();

  const gallery = files.map(f => `
    <div class="thumb">
      <a href="/uploads/${f}" target="_blank">
        <img src="/uploads/${f}" loading="lazy">
        <div class="thumb-meta">${f}</div>
      </a>
      <a class="thumb-dl" href="/uploads/${f}" download="${f}" title="Tải xuống">↓</a>
      <button class="thumb-cp" onclick="copyImage(this, '/uploads/${f}')" title="Copy ảnh">⎘</button>
    </div>`).join('');

  const lanUrl = `http://${getLocalIP()}:${PORT}`;
  const qrLan = await QRCode.toDataURL(lanUrl, {
    width: 140, margin: 1,
    color: { dark: '#c8c8c8', light: '#0a0a0a' },
  });
  const qrPublic = publicUrl ? await QRCode.toDataURL(publicUrl, {
    width: 140, margin: 1,
    color: { dark: '#f97316', light: '#0a0a0a' },
  }) : null;

  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NEM//FILE</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #080808;
      --surface: #0e0e0e;
      --border: #1a1a1a;
      --border-hi: #2c2c2c;
      --accent: #f97316;
      --accent-dim: rgba(249,115,22,0.08);
      --text: #d4d4d4;
      --muted: #8a8a8a;
      --faint: #5a5a5a;
      --mono: 'IBM Plex Mono', monospace;
      --display: 'Bebas Neue', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--mono);
      background-color: var(--bg);
      background-image:
        linear-gradient(var(--border) 1px, transparent 1px),
        linear-gradient(90deg, var(--border) 1px, transparent 1px);
      background-size: 48px 48px;
      color: var(--text);
      min-height: 100vh;
    }

    /* grain */
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.35;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
    }

    .wrap { max-width: 980px; margin: 0 auto; padding: 36px 28px 80px; }

    /* ── Header ── */
    header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-hi);
      padding-bottom: 18px;
      margin-bottom: 40px;
    }
    .logo {
      font-family: var(--display);
      font-size: 3.2rem;
      color: #fff;
      letter-spacing: 3px;
      line-height: 1;
    }
    .logo em { color: var(--accent); font-style: normal; }
    .header-right {
      text-align: right;
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--muted);
      line-height: 2;
    }
    .pulse {
      display: inline-block;
      width: 5px; height: 5px;
      background: var(--accent);
      border-radius: 50%;
      margin-right: 5px;
      vertical-align: middle;
      animation: blink 2s ease infinite;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }

    /* ── Upload zone ── */
    .drop-zone {
      position: relative;
      background: var(--surface);
      border: 1px solid var(--border-hi);
      padding: 56px 32px;
      text-align: center;
      cursor: pointer;
      margin-bottom: 12px;
      transition: border-color .15s, background .15s;
    }
    /* corner brackets */
    .drop-zone::before, .drop-zone::after,
    .drop-zone .corner-br, .drop-zone .corner-tl-inner {
      content: '';
      position: absolute;
      width: 18px; height: 18px;
    }
    .drop-zone::before { top:-1px; left:-1px; border-top:2px solid var(--accent); border-left:2px solid var(--accent); }
    .drop-zone::after  { bottom:-1px; right:-1px; border-bottom:2px solid var(--accent); border-right:2px solid var(--accent); }

    .drop-zone.drag, .drop-zone:hover {
      border-color: var(--accent);
      background: var(--accent-dim);
    }
    .drop-label {
      font-family: var(--display);
      font-size: 1.6rem;
      letter-spacing: 4px;
      color: var(--muted);
      display: block;
      margin-bottom: 24px;
    }
    input[type=file] { display:none; }
    .btn {
      font-family: var(--mono);
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      background: transparent;
      color: var(--accent);
      border: 1px solid var(--accent);
      padding: 12px 32px;
      cursor: pointer;
      transition: background .12s, color .12s;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover, .btn:active { background: var(--accent); color: #000; }

    /* ── Status ── */
    #status {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--muted);
      min-height: 20px;
      margin: 10px 0 32px;
      padding-left: 2px;
      transition: color .2s;
    }
    #status.live { color: var(--accent); }

    /* ── Gallery header ── */
    .gallery-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }
    .g-label {
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: var(--muted);
      white-space: nowrap;
    }
    .g-count {
      font-size: 0.6rem;
      color: var(--accent);
      border: 1px solid currentColor;
      padding: 1px 7px;
      letter-spacing: 1px;
    }
    .g-line { flex:1; height:1px; background: var(--border-hi); }
    .btn-clear {
      font-family: var(--mono);
      font-size: 0.6rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--border-hi);
      padding: 4px 12px;
      cursor: pointer;
      transition: color .12s, border-color .12s;
    }
    .btn-clear:hover { color: #e55; border-color: #e55; }

    /* ── Gallery grid ── */
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
      gap: 5px;
    }
    .thumb {
      position: relative;
      border: 1px solid var(--border);
      overflow: hidden;
      aspect-ratio: 4/3;
      background: var(--surface);
      transition: border-color .15s;
    }
    .thumb:hover { border-color: var(--border-hi); }
    .thumb a { display:block; height:100%; }
    .thumb a.thumb-dl { height:26px; }
    .thumb img {
      width:100%; height:100%;
      object-fit: cover;
      display: block;
      transition: transform .3s ease, opacity .2s;
    }
    .thumb:hover img { transform: scale(1.03); opacity: .88; }
    .thumb-meta {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      padding: 5px 8px;
      background: linear-gradient(transparent, rgba(0,0,0,.85));
      font-size: 0.52rem;
      color: #aaa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0;
      transition: opacity .15s;
    }
    .thumb:hover .thumb-meta { opacity: 1; }
    .thumb-dl {
      position: absolute;
      top: 6px; right: 6px;
      width: 26px; height: 26px;
      background: rgba(0,0,0,0.7);
      border: 1px solid var(--border-hi);
      color: var(--text);
      display: flex; align-items: center; justify-content: center;
      opacity: 0;
      transition: opacity .15s, background .12s;
      cursor: pointer;
      text-decoration: none;
      font-size: 11px;
    }
    .thumb:hover .thumb-dl { opacity: 1; }
    .thumb-dl:hover { background: var(--accent); color: #000; border-color: var(--accent); }
    .thumb-cp {
      position: absolute;
      top: 6px; right: 36px;
      width: 26px; height: 26px;
      background: rgba(0,0,0,0.7);
      border: 1px solid var(--border-hi);
      color: var(--text);
      display: flex; align-items: center; justify-content: center;
      opacity: 0;
      transition: opacity .15s, background .12s;
      cursor: pointer;
      font-size: 11px;
      padding: 0;
      box-sizing: border-box;
    }
    .thumb:hover .thumb-cp { opacity: 1; }
    .thumb-cp:hover { background: var(--accent); color: #000; border-color: var(--accent); }
    .thumb-cp.copied { background: #2a2; border-color: #2a2; color: #fff; opacity: 1; }
    /* new badge (fades after 4s via JS) */
    .thumb-new { border-color: var(--accent) !important; }
    .thumb-new::after {
      content: 'NEW';
      position: absolute;
      top: 6px; right: 6px;
      font-size: 0.48rem;
      font-weight: 600;
      letter-spacing: 1.5px;
      background: var(--accent);
      color: #000;
      padding: 2px 5px;
    }

    .empty {
      grid-column: 1/-1;
      text-align: center;
      padding: 48px 0;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: var(--muted);
    }

    /* ── QR ── */
    .qr-group {
      position: fixed;
      bottom: 24px; right: 24px;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      z-index: 100;
    }
    .qr {
      position: relative;
      background: var(--surface);
      border: 1px solid var(--border-hi);
      padding: 10px 10px 8px;
    }
    .qr::before {
      content: '';
      position: absolute;
      top:-1px; left:-1px;
      width:12px; height:12px;
      border-top:2px solid var(--accent);
      border-left:2px solid var(--accent);
    }
    .qr.tunnel::before { border-color: var(--accent); }
    .qr img { display:block; width:96px; height:96px; }
    .qr-tag {
      font-size: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--muted);
      text-align: center;
      margin-top: 7px;
    }
    .qr.tunnel .qr-tag { color: var(--accent); }
    .qr-url {
      font-size: 0.44rem;
      color: var(--muted);
      text-align: center;
      margin-top: 2px;
      word-break: break-all;
      max-width: 96px;
    }
  </style>
</head>
<body>
  <div class="qr-group">
    <div class="qr">
      <img src="${qrLan}" alt="LAN QR">
      <div class="qr-tag">// LAN</div>
      <div class="qr-url">${lanUrl}</div>
    </div>
    ${qrPublic ? `<div class="qr tunnel">
      <img src="${qrPublic}" alt="Public QR">
      <div class="qr-tag">// PUBLIC</div>
      <div class="qr-url">${publicUrl}</div>
    </div>` : ''}
  </div>

  <div class="wrap">
    <header>
      <div class="logo">NEM<em>//</em>FILE</div>
      <div class="header-right">
        <span class="pulse"></span>ONLINE · :${PORT}<br>
        ${publicUrl ? '<span style="color:var(--accent)">// PUBLIC TUNNEL ACTIVE</span>' : '// LAN ONLY'}<br>
        SCREENSHOT TRANSFER SYS
      </div>
    </header>

    <div class="drop-zone" id="dropzone">
      <span class="drop-label">DROP FILE — HOẶC CHỌN TỪ THƯ VIỆN</span>
      <input type="file" id="fileInput" accept="image/*" multiple>
      <button class="btn" onclick="document.getElementById('fileInput').click()">[ SELECT FILE ]</button>
    </div>

    <div id="status">// AWAITING INPUT</div>

    <div class="gallery-header">
      <span class="g-label">Transfer Log</span>
      <span class="g-count" id="count">${files.length}</span>
      <div class="g-line"></div>
      <button class="btn-clear" id="clearBtn" onclick="clearFiles()">[ CLEAR ]</button>
    </div>

    <div class="gallery" id="gallery">
      ${files.length === 0 ? '<p class="empty">// NO FILES TRANSFERRED</p>' : gallery}
    </div>
  </div>

  <script>
    const input = document.getElementById('fileInput');
    const statusEl = document.getElementById('status');
    const dropzone = document.getElementById('dropzone');
    const countEl = document.getElementById('count');

    function setStatus(msg, active) {
      statusEl.textContent = msg;
      statusEl.className = active ? 'live' : '';
    }

    input.addEventListener('change', () => uploadFiles(Array.from(input.files)));
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('drag');
      uploadFiles(Array.from(e.dataTransfer.files));
    });

    async function uploadFiles(files) {
      for (const file of files) {
        setStatus('// UPLOADING ' + file.name, true);
        const fd = new FormData();
        fd.append('image', file);
        try {
          const res = await fetch('/upload', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.ok) {
            setStatus('// OK — ' + data.filename, true);
          } else {
            setStatus('// ERR: ' + data.error, false);
          }
        } catch {
          setStatus('// CONNECTION FAILED — SAME WIFI?', false);
        }
      }
      setTimeout(() => setStatus('// AWAITING INPUT', false), 3000);
    }

    function prependToGallery(filename, url, isNew) {
      const gallery = document.getElementById('gallery');
      const empty = gallery.querySelector('.empty');
      if (empty) empty.remove();
      const div = document.createElement('div');
      div.className = 'thumb' + (isNew ? ' thumb-new' : '');
      div.innerHTML = '<a href="' + url + '" target="_blank"><img src="' + url + '" loading="lazy"><div class="thumb-meta">' + filename + '</div></a><a class="thumb-dl" href="' + url + '" download="' + filename + '" title="Tải xuống">↓</a><button class="thumb-cp" onclick="copyImage(this, \'' + url + '\')" title="Copy ảnh">⎘</button>';
      gallery.prepend(div);
      countEl.textContent = gallery.querySelectorAll('.thumb').length;
      if (isNew) setTimeout(() => div.classList.remove('thumb-new'), 4000);
    }

    async function copyImage(btn, url) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const mime = blob.type.startsWith('image/') ? blob.type : 'image/png';
        await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
        btn.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '⎘'; btn.classList.remove('copied'); }, 2000);
      } catch {
        btn.textContent = '✗';
        setTimeout(() => { btn.textContent = '⎘'; }, 2000);
      }
    }

    async function clearFiles() {
      if (!confirm('Xoá tất cả file?')) return;
      const res = await fetch('/clear', { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('gallery').innerHTML = '<p class="empty">// NO FILES TRANSFERRED</p>';
        countEl.textContent = '0';
        setStatus('// CLEARED — ' + data.deleted + ' FILES', true);
        setTimeout(() => setStatus('// AWAITING INPUT', false), 3000);
      }
    }

    // Realtime từ iPad
    const es = new EventSource('/events');
    es.onmessage = e => {
      const { filename, url } = JSON.parse(e.data);
      prependToGallery(filename, url, true);
      setStatus('// RECEIVED — ' + filename, true);
      setTimeout(() => setStatus('// AWAITING INPUT', false), 3000);
    };
  </script>
</body>
</html>`);
});

app.delete('/clear', (req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR);
  files.forEach(f => fs.unlinkSync(path.join(UPLOADS_DIR, f)));
  res.json({ ok: true, deleted: files.length });
});

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.json({ ok: false, error: 'Không có file' });
  const payload = { filename: req.file.filename, url: '/uploads/' + req.file.filename };
  // Đẩy event tới tất cả browser đang mở trang
  for (const client of sseClients) {
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
  res.json({ ok: true, ...payload });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log('\nScreenshot Drop đang chạy:\n');
  console.log('  Local:   http://localhost:' + PORT);

  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log('  LAN:     http://' + net.address + ':' + PORT);
      }
    }
  }

  console.log('\n  Đang tạo tunnel public...');
  try {
    const tunnel = await localtunnel({ port: PORT });
    publicUrl = tunnel.url;
    console.log('  Public:  ' + publicUrl + '  ← dùng cái này khi khác mạng\n');
    console.log('  (Lần đầu mở link có thể hỏi xác nhận — bấm "Click to Continue")\n');

    tunnel.on('close', () => {
      publicUrl = null;
      console.log('  Tunnel đã đóng.');
    });
    tunnel.on('error', err => {
      publicUrl = null;
      console.error('  Tunnel lỗi:', err.message);
    });
  } catch (err) {
    console.error('  Không tạo được tunnel:', err.message);
    console.log('  → Chỉ dùng được trong LAN.\n');
  }
});
