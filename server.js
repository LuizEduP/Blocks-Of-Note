// ============================================
// server.js — Servidor HTTP + WebSocket
// Workspace Colaborativo (board modular + desenho + chat)
// ============================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
};

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ============================================
// HELPERS — Workspace persistence
// ============================================

function getWorkspacesPath() {
    return path.join(DATA_DIR, 'workspaces.json');
}

function readWorkspaces() {
    try {
        const raw = fs.readFileSync(getWorkspacesPath(), 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeWorkspaces(list) {
    fs.writeFileSync(getWorkspacesPath(), JSON.stringify(list, null, 2), 'utf-8');
}

// ============================================
// HTTP server
// ============================================

const server = http.createServer((req, res) => {
    const method = req.method;
    let url = req.url.split('?')[0];

    // ---- Redirects (merged pages) ----
    if (url === '/taskboard' || url === '/taskboard/' || url === '/taskboard/index.html') {
        res.writeHead(301, { 'Location': '/tasks/' });
        res.end();
        return;
    }

    // ---- API routes ----
    if (url === '/api/workspaces' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(readWorkspaces()));
        return;
    }

    if (url === '/api/workspaces' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const list = readWorkspaces();

                // Update if existing code, otherwise push new
                const idx = list.findIndex(w => w.code === data.code);
                const entry = {
                    code: data.code,
                    title: data.title || 'Sem título',
                    savedAt: new Date().toISOString(),
                    userCount: data.userCount || 0
                };

                if (idx >= 0) {
                    list[idx] = { ...list[idx], ...entry };
                } else {
                    list.push(entry);
                }

                writeWorkspaces(list);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, workspace: entry }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (url.startsWith('/api/workspaces/') && method === 'DELETE') {
        const code = url.replace('/api/workspaces/', '');
        if (!code) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing code' }));
            return;
        }
        const list = readWorkspaces();
        const filtered = list.filter(w => w.code !== code);
        if (filtered.length === list.length) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
        }
        writeWorkspaces(filtered);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    // ---- Static files ----

    // Redirect /dir -> /dir/ so relative CSS/JS paths resolve correctly
    if (!url.endsWith('/') && path.extname(url) === '' && url !== '/') {
        const candidateDir = path.join(PUBLIC_DIR, url);
        const candidateIndex = path.join(candidateDir, 'index.html');
        if (candidateDir.startsWith(PUBLIC_DIR) && fs.existsSync(candidateIndex)) {
            res.writeHead(301, { 'Location': url + '/' });
            res.end();
            return;
        }
    }

    // Serve index.html for directory paths (e.g. /notes/ -> /notes/index.html)
    if (url.endsWith('/') || path.extname(url) === '') {
        url = path.join(url, 'index.html').replace(/\\/g, '/');
    }

    // Default: / -> /index.html
    if (url === '/') url = '/index.html';

    const filePath = path.join(PUBLIC_DIR, url);

    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Try fallback: serve index.html if navigating to a directory without trailing slash
                if (!url.endsWith('index.html')) {
                    const dirPath = path.join(PUBLIC_DIR, req.url.split('?')[0], 'index.html');
                    if (dirPath.startsWith(PUBLIC_DIR)) {
                        return fs.readFile(dirPath, (err2, data2) => {
                            if (!err2) {
                                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                                return res.end(data2);
                            }
                            res.writeHead(404);
                            res.end('404 — Not Found');
                        });
                    }
                }
                res.writeHead(404);
                res.end('404 — Not Found');
            } else {
                res.writeHead(500);
                res.end('500 — Internal Server Error');
            }
            return;
        }
        // Prevent browser caching so deploys reflect immediately
        const headers = {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, must-revalidate'
        };
        res.writeHead(200, headers);
        res.end(data);
    });
});

// ============================================
// WebSocket — Workspace Colaborativo
// ============================================

const wss = new WebSocketServer({ server });

// rooms: Map<roomCode, { clients: Set<ws>, doc: {title}, blocks: Array, strokes: Array, messages: Array }>
const rooms = new Map();
const MAX_HISTORY = 200;
const MAX_BLOCKS = 500;

function getRoom(code, createIfMissing = true) {
    let room = rooms.get(code);
    if (!room && createIfMissing) {
        room = {
            clients: new Set(),
            doc: { title: 'Sem título' },
            blocks: [],
            strokes: [],
            messages: []
        };
        rooms.set(code, room);
    }
    return room || null;
}

function broadcast(roomCode, data) {
    const room = rooms.get(roomCode);
    if (!room) return;
    const msg = JSON.stringify(data);
    for (const ws of room.clients) {
        if (ws.readyState === 1) ws.send(msg);
    }
}

function sendTo(ws, data) {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (raw) => {
        try {
            const data = JSON.parse(raw.toString());
            const { type } = data;

            switch (type) {
                case 'create-room': {
                    let code;
                    do { code = generateCode(); } while (rooms.has(code));

                    const room = getRoom(code);
                    currentRoom = code;
                    room.clients.add(ws);

                    sendTo(ws, {
                        type: 'room-created',
                        code,
                        doc: room.doc,
                        blocks: room.blocks,
                        strokes: room.strokes,
                        messages: room.messages
                    });
                    console.log(`🏠 Sala criada: ${code}`);
                    break;
                }

                case 'join-room': {
                    const code = (data.code || '').toUpperCase().trim();
                    if (!code || code.length < 2) {
                        sendTo(ws, { type: 'error', message: 'Código inválido' });
                        return;
                    }

                    const room = getRoom(code, false);
                    if (!room) {
                        sendTo(ws, { type: 'error', message: 'Sala não encontrada' });
                        return;
                    }

                    if (currentRoom && rooms.has(currentRoom)) {
                        const old = rooms.get(currentRoom);
                        old.clients.delete(ws);
                        if (old.clients.size === 0) rooms.delete(currentRoom);
                    }

                    currentRoom = code;
                    room.clients.add(ws);

                    broadcast(code, { type: 'user-joined', count: room.clients.size });

                    sendTo(ws, {
                        type: 'room-joined',
                        code,
                        doc: room.doc,
                        blocks: room.blocks,
                        strokes: room.strokes,
                        messages: room.messages
                    });
                    console.log(`🚪 Entrou: ${code} (${room.clients.size})`);
                    break;
                }

                // Doc title
                case 'doc-title': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room) return;
                    room.doc.title = data.title || 'Sem título';
                    broadcast(currentRoom, { type: 'doc-title', title: room.doc.title });
                    break;
                }

                // Blocks (modular text/image blocks)
                case 'block-create': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room) return;
                    const block = data.block;
                    if (!block || !block.id) return;
                    room.blocks.push(block);
                    if (room.blocks.length > MAX_BLOCKS) room.blocks = room.blocks.slice(-MAX_BLOCKS);
                    broadcast(currentRoom, { type: 'block-create', block });
                    break;
                }

                case 'block-update': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room) return;
                    const idx = room.blocks.findIndex(b => b.id === data.id);
                    if (idx >= 0) {
                        if (data.content !== undefined) room.blocks[idx].content = data.content;
                        if (data.width !== undefined) room.blocks[idx].width = data.width;
                        if (data.height !== undefined) room.blocks[idx].height = data.height;
                    }
                    broadcast(currentRoom, { type: 'block-update', id: data.id, content: data.content, width: data.width, height: data.height });
                    break;
                }

                case 'block-move': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room) return;
                    const idx2 = room.blocks.findIndex(b => b.id === data.id);
                    if (idx2 >= 0) {
                        if (data.x !== undefined) room.blocks[idx2].x = data.x;
                        if (data.y !== undefined) room.blocks[idx2].y = data.y;
                    }
                    broadcast(currentRoom, { type: 'block-move', id: data.id, x: data.x, y: data.y });
                    break;
                }

                case 'block-delete': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room) return;
                    room.blocks = room.blocks.filter(b => b.id !== data.id);
                    broadcast(currentRoom, { type: 'block-delete', id: data.id });
                    break;
                }

                case 'blocks-sync': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room) return;
                    room.blocks = data.blocks || [];
                    broadcast(currentRoom, { type: 'blocks-sync', blocks: room.blocks });
                    break;
                }

                // Desenho
                case 'draw-stroke': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room) return;
                    const stroke = data.stroke;
                    room.strokes.push(stroke);
                    if (room.strokes.length > 500) room.strokes = room.strokes.slice(-500);
                    broadcast(currentRoom, { type: 'draw-stroke', stroke });
                    break;
                }

                case 'draw-clear': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room) return;
                    room.strokes = [];
                    broadcast(currentRoom, { type: 'draw-clear' });
                    break;
                }

                case 'draw-undo': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room || room.strokes.length === 0) return;
                    room.strokes.pop();
                    broadcast(currentRoom, { type: 'draw-sync', strokes: room.strokes });
                    break;
                }

                // Chat
                case 'send-message': {
                    if (!currentRoom) return;
                    const room = rooms.get(currentRoom);
                    if (!room) return;
                    const msg = {
                        id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                        text: (data.text || '').trim().substring(0, 500),
                        user: data.user || 'Anônimo',
                        time: new Date().toISOString()
                    };
                    if (!msg.text) return;
                    room.messages.push(msg);
                    if (room.messages.length > MAX_HISTORY) room.messages = room.messages.slice(-MAX_HISTORY);
                    broadcast(currentRoom, { type: 'new-message', message: msg });
                    break;
                }
            }
        } catch (e) {
            console.error('❌ Erro:', e);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            room.clients.delete(ws);
            // Keep room in memory even when empty so saved workspaces can be rejoined
            console.log(`👋 Saiu: ${currentRoom} (${room.clients.size})`);
        }
    });

    ws.on('error', () => {});
});

server.listen(PORT, () => {
    console.log(`🚀 Commentarium rodando em http://localhost:${PORT}`);
});
