
const API = 'http://localhost:8080/api';
let currentAdmin = null;

// Verificar token antes de cargar datos
if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
}
// ── HEADERS ───────────────────────────────────────────────────
function headers() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ── PROTECCIÓN DE RUTA ────────────────────────────────────────
function checkAdminAccess() {
    const userData = localStorage.getItem('currentUser');
    if (!userData) { window.location.href = 'login.html'; return false; }
    try {
        const user = JSON.parse(userData);
        if (user.rol !== 'admin') {
            alert('Acceso denegado. Se requiere rol administrador.');
            window.location.href = 'index.html';
            return false;
        }
        currentAdmin = user;
        document.getElementById('adminName').innerText = user.nombre || 'Admin';
        return true;
    } catch (e) {
        window.location.href = 'login.html';
        return false;
    }
}

function logoutAdmin() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

// ── ESTADÍSTICAS ──────────────────────────────────────────────
async function updateStats() {
    try {
        const [resUsers, resTickets] = await Promise.all([
            fetch(`${API}/usuarios`, { headers: headers() }),
            fetch(`${API}/tickets?size=1000`, { headers: headers() })
        ]);

        const users = await resUsers.json();
        const tickets = await resTickets.json();
        const list = tickets.content || [];

        document.getElementById('totalUsers').innerText = users.length;
        document.getElementById('totalTickets').innerText = list.length;
        document.getElementById('openTickets').innerText = list.filter(t =>
            t.estado?.nombre === 'Abierto' ||
            t.estado?.nombre === 'En Proceso').length;
        document.getElementById('resolvedTickets').innerText = list.filter(t =>
            t.estado?.nombre === 'Resuelto').length;

        const badge = document.getElementById('ticketCountBadge');
        if (badge) badge.innerText = `${list.length} tickets`;

    } catch (err) {
        console.error('Error cargando stats:', err);
    }
}

// ── USUARIOS ──────────────────────────────────────────────────
async function renderUsersTable() {
    try {
        const res = await fetch(`${API}/usuarios`, { headers: headers() });
        let users = await res.json();

        const search = document.getElementById('searchUser')?.value.toLowerCase() || '';
        if (search) {
            users = users.filter(u =>
                u.nombre.toLowerCase().includes(search) ||
                u.email.toLowerCase().includes(search));
        }

        const tbody = document.getElementById('usersList');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay usuarios registrados</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => {
            const rol = String(u.rol).toUpperCase().trim();

            const rolClass =
                rol === 'ADMIN' ? 'role-admin' :
                    rol === 'AGENTE' ? 'role-agente' :
                        'role-cliente';

            const rolLabel =
                rol === 'ADMIN' ? 'Administrador' :
                    rol === 'AGENTE' ? 'Agente' :
                        'Cliente';
                        
            return `<tr class="hover-shadow-tr">
                <td>${u.usuarioId}</td>
                <td>${escapeHtml(u.nombre)}</td>
                <td>${u.email}</td>
                <td><span class="badge role-badge ${rolClass} px-2 py-1 rounded-pill">${rolLabel}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1"
                        onclick="editUser(${u.usuarioId})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger"
                        onclick="deleteUser(${u.usuarioId})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        updateStats();
    } catch (err) {
        console.error('Error cargando usuarios:', err);
    }
}

function openUserModal(userId = null) {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userModalTitle').innerText = 'Nuevo Usuario';
    if (userId) editUser(userId);
}

async function editUser(id) {
    try {
        const res = await fetch(`${API}/usuarios/${id}`, { headers: headers() });
        const user = await res.json();
        document.getElementById('userId').value = user.usuarioId;
        document.getElementById('userNombre').value = user.nombre;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userRol').value = user.rol;
        document.getElementById('userPassword').value = '';
        document.getElementById('userModalTitle').innerText = 'Editar Usuario';
        new bootstrap.Modal(document.getElementById('userModal')).show();
    } catch (err) {
        console.error('Error cargando usuario:', err);
    }
}

async function saveUserHandler() {
    const id = document.getElementById('userId').value;
    const nombre = document.getElementById('userNombre').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const rol = document.getElementById('userRol').value;
    const password = document.getElementById('userPassword').value;

    if (!nombre || !email) { alert('Nombre y email son obligatorios'); return; }

    try {
        if (id) {
            // Editar usuario existente
            await fetch(`${API}/usuarios/${id}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({ nombre, email, rol, password })
            });
        } else {
            // Crear nuevo usuario (solo admin)
            await fetch(`${API}/usuarios`, {   // ← CAMBIO AQUÍ
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ nombre, email, password, rol })
            });
        }
        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
        renderUsersTable();
    } catch (err) {
        console.error('Error guardando usuario:', err);
        alert('Error al guardar el usuario');
    }
}

async function deleteUser(id) {
    if (id === currentAdmin?.usuarioId) {
        alert('No puedes eliminar tu propia cuenta.');
        return;
    }
    if (!confirm('¿Eliminar este usuario?')) return;

    try {
        await fetch(`${API}/usuarios/${id}`, {
            method: 'DELETE',
            headers: headers()
        });
        renderUsersTable();
    } catch (err) {
        console.error('Error eliminando usuario:', err);
    }
}

// ── TICKETS ───────────────────────────────────────────────────
async function renderTicketsTable() {
    try {
        const statusFilter = document.getElementById('ticketStatusFilter')?.value || 'all';
        const search = document.getElementById('searchTicketGlobal')?.value || '';

        const url = new URL(`${API}/tickets`);
        url.searchParams.append('size', '1000');
        if (statusFilter !== 'all') {
            const estadoMap = {
                'abierto': 'Abierto',
                'en-proceso': 'En Proceso',
                'resuelto': 'Resuelto',
                'cerrado': 'Cerrado'
            };
            url.searchParams.append('estado', estadoMap[statusFilter]);
        }
        if (search.trim().length > 1) {
            url.searchParams.append('search', search.trim());
        }

        const res = await fetch(url, { headers: headers() });
        const data = await res.json();
        const tickets = data.content || [];

        const badge = document.getElementById('ticketCountBadge');
        if (badge) badge.innerText = `${tickets.length} tickets`;

        const tbody = document.getElementById('ticketsList');
        if (!tbody) return;

        if (tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay tickets para mostrar</td></tr>';
            return;
        }

        tbody.innerHTML = tickets.map(t => {
            const estadoClass = {
                'Abierto': 'bg-warning text-dark',
                'En Proceso': 'bg-info text-white',
                'Pendiente': 'bg-secondary text-white',
                'Resuelto': 'bg-success text-white',
                'Cerrado': 'bg-dark text-white'
            }[t.estado?.nombre] || 'bg-secondary';

            const prioridadIcon = {
                'Baja': '🟢', 'Media': '🟠', 'Alta': '🔴', 'Critica': '🔴'
            }[t.prioridad?.nombre] || '⚪';

            return `<tr class="hover-shadow-tr">
                <td>${t.ticketId}</td>
                <td><strong>${escapeHtml(t.titulo)}</strong></td>
                <td>${t.cliente?.nombre || '—'}</td>
                <td><span class="badge bg-secondary bg-opacity-25 text-dark">
                    ${prioridadIcon} ${t.prioridad?.nombre || '—'}
                </span></td>
                <td><span class="badge ${estadoClass}">${t.estado?.nombre || '—'}</span></td>
                <td>${formatFecha(t.fechaCreacion)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary me-1"
                        onclick="viewTicketDetail(${t.ticketId})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger"
                        onclick="deleteTicket(${t.ticketId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        updateStats();
    } catch (err) {
        console.error('Error cargando tickets:', err);
    }
}

async function viewTicketDetail(id) {
    try {
        const [resTicket, resBitacora] = await Promise.all([
            fetch(`${API}/tickets/${id}`, { headers: headers() }),
            fetch(`${API}/tickets/${id}/bitacora`, { headers: headers() })
        ]);

        const ticket = await resTicket.json();
        const bitacora = await resBitacora.json();

        const bitacoraHtml = bitacora.length > 0
            ? `<table class="table table-sm table-bordered small mt-2">
                <thead class="table-dark">
                    <tr>
                        <th>Fecha</th>
                        <th>Estado anterior</th>
                        <th>Estado nuevo</th>
                        <th>Usuario</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>
                    ${bitacora.map(b => `<tr>
                        <td>${formatFecha(b.fechaCambio)}</td>
                        <td>${b.estadoAnterior?.nombre || '—'}</td>
                        <td><strong>${b.estadoNuevo?.nombre || '—'}</strong></td>
                        <td>${b.usuario?.nombre || '—'}</td>
                        <td class="text-muted">${b.comentario || '—'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`
            : '<p class="text-muted small">Sin registros en bitácora.</p>';

        document.getElementById('detailTicketContent').innerHTML = `
            <div class="row mb-3">
                <div class="col-6"><strong>ID:</strong> #${ticket.ticketId}</div>
                <div class="col-6"><strong>Fecha:</strong> ${formatFecha(ticket.fechaCreacion)}</div>
                <div class="col-6 mt-2"><strong>Cliente:</strong> ${ticket.cliente?.nombre || '—'}</div>
                <div class="col-6 mt-2"><strong>Agente:</strong> ${ticket.agente?.nombre || 'Sin asignar'}</div>
                <div class="col-6 mt-2"><strong>Prioridad:</strong> ${ticket.prioridad?.nombre || '—'}</div>
                <div class="col-6 mt-2"><strong>Estado:</strong> ${ticket.estado?.nombre || '—'}</div>
            </div>
            <div class="mb-3">
                <strong>Título:</strong>
                <p class="fw-bold">${escapeHtml(ticket.titulo)}</p>
            </div>
            <div class="mb-3">
                <strong>Descripción:</strong>
                <p class="bg-light p-2 rounded">${escapeHtml(ticket.descripcionInicial || 'Sin descripción')}</p>
            </div>
            <hr>
            <div class="mb-2 fw-semibold">
                <i class="fas fa-history me-1"></i> Bitácora:
            </div>
            ${bitacoraHtml}`;

        const deleteBtn = document.getElementById('deleteTicketFromDetail');
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener('click', () => {
            if (confirm('¿Eliminar ticket definitivamente?')) {
                deleteTicket(ticket.ticketId);
                bootstrap.Modal.getInstance(
                    document.getElementById('detailTicketModal')).hide();
            }
        });

        new bootstrap.Modal(document.getElementById('detailTicketModal')).show();

    } catch (err) {
        console.error('Error cargando detalle:', err);
    }
}

async function deleteTicket(id) {
    if (!confirm('¿Eliminar este ticket permanentemente?')) return;
    try {
        await fetch(`${API}/tickets/${id}`, {
            method: 'DELETE',
            headers: headers()
        });
        renderTicketsTable();
    } catch (err) {
        console.error('Error eliminando ticket:', err);
    }
}

// ── HELPERS ───────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatFecha(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAdminAccess()) return;

    renderUsersTable();
    renderTicketsTable();
    updateStats();

    document.getElementById('saveUserBtn').addEventListener('click', saveUserHandler);
    document.getElementById('searchUser').addEventListener('input', renderUsersTable);
    document.getElementById('ticketStatusFilter').addEventListener('change', renderTicketsTable);
    document.getElementById('searchTicketGlobal').addEventListener('input', renderTicketsTable);
});

window.editUser = editUser;
window.deleteUser = deleteUser;
window.openUserModal = openUserModal;
window.deleteTicket = deleteTicket;
window.viewTicketDetail = viewTicketDetail;
window.logoutAdmin = logoutAdmin;