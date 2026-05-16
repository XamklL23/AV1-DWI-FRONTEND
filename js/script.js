const API = 'http://localhost:8080/api';

const token = localStorage.getItem('token');

if (!token) {
    window.location.replace('index.html');
}


function formatFecha(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '—';

    return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const rol  = user?.rol || 'cliente';

    // ── Ocultar botón "Nuevo Ticket" si es agente
    const newTicketBtn = document.getElementById('newTicketBtn');
    if (rol === 'agente') {
        newTicketBtn.classList.add('d-none');
    }

    cargarTickets();

    // Botón nuevo ticket: resetear form
    newTicketBtn.addEventListener('click', () => {
        document.getElementById('ticketForm').reset();
        document.getElementById('ticketId').value = '';
        document.getElementById('prioridad').value = 'media';
    });

    // Limpiar modal al cerrar
    document.getElementById('ticketModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('ticketForm').reset();
        document.getElementById('ticketId').value = '';
    });

    // Guardar ticket
    document.getElementById('saveTicketBtn').addEventListener('click', guardarTicket);

    // Filtros
    let filtroActual = null;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b =>
                b.classList.remove('active', 'btn-primary'));
            btn.classList.add('active', 'btn-primary');

            const estadoMap = {
                'all':        null,
                'abierto':    'Abierto',
                'en-proceso': 'En Proceso',
                'resuelto':   'Resuelto',
                'cerrado':    'Cerrado'
            };
            filtroActual = estadoMap[btn.dataset.filter];
            cargarTickets(filtroActual);
        });

        if (btn.dataset.filter === 'all') {
            btn.classList.add('active', 'btn-primary');
        }
    });

    // Búsqueda
    let timeoutBusqueda;

    document.getElementById('searchTicket').addEventListener('input', (e) => {
        clearTimeout(timeoutBusqueda);
        const q = e.target.value.trim();

        timeoutBusqueda = setTimeout(async () => {
            try {
                const url = new URL(`${API}/tickets`);

                if (q.length > 0) {
                    url.searchParams.append('search', q);
                }
                if (filtroActual) {
                    url.searchParams.append('estado', filtroActual);
                }

                const res  = await fetch(url, { headers: headers() });
                const data = await res.json();
                renderizarTickets(data.content || []);

            } catch (err) {
                console.error('Error buscando:', err);
            }
        }, 400);
    });
});

// ── HEADERS ───────────────────────────────────────────────────
function headers() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ── CARGAR TICKETS ────────────────────────────────────────────
async function cargarTickets(estado = null) {
    try {
        const url = estado
            ? `${API}/tickets?estado=${estado}`
            : `${API}/tickets`;

        const res = await fetch(url, { headers: headers() });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return;
        }

        const data = await res.json();
        const tickets = data.content || [];

        actualizarContadores(tickets);
        renderizarTickets(tickets);
    } catch (err) {
        console.error('Error cargando tickets:', err);
    }
}

// ── CONTADORES ────────────────────────────────────────────────
function actualizarContadores(tickets) {
    document.getElementById('totalCount').innerText =
        tickets.length;
    document.getElementById('abiertoCount').innerText =
        tickets.filter(t => t.estado?.nombre === 'Abierto').length;
    document.getElementById('procesoCount').innerText =
        tickets.filter(t => t.estado?.nombre === 'En Proceso').length;
    document.getElementById('resueltoCount').innerText =
        tickets.filter(t => t.estado?.nombre === 'Resuelto').length;
}

// ── RENDER TICKETS ────────────────────────────────────────────
function renderizarTickets(tickets) {
    const container = document.getElementById('ticketsContainer');

    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-ticket-alt fa-3x mb-3"></i>
                <p>No se encontraron tickets con los filtros actuales.</p>
            </div>`;
        return;
    }

    let html = `<div class="row g-3">`;
    tickets.forEach(ticket => {
        const fechaFormateada = formatFecha(ticket.fechaCreacion);
        const cerrado = ticket.estado?.nombre === 'Cerrado';

        html += `
            <div class="col-md-6 col-xl-4">
                <div class="card h-100 shadow-sm border-0 rounded-3
                     ${cerrado ? 'opacity-50' : ''}"
                     style="
                        border-left: 4px solid ${cerrado ? '#adb5bd' : colorPrioridad(ticket.prioridad?.nombre)} !important;
                        cursor: ${cerrado ? 'not-allowed' : 'pointer'};
                     "
                     ${cerrado ? '' : `onclick="abrirDetalleTicket(${ticket.ticketId})"`}>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold mb-0 fs-6
                                ${cerrado ? 'text-decoration-line-through text-muted' : ''}">
                                ${escapeHtml(ticket.titulo)}
                            </h5>
                            <div class="d-flex flex-column gap-1 align-items-end">
                                ${badgeEstado(ticket.estado?.nombre)}
                                ${cerrado ? '<span class="badge bg-secondary" style="font-size:0.65rem">🔒 No editable</span>' : ''}
                            </div>
                        </div>
                        <p class="text-muted small mb-2">
                            <i class="fas fa-user me-1"></i>${ticket.cliente?.nombre || 'Sin cliente'}
                        </p>
                        <p class="small text-muted">
                            ${escapeHtml((ticket.descripcionInicial || '').substring(0, 80))}
                            ${(ticket.descripcionInicial || '').length > 80 ? '...' : ''}
                        </p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            ${badgePrioridad(ticket.prioridad?.nombre)}
                            <span class="small text-muted">
                                <i class="far fa-clock me-1"></i>${fechaFormateada}
                            </span>
                        </div>
                    </div>
                </div>
            </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

let html = `<div class="row g-3">`;
tickets.forEach(ticket => {
    const fechaFormateada = formatFecha(ticket.fechaCreacion);
    html += `
            <div class="col-md-6 col-xl-4">
                <div class="card h-100 shadow-sm border-0 rounded-3"
                    style="cursor:pointer; border-left: 4px solid ${colorPrioridad(ticket.prioridad?.nombre)} !important;"
                    data-ticket-id="${ticket.ticketId}"
                    onclick="abrirDetalleTicket(${ticket.ticketId})">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold mb-0 fs-6">
                                ${escapeHtml(ticket.titulo)}
                            </h5>
                            ${badgeEstado(ticket.estado?.nombre)}
                        </div>
                        <p class="text-muted small mb-2">
                            <i class="fas fa-user me-1"></i>${ticket.cliente?.nombre || 'Sin cliente'}
                        </p>
                        <p class="small text-muted">
                            ${escapeHtml((ticket.descripcionInicial || '').substring(0, 80))}
                            ${(ticket.descripcionInicial || '').length > 80 ? '...' : ''}
                        </p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            ${badgePrioridad(ticket.prioridad?.nombre)}
                            <span class="small text-muted">
                                <i class="far fa-clock me-1"></i>${fechaFormateada}
                            </span>
                        </div>
                    </div>
                </div>
            </div>`;
});
html += `</div>`;
container.innerHTML = html;


// ── DETALLE TICKET ────────────────────────────────────────────
async function abrirDetalleTicket(id) {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const rol  = user?.rol || 'cliente';

    try {
        const res    = await fetch(`${API}/tickets/${id}`, { headers: headers() });
        const ticket = await res.json();

        const resComentarios = await fetch(
            `${API}/tickets/${id}/comments`, { headers: headers() });
        const comentarios = await resComentarios.json();

        const resBitacora = await fetch(
            `${API}/tickets/${id}/bitacora`, { headers: headers() });
        const bitacora = await resBitacora.json();

        const cerrado = ticket.estado?.nombre === 'Cerrado';

        // ── Botones de estado según rol ──────────────────────
        const botonesEstado = () => {
            if (cerrado) {
                return `<div class="alert alert-secondary py-2 small">
                    🔒 Este ticket está cerrado y no puede modificarse.
                </div>`;
            }
            if (rol === 'cliente') {
                return `<div class="alert alert-info py-2 small">
                    <i class="fas fa-info-circle me-1"></i>
                    Solo puedes visualizar este ticket.
                </div>`;
            }
            if (rol === 'agente') {
                return `
                <div class="mb-2 fw-semibold">
                    <i class="fas fa-tasks me-1"></i> Gestionar estado:
                </div>
                <div class="d-flex flex-wrap gap-2 mb-3">
                    <button onclick="cambiarEstado(${ticket.ticketId}, 2)"
                        class="btn btn-sm btn-info text-white">🔄 En Proceso</button>
                    <button onclick="cambiarEstado(${ticket.ticketId}, 4)"
                        class="btn btn-sm btn-success">✅ Resuelto</button>
                    <button onclick="cambiarEstado(${ticket.ticketId}, 5)"
                        class="btn btn-sm btn-secondary">🔒 Cerrar</button>
                </div>`;
            }
            // Admin — todos los estados
            return `
                <div class="mb-2 fw-semibold">
                    <i class="fas fa-tasks me-1"></i> Cambiar estado:
                </div>
                <div class="d-flex flex-wrap gap-2 mb-3">
                    <button onclick="cambiarEstado(${ticket.ticketId}, 1)"
                        class="btn btn-sm btn-warning">🟡 Abierto</button>
                    <button onclick="cambiarEstado(${ticket.ticketId}, 2)"
                        class="btn btn-sm btn-info text-white">🔄 En Proceso</button>
                    <button onclick="cambiarEstado(${ticket.ticketId}, 3)"
                        class="btn btn-sm btn-primary">⏳ Pendiente</button>
                    <button onclick="cambiarEstado(${ticket.ticketId}, 4)"
                        class="btn btn-sm btn-success">✅ Resuelto</button>
                    <button onclick="cambiarEstado(${ticket.ticketId}, 5)"
                        class="btn btn-sm btn-secondary">🔒 Cerrar</button>
                </div>`;
        };

        // ── Asignar agente (solo admin) ───────────────────────
        const seccionAsignar = rol === 'admin' && !cerrado ? `
            <hr>
            <div class="mb-2 fw-semibold">
                <i class="fas fa-user-check me-1"></i> Asignar agente:
            </div>
            <div class="d-flex gap-2">
                <input type="number" id="agenteIdInput"
                    class="form-control form-control-sm" placeholder="ID del agente">
                <button onclick="asignarAgente(${ticket.ticketId})"
                    class="btn btn-sm btn-outline-primary">
                    Asignar
                </button>
            </div>` : '';

        // ── Sección comentarios (agente y admin) ──────────────
        const seccionComentarios = (rol === 'agente' || rol === 'admin') && !cerrado ? `
            <div>
                <textarea id="nuevoComentario" class="form-control form-control-sm mb-2"
                    rows="2" placeholder="Añadir comentario..."></textarea>
                <button class="btn btn-sm btn-primary"
                    onclick="agregarComentario(${ticket.ticketId})">
                    <i class="fas fa-paper-plane me-1"></i> Enviar comentario
                </button>
            </div>` : '';

        // ── Bitácora ──────────────────────────────────────────
        const bitacoraHtml = bitacora.length > 0
            ? `<table class="table table-sm table-bordered small">
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
                    ${bitacora.map(b => `
                        <tr>
                            <td>${formatFecha(b.fechaCambio)}</td>
                            <td>${b.estadoAnterior?.nombre || '—'}</td>
                            <td><strong>${b.estadoNuevo?.nombre || '—'}</strong></td>
                            <td>${b.usuario?.nombre || '—'}</td>
                            <td class="text-muted">${b.comentario || '—'}</td>
                        </tr>`).join('')}
                </tbody>
               </table>`
            : `<p class="text-muted small">Sin registros en bitácora.</p>`;

        const comentariosHtml = comentarios.length > 0
            ? comentarios.map(c => `
                <div class="p-2 bg-light rounded mb-2">
                    <div class="d-flex justify-content-between">
                        <strong class="small">${c.autor?.nombre || 'Usuario'}</strong>
                        <span class="text-muted" style="font-size:0.7rem">
                            ${formatFecha(c.fechaCreacion)}
                        </span>
                    </div>
                    <p class="mb-0 small">${escapeHtml(c.contenido)}</p>
                </div>`).join('')
            : `<p class="text-muted small">Sin comentarios aún.</p>`;

        document.getElementById('detailContent').innerHTML = `
            <div class="mb-3 border-bottom pb-2">
                <h5 class="fw-bold">#${ticket.ticketId} - ${escapeHtml(ticket.titulo)}</h5>
                <div class="d-flex gap-2 flex-wrap">
                    ${badgeEstado(ticket.estado?.nombre)}
                    ${badgePrioridad(ticket.prioridad?.nombre)}
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-6">
                    <div class="text-muted small">Cliente</div>
                    <div class="fw-semibold">${ticket.cliente?.nombre || '—'}</div>
                </div>
                <div class="col-6">
                    <div class="text-muted small">Agente</div>
                    <div class="fw-semibold">${ticket.agente?.nombre || 'Sin asignar'}</div>
                </div>
                <div class="col-6 mt-2">
                    <div class="text-muted small">Creado</div>
                    <div class="fw-semibold">${formatFecha(ticket.fechaCreacion)}</div>
                </div>
                <div class="col-6 mt-2">
                    <div class="text-muted small">Actualizado</div>
                    <div class="fw-semibold">${formatFecha(ticket.fechaActualizacion)}</div>
                </div>
            </div>
            <div class="p-3 bg-light rounded mb-3">
                <strong class="small">
                    <i class="fas fa-align-left me-1"></i>Descripción:
                </strong>
                <p class="mb-0 mt-1 small">${escapeHtml(ticket.descripcionInicial)}</p>
            </div>
            <hr>
            ${botonesEstado()}
            ${seccionAsignar}
            <hr>
            <div class="mb-2 fw-semibold">
                <i class="fas fa-comments me-1"></i> Comentarios:
            </div>
            <div id="comentariosContainer" class="mb-3">
                ${comentariosHtml}
            </div>
            ${seccionComentarios}
            <hr>
            <div class="mb-2 fw-semibold">
                <i class="fas fa-history me-1"></i> Bitácora:
            </div>
            ${bitacoraHtml}`;

        // Botón eliminar — solo admin y ticket no cerrado
        const deleteBtn = document.getElementById('deleteFromDetailBtn');
        if (rol === 'admin' && !cerrado) {
            deleteBtn.classList.remove('d-none');
            deleteBtn.onclick = () => eliminarTicket(ticket.ticketId);
        } else {
            deleteBtn.classList.add('d-none');
        }

        new bootstrap.Modal(document.getElementById('detailModal')).show();

    } catch (err) {
        console.error('Error cargando detalle:', err);
    }
}

// ── GUARDAR TICKET ────────────────────────────────────────────
async function guardarTicket() {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const rol  = user?.rol || 'cliente';

    // Agente no puede crear tickets
    if (rol === 'agente') {
        alert('Los agentes no pueden crear tickets.');
        return;
    }

    const titulo             = document.getElementById('titulo').value.trim();
    const descripcionInicial = document.getElementById('descripcion').value.trim();
    const prioridadNombre    = document.getElementById('prioridad').value;

    if (!titulo) { alert('El título es obligatorio'); return; }

    // Validar máximo 6 tickets pendientes para cliente
    if (rol === 'cliente') {
        try {
            const res  = await fetch(`${API}/tickets`, { headers: headers() });
            const data = await res.json();
            const ticketsPendientes = (data.content || []).filter(t =>
                t.estado?.nombre !== 'Cerrado' &&
                t.estado?.nombre !== 'Resuelto'
            );
            if (ticketsPendientes.length >= 6) {
                alert('Has alcanzado el límite de 6 tickets pendientes. Resuelve o cierra alguno antes de crear uno nuevo.');
                bootstrap.Modal.getInstance(
                    document.getElementById('ticketModal')).hide();
                return;
            }
        } catch (err) {
            console.error('Error verificando límite:', err);
        }
    }

    const prioridadMap = { baja: 1, media: 2, alta: 3, critica: 4 };
    const prioridadId  = prioridadMap[prioridadNombre] || 2;

    try {
        const res = await fetch(`${API}/tickets`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ titulo, descripcionInicial, prioridadId })
        });

        if (!res.ok) throw new Error('Error al crear ticket');

        bootstrap.Modal.getInstance(
            document.getElementById('ticketModal')).hide();
        document.getElementById('ticketForm').reset();
        cargarTickets();

    } catch (err) {
        console.error('Error guardando ticket:', err);
        alert('Error al guardar el ticket.');
    }
}

// ── CAMBIAR ESTADO ────────────────────────────────────────────
async function cambiarEstado(ticketId, estadoId) {
    try {
        await fetch(`${API}/tickets/${ticketId}/estado/${estadoId}`, {
            method: 'PATCH',
            headers: headers()
        });
        bootstrap.Modal.getInstance(
            document.getElementById('detailModal')).hide();
        cargarTickets();
    } catch (err) {
        console.error('Error cambiando estado:', err);
    }
}

// ── AGREGAR COMENTARIO ────────────────────────────────────────
async function agregarComentario(ticketId) {
    const contenido = document.getElementById('nuevoComentario').value.trim();
    if (!contenido) {
        alert('Escribe un comentario primero');
        return;
    }

    try {
        await fetch(`${API}/tickets/${ticketId}/comments`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ contenido })
        });

        const modalEl = document.getElementById('detailModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);

        if (modalInstance) {
            modalInstance.hide();
        }

        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');

        setTimeout(() => abrirDetalleTicket(ticketId), 150);

    } catch (err) {
        console.error('Error agregando comentario:', err);
    }
}

// ── ELIMINAR TICKET ───────────────────────────────────────────
async function eliminarTicket(id) {
    try {
        const confirmacion = confirm(`¿Eliminar ticket #${id}?`);
        if (!confirmacion) return;

        const res = await fetch(`${API}/tickets/${id}`, {
            method: 'DELETE',
            headers: headers()
        });

        const text = await res.text();

        console.log("STATUS:", res.status);
        console.log("RESPONSE:", text);

        if (!res.ok) {
            throw new Error(text || "Error eliminando ticket");
        }

        bootstrap.Modal.getInstance(
            document.getElementById('detailModal')
        )?.hide();

        cargarTickets();

    } catch (err) {
        console.error('Error eliminando ticket:', err);
        alert("No se pudo eliminar el ticket");
    }
}

async function asignarAgente(ticketId) {
    const agenteId = document.getElementById('agenteIdInput').value;
    if (!agenteId) { alert('Ingresa el ID del agente'); return; }

    try {
        await fetch(`${API}/tickets/${ticketId}/asignar/${agenteId}`, {
            method: 'PATCH',
            headers: headers()
        });
        abrirDetalleTicket(ticketId);
    } catch (err) {
        console.error('Error asignando agente:', err);
    }
}

// ── HELPERS ───────────────────────────────────────────────────
function badgeEstado(nombre) {
    const map = {
        'Abierto': 'bg-warning text-dark',
        'En Proceso': 'bg-info text-white',
        'Pendiente': 'bg-secondary text-white',
        'Resuelto': 'bg-success text-white',
        'Cerrado': 'bg-dark text-white',
    };
    const cls = map[nombre] || 'bg-secondary text-white';
    return `<span class="badge ${cls}">${nombre || 'Sin estado'}</span>`;
}

function badgePrioridad(nombre) {
    const map = {
        'Baja': 'bg-success',
        'Media': 'bg-warning text-dark',
        'Alta': 'bg-danger',
        'Critica': 'bg-danger',
    };
    const cls = map[nombre] || 'bg-secondary';
    return `<span class="badge ${cls}"><i class="fas fa-flag me-1"></i>${nombre || '—'}</span>`;
}

function colorPrioridad(nombre) {
    const map = {
        'Baja': '#198754',
        'Media': '#ffc107',
        'Alta': '#dc3545',
        'Critica': '#7f0000',
    };
    return map[nombre] || '#6c757d';
}

function formatFecha(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}