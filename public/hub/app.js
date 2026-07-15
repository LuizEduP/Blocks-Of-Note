/* ============================================
   hub/app.js — Hub completo
   Relógio + Órbita + Calendário + Métricas + Atividade
   ============================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const dash = new Dashboard();
    dash.init();
});

class Dashboard {
    constructor() {
        this.tasks = [];
        this.calYear = new Date().getFullYear();
        this.calMonth = new Date().getMonth();
        this.today = new Date();
        this.today.setHours(0, 0, 0, 0);
    }

    /* ============================================
       INIT
       ============================================ */

    async init() {
        this._cacheDom();
        this._loadData();
        this._startClock();
        this._renderCalendar();
        this._renderOrbit();
        this._renderUpcoming();
        this._renderMetricsRings();
        this._renderActivityDashboard();
        this._bindEvents();
    }

    _cacheDom() {
        this.clockTime = document.getElementById('clock-time');
        this.clockDate = document.getElementById('clock-date');
        this.orbitContainer = document.getElementById('orbit-container');
        this.calMonthYear = document.getElementById('cal-month-year');
        this.calDays = document.getElementById('cal-days');
        this.upcomingList = document.getElementById('upcoming-list');
        this.upcomingEmpty = document.getElementById('upcoming-empty');
        this.progressDone = document.getElementById('progress-done');
        this.progressTotal = document.getElementById('progress-total');
        this.progressLabel = document.getElementById('progress-label');
    }

    _loadData() {
        try {
            this.tasks = JSON.parse(localStorage.getItem('commentarium_tasks') || '[]');
        } catch { this.tasks = []; }
    }

    _refreshAll() {
        this._renderOrbit();
        this._renderUpcoming();
        this._renderCalendar();
        this._renderMetricsRings();
        this._renderActivityDashboard();
    }

    /* ============================================
       CLOCK
       ============================================ */

    _startClock() {
        this._tick();
        setInterval(() => this._tick(), 1000);
    }

    _tick() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        this.clockTime.textContent = `${h}:${m}:${s}`;
        const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        this.clockDate.textContent = `${now.getDate()} de ${months[now.getMonth()]}`;
    }

    /* ============================================
       ORBIT (520×300 elliptical, tilted)
       ============================================ */

    _renderOrbit() {
        const existing = this.orbitContainer.querySelectorAll('.orbit-pill');
        existing.forEach(p => p.remove());

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const nowMs = now.getHours() * 60 + now.getMinutes();

        const todayTasks = this.tasks.filter(t => {
            if (t.done) return false;
            const due = t.due_date || t.dueDate;
            return due && due.slice(0, 10) === todayStr && t.due_time;
        });

        if (todayTasks.length === 0) return;

        todayTasks.sort((a, b) => (a.due_time || '').localeCompare(b.due_time || ''));

        const cw = 520, ch = 300;
        const rx = cw / 2 - 42, ry = ch / 2 - 42;
        const cx = cw / 2, cy = ch / 2;

        const timeToAngle = (ts) => {
            if (!ts) return 0;
            const [h, m] = ts.split(':').map(Number);
            return ((h * 60 + m) / 1440) * 2 * Math.PI - Math.PI / 2;
        };

        let closestIdx = 0, closestDiff = Infinity;
        todayTasks.forEach((t, i) => {
            const [h, m] = (t.due_time || '00:00').split(':').map(Number);
            const diff = Math.abs(h * 60 + m - nowMs);
            if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
        });

        todayTasks.forEach((task, i) => {
            const angle = timeToAngle(task.due_time);
            const x = cx + rx * Math.cos(angle);
            const y = cy + ry * Math.sin(angle);
            const isNow = i === closestIdx && closestDiff < 120;

            const pill = document.createElement('div');
            pill.className = 'orbit-pill' + (isNow ? ' now' : '');
            pill.style.top = y + 'px';
            pill.style.left = x + 'px';
            pill.title = task.title || 'Tarefa';

            const icon = this._taskIcon(task.title || '');
            const time = task.due_time ? task.due_time.slice(0, 5) : '';
            pill.innerHTML = `<span class="orbit-pill-icon">${icon}</span><span class="orbit-pill-time">${time}</span><span>${this._esc((task.title || '').slice(0, 20))}</span>`;
            pill.addEventListener('click', () => { window.location.href = '../tasks/'; });
            this.orbitContainer.appendChild(pill);
        });
    }

    /* ============================================
       CALENDAR
       ============================================ */

    _renderCalendar() {
        const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        this.calMonthYear.textContent = `${months[this.calMonth]} ${this.calYear}`;

        const today = new Date();
        const td = today.getDate(), tm = today.getMonth(), ty = today.getFullYear();
        const firstDay = new Date(this.calYear, this.calMonth, 1).getDay();
        const dim = new Date(this.calYear, this.calMonth + 1, 0).getDate();
        const dip = new Date(this.calYear, this.calMonth, 0).getDate();

        const taskDates = new Set();
        this.tasks.forEach(task => {
            const d = new Date(task.due_date || task.dueDate);
            if (d.getFullYear() === this.calYear && d.getMonth() === this.calMonth) taskDates.add(d.getDate());
        });

        let html = '';
        for (let i = firstDay - 1; i >= 0; i--) html += `<div class="cal-day other-month">${dip - i}</div>`;
        for (let d = 1; d <= dim; d++) {
            let cls = 'cal-day';
            if (d === td && this.calMonth === tm && this.calYear === ty) cls += ' today';
            if (taskDates.has(d)) cls += ' has-tasks';
            html += `<div class="${cls}" data-day="${d}">${d}</div>`;
        }
        const tc = firstDay + dim, rem = tc % 7 === 0 ? 0 : 7 - (tc % 7);
        for (let i = 1; i <= rem; i++) html += `<div class="cal-day other-month">${i}</div>`;

        this.calDays.innerHTML = html;
        this.calDays.querySelectorAll('.cal-day:not(.other-month)').forEach(el => {
            el.addEventListener('click', () => {
                this.calDays.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
                el.classList.add('selected');
                this._highlightDay(parseInt(el.dataset.day));
            });
        });
    }

    _highlightDay(day) {
        const ds = `${this.calYear}-${String(this.calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        this.upcomingList.querySelectorAll('.upcoming-item').forEach(item => {
            if (item.dataset.date === ds) {
                item.style.background = 'var(--hub-accent-soft)';
                item.style.borderRadius = '8px';
                setTimeout(() => { item.style.background = ''; }, 2500);
            }
        });
    }

    /* ============================================
       UPCOMING TASKS
       ============================================ */

    _renderUpcoming() {
        const pending = this.tasks.filter(t => !t.done)
            .sort((a, b) => (a.due_date||a.dueDate||'9999').localeCompare(b.due_date||b.dueDate||'9999'))
            .slice(0, 8);

        if (pending.length === 0) {
            this.upcomingList.innerHTML = '';
            this.upcomingEmpty.classList.remove('hidden');
            return;
        }
        this.upcomingEmpty.classList.add('hidden');
        this.upcomingList.innerHTML = pending.map(task => {
            const title = task.title || 'Sem título';
            const dd = task.due_date || task.dueDate || '';
            const ds = dd ? new Date(dd + 'T00:00:00').toLocaleDateString('pt-BR') : '';
            const da = dd ? dd.slice(0,10) : '';
            return `<div class="upcoming-item" data-date="${da}" data-id="${task.id||''}">
                <div class="upcoming-check"></div>
                <span class="flex-1 truncate">${this._esc(title)}</span>
                ${ds ? `<span class="text-[0.7rem] text-[var(--hub-text-muted)] ml-auto flex-shrink-0">${ds}</span>` : ''}
            </div>`;
        }).join('');

        this.upcomingList.querySelectorAll('.upcoming-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const task = this.tasks.find(t => (t.id||'') === id);
                if (task) {
                    task.done = true;
                    task.done_at = new Date().toISOString();
                    localStorage.setItem('commentarium_tasks', JSON.stringify(this.tasks));
                    this._refreshAll();
                }
            });
        });
    }

    /* ============================================
       METRICS RINGS (right sidebar)
       ============================================ */

    _renderMetricsRings() {
        const todayStr = this.today.toISOString().slice(0, 10);
        const todayTasks = this.tasks.filter(t => {
            const due = t.due_date || t.dueDate;
            return due && due.slice(0, 10) === todayStr;
        });
        const todayDone = todayTasks.filter(t => t.done).length;
        const todayTotal = todayTasks.length;
        const allPending = this.tasks.filter(t => !t.done).length;
        const allDone = this.tasks.filter(t => t.done).length;
        const allTotal = this.tasks.length;
        const highPriority = this.tasks.filter(t => !t.done && (t.priority==='high'||t.priority==='alta')).length;

        let focusMin = 0;
        try { focusMin = parseInt(localStorage.getItem('commentarium_focus_time')||'0',10)||0; } catch {}
        if (!focusMin) focusMin = todayDone * 30;

        this.progressDone.textContent = allDone;
        this.progressTotal.textContent = allTotal;
        this.progressLabel.textContent = allTotal > 0 ? `${allDone} de ${allTotal} tarefas` : 'Nenhuma tarefa';

        const circ = 2 * Math.PI * 40;
        const prodPct = todayTotal > 0 ? todayDone/todayTotal : 0;
        this._setRing('ring-produtividade', circ, prodPct);
        document.getElementById('val-produtividade').textContent = Math.round(prodPct*100) + '%';

        const focusH = focusMin / 60;
        const focusPct = Math.min(focusH/8, 1);
        this._setRing('ring-foco', circ, focusPct);
        document.getElementById('val-foco').textContent = focusH.toFixed(1) + 'h';

        this._setRing('ring-concluidas', circ, prodPct);
        document.getElementById('val-concluidas').textContent = todayDone;

        const prioPct = allPending > 0 ? Math.min(highPriority/allPending, 1) : 0;
        this._setRing('ring-prioridades', circ, prioPct);
        document.getElementById('val-prioridades').textContent = highPriority;
    }

    _setRing(id, circ, frac) {
        const ring = document.getElementById(id);
        if (!ring) return;
        ring.style.strokeDasharray = circ;
        ring.style.strokeDashoffset = circ * (1 - frac);
    }

    /* ============================================
       ACTIVITY DASHBOARD (below 3-col)
       ============================================ */

    _renderActivityDashboard() {
        this._renderActivityMetrics();
        this._renderBarChart();
        this._renderHeatmap();
        this._renderActivityList();
    }

    /* Activity metric cards */
    _renderActivityMetrics() {
        const todayStr = this.today.toISOString().slice(0, 10);
        const dms = 86400000;
        const ystr = new Date(this.today.getTime() - dms).toISOString().slice(0, 10);

        const todayDone = this.tasks.filter(t => {
            const d = t.due_date || t.dueDate;
            return d && d.slice(0,10) === todayStr && t.done;
        }).length;
        const todayMins = todayDone * 30;

        const yestMins = this.tasks.filter(t => {
            const d = t.due_date || t.dueDate;
            return d && d.slice(0,10) === ystr && t.done;
        }).length * 30;

        let wkTotal = 0, wkDays = 0;
        for (let i = 0; i < 7; i++) {
            const dd = new Date(this.today.getTime() - i*dms).toISOString().slice(0,10);
            const dayTasks = this.tasks.filter(t => {
                const d = t.due_date || t.dueDate;
                return d && d.slice(0,10) === dd;
            });
            if (dayTasks.length > 0) { wkTotal += dayTasks.filter(t=>t.done).length*30; wkDays++; }
        }
        const avgMins = wkDays > 0 ? wkTotal/wkDays : 0;
        const trendMins = todayMins - yestMins;
        const trendUp = trendMins >= 0;

        document.getElementById('metric-avg').textContent = this._fmtTime(avgMins);
        document.getElementById('metric-avg-range').textContent = this._weekRange();
        document.getElementById('metric-total').textContent = this._fmtTime(todayMins);
        document.getElementById('metric-date').textContent = this._fmtDate(this.today);
        document.getElementById('metric-trend-icon').textContent = trendUp ? '↑' : '↓';
        document.getElementById('metric-trend-icon').style.color = trendUp ? 'var(--hub-accent)' : 'var(--hub-text-muted)';
        document.getElementById('metric-trend').textContent = this._fmtTime(Math.abs(trendMins));
    }

    /* Weekly bar chart */
    _renderBarChart() {
        const dms = 86400000;
        const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const data = []; let maxVal = 1;
        for (let i = 6; i >= 0; i--) {
            const dd = new Date(this.today.getTime() - i*dms).toISOString().slice(0,10);
            const v = this.tasks.filter(t => {
                const d = t.due_date || t.dueDate;
                return d && d.slice(0,10) === dd && t.done;
            }).length;
            const dow = new Date(this.today.getTime() - i*dms).getDay();
            data.push({ label: dayNames[dow], value: v, isToday: i===0 });
            if (v > maxVal) maxVal = v;
        }
        document.getElementById('bar-chart').innerHTML = data.map(d => {
            const h = maxVal > 0 ? (d.value/maxVal)*100 : 0;
            return `<div class="bar-wrap"><div class="bar-val">${d.value}</div><div class="bar-fill${d.isToday?' active':''}" style="height:${Math.max(h,3)}%"></div></div>`;
        }).join('');
        document.getElementById('bar-labels').innerHTML = data.map(d => `<div class="bar-label">${d.label}</div>`).join('');
    }

    /* Monthly heatmap */
    _renderHeatmap() {
        const mNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const y = this.today.getFullYear(), m = this.today.getMonth();
        document.getElementById('heatmap-month-title').textContent = mNames[m];

        const fd = new Date(y, m, 1).getDay(), dim = new Date(y, m+1, 0).getDate();
        const amap = {};
        this.tasks.forEach(t => {
            const due = t.due_date || t.dueDate;
            if (!due) return;
            const d = new Date(due);
            if (d.getFullYear()===y && d.getMonth()===m) amap[d.getDate()] = (amap[d.getDate()]||0)+1;
        });
        const maxA = Math.max(1, ...Object.values(amap));
        const cells = [];
        for (let i = 0; i < fd; i++) cells.push('<div class="hm-cell" style="background:transparent"></div>');
        for (let d = 1; d <= dim; d++) {
            const c = amap[d] || 0, int = c/maxA;
            let bg;
            if (c===0) bg = 'var(--hub-card)';
            else if (int<=0.25) bg = 'rgba(249,188,96,0.25)';
            else if (int<=0.5) bg = 'rgba(249,188,96,0.5)';
            else if (int<=0.75) bg = 'rgba(249,188,96,0.75)';
            else bg = 'var(--hub-accent)';
            const isToday = d === this.today.getDate();
            const s = `background:${bg}` + (isToday ? ';outline:2px solid var(--hub-accent);outline-offset:1px' : '');
            cells.push(`<div class="hm-cell" style="${s}" title="${d} ${mNames[m]} — ${c} tarefas"></div>`);
        }
        document.getElementById('heatmap-grid').innerHTML = cells.join('');
    }

    /* Activity list */
    _renderActivityList() {
        const todayStr = this.today.toISOString().slice(0, 10);
        const todayTasks = this.tasks.filter(t => {
            const d = t.due_date || t.dueDate;
            return d && d.slice(0,10) === todayStr;
        });
        const list = document.getElementById('activity-list');
        const empty = document.getElementById('activity-empty');
        if (todayTasks.length === 0) { list.innerHTML = ''; empty.style.display = 'block'; return; }
        empty.style.display = 'none';

        list.innerHTML = todayTasks.map(task => {
            const title = task.title || 'Sem título';
            const icon = this._taskIcon(title);
            const done = task.done, est = 30;
            return `<div class="activity-row" data-id="${task.id||''}">
                <div class="activity-icon">${icon}</div>
                <div class="activity-info">
                    <span class="activity-name">${this._esc(title)}</span>
                    <div class="activity-bar-wrap"><div class="activity-bar-fill" style="width:${done?100:0}%"></div></div>
                </div>
                <span class="activity-time">${done ? this._fmtTime(est) : '--'}</span>
            </div>`;
        }).join('');

        list.querySelectorAll('.activity-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.dataset.id;
                const task = this.tasks.find(t => (t.id||'') === id);
                if (task) {
                    task.done = !task.done;
                    if (task.done) task.done_at = new Date().toISOString();
                    else delete task.done_at;
                    localStorage.setItem('commentarium_tasks', JSON.stringify(this.tasks));
                    this._refreshAll();
                }
            });
        });
    }

    /* ============================================
       EVENTS
       ============================================ */

    _bindEvents() {
        const dms = 86400000;

        document.getElementById('cal-prev')?.addEventListener('click', () => {
            this.calMonth--; if (this.calMonth < 0) { this.calMonth=11; this.calYear--; }
            this._renderCalendar();
        });
        document.getElementById('cal-next')?.addEventListener('click', () => {
            this.calMonth++; if (this.calMonth > 11) { this.calMonth=0; this.calYear++; }
            this._renderCalendar();
        });

        document.getElementById('btn-new-note')?.addEventListener('click', () => { window.location.href = '../notes/'; });
        document.getElementById('btn-new-task')?.addEventListener('click', () => { window.location.href = '../tasks/'; });
        document.getElementById('btn-new-workspace')?.addEventListener('click', () => { window.location.href = 'workspace/?id=new'; });

        document.getElementById('metric-prev')?.addEventListener('click', () => { this._loadData(); this._refreshAll(); });
        document.getElementById('metric-next')?.addEventListener('click', () => { this._loadData(); this._refreshAll(); });

        document.getElementById('nav-prev')?.addEventListener('click', () => { this.today = new Date(this.today.getTime()-dms); this._refreshAll(); });
        document.getElementById('nav-today')?.addEventListener('click', () => { this.today = new Date(); this.today.setHours(0,0,0,0); this._refreshAll(); });
        document.getElementById('nav-next')?.addEventListener('click', () => { this.today = new Date(this.today.getTime()+dms); this._refreshAll(); });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && !e.target.closest('input,textarea')) { e.preventDefault(); this.today = new Date(this.today.getTime()-dms); this._refreshAll(); }
            if (e.key === 'ArrowRight' && !e.target.closest('input,textarea')) { e.preventDefault(); this.today = new Date(this.today.getTime()+dms); this._refreshAll(); }
        });
    }

    /* ============================================
       HELPERS
       ============================================ */

    _fmtTime(mins) {
        const h = Math.floor(mins/60), m = Math.round(mins%60);
        if (h===0 && m===0) return '0m';
        if (h===0) return `${m}m`;
        if (m===0) return `${h}h`;
        return `${h}h ${m}m`;
    }

    _fmtDate(d) {
        const mo = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return `${d.getDate()} ${mo[d.getMonth()]}`;
    }

    _weekRange() {
        const dms = 86400000;
        const s = new Date(this.today.getTime() - 6*dms);
        return `${this._fmtDate(s)} — ${this._fmtDate(this.today)}`;
    }

    _taskIcon(title) {
        const t = (title || '').toLowerCase();
        if (t.includes('estud')||t.includes('ler')||t.includes('leitura')) return '📖';
        if (t.includes('revis')) return '🔄';
        if (t.includes('prova')||t.includes('teste')||t.includes('exame')) return '📝';
        if (t.includes('projeto')||t.includes('trabalho')) return '📋';
        if (t.includes('exerc')) return '✏️';
        if (t.includes('reuni')||t.includes('aula')) return '🎓';
        if (t.includes('correr')||t.includes('treino')||t.includes('caminhada')) return '🏃';
        return '📌';
    }

    _esc(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
