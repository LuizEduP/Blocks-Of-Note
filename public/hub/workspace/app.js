/* ============================================
   hub/workspace/app.js — Workspace interno
   Salas, membros, configurações de um workspace
   ============================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const wsi = new WorkspaceInternal();
    wsi.init();
});

class WorkspaceInternal {
    constructor() {
        // State
        this.workspaceId = null;
        this.workspace = null;
        this.rooms = [];
        this.members = [];

        // DOM refs (populated in _cacheDom)
    }

    /* ============================================
       INIT
       ============================================ */

    async init() {
        // Extract workspace ID from URL
        const params = new URLSearchParams(window.location.search);
        this.workspaceId = params.get('id');
        if (!this.workspaceId) {
            Toast.show('Workspace não encontrado.', { type: 'error', duration: 3000 });
            setTimeout(() => { window.location.href = '../'; }, 1500);
            return;
        }

        this._cacheDom();

        // Navbar
        const navbar = document.getElementById('navbar');
        if (navbar) setTimeout(() => navbar.classList.add('visible'), 100);

        // Load workspace data
        await this._loadWorkspace();
        await this._loadRooms();
        await this._loadMembers();

        this._render();
        this._bindEvents();
    }

    _cacheDom() {
        this.titleEl = document.getElementById('wsi-title');
        this.metaEl = document.getElementById('wsi-meta');
        this.iconEl = document.getElementById('wsi-icon');
        this.roomsGrid = document.getElementById('rooms-grid');
        this.roomsEmpty = document.getElementById('rooms-empty');
        this.roomsLoading = document.getElementById('rooms-loading');
        this.membersList = document.getElementById('members-list');
        this.membersCount = document.getElementById('members-count');

        // Modals
        this.modalOverlay = document.getElementById('modal-overlay');
        this.createRoomModal = document.getElementById('create-room-modal');
        this.inviteOverlay = document.getElementById('invite-overlay');
        this.inviteModal = document.getElementById('invite-modal');
    }

    /* ============================================
       DATA LOADING
       ============================================ */

    async _loadWorkspace() {
        try {
            // Tenta carregar do cache local primeiro
            const cached = this._loadFromLocal('commentarium_workspaces');
            if (cached) {
                const found = cached.find(w => w.id === this.workspaceId);
                if (found) {
                    this.workspace = found;
                    return;
                }
            }

            // Tenta Supabase
            const supabase = window.supabaseClient;
            if (supabase) {
                const { data, error } = await supabase
                    .from('workspaces')
                    .select('*')
                    .eq('id', this.workspaceId)
                    .single();

                if (!error && data) {
                    this.workspace = data;
                    return;
                }
            }
        } catch (err) {
            console.warn('WSI: erro ao carregar workspace:', err.message);
        }

        // Fallback
        this.workspace = {
            id: this.workspaceId,
            name: 'Workspace',
            color: '#7c3aed',
            owner_id: Auth.getUser()?.sub,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            member_count: 1,
            room_count: 0,
        };
    }

    async _loadRooms() {
        this._showRoomsLoading(true);

        try {
            const supabase = window.supabaseClient;
            if (supabase) {
                const { data, error } = await supabase
                    .from('workspace_rooms')
                    .select('*')
                    .eq('workspace_id', this.workspaceId)
                    .order('created_at', { ascending: false });

                if (!error) {
                    this.rooms = data || [];
                    this._showRoomsLoading(false);
                    return;
                }
            }
        } catch (err) {
            console.warn('WSI: erro ao carregar salas:', err.message);
        }

        // Fallback local
        const key = `commentarium_rooms_${this.workspaceId}`;
        this.rooms = this._loadFromLocal(key) || [];
        this._showRoomsLoading(false);
    }

    async _loadMembers() {
        try {
            const supabase = window.supabaseClient;
            if (supabase) {
                const { data, error } = await supabase
                    .from('workspace_members')
                    .select('user_id, role, joined_at')
                    .eq('workspace_id', this.workspaceId);

                if (!error) {
                    this.members = data || [];
                    return;
                }
            }
        } catch (err) {
            console.warn('WSI: erro ao carregar membros:', err.message);
        }

        // Fallback: owner only
        this.members = [{
            user_id: this.workspace?.owner_id || Auth.getUser()?.sub,
            role: 'owner',
            joined_at: this.workspace?.created_at || new Date().toISOString(),
        }];
    }

    /* ============================================
       RENDER
       ============================================ */

    _render() {
        this._renderHeader();
        this._renderRooms();
        this._renderMembers();
        this._renderSettings();
    }

    _renderHeader() {
        const ws = this.workspace;
        if (!ws) return;

        this.titleEl.textContent = ws.name || 'Workspace';
        this.iconEl.textContent = (ws.name || 'W')[0].toUpperCase();
        this.iconEl.style.background = ws.color || '#7c3aed';
        document.documentElement.style.setProperty('--ws-color', ws.color || '#7c3aed');

        const created = ws.created_at
            ? new Date(ws.created_at).toLocaleDateString('pt-BR')
            : 'hoje';
        this.metaEl.textContent = `Criado em ${created} · ${this.rooms.length} sala${this.rooms.length !== 1 ? 's' : ''}`;
    }

    _renderRooms() {
        if (this.rooms.length === 0) {
            this.roomsGrid.innerHTML = '';
            this.roomsEmpty.hidden = false;
            return;
        }

        this.roomsEmpty.hidden = true;
        this.roomsGrid.innerHTML = this.rooms.map(r => this._renderRoomCard(r)).join('');

        // Add create card
        this.roomsGrid.insertAdjacentHTML('beforeend', `
            <div class="wsi-create-room-card" id="card-create-room">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                <span class="wsi-create-room-text">Criar sala</span>
            </div>
        `);

        // Stagger animation
        const cards = this.roomsGrid.querySelectorAll('.wsi-room-card, .wsi-create-room-card');
        cards.forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(8px)';
            card.style.transition = `opacity 0.3s ease ${i * 0.05}s, transform 0.3s ease ${i * 0.05}s`;
            requestAnimationFrame(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        });
    }

    _renderRoomCard(room) {
        const code = room.code || '------';
        const name = room.name || 'Sala sem nome';
        return `
            <div class="wsi-room-card" data-room-id="${room.id}" data-room-code="${code}">
                <div class="wsi-room-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                </div>
                <div class="wsi-room-name">${this._escapeHtml(name)}</div>
                <div class="wsi-room-code">${code}</div>
                <div class="wsi-room-meta">
                    <span class="wsi-room-online">
                        <span class="wsi-room-dot"></span> 0 online
                    </span>
                    <span>${room.created_at ? this._formatDate(room.created_at) : ''}</span>
                </div>
            </div>`;
    }

    _renderMembers() {
        this.membersCount.textContent = `${this.members.length} membro${this.members.length !== 1 ? 's' : ''}`;
        this.membersList.innerHTML = this.members.map(m => this._renderMember(m)).join('');
    }

    _renderMember(member) {
        const isOwner = member.role === 'owner';
        const initial = 'U';
        return `
            <div class="wsi-member-item">
                <div class="wsi-member-avatar">${initial}</div>
                <div class="wsi-member-info">
                    <div class="wsi-member-name">Usuário</div>
                    <div class="wsi-member-email">ID: ${(member.user_id || '').slice(0, 8)}...</div>
                </div>
                <span class="wsi-member-role ${isOwner ? 'owner' : ''}">${member.role || 'viewer'}</span>
            </div>`;
    }

    _renderSettings() {
        const nameInput = document.getElementById('settings-name');
        if (nameInput) nameInput.value = this.workspace?.name || '';

        // Highlight current color
        const colorPicker = document.getElementById('settings-color-picker');
        if (colorPicker && this.workspace?.color) {
            colorPicker.querySelectorAll('.color-swatch').forEach(s => {
                s.classList.toggle('active', s.dataset.color === this.workspace.color);
            });
        }
    }

    /* ============================================
       EVENTS
       ============================================ */

    _bindEvents() {
        // Tabs
        document.querySelectorAll('.wsi-tab').forEach(tab => {
            tab.addEventListener('click', () => this._switchTab(tab.dataset.tab));
        });

        // Tab shortcut buttons
        document.getElementById('btn-members')?.addEventListener('click', () => this._switchTab('members'));
        document.getElementById('btn-settings')?.addEventListener('click', () => this._switchTab('settings'));

        // Room cards click → enter room
        this.roomsGrid.addEventListener('click', (e) => {
            const roomCard = e.target.closest('.wsi-room-card');
            if (roomCard) {
                const roomId = roomCard.dataset.roomId;
                const code = roomCard.dataset.roomCode;
                window.location.href = `../../workspace/?room=${encodeURIComponent(code)}`;
            }

            const createCard = e.target.closest('.wsi-create-room-card');
            if (createCard) {
                this._openCreateRoomModal();
            }
        });

        // Empty room button
        document.getElementById('btn-empty-room')?.addEventListener('click', () => this._openCreateRoomModal());

        // Create room modal
        document.querySelector('#create-room-modal .modal-close')?.addEventListener('click', () => this._closeCreateRoomModal());
        document.getElementById('modal-cancel')?.addEventListener('click', () => this._closeCreateRoomModal());
        document.getElementById('modal-confirm')?.addEventListener('click', () => this._createRoom());
        this.modalOverlay?.addEventListener('click', () => {
            this._closeCreateRoomModal();
            this._closeInviteModal();
        });

        // Room name input → enable confirm
        const roomNameInput = document.getElementById('room-name');
        roomNameInput?.addEventListener('input', () => {
            const btn = document.getElementById('modal-confirm');
            if (btn) btn.disabled = !roomNameInput.value.trim();
        });

        // Invite modal
        document.getElementById('btn-invite')?.addEventListener('click', () => this._openInviteModal());
        document.querySelector('#invite-modal .modal-close')?.addEventListener('click', () => this._closeInviteModal());
        document.getElementById('invite-cancel')?.addEventListener('click', () => this._closeInviteModal());
        document.getElementById('invite-confirm')?.addEventListener('click', () => this._inviteMember());

        const inviteEmail = document.getElementById('invite-email');
        inviteEmail?.addEventListener('input', () => {
            const btn = document.getElementById('invite-confirm');
            if (btn) btn.disabled = !inviteEmail.value.trim() || !inviteEmail.value.includes('@');
        });

        // Settings
        document.getElementById('btn-save-name')?.addEventListener('click', () => this._saveSettings());

        const settingsColorPicker = document.getElementById('settings-color-picker');
        settingsColorPicker?.addEventListener('click', (e) => {
            const swatch = e.target.closest('.color-swatch');
            if (!swatch) return;
            settingsColorPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            this._saveColor(swatch.dataset.color);
        });

        // Delete workspace
        document.getElementById('btn-delete-workspace')?.addEventListener('click', () => this._deleteWorkspace());

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this._closeCreateRoomModal();
                this._closeInviteModal();
            }
            if (e.key === 'Enter') {
                if (!this.createRoomModal.hidden) {
                    const btn = document.getElementById('modal-confirm');
                    if (btn && !btn.disabled) this._createRoom();
                }
                if (!this.inviteModal.hidden) {
                    const btn = document.getElementById('invite-confirm');
                    if (btn && !btn.disabled) this._inviteMember();
                }
            }
        });
    }

    _switchTab(tabName) {
        document.querySelectorAll('.wsi-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        document.querySelectorAll('.wsi-tab-content').forEach(c => {
            c.classList.toggle('active', c.id === `tab-${tabName}`);
        });
    }

    /* ============================================
       ROOM ACTIONS
       ============================================ */

    _openCreateRoomModal() {
        const input = document.getElementById('room-name');
        if (input) input.value = '';
        const btn = document.getElementById('modal-confirm');
        if (btn) btn.disabled = true;

        this.modalOverlay.hidden = false;
        this.createRoomModal.hidden = false;
        input?.focus();
    }

    _closeCreateRoomModal() {
        this.modalOverlay.hidden = true;
        this.createRoomModal.hidden = true;
    }

    async _createRoom() {
        const name = document.getElementById('room-name')?.value.trim();
        if (!name) return;

        const code = this._generateRoomCode();
        const room = {
            id: crypto.randomUUID ? crypto.randomUUID() : 'room_' + Date.now(),
            workspace_id: this.workspaceId,
            name,
            code,
            created_by: Auth.getUser()?.sub,
            created_at: new Date().toISOString(),
        };

        try {
            const supabase = window.supabaseClient;
            if (supabase) {
                const { error } = await supabase.from('workspace_rooms').insert(room);
                if (error) {
                    console.warn('WSI: erro ao criar sala no Supabase:', error.message);
                }
            }
        } catch (err) {
            console.warn('WSI: erro ao criar sala:', err.message);
        }

        this.rooms.unshift(room);

        // Cache local
        const key = `commentarium_rooms_${this.workspaceId}`;
        this._saveToLocal(key, this.rooms);

        // Update workspace room count
        if (this.workspace) {
            this.workspace.room_count = this.rooms.length;
        }

        this._renderRooms();
        this._renderHeader();
        this._closeCreateRoomModal();

        Toast.show(`Sala "${name}" criada! Código: ${code}`, { type: 'success', duration: 3000 });
    }

    /* ============================================
       INVITE
       ============================================ */

    _openInviteModal() {
        const input = document.getElementById('invite-email');
        if (input) input.value = '';
        const btn = document.getElementById('invite-confirm');
        if (btn) btn.disabled = true;

        this.inviteOverlay.hidden = false;
        this.inviteModal.hidden = false;
        input?.focus();
    }

    _closeInviteModal() {
        this.inviteOverlay.hidden = true;
        this.inviteModal.hidden = true;
    }

    async _inviteMember() {
        const email = document.getElementById('invite-email')?.value.trim();
        if (!email) return;

        // TODO: implementar convite real (Supabase invite ou email)
        Toast.show(`Convite enviado para ${email}! (simulação)`, { type: 'success', duration: 3000 });
        this._closeInviteModal();
    }

    /* ============================================
       SETTINGS
       ============================================ */

    async _saveSettings() {
        const name = document.getElementById('settings-name')?.value.trim();
        if (!name || name === this.workspace?.name) return;

        if (this.workspace) {
            this.workspace.name = name;
            this.workspace.updated_at = new Date().toISOString();
        }

        try {
            const supabase = window.supabaseClient;
            if (supabase) {
                await supabase.from('workspaces').update({ name, updated_at: this.workspace.updated_at }).eq('id', this.workspaceId);
            }
        } catch (err) {
            console.warn('WSI: erro ao salvar nome:', err.message);
        }

        // Update local cache
        const cached = this._loadFromLocal('commentarium_workspaces') || [];
        const idx = cached.findIndex(w => w.id === this.workspaceId);
        if (idx !== -1) cached[idx] = this.workspace;
        this._saveToLocal('commentarium_workspaces', cached);

        this._renderHeader();
        Toast.show('Nome atualizado!', { type: 'success', duration: 2000 });
    }

    async _saveColor(color) {
        if (this.workspace) {
            this.workspace.color = color;
            this.workspace.updated_at = new Date().toISOString();
        }

        try {
            const supabase = window.supabaseClient;
            if (supabase) {
                await supabase.from('workspaces').update({ color, updated_at: this.workspace.updated_at }).eq('id', this.workspaceId);
            }
        } catch (err) {
            console.warn('WSI: erro ao salvar cor:', err.message);
        }

        const cached = this._loadFromLocal('commentarium_workspaces') || [];
        const idx = cached.findIndex(w => w.id === this.workspaceId);
        if (idx !== -1) cached[idx] = this.workspace;
        this._saveToLocal('commentarium_workspaces', cached);

        this._renderHeader();
        Toast.show('Cor atualizada!', { type: 'success', duration: 2000 });
    }

    async _deleteWorkspace() {
        const name = this.workspace?.name || 'este workspace';
        if (!confirm(`Tem certeza que deseja excluir "${name}" e todas as suas salas? Esta ação não pode ser desfeita.`)) return;

        try {
            const supabase = window.supabaseClient;
            if (supabase) {
                await supabase.from('workspace_rooms').delete().eq('workspace_id', this.workspaceId);
                await supabase.from('workspace_members').delete().eq('workspace_id', this.workspaceId);
                await supabase.from('workspaces').delete().eq('id', this.workspaceId);
            }
        } catch (err) {
            console.warn('WSI: erro ao excluir workspace:', err.message);
        }

        // Remove from local cache
        const cached = this._loadFromLocal('commentarium_workspaces') || [];
        this._saveToLocal('commentarium_workspaces', cached.filter(w => w.id !== this.workspaceId));

        Toast.show('Workspace excluído.', { type: 'success', duration: 2000 });
        setTimeout(() => { window.location.href = '../'; }, 1000);
    }

    /* ============================================
       UTILS
       ============================================ */

    _showRoomsLoading(show) {
        if (this.roomsLoading) this.roomsLoading.hidden = !show;
        if (show) {
            if (this.roomsGrid) this.roomsGrid.innerHTML = '';
            if (this.roomsEmpty) this.roomsEmpty.hidden = true;
        }
    }

    _generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    _formatDate(isoString) {
        return new Date(isoString).toLocaleDateString('pt-BR');
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    _loadFromLocal(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

    _saveToLocal(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch { /* ignore */ }
    }
}
