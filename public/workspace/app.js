/* ============================================
   workspace/app.js — Workspace Colaborativo
   Board modular (blocos de texto/imagem + desenho) + Chat
   Com servidor WebSocket e grid invisível com snap
   ============================================ */

const WS_URL = (function() {
    var loc = window.location;
    return (loc.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + loc.host;
})();

// Grid snap helper
function snapToGrid(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
}

class Workspace {
    constructor() {
        this.ws = null;
        this.roomCode = null;
        this.userName = '';
        this.userId = 'u-' + Math.random().toString(36).slice(2, 8);
        this.messages = [];
        this.docTitle = 'Sem título';
        this.blocks = [];
        this.strokes = [];
        this.reconnectAttempts = 0;
        this.maxReconnect = 5;

        // Board state
        this.activeTool = 'draw';       // 'draw' | 'text' | 'image'
        this.gridSize = 20;             // pixels per grid cell
        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 10;

        // Drawing state
        this._ctx = null;
        this._isDrawing = false;
        this._currentStroke = null;
        this._drawColor = '#000000';
        this._drawSize = 3;

        // Panning
        this._isPanning = false;
        this._panStart = { x: 0, y: 0 };
        this._panStartPan = { x: 0, y: 0 };

        // Dragging blocks
        this._dragging = null;         // currently dragged block DOM element
        this._dragStart = { x: 0, y: 0 };
        this._dragOrigPos = { x: 0, y: 0 };
        this._dragSnapped = { x: 0, y: 0 };

        // Block resizing
        this._resizing = null;
        this._resizeStart = { x: 0, y: 0, w: 0, h: 0 };
        this._resizeMin = 40;

        // Selected block
        this._selectedBlockId = null;

        // Text mode pending
        this._textFontSize = 16;

        // Zoom center tracking
        this._zoomCx = 0;
        this._zoomCy = 0;
    }

    // ======================== LOBBY ========================

    showLobby() {
        var lobby = document.getElementById('lobby-screen');
        var room = document.getElementById('room-screen');
        if (lobby) lobby.style.display = 'flex';
        if (room) room.style.display = 'none';
        this.roomCode = null;
        if (this.ws) {
            try { this.ws.close(); } catch (e) {}
            this.ws = null;
        }
        this.loadSavedWorkspaces();
    }

    showRoom(code) {
        this.roomCode = code;
        document.getElementById('lobby-screen').style.display = 'none';
        document.getElementById('room-screen').style.display = 'flex';
        document.getElementById('room-code-display').textContent = code;
        document.getElementById('doc-title-input').value = this.docTitle;

        this.renderChat();
        this.renderAllBlocks();
        this.updateBoardHint();
    }

    // ======================== WEBSOCKET ========================

    connect(onOpen) {
        if (this.ws) {
            try { this.ws.close(); } catch (e) {}
        }

        var self = this;
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = function() {
            self.reconnectAttempts = 0;
            console.log('Conectado ao servidor');
            if (onOpen) onOpen();
        };

        this.ws.onmessage = function(e) {
            try {
                self.handleMessage(JSON.parse(e.data));
            } catch (err) {
                console.error('Erro ao processar mensagem:', err);
            }
        };

        this.ws.onclose = function() {
            console.log('Conexão fechada');
            if (self.roomCode && self.reconnectAttempts < self.maxReconnect) {
                self.reconnectAttempts++;
                var delay = Math.min(1000 * Math.pow(2, self.reconnectAttempts), 8000);
                setTimeout(function() {
                    self.connect(function() {
                        self.send('join-room', {
                            code: self.roomCode,
                            user: self.userName || 'Anônimo'
                        });
                    });
                }, delay);
            }
        };

        this.ws.onerror = function() {
            console.log('Erro de conexão');
        };
    }

    send(type, extra) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket não conectado');
            return;
        }
        var data = Object.assign({ type: type }, extra || {});
        this.ws.send(JSON.stringify(data));
    }

    // ======================== HANDLE MESSAGES ========================

    handleMessage(data) {
        switch (data.type) {
            case 'room-created':
                this.docTitle = (data.doc && data.doc.title) || 'Sem título';
                this.blocks = data.blocks || [];
                this.strokes = data.strokes || [];
                this.messages = data.messages || [];
                this.showRoom(data.code);
                this.redrawCanvas();
                this.addSysMsg('Sala criada! Código: ' + data.code);
                break;

            case 'room-joined':
                this.docTitle = (data.doc && data.doc.title) || 'Sem título';
                this.blocks = data.blocks || [];
                this.strokes = data.strokes || [];
                this.messages = data.messages || [];
                this.showRoom(data.code);
                this.redrawCanvas();
                this.addSysMsg('Você entrou na sala');
                this.toast('Conectado à sala ' + data.code);
                break;

            case 'new-message':
                this.messages.push(data.message);
                this.renderChat();
                this.scrollChat();
                break;

            case 'user-joined':
                this.addSysMsg('Alguém entrou');
                this.updateUsers(data.count);
                break;

            case 'doc-title':
                this.docTitle = data.title || 'Sem título';
                var el = document.getElementById('doc-title-input');
                if (el) el.value = this.docTitle;
                break;

            // Blocks
            case 'block-create':
                if (data.block) {
                    // Avoid duplicates (if we sent this ourselves)
                    if (!this.blocks.find(function(b) { return b.id === data.block.id; })) {
                        this.blocks.push(data.block);
                        this.renderBlock(data.block);
                        this.updateBoardHint();
                    }
                }
                break;

            case 'block-update':
                var bIdx = this.blocks.findIndex(function(b) { return b.id === data.id; });
                if (bIdx >= 0) {
                    if (data.content !== undefined) this.blocks[bIdx].content = data.content;
                    if (data.width !== undefined) this.blocks[bIdx].width = data.width;
                    if (data.height !== undefined) this.blocks[bIdx].height = data.height;
                    this.refreshBlockDOM(data.id);
                }
                break;

            case 'block-move':
                var bIdx2 = this.blocks.findIndex(function(b) { return b.id === data.id; });
                if (bIdx2 >= 0) {
                    if (data.x !== undefined) this.blocks[bIdx2].x = data.x;
                    if (data.y !== undefined) this.blocks[bIdx2].y = data.y;
                    this.refreshBlockDOM(data.id);
                }
                break;

            case 'block-delete':
                this.blocks = this.blocks.filter(function(b) { return b.id !== data.id; });
                this.removeBlockDOM(data.id);
                this.updateBoardHint();
                break;

            case 'blocks-sync':
                this.blocks = data.blocks || [];
                this.renderAllBlocks();
                this.updateBoardHint();
                break;

            // Drawing
            case 'draw-stroke':
                if (data.stroke) {
                    this.strokes.push(data.stroke);
                    this.drawStroke(data.stroke);
                }
                break;

            case 'draw-clear':
                this.strokes = [];
                this.redrawCanvas();
                break;

            case 'draw-sync':
                this.strokes = data.strokes || [];
                this.redrawCanvas();
                break;

            case 'error':
                this.toast(data.message || 'Erro', 'error');
                break;
        }
    }

    // ======================== BOARD: BLOCKS ========================

    createBlock(type, x, y, extra) {
        var id = 'b-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        // Snap position to grid, but in world coordinates
        var worldX = (x - this.panX) / this.zoom;
        var worldY = (y - this.panY) / this.zoom;
        var sx = snapToGrid(worldX, this.gridSize);
        var sy = snapToGrid(worldY, this.gridSize);

        var block = {
            id: id,
            type: type,
            x: sx,
            y: sy,
            width: type === 'image' ? 200 : 200,
            height: type === 'image' ? 200 : 100
        };

        if (type === 'text') {
            block.content = extra && extra.content ? extra.content : '';
            block.fontSize = this._textFontSize || 16;
        } else if (type === 'image') {
            block.content = extra && extra.data ? extra.data : '';
            block.name = extra && extra.name ? extra.name : 'imagem';
        }

        this.blocks.push(block);
        this.renderBlock(block);
        this.updateBoardHint();

        // Notify server
        this.send('block-create', { block: block });

        return block;
    }

    deleteBlock(blockId) {
        var self = this;
        this.showConfirm('Remover este bloco?', function() {
            self.blocks = self.blocks.filter(function(b) { return b.id !== blockId; });
            self.removeBlockDOM(blockId);
            self.updateBoardHint();
            self.send('block-delete', { id: blockId });
            if (self._selectedBlockId === blockId) self._selectedBlockId = null;
        });
    }

    selectBlock(blockId) {
        if (this._selectedBlockId) {
            var old = document.querySelector('.ws-block[data-id="' + this._selectedBlockId + '"]');
            if (old) old.classList.remove('selected');
        }
        this._selectedBlockId = blockId;
        if (blockId) {
            var el = document.querySelector('.ws-block[data-id="' + blockId + '"]');
            if (el) el.classList.add('selected');
        }
    }

    // ======================== BOARD: BLOCK RENDERING ========================

    renderAllBlocks() {
        var container = document.getElementById('board-blocks');
        if (!container) return;
        container.innerHTML = '';
        for (var i = 0; i < this.blocks.length; i++) {
            this.renderBlock(this.blocks[i]);
        }
    }

    renderBlock(block) {
        var container = document.getElementById('board-blocks');
        if (!container) return;

        // Remove existing
        var existing = container.querySelector('.ws-block[data-id="' + block.id + '"]');
        if (existing) existing.remove();

        var el = document.createElement('div');
        el.className = 'ws-block';
        el.dataset.id = block.id;
        el.style.left = block.x + 'px';
        el.style.top = block.y + 'px';
        el.style.width = block.width + 'px';
        el.style.height = block.height + 'px';

        if (block.id === this._selectedBlockId) {
            el.classList.add('selected');
        }

        // Content
        if (block.type === 'text') {
            var textEl = document.createElement('div');
            textEl.className = 'ws-block-text';
            textEl.contentEditable = 'true';
            textEl.dataset.placeholder = 'Escreva algo...';
            textEl.style.fontSize = (block.fontSize || 16) + 'px';
            textEl.textContent = block.content || '';
            el.appendChild(textEl);

            // Bind text edit events
            var self = this;
            var editTimer = null;
            textEl.addEventListener('input', function() {
                clearTimeout(editTimer);
                editTimer = setTimeout(function() {
                    block.content = textEl.textContent || '';
                    var h = Math.max(40, textEl.scrollHeight + 16);
                    if (h !== block.height) {
                        block.height = h;
                        el.style.height = h + 'px';
                    }
                    self.send('block-update', {
                        id: block.id,
                        content: block.content,
                        height: block.height
                    });
                }, 300);
            });

            textEl.addEventListener('focus', function() {
                self.selectBlock(block.id);
            });

            textEl.addEventListener('mousedown', function(e) {
                if (self.activeTool === 'draw') {
                    e.stopPropagation();
                    self.selectBlock(block.id);
                }
            });

        } else if (block.type === 'image') {
            var imgWrap = document.createElement('div');
            imgWrap.className = 'ws-block-image-wrap';
            var img = document.createElement('img');
            img.className = 'ws-block-image';
            img.src = block.content;
            img.alt = block.name || 'Imagem';
            img.draggable = false;
            img.addEventListener('dblclick', function() {
                self.openLightbox(block.content);
            });
            imgWrap.appendChild(img);
            el.appendChild(imgWrap);
        }

        // Delete button
        var delBtn = document.createElement('button');
        delBtn.className = 'ws-block-delete';
        delBtn.textContent = '×';
        delBtn.title = 'Excluir bloco';
        var self = this;
        delBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            self.deleteBlock(block.id);
        });
        el.appendChild(delBtn);

        // Resize handle
        var resizeHandle = document.createElement('div');
        resizeHandle.className = 'ws-block-resize';
        el.appendChild(resizeHandle);

        // Bind drag events on the block
        el.addEventListener('mousedown', function(e) {
            // Don't start drag from textarea, buttons, or resize handle
            if (e.target === delBtn || e.target === resizeHandle) return;
            if (e.target.contentEditable === 'true' && document.activeElement === e.target) return;
            if (e.button !== 0 && e.button !== undefined) return;
            if (e.ctrlKey || e.metaKey) return; // ctrl+drag = pan

            e.preventDefault();
            self.selectBlock(block.id);
            self._startBlockDrag(block.id, el, e.clientX, e.clientY);
        });

        // Bind resize
        resizeHandle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            self._startBlockResize(block.id, el, e.clientX, e.clientY);
        });

        container.appendChild(el);
    }

    refreshBlockDOM(blockId) {
        var block = this.blocks.find(function(b) { return b.id === blockId; });
        if (!block) return;

        var el = document.querySelector('.ws-block[data-id="' + blockId + '"]');
        if (!el) {
            this.renderBlock(block);
            return;
        }

        el.style.left = block.x + 'px';
        el.style.top = block.y + 'px';
        el.style.width = block.width + 'px';
        el.style.height = block.height + 'px';

        if (block.type === 'text') {
            var textEl = el.querySelector('.ws-block-text');
            if (textEl && document.activeElement !== textEl) {
                textEl.textContent = block.content || '';
            }
        }
    }

    removeBlockDOM(blockId) {
        var el = document.querySelector('.ws-block[data-id="' + blockId + '"]');
        if (el) el.remove();
    }

    // ======================== BOARD: BLOCK DRAG & RESIZE ========================

    _startBlockDrag(blockId, el, clientX, clientY) {
        this._dragging = {
            id: blockId,
            el: el
        };
        this._dragStart = { x: clientX, y: clientY };

        var block = this.blocks.find(function(b) { return b.id === blockId; });
        if (block) {
            this._dragOrigPos = { x: block.x, y: block.y };
            this._dragSnapped = { x: block.x, y: block.y };
        }

        el.classList.add('dragging');

        var self = this;
        this._dragMove = function(e) {
            var dx = (e.clientX - self._dragStart.x) / self.zoom;
            var dy = (e.clientY - self._dragStart.y) / self.zoom;
            var rawX = self._dragOrigPos.x + dx;
            var rawY = self._dragOrigPos.y + dy;
            var sx = snapToGrid(rawX, self.gridSize);
            var sy = snapToGrid(rawY, self.gridSize);

            el.style.left = sx + 'px';
            el.style.top = sy + 'px';
            self._dragSnapped = { x: sx, y: sy };
        };

        this._dragEnd = function() {
            el.classList.remove('dragging');
            document.removeEventListener('mousemove', self._dragMove);
            document.removeEventListener('mouseup', self._dragEnd);

            // Save final position
            var block = self.blocks.find(function(b) { return b.id === blockId; });
            if (block && (block.x !== self._dragSnapped.x || block.y !== self._dragSnapped.y)) {
                block.x = self._dragSnapped.x;
                block.y = self._dragSnapped.y;
                self.send('block-move', { id: blockId, x: block.x, y: block.y });
            }
            self._dragging = null;
        };

        document.addEventListener('mousemove', this._dragMove);
        document.addEventListener('mouseup', this._dragEnd);
    }

    _startBlockResize(blockId, el, clientX, clientY) {
        this._resizing = { id: blockId, el: el };
        this._resizeStart = {
            x: clientX,
            y: clientY,
            w: parseInt(el.style.width) || 200,
            h: parseInt(el.style.height) || 100
        };

        var self = this;
        this._resizeMove = function(e) {
            var dx = (e.clientX - self._resizeStart.x) / self.zoom;
            var dy = (e.clientY - self._resizeStart.y) / self.zoom;
            var nw = snapToGrid(Math.max(self._resizeMin, self._resizeStart.w + dx), self.gridSize);
            var nh = snapToGrid(Math.max(self._resizeMin, self._resizeStart.h + dy), self.gridSize);
            el.style.width = nw + 'px';
            el.style.height = nh + 'px';
        };

        this._resizeEnd = function() {
            document.removeEventListener('mousemove', self._resizeMove);
            document.removeEventListener('mouseup', self._resizeEnd);

            var block = self.blocks.find(function(b) { return b.id === blockId; });
            if (block) {
                block.width = parseInt(el.style.width) || block.width;
                block.height = parseInt(el.style.height) || block.height;
                self.send('block-update', {
                    id: blockId,
                    width: block.width,
                    height: block.height
                });
            }
            self._resizing = null;
        };

        document.addEventListener('mousemove', this._resizeMove);
        document.addEventListener('mouseup', this._resizeEnd);
    }

    updateBoardHint() {
        var hint = document.getElementById('board-hint');
        if (!hint) return;
        if (this.blocks.length === 0 && this.strokes.length === 0) {
            hint.style.display = 'flex';
        } else {
            hint.style.display = 'none';
        }
    }

    // ======================== BOARD: CANVAS DRAWING ========================

    initCanvas() {
        var canvas = document.getElementById('board-canvas');
        if (!canvas) return;

        var self = this;
        var ctx = canvas.getContext('2d');
        this._ctx = ctx;

        this._resizeCanvasToWrap();

        // ---- Mouse event handlers (on the canvas) ----
        canvas.addEventListener('mousedown', function(e) { self._onCanvasMouseDown(e); });
        canvas.addEventListener('mousemove', function(e) { self._onCanvasMouseMove(e); });
        canvas.addEventListener('mouseup', function(e) { self._onCanvasMouseUp(e); });
        canvas.addEventListener('mouseleave', function(e) { self._onCanvasMouseUp(e); });

        // Touch events
        canvas.addEventListener('touchstart', function(e) { self._onCanvasTouchStart(e); }, { passive: false });
        canvas.addEventListener('touchmove', function(e) { self._onCanvasTouchMove(e); }, { passive: false });
        canvas.addEventListener('touchend', function(e) { self._onCanvasTouchEnd(e); });

        canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

        // Wheel zoom
        canvas.addEventListener('wheel', function(e) {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            var rect = canvas.getBoundingClientRect();
            var cx = e.clientX - rect.left;
            var cy = e.clientY - rect.top;
            var factor = e.deltaY > 0 ? 0.9 : 1.1;
            self.setZoom(self.zoom * factor, cx, cy);
        }, { passive: false });

        this._resizeCanvasToWrap();
        this.redrawCanvas();
        console.log('Canvas inicializado');
    }

    _resizeCanvasToWrap() {
        var canvas = document.getElementById('board-canvas');
        if (!canvas) return;
        var wrap = canvas.parentElement;
        if (!wrap) return;
        var rect = wrap.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            canvas.width = rect.width;
            canvas.height = rect.height;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
        }
    }

    _applyTransform() {
        if (!this._ctx) return;
        this._ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panX, this.panY);

        // Also transform blocks overlay
        var blocksEl = document.getElementById('board-blocks');
        if (blocksEl) {
            blocksEl.style.transform = 'translate(' + this.panX + 'px, ' + this.panY + 'px) scale(' + this.zoom + ')';
        }
    }

    _clientToWorld(clientX, clientY) {
        var canvas = document.getElementById('board-canvas');
        if (!canvas) return { x: clientX, y: clientY };
        var rect = canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.panX) / this.zoom,
            y: (clientY - rect.top - this.panY) / this.zoom
        };
    }

    // ---- Canvas mouse handlers ----

    _onCanvasMouseDown(e) {
        // Pan: Ctrl+drag or middle button
        if (e.ctrlKey || e.metaKey || e.button === 1) {
            e.preventDefault();
            this._isPanning = true;
            this._panStart = { x: e.clientX, y: e.clientY };
            this._panStartPan = { x: this.panX, y: this.panY };
            var canvas = document.getElementById('board-canvas');
            if (canvas) canvas.style.cursor = 'grabbing';
            return;
        }

        // Text tool: click creates text block
        if (this.activeTool === 'text') {
            if (e.button !== 0) return;
            e.preventDefault();
            var pos = this._clientToWorld(e.clientX, e.clientY);
            var block = this.createBlock('text', e.clientX - this.panX, e.clientY - this.panY);
            // Focus the new text block for editing
            var self = this;
            setTimeout(function() {
                var textEl = document.querySelector('.ws-block[data-id="' + block.id + '"] .ws-block-text');
                if (textEl) textEl.focus();
            }, 50);
            return;
        }

        // Image tool: click opens file picker
        if (this.activeTool === 'image') {
            if (e.button !== 0) return;
            e.preventDefault();
            var imgInput = document.getElementById('image-upload');
            if (imgInput) {
                this._pendingImagePos = { x: e.clientX, y: e.clientY };
                imgInput.click();
            }
            return;
        }

        // Draw tool: start drawing
        if (this.activeTool === 'draw') {
            if (e.button !== 0) return;
            e.preventDefault();
            this._isDrawing = true;
            var p = this._clientToWorld(e.clientX, e.clientY);
            this._currentStroke = { color: this._drawColor, size: this._drawSize, points: [p] };
            var canvas = document.getElementById('board-canvas');
            if (canvas) canvas.style.cursor = 'crosshair';

            this._applyTransform();
            this._ctx.beginPath();
            this._ctx.moveTo(p.x, p.y);
            this._ctx.strokeStyle = this._drawColor;
            this._ctx.lineWidth = this._drawSize;
            this._ctx.lineCap = 'round';
            this._ctx.lineJoin = 'round';
            this._ctx.lineTo(p.x, p.y);
            this._ctx.stroke();
        }
    }

    _onCanvasMouseMove(e) {
        if (this._isPanning) {
            e.preventDefault();
            this.panX = this._panStartPan.x + (e.clientX - this._panStart.x);
            this.panY = this._panStartPan.y + (e.clientY - this._panStart.y);
            this._applyTransform();
            this.redrawCanvas();
            return;
        }

        if (!this._isDrawing || !this._currentStroke) return;
        e.preventDefault();
        var p = this._clientToWorld(e.clientX, e.clientY);
        this._currentStroke.points.push(p);
        this._applyTransform();
        this._ctx.lineTo(p.x, p.y);
        this._ctx.stroke();
    }

    _onCanvasMouseUp(e) {
        if (this._isPanning) {
            this._isPanning = false;
            var canvas = document.getElementById('board-canvas');
            if (canvas) canvas.style.cursor = this.activeTool === 'draw' ? 'crosshair' : 'default';
            return;
        }
        if (!this._isDrawing || !this._currentStroke) return;
        this._isDrawing = false;
        var canvas = document.getElementById('board-canvas');
        if (canvas) canvas.style.cursor = 'crosshair';

        // Only send if the stroke has actual points
        if (this._currentStroke.points.length > 0) {
            this.strokes.push(this._currentStroke);
            this.send('draw-stroke', { stroke: this._currentStroke });
            this.updateBoardHint();
        }
        this._currentStroke = null;
    }

    // ---- Touch handlers ----

    _onCanvasTouchStart(e) {
        if (e.touches.length === 2) {
            // Two-finger = pan
            e.preventDefault();
            this._isPanning = true;
            var cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            var cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            this._panStart = { x: cx, y: cy };
            this._panStartPan = { x: this.panX, y: this.panY };
            return;
        }

        if (e.touches.length === 1 && this.activeTool === 'draw') {
            e.preventDefault();
            this._isDrawing = true;
            var t = e.touches[0];
            var p = this._clientToWorld(t.clientX, t.clientY);
            this._currentStroke = { color: this._drawColor, size: this._drawSize, points: [p] };

            this._applyTransform();
            this._ctx.beginPath();
            this._ctx.moveTo(p.x, p.y);
            this._ctx.strokeStyle = this._drawColor;
            this._ctx.lineWidth = this._drawSize;
            this._ctx.lineCap = 'round';
            this._ctx.lineJoin = 'round';
            this._ctx.lineTo(p.x, p.y);
            this._ctx.stroke();
        }
    }

    _onCanvasTouchMove(e) {
        if (this._isPanning && e.touches.length === 2) {
            e.preventDefault();
            var cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            var cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            this.panX = this._panStartPan.x + (cx - this._panStart.x);
            this.panY = this._panStartPan.y + (cy - this._panStart.y);
            this._applyTransform();
            this.redrawCanvas();
            return;
        }

        if (!this._isDrawing || !this._currentStroke || e.touches.length !== 1) return;
        e.preventDefault();
        var t = e.touches[0];
        var p = this._clientToWorld(t.clientX, t.clientY);
        this._currentStroke.points.push(p);
        this._applyTransform();
        this._ctx.lineTo(p.x, p.y);
        this._ctx.stroke();
    }

    _onCanvasTouchEnd(e) {
        if (this._isPanning) {
            this._isPanning = false;
            return;
        }
        if (!this._isDrawing || !this._currentStroke) return;
        this._isDrawing = false;
        if (this._currentStroke.points.length > 0) {
            this.strokes.push(this._currentStroke);
            this.send('draw-stroke', { stroke: this._currentStroke });
            this.updateBoardHint();
        }
        this._currentStroke = null;
    }

    // ---- Canvas rendering ----

    redrawCanvas() {
        if (!this._ctx) return;
        var canvas = document.getElementById('board-canvas');
        var ctx = this._ctx;
        if (!ctx || !canvas) return;

        // Reset and clear
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid dots
        this._drawGrid();

        // Apply pan/zoom transform
        this._applyTransform();

        // Draw all strokes
        for (var i = 0; i < this.strokes.length; i++) {
            ctx.beginPath();
            var s = this.strokes[i];
            var pts = s.points || [];
            if (pts.length < 1) continue;
            ctx.strokeStyle = s.color || '#000';
            ctx.lineWidth = s.size || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(pts[0].x, pts[0].y);
            for (var j = 1; j < pts.length; j++) {
                ctx.lineTo(pts[j].x, pts[j].y);
            }
            ctx.stroke();
        }
    }

    _drawGrid() {
        if (!this._ctx) return;
        var canvas = document.getElementById('board-canvas');
        var ctx = this._ctx;
        if (!ctx || !canvas) return;
        if (this.gridSize < 1) return;

        // Grid dots in screen space: calculate visible world area
        var gs = this.gridSize * this.zoom;
        // Only draw if dots aren't too dense or too sparse
        if (gs < 4 || gs > 100) return;

        // Calculate visible range in world coordinates
        var worldLeft = -this.panX / this.zoom;
        var worldTop = -this.panY / this.zoom;
        var worldRight = worldLeft + canvas.width / this.zoom;
        var worldBottom = worldTop + canvas.height / this.zoom;

        var startX = Math.floor(worldLeft / this.gridSize) * this.gridSize;
        var startY = Math.floor(worldTop / this.gridSize) * this.gridSize;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        var dotSize = Math.max(1, Math.min(2, gs * 0.12));
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

        for (var wx = startX; wx <= worldRight + this.gridSize; wx += this.gridSize) {
            for (var wy = startY; wy <= worldBottom + this.gridSize; wy += this.gridSize) {
                var sx = wx * this.zoom + this.panX;
                var sy = wy * this.zoom + this.panY;
                ctx.fillRect(sx - dotSize / 2, sy - dotSize / 2, dotSize, dotSize);
            }
        }

        ctx.restore();
    }

    drawStroke(stroke) {
        if (!this._ctx) return;
        var ctx = this._ctx;
        var pts = stroke.points || [];
        if (pts.length < 1) return;

        this._applyTransform();
        ctx.beginPath();
        ctx.strokeStyle = stroke.color || '#000';
        ctx.lineWidth = stroke.size || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    }

    resizeCanvas() {
        this._resizeCanvasToWrap();
        this.redrawCanvas();
    }

    // ---- Zoom ----

    setZoom(newZoom, cx, cy) {
        var oldZoom = this.zoom;
        newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        if (newZoom === oldZoom) return;

        if (cx !== undefined && cy !== undefined) {
            this.panX = cx - (cx - this.panX) * (newZoom / oldZoom);
            this.panY = cy - (cy - this.panY) * (newZoom / oldZoom);
        }

        this.zoom = newZoom;
        this._applyTransform();
        this.redrawCanvas();
        this.updateZoomLabel();
    }

    zoomIn() {
        var canvas = document.getElementById('board-canvas');
        if (canvas) {
            var rect = canvas.getBoundingClientRect();
            this.setZoom(this.zoom * 1.25, rect.width / 2, rect.height / 2);
        } else {
            this.setZoom(this.zoom * 1.25);
        }
    }

    zoomOut() {
        var canvas = document.getElementById('board-canvas');
        if (canvas) {
            var rect = canvas.getBoundingClientRect();
            this.setZoom(this.zoom / 1.25, rect.width / 2, rect.height / 2);
        } else {
            this.setZoom(this.zoom / 1.25);
        }
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this._applyTransform();
        this.redrawCanvas();
        this.updateZoomLabel();
    }

    updateZoomLabel() {
        var label = document.getElementById('draw-zoom-label');
        if (label) label.textContent = Math.round(this.zoom * 100) + '%';
    }

    // ======================== TOOL SELECTION ========================

    setActiveTool(tool) {
        this.activeTool = tool;

        var canvas = document.getElementById('board-canvas');
        if (canvas) {
            canvas.style.cursor = tool === 'draw' ? 'crosshair' : tool === 'text' ? 'cell' : 'copy';
        }

        // Update tool buttons
        document.querySelectorAll('.ws-tool-btn').forEach(function(btn) {
            btn.classList.remove('active');
        });
        var toolBtn = document.getElementById('tool-' + tool);
        if (toolBtn) toolBtn.classList.add('active');

        // Show/hide tool-specific controls
        var drawTools = document.getElementById('draw-tools');
        var textTools = document.getElementById('text-tools');
        var textToolsSep = document.getElementById('text-tools-sep');

        if (drawTools) drawTools.style.display = tool === 'draw' ? 'flex' : 'none';
        if (textTools) textTools.style.display = tool === 'text' ? 'flex' : 'none';
        if (textToolsSep) textToolsSep.style.display = tool === 'text' ? '' : 'none';

        // Deselect block when switching to draw mode
        if (tool === 'draw') {
            this.selectBlock(null);
        }
    }

    // ======================== CHAT ========================

    renderChat() {
        var container = document.getElementById('chat-messages');
        if (!container) return;

        if (this.messages.length === 0) {
            container.innerHTML =
                '<div class="ws-chat-empty">' +
                    '<div class="ws-chat-empty-icon">💬</div>' +
                    '<div class="ws-chat-empty-title">Nenhuma mensagem</div>' +
                    '<div class="ws-chat-empty-desc">Compartilhe o código para conversarem!</div>' +
                '</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < this.messages.length; i++) {
            var m = this.messages[i];
            var isOwn = m.userId === this.userId;
            var cls = isOwn ? 'ws-chat-msg own' : 'ws-chat-msg other';
            var name = this.escapeHtml(m.user || 'Anônimo');
            var text = this.escapeHtml(m.text);
            var time = this.formatTime(m.time);

            html += '<div class="' + cls + '">' +
                        '<div>' +
                            '<div class="ws-chat-name">' + name + '<span class="ws-chat-time">' + time + '</span></div>' +
                            '<div class="ws-chat-text">' + text + '</div>' +
                        '</div>' +
                    '</div>';
        }
        container.innerHTML = html;
    }

    addSysMsg(text) {
        var container = document.getElementById('chat-messages');
        if (!container) return;

        var empty = container.querySelector('.ws-chat-empty');
        if (empty) this.messages = [];

        var div = document.createElement('div');
        div.className = 'ws-chat-msg sys';
        div.textContent = text;
        container.appendChild(div);
        this.scrollChat();
    }

    scrollChat() {
        var container = document.getElementById('chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    sendChatMessage(text) {
        if (!text || !text.trim() || !this.roomCode) return;
        this.send('send-message', {
            text: text.trim().substring(0, 500),
            user: this.userName || 'Anônimo',
            userId: this.userId
        });
    }

    // ======================== UTILS ========================

    formatTime(iso) {
        try {
            return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '--:--';
        }
    }

    escapeHtml(text) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    toast(msg, type) {
        var container = document.getElementById('toast-container');
        if (!container) return;
        var toast = document.createElement('div');
        toast.className = 'toast' + (type === 'error' ? ' toast-error' : '');
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3000);
    }

    updateUsers(count) {
        var el = document.getElementById('room-users-count');
        if (el) el.textContent = (count || 0) + ' online';
    }

    showConfirm(text, callback) {
        var modal = document.getElementById('confirm-modal');
        var textEl = document.getElementById('confirm-text');
        var btnOk = document.getElementById('confirm-ok');
        var btnCancel = document.getElementById('confirm-cancel');
        if (!modal || !textEl || !btnOk || !btnCancel) return;

        textEl.textContent = text || 'Confirmar?';
        modal.style.display = 'flex';

        var okHandler, cancelHandler, overlayHandler, escHandler;

        var cleanup = function() {
            modal.style.display = 'none';
            if (okHandler) btnOk.removeEventListener('click', okHandler);
            if (cancelHandler) btnCancel.removeEventListener('click', cancelHandler);
            if (overlayHandler) {
                var overlay = modal.querySelector('.ws-modal-overlay');
                if (overlay) overlay.removeEventListener('click', overlayHandler);
            }
            if (escHandler) document.removeEventListener('keydown', escHandler);
        };

        okHandler = function() {
            cleanup();
            if (callback) callback();
        };
        cancelHandler = function() {
            cleanup();
        };

        btnOk.addEventListener('click', okHandler);
        btnCancel.addEventListener('click', cancelHandler);

        var overlay = modal.querySelector('.ws-modal-overlay');
        if (overlay) {
            overlayHandler = function() { cleanup(); };
            overlay.addEventListener('click', overlayHandler);
        }

        escHandler = function(e) {
            if (e.key === 'Escape') { cleanup(); }
        };
        document.addEventListener('keydown', escHandler);
    }

    openLightbox(src) {
        var lb = document.getElementById('lightbox');
        var img = document.getElementById('lightbox-img');
        if (!lb || !img) return;
        img.src = src;
        img.style.setProperty('--lb-scale', '1');
        img.classList.remove('zoomed');
        lb.style.display = 'flex';
    }

    // ======================== BIND EVENTS ========================

    bindEvents() {
        var self = this;

        // ---- Lobby ----
        var btnCreate = document.getElementById('btn-create-room');
        if (btnCreate) {
            btnCreate.addEventListener('click', function() {
                self.userName = document.getElementById('user-name-input').value.trim();
                self.connect(function() {
                    self.send('create-room', {
                        user: self.userName || 'Anônimo',
                        userId: self.userId
                    });
                });
            });
        }

        var btnJoin = document.getElementById('btn-join-room');
        if (btnJoin) {
            btnJoin.addEventListener('click', function() { self.joinRoom(); });
        }

        var codeInput = document.getElementById('room-code-input');
        if (codeInput) {
            codeInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); self.joinRoom(); }
                this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }

        var btnLeave = document.getElementById('btn-leave-room');
        if (btnLeave) {
            btnLeave.addEventListener('click', function() {
                if (self.ws) self.ws.close();
                self.showLobby();
            });
        }

        var btnCopy = document.getElementById('btn-copy-code');
        if (btnCopy) {
            btnCopy.addEventListener('click', function() {
                if (self.roomCode) {
                    navigator.clipboard.writeText(self.roomCode).then(function() {
                        self.toast('Código copiado!');
                    }).catch(function() {
                        self.toast('Erro ao copiar', 'error');
                    });
                }
            });
        }

        var btnSaveWs = document.getElementById('btn-save-workspace');
        if (btnSaveWs) {
            btnSaveWs.addEventListener('click', function() { self.saveCurrentWorkspace(); });
        }

        var btnRefreshSaved = document.getElementById('btn-refresh-saved');
        if (btnRefreshSaved) {
            btnRefreshSaved.addEventListener('click', function() {
                self.loadSavedWorkspaces();
                self.toast('Lista atualizada');
            });
        }

        // ---- Tabs ----
        var tabs = document.querySelectorAll('.ws-tab');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                tabs.forEach(function(t) { t.classList.remove('active'); });
                document.querySelectorAll('.ws-panel').forEach(function(p) { p.classList.remove('active'); });
                this.classList.add('active');
                var panel = document.getElementById('panel-' + this.dataset.tab);
                if (panel) {
                    panel.classList.add('active');
                    if (this.dataset.tab === 'board') {
                        setTimeout(function() { self.resizeCanvas(); }, 100);
                    }
                }
            });
        });

        // ---- Title ----
        var titleInput = document.getElementById('doc-title-input');
        if (titleInput) {
            titleInput.addEventListener('blur', function() {
                var title = this.value.trim() || 'Sem título';
                self.docTitle = title;
                self.send('doc-title', { title: title });
            });
            titleInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') this.blur();
            });
        }

        // ---- Tool buttons ----
        var toolDraw = document.getElementById('tool-draw');
        if (toolDraw) toolDraw.addEventListener('click', function() { self.setActiveTool('draw'); });

        var toolText = document.getElementById('tool-text');
        if (toolText) toolText.addEventListener('click', function() { self.setActiveTool('text'); });

        var toolImage = document.getElementById('tool-image');
        if (toolImage) toolImage.addEventListener('click', function() { self.setActiveTool('image'); });

        // Draw color & size
        var colorInput = document.getElementById('draw-color');
        if (colorInput) {
            colorInput.addEventListener('input', function() { self._drawColor = this.value; });
        }

        var sizeInput = document.getElementById('draw-size');
        if (sizeInput) {
            sizeInput.addEventListener('input', function() {
                self._drawSize = parseInt(this.value);
                var label = document.getElementById('draw-size-label');
                if (label) label.textContent = self._drawSize + 'px';
            });
        }

        // Text font size
        var fontSizeInput = document.getElementById('text-font-size');
        if (fontSizeInput) {
            fontSizeInput.addEventListener('input', function() {
                self._textFontSize = parseInt(this.value);
                var label = document.getElementById('text-size-label');
                if (label) label.textContent = self._textFontSize + 'px';
            });
        }

        // Grid size
        var gridSizeInput = document.getElementById('grid-size-input');
        if (gridSizeInput) {
            gridSizeInput.addEventListener('input', function() {
                self.gridSize = parseInt(this.value);
                var label = document.getElementById('grid-size-label');
                if (label) label.textContent = self.gridSize + 'px';
                self.redrawCanvas();
            });
        }

        // Image upload
        var imageUpload = document.getElementById('image-upload');
        if (imageUpload) {
            imageUpload.addEventListener('change', function(e) {
                var file = e.target.files[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                    self.toast('Imagem muito grande (máx 5MB)', 'error');
                    return;
                }
                var reader = new FileReader();
                reader.onload = function(ev) {
                    var px = self._pendingImagePos ? self._pendingImagePos.x - self.panX : 100;
                    var py = self._pendingImagePos ? self._pendingImagePos.y - self.panY : 100;
                    self.createBlock('image', px, py, { data: ev.target.result, name: file.name });
                    self._pendingImagePos = null;
                };
                reader.readAsDataURL(file);
                this.value = '';
                self.toast('Imagem adicionada ao board!');
            });
        }

        // Undo / Clear
        var drawUndo = document.getElementById('draw-undo');
        if (drawUndo) {
            drawUndo.addEventListener('click', function() {
                self.send('draw-undo');
            });
        }

        var boardClear = document.getElementById('board-clear');
        if (boardClear) {
            boardClear.addEventListener('click', function() {
                self.showConfirm('Limpar todo o board (desenhos e blocos)?', function() {
                    self.send('draw-clear');
                    // Clear all blocks
                    for (var i = self.blocks.length - 1; i >= 0; i--) {
                        self.send('block-delete', { id: self.blocks[i].id });
                    }
                    self.blocks = [];
                    self.renderAllBlocks();
                    self.updateBoardHint();
                });
            });
        }

        // Zoom buttons
        var zoomInBtn = document.getElementById('draw-zoom-in');
        if (zoomInBtn) zoomInBtn.addEventListener('click', function() { self.zoomIn(); });

        var zoomOutBtn = document.getElementById('draw-zoom-out');
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', function() { self.zoomOut(); });

        var zoomResetBtn = document.getElementById('draw-zoom-reset');
        if (zoomResetBtn) zoomResetBtn.addEventListener('click', function() { self.resetZoom(); });

        // ---- Chat ----
        var btnSend = document.getElementById('btn-send');
        if (btnSend) {
            btnSend.addEventListener('click', function() {
                var input = document.getElementById('chat-input');
                if (input && input.value.trim()) {
                    self.sendChatMessage(input.value);
                    input.value = '';
                    input.focus();
                }
            });
        }

        var chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.value.trim()) {
                        self.sendChatMessage(this.value);
                        this.value = '';
                    }
                }
            });
        }

        // ---- Keyboard shortcuts ----
        document.addEventListener('keydown', function(e) {
            // Ignore if typing in input/textarea/contenteditable
            var tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            var isEditable = tag === 'input' || tag === 'textarea' || (document.activeElement && document.activeElement.contentEditable === 'true');
            if (isEditable) return;

            switch (e.key.toLowerCase()) {
                case 'd':
                    self.setActiveTool('draw');
                    break;
                case 't':
                    self.setActiveTool('text');
                    break;
                case 'i':
                    self.setActiveTool('image');
                    break;
                case 'delete':
                case 'backspace':
                    if (self._selectedBlockId) {
                        e.preventDefault();
                        self.deleteBlock(self._selectedBlockId);
                    }
                    break;
                case 'escape':
                    self.selectBlock(null);
                    break;
                case '0':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        self.resetZoom();
                    }
                    break;
            }
        });

        // Lightbox events
        var lb = document.getElementById('lightbox');
        var lbClose = document.getElementById('lightbox-close');
        var lbImg = document.getElementById('lightbox-img');

        if (lb && lbClose) {
            lbClose.addEventListener('click', function() { lb.style.display = 'none'; });
            lb.addEventListener('click', function(e) {
                if (e.target === lb) lb.style.display = 'none';
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && lb.style.display !== 'none' && lb.style.display !== '') {
                    lb.style.display = 'none';
                }
            });
        }

        if (lbImg) {
            lbImg.addEventListener('wheel', function(e) {
                e.preventDefault();
                var rect = this.getBoundingClientRect();
                var xPct = ((e.clientX - rect.left) / rect.width) * 100;
                var yPct = ((e.clientY - rect.top) / rect.height) * 100;
                xPct = Math.max(0, Math.min(100, xPct));
                yPct = Math.max(0, Math.min(100, yPct));

                var cur = parseFloat(this.style.getPropertyValue('--lb-scale')) || 1;
                var delta = e.deltaY > 0 ? -0.15 : 0.15;
                var newScale = Math.max(0.5, Math.min(5, cur + delta));

                this.style.setProperty('--lb-scale', String(newScale));
                this.style.setProperty('--lb-ox', xPct + '%');
                this.style.setProperty('--lb-oy', yPct + '%');

                if (newScale !== 1) { this.classList.add('zoomed'); }
                else { this.classList.remove('zoomed'); }
            }, { passive: false });

            lbImg.addEventListener('dblclick', function() {
                this.style.setProperty('--lb-scale', '1');
                this.style.setProperty('--lb-ox', '50%');
                this.style.setProperty('--lb-oy', '50%');
                this.classList.remove('zoomed');
            });
        }

        // Name input persistence
        var nameInput = document.getElementById('user-name-input');
        if (nameInput) {
            var savedName = localStorage.getItem('blocks-chat-username');
            if (savedName) nameInput.value = savedName;
            nameInput.addEventListener('change', function() {
                localStorage.setItem('blocks-chat-username', this.value.trim());
            });
        }

        // Init canvas (deferred to ensure DOM is ready)
        setTimeout(function() { self.initCanvas(); }, 200);

        window.addEventListener('resize', function() {
            self.resizeCanvas();
        });
    }

    // ======================== ROOM JOIN / LEAVE ========================

    joinRoomWithCode(code) {
        if (!code || code.length < 2) {
            this.toast('Código inválido', 'error');
            return;
        }
        document.getElementById('room-code-input').value = code;
        this.joinRoom();
    }

    joinRoom() {
        var code = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!code || code.length < 2) {
            this.toast('Digite um código válido', 'error');
            return;
        }
        this.userName = document.getElementById('user-name-input').value.trim();
        var self = this;
        this.connect(function() {
            self.send('join-room', {
                code: code,
                user: self.userName || 'Anônimo',
                userId: self.userId
            });
        });
    }

    // ======================== WORKSPACES SALVOS (API) ========================

    loadSavedWorkspaces() {
        var self = this;
        fetch('/api/workspaces')
            .then(function(r) { return r.json(); })
            .then(function(list) { self.renderSavedWorkspaces(list); })
            .catch(function() {});
    }

    saveCurrentWorkspace() {
        if (!this.roomCode) return;
        var title = document.getElementById('doc-title-input');
        var payload = {
            code: this.roomCode,
            title: (title ? title.value : 'Sem título') || 'Sem título',
            userCount: 0
        };
        var self = this;
        fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(r) { return r.json(); })
        .then(function() {
            self.toast('Workspace salvo!');
            self.loadSavedWorkspaces();
        })
        .catch(function() {
            self.toast('Erro ao salvar workspace', 'error');
        });
    }

    deleteSavedWorkspace(code) {
        var self = this;
        this.showConfirm('Excluir este workspace da lista?', function() {
            fetch('/api/workspaces/' + code, { method: 'DELETE' })
                .then(function(r) { return r.json(); })
                .then(function() {
                    self.toast('Workspace removido');
                    self.loadSavedWorkspaces();
                })
                .catch(function() {
                    self.toast('Erro ao remover', 'error');
                });
        });
    }

    renderSavedWorkspaces(list) {
        var container = document.getElementById('saved-workspaces-list');
        if (!container) return;

        if (!list || list.length === 0) {
            container.innerHTML = '<div class="ws-saved-empty">Nenhum workspace salvo ainda.<br>Crie ou entre em uma sala para salvá-la.</div>';
            return;
        }

        list.sort(function(a, b) {
            return new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
        });

        var self = this;
        var html = '';
        for (var i = 0; i < list.length; i++) {
            var w = list[i];
            var time = '';
            try { time = new Date(w.savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch(e) {}
            html +=
                '<div class="ws-saved-item">' +
                    '<div class="ws-saved-item-icon">📄</div>' +
                    '<div class="ws-saved-item-info">' +
                        '<div class="ws-saved-item-title">' + this.escapeHtml(w.title || 'Sem título') + '</div>' +
                        '<div class="ws-saved-item-meta">' +
                            '<span class="ws-saved-item-code">' + this.escapeHtml(w.code) + '</span>' +
                            '<span>' + time + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="ws-saved-item-actions">' +
                        '<button class="btn btn-sm ws-saved-btn-join" data-code="' + w.code + '">Entrar</button>' +
                        '<button class="ws-saved-btn-delete" data-code="' + w.code + '" title="Excluir">✕</button>' +
                    '</div>' +
                '</div>';
        }
        container.innerHTML = html;

        container.querySelectorAll('.ws-saved-btn-join').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                self.joinRoomWithCode(this.dataset.code);
            });
        });
        container.querySelectorAll('.ws-saved-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.ws-saved-item-actions')) return;
                var btn = this.querySelector('.ws-saved-btn-join');
                if (btn) btn.click();
            });
        });
        container.querySelectorAll('.ws-saved-btn-delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                self.deleteSavedWorkspace(this.dataset.code);
            });
        });
    }
}

// ======================== INIT ========================

document.addEventListener('DOMContentLoaded', function() {
    var ws = new Workspace();
    ws.bindEvents();
    window._workspace = ws;
});
