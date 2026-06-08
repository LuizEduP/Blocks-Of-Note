/* ============================================
   workspace/app.js — Workspace Colaborativo
   Documento + Desenho + Chat em tempo real
   Com servidor WebSocket
   ============================================ */

const WS_URL = (function() {
    var loc = window.location;
    return (loc.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + loc.host;
})();

class Workspace {
    constructor() {
        this.ws = null;
        this.roomCode = null;
        this.userName = '';
        this.userId = 'u-' + Math.random().toString(36).slice(2, 8);
        this.messages = [];
        this.docContent = '';
        this.docTitle = 'Sem título';
        this.images = [];
        this.strokes = [];
        this.reconnectAttempts = 0;
        this.maxReconnect = 5;
        this._docTimer = null;
        this._canvasReady = false;
        this._ctx = null;
        this._panX = 0;
        this._panY = 0;
        this._zoom = 1;
        this._isPanning = false;
        this._panStart = { x: 0, y: 0 };
        this._minZoom = 0.1;
        this._maxZoom = 10;
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
        this.renderImages();
        this.updateDocTextarea();
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
                this.docContent = (data.doc && data.doc.content) || '';
                this.docTitle = (data.doc && data.doc.title) || 'Sem título';
                this.strokes = data.strokes || [];
                this.messages = data.messages || [];
                this.images = data.images || [];
                this.showRoom(data.code);
                this.redrawCanvas();
                this.addSysMsg('Sala criada! Código: ' + data.code);
                break;

            case 'room-joined':
                this.docContent = (data.doc && data.doc.content) || '';
                this.docTitle = (data.doc && data.doc.title) || 'Sem título';
                this.strokes = data.strokes || [];
                this.messages = data.messages || [];
                this.images = data.images || [];
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

            case 'doc-update':
                this.docContent = data.content || '';
                this.updateDocTextarea(true);
                break;

            case 'doc-title':
                this.docTitle = data.title || 'Sem título';
                var el = document.getElementById('doc-title-input');
                if (el) el.value = this.docTitle;
                break;

            case 'doc-image':
                if (data.image) {
                    this.images.push(data.image);
                    this.renderImages();
                }
                break;

            case 'remove-image':
                this.images = this.images.filter(function(img) { return img.id !== data.id; });
                this.renderImages();
                break;

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

    // ======================== DOCUMENTO ========================

    updateDocTextarea(fromRemote) {
        var ta = document.getElementById('doc-textarea');
        if (ta && ta.value !== this.docContent) {
            ta.value = this.docContent;
        }
        var status = document.getElementById('doc-status');
        if (status) {
            status.textContent = fromRemote ? 'Sincronizado ✓' : 'Salvando...';
        }
    }

    sendDocUpdate() {
        var ta = document.getElementById('doc-textarea');
        if (!ta) return;
        this.docContent = ta.value;
        this.send('doc-update', { content: this.docContent });
        var status = document.getElementById('doc-status');
        if (status) status.textContent = 'Sincronizado ✓';
    }

    renderImages() {
        var container = document.getElementById('doc-images');
        if (!container) return;
        if (this.images.length === 0) {
            container.innerHTML = '';
            return;
        }
        var self = this;
        var html = '';
        for (var i = 0; i < this.images.length; i++) {
            var img = this.images[i];
            var id = img.id || '';
            html += '<div class="ws-doc-img-wrap">' +
                        '<img class="ws-doc-image" src="' + img.data + '" alt="imagem" onclick="window._workspace && window._workspace.openLightbox(this.src)" loading="lazy">' +
                        '<button class="ws-doc-img-remove" data-id="' + id + '" title="Remover imagem">&times;</button>' +
                    '</div>';
        }
        container.innerHTML = html;
        var self2 = this;
        container.querySelectorAll('.ws-doc-img-remove').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var imgId = this.dataset.id;
                self2.showConfirm('Remover esta imagem?', function() {
                    self2.send('remove-image', { id: imgId });
                });
            });
        });
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

    // ======================== MODAL DE CONFIRMAÇÃO ========================

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
            overlayHandler = function() {
                cleanup();
            };
            overlay.addEventListener('click', overlayHandler);
        }

        escHandler = function(e) {
            if (e.key === 'Escape') {
                cleanup();
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // ======================== DESENHO (CANVAS) ========================

    initCanvas() {
        var canvas = document.getElementById('draw-canvas');
        if (!canvas) return;

        var self = this;
        this._canvasReady = true;
        var ctx = canvas.getContext('2d');

        var wrap = canvas.parentElement;
        this._resizeCanvasToWrap();

        var isDrawing = false;
        var currentStroke = null;
        var color = '#000000';
        var size = 3;

        function getPos(e) {
            var r = canvas.getBoundingClientRect();
            var cx, cy;
            if (e.touches) {
                cx = e.touches[0].clientX;
                cy = e.touches[0].clientY;
                e.preventDefault();
            } else {
                cx = e.clientX;
                cy = e.clientY;
            }
            var worldX = (cx - r.left - self._panX) / self._zoom;
            var worldY = (cy - r.top - self._panY) / self._zoom;
            return { x: worldX, y: worldY };
        }

        function applyTransform() {
            ctx.setTransform(self._zoom, 0, 0, self._zoom, self._panX, self._panY);
        }

        function onStart(e) {
            if (e.ctrlKey || e.button === 1) {
                e.preventDefault();
                self._isPanning = true;
                var p = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
                self._panStart = { x: p.x - self._panX, y: p.y - self._panY };
                return;
            }
            if (e.button !== 0) return;
            e.preventDefault();
            isDrawing = true;
            var p = getPos(e);
            currentStroke = { color: color, size: size, points: [p] };
            canvas.style.cursor = 'crosshair';

            applyTransform();
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }

        function onMove(e) {
            if (self._isPanning) {
                e.preventDefault();
                var p = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
                self._panX = p.x - self._panStart.x;
                self._panY = p.y - self._panStart.y;
                applyTransform();
                self.redrawCanvas();
                return;
            }
            if (!isDrawing || !currentStroke) return;
            e.preventDefault();
            var p = getPos(e);
            currentStroke.points.push(p);
            applyTransform();
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }

        function onEnd(e) {
            if (self._isPanning) {
                self._isPanning = false;
                canvas.style.cursor = '';
                return;
            }
            if (!isDrawing || !currentStroke) return;
            isDrawing = false;
            canvas.style.cursor = '';
            self.send('draw-stroke', { stroke: currentStroke });
            currentStroke = null;
        }

        canvas.addEventListener('mousedown', onStart);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onEnd);
        canvas.addEventListener('mouseleave', onEnd);

        canvas.addEventListener('touchstart', onStart, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onEnd);

        canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

        var colorInput = document.getElementById('draw-color');
        if (colorInput) {
            colorInput.addEventListener('input', function() {
                color = this.value;
            });
        }

        var sizeInput = document.getElementById('draw-size');
        if (sizeInput) {
            sizeInput.addEventListener('input', function() {
                size = parseInt(this.value);
                var label = document.getElementById('draw-size-label');
                if (label) label.textContent = size + 'px';
            });
        }

        this._ctx = ctx;
        this._resizeCanvasToWrap();
        this.redrawCanvas();
        console.log('Canvas inicializado');
    }

    _resizeCanvasToWrap() {
        var canvas = document.getElementById('draw-canvas');
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

    drawStroke(stroke) {
        if (!this._canvasReady || !this._ctx) return;
        var ctx = this._ctx;
        var pts = stroke.points || [];
        if (pts.length < 1) return;

        ctx.setTransform(this._zoom, 0, 0, this._zoom, this._panX, this._panY);

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

    redrawCanvas() {
        if (!this._canvasReady || !this._ctx) return;
        var canvas = document.getElementById('draw-canvas');
        var ctx = this._ctx;
        if (!ctx || !canvas) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.setTransform(this._zoom, 0, 0, this._zoom, this._panX, this._panY);

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

    resizeCanvas() {
        if (!this._canvasReady) return;
        this._resizeCanvasToWrap();
        this.redrawCanvas();
    }

    // ======================== ZOOM ========================

    setZoom(newZoom, cx, cy) {
        var oldZoom = this._zoom;
        newZoom = Math.max(this._minZoom, Math.min(this._maxZoom, newZoom));
        if (newZoom === oldZoom) return;

        if (cx !== undefined && cy !== undefined) {
            // Zoom centered on a specific point
            this._panX = cx - (cx - this._panX) * (newZoom / oldZoom);
            this._panY = cy - (cy - this._panY) * (newZoom / oldZoom);
        }

        this._zoom = newZoom;
        this.redrawCanvas();
        this.updateZoomLabel();
    }

    zoomIn() {
        this.setZoom(this._zoom * 1.25);
    }

    zoomOut() {
        this.setZoom(this._zoom / 1.25);
    }

    resetZoom() {
        this._zoom = 1;
        this._panX = 0;
        this._panY = 0;
        this.redrawCanvas();
        this.updateZoomLabel();
    }

    updateZoomLabel() {
        var label = document.getElementById('draw-zoom-label');
        if (label) label.textContent = Math.round(this._zoom * 100) + '%';
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

    // ======================== BIND EVENTS ========================

    bindEvents() {
        var self = this;

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
            btnJoin.addEventListener('click', function() {
                self.joinRoom();
            });
        }

        var codeInput = document.getElementById('room-code-input');
        if (codeInput) {
            codeInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    self.joinRoom();
                }
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
            btnSaveWs.addEventListener('click', function() {
                self.saveCurrentWorkspace();
            });
        }

        var btnRefreshSaved = document.getElementById('btn-refresh-saved');
        if (btnRefreshSaved) {
            btnRefreshSaved.addEventListener('click', function() {
                self.loadSavedWorkspaces();
                self.toast('Lista atualizada');
            });
        }

        var tabs = document.querySelectorAll('.ws-tab');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                tabs.forEach(function(t) { t.classList.remove('active'); });
                document.querySelectorAll('.ws-panel').forEach(function(p) { p.classList.remove('active'); });
                this.classList.add('active');
                var panel = document.getElementById('panel-' + this.dataset.tab);
                if (panel) {
                    panel.classList.add('active');
                    if (this.dataset.tab === 'draw') {
                        setTimeout(function() { self.resizeCanvas(); }, 100);
                    }
                }
            });
        });

        var docTextarea = document.getElementById('doc-textarea');
        if (docTextarea) {
            docTextarea.addEventListener('input', function() {
                clearTimeout(self._docTimer);
                var status = document.getElementById('doc-status');
                if (status) status.textContent = 'Editando...';
                self._docTimer = setTimeout(function() {
                    self.sendDocUpdate();
                }, 400);
            });
        }

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
                    self.send('doc-image', { data: ev.target.result, name: file.name });
                };
                reader.readAsDataURL(file);
                this.value = '';
                self.toast('Imagem enviada!');
            });
        }

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

        var drawUndo = document.getElementById('draw-undo');
        if (drawUndo) {
            drawUndo.addEventListener('click', function() {
                self.send('draw-undo');
            });
        }

        var drawClear = document.getElementById('draw-clear');
        if (drawClear) {
            drawClear.addEventListener('click', function() {
                self.showConfirm('Limpar todo o desenho?', function() {
                    self.send('draw-clear');
                });
            });
        }

        // Zoom buttons
        var zoomInBtn = document.getElementById('draw-zoom-in');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', function() {
                self.zoomIn();
            });
        }

        var zoomOutBtn = document.getElementById('draw-zoom-out');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', function() {
                self.zoomOut();
            });
        }

        var zoomResetBtn = document.getElementById('draw-zoom-reset');
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', function() {
                self.resetZoom();
            });
        }

        // Canvas wheel zoom
        var canvas = document.getElementById('draw-canvas');
        if (canvas) {
            canvas.addEventListener('wheel', function(e) {
                if (!e.ctrlKey && !e.metaKey) return; // Only zoom with Ctrl+Scroll or Cmd+Scroll
                e.preventDefault();
                var rect = canvas.getBoundingClientRect();
                var cx = e.clientX - rect.left;
                var cy = e.clientY - rect.top;
                var factor = e.deltaY > 0 ? 0.9 : 1.1;
                self.setZoom(self._zoom * factor, cx, cy);
            }, { passive: false });
        }

        var lb = document.getElementById('lightbox');

        var lbClose = document.getElementById('lightbox-close');
        var lbImg = document.getElementById('lightbox-img');

        if (lb && lbClose) {
            lbClose.addEventListener('click', function() {
                lb.style.display = 'none';
            });
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

                if (newScale !== 1) {
                    this.classList.add('zoomed');
                } else {
                    this.classList.remove('zoomed');
                }
            }, { passive: false });

            lbImg.addEventListener('dblclick', function() {
                this.style.setProperty('--lb-scale', '1');
                this.style.setProperty('--lb-ox', '50%');
                this.style.setProperty('--lb-oy', '50%');
                this.classList.remove('zoomed');
            });
        }

        var nameInput = document.getElementById('user-name-input');
        if (nameInput) {
            var savedName = localStorage.getItem('blocks-chat-username');
            if (savedName) nameInput.value = savedName;
            nameInput.addEventListener('change', function() {
                localStorage.setItem('blocks-chat-username', this.value.trim());
            });
        }

        setTimeout(function() { self.initCanvas(); }, 300);

        window.addEventListener('resize', function() {
            self.resizeCanvas();
        });
    }

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
            .then(function(list) {
                self.renderSavedWorkspaces(list);
            })
            .catch(function() {
                // Silently fail — workspaces list is best-effort
            });
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

        // Sort by most recent first
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

        // Bind events
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
