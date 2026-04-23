 // ---------- MODELO DE DATOS ----------
    let tickets = [];

    // Cargar desde localStorage
    function loadTicketsFromStorage() {
        const stored = localStorage.getItem('soporte_tickets');
        if(stored) {
            tickets = JSON.parse(stored);
        } else {
            // Datos de ejemplo para demostración
            tickets = [
                { id: 1, titulo: "No puedo acceder al panel", cliente: "Ana Rodríguez", prioridad: "alta", estado: "abierto", descripcion: "Error 403 al intentar ingresar con credenciales correctas", fechaCreacion: new Date(2025,2,15,10,30).toISOString() },
                { id: 2, titulo: "Solicitud de cambio de contraseña", cliente: "Carlos Méndez", prioridad: "baja", estado: "en-proceso", descripcion: "Olvidó su contraseña, requiere reseteo", fechaCreacion: new Date(2025,2,18,9,15).toISOString() },
                { id: 3, titulo: "Error en el módulo de facturación", cliente: "Laura Fernández", prioridad: "media", estado: "resuelto", descripcion: "No calcula impuestos correctamente, ya se solucionó", fechaCreacion: new Date(2025,2,10,14,45).toISOString() }
            ];
            saveToLocalStorage();
        }
        renderizarTickets();
        actualizarContadores();
    }

    function saveToLocalStorage() {
        localStorage.setItem('soporte_tickets', JSON.stringify(tickets));
    }

    // generar ID único
    function generarId() {
        return tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1;
    }

    // renderizar lista según filtros y búsqueda
    let currentFilter = 'all';
    let searchTerm = '';

    function renderizarTickets() {
        let filtered = [...tickets];
        // Filtro por estado
        if(currentFilter !== 'all') {
            filtered = filtered.filter(t => t.estado === currentFilter);
        }
        // Búsqueda por título o cliente
        if(searchTerm.trim() !== '') {
            const term = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(t => t.titulo.toLowerCase().includes(term) || t.cliente.toLowerCase().includes(term));
        }
        // Ordenar por fecha descendente (más reciente primero)
        filtered.sort((a,b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

        const container = document.getElementById('ticketsContainer');
        if(filtered.length === 0) {
            container.innerHTML = `<div class="text-center py-5 text-muted"><i class="fas fa-ticket-alt fa-3x mb-3"></i><p>No se encontraron tickets con los filtros actuales.</p></div>`;
            return;
        }

        // Uso de cards responsivas con diseño atractivo
        let html = `<div class="row g-3">`;
        filtered.forEach(ticket => {
            const prioridadClass = ticket.prioridad === 'alta' ? 'priority-high' : (ticket.prioridad === 'media' ? 'priority-medium' : 'priority-low');
            const statusText = getStatusText(ticket.estado);
            const statusClass = getStatusClass(ticket.estado);
            const prioridadIcon = ticket.prioridad === 'alta' ? '🔴' : (ticket.prioridad === 'media' ? '🟠' : '🟢');
            const fechaFormateada = new Date(ticket.fechaCreacion).toLocaleDateString('es-ES', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
            html += `
                <div class="col-md-6 col-xl-4">
                    <div class="card ticket-card h-100 shadow-sm border-0 rounded-3 ${prioridadClass}" data-ticket-id="${ticket.id}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title fw-bold mb-0">${escapeHtml(ticket.titulo)}</h5>
                                <span class="ticket-status ${statusClass}">${statusText}</span>
                            </div>
                            <p class="card-text text-muted small mb-2"><i class="fas fa-user"></i> ${escapeHtml(ticket.cliente)}</p>
                            <p class="card-text small">${escapeHtml(ticket.descripcion.substring(0, 80))}${ticket.descripcion.length > 80 ? '...' : ''}</p>
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <div><span class="badge-priority bg-light text-dark"><i class="fas fa-flag"></i> ${prioridadIcon} ${ticket.prioridad.toUpperCase()}</span>
                                <span class="ms-2 small text-muted"><i class="far fa-calendar-alt"></i> ${fechaFormateada}</span>
                                </div>
                                <button class="btn btn-sm btn-outline-primary view-detail-btn" data-id="${ticket.id}">Ver detalles <i class="fas fa-chevron-right"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;

        // Eventos para botones de ver detalle
        document.querySelectorAll('.view-detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                abrirDetalleTicket(id);
            });
        });
        // opcional: hacer click en card entera también
        document.querySelectorAll('.ticket-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if(e.target.classList.contains('view-detail-btn') || e.target.closest('.view-detail-btn')) return;
                const id = parseInt(card.getAttribute('data-ticket-id'));
                if(id) abrirDetalleTicket(id);
            });
        });
    }

    function abrirDetalleTicket(id) {
        const ticket = tickets.find(t => t.id === id);
        if(!ticket) return;
        const modalBody = document.getElementById('detailContent');
        const fechaCreacion = new Date(ticket.fechaCreacion).toLocaleString('es-ES');
        const prioridadTexto = ticket.prioridad === 'alta' ? 'Alta 🔴' : (ticket.prioridad === 'media' ? 'Media 🟠' : 'Baja 🟢');
        const estadoTexto = getStatusText(ticket.estado);
        const estadoClass = getStatusClass(ticket.estado);
        const html = `
            <div class="mb-3 border-bottom pb-2">
                <h4>#${ticket.id} - ${escapeHtml(ticket.titulo)}</h4>
                <div><span class="ticket-status ${estadoClass}">${estadoTexto}</span> <span class="badge bg-secondary ms-2">${prioridadTexto}</span></div>
            </div>
            <div class="row">
                <div class="col-md-6"><strong><i class="fas fa-user-circle"></i> Cliente:</strong> ${escapeHtml(ticket.cliente)}</div>
                <div class="col-md-6"><strong><i class="fas fa-calendar-plus"></i> Creado:</strong> ${fechaCreacion}</div>
            </div>
            <div class="mt-3"><strong><i class="fas fa-align-left"></i> Descripción completa:</strong></div>
            <div class="p-2 bg-light rounded">${escapeHtml(ticket.descripcion) || 'Sin descripción'}</div>
            
            <hr class="my-3">
            <div class="mt-2"><strong><i class="fas fa-tasks"></i> Cambiar estado:</strong></div>
            <div class="d-flex flex-wrap gap-2 mt-2">
                <button class="btn btn-sm btn-warning status-change" data-status="abierto">🟡 Abierto</button>
                <button class="btn btn-sm btn-info status-change" data-status="en-proceso">🔄 En Proceso</button>
                <button class="btn btn-sm btn-success status-change" data-status="resuelto">✅ Resuelto</button>
                <button class="btn btn-sm btn-secondary status-change" data-status="cerrado">🔒 Cerrado</button>
            </div>
            <div class="mt-3">
                <label class="form-label fw-semibold"><i class="fas fa-edit"></i> Agregar comentario / actualización (se reflejará en descripción)</label>
                <textarea id="comentarioActualizacion" class="form-control" rows="2" placeholder="Añadir nota o solución..."></textarea>
                <button class="btn btn-sm btn-primary mt-2" id="addComentarioBtn">➕ Agregar comentario</button>
            </div>
        `;
        modalBody.innerHTML = html;
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        modal.show();

        // Cambiar estado desde detalle
        document.querySelectorAll('.status-change').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newStatus = btn.getAttribute('data-status');
                if(confirm(`¿Cambiar estado a "${getStatusText(newStatus)}"?`)) {
                    ticket.estado = newStatus;
                    saveToLocalStorage();
                    renderizarTickets();
                    actualizarContadores();
                    // Refrescar detalle actual
                    abrirDetalleTicket(ticket.id);
                }
            });
        });
        // agregar comentario: actualiza descripción concatenando
        const addComentario = document.getElementById('addComentarioBtn');
        if(addComentario) {
            addComentario.onclick = () => {
                const comentario = document.getElementById('comentarioActualizacion').value.trim();
                if(comentario) {
                    const timestamp = new Date().toLocaleString();
                    const nuevoComentario = `\n[${timestamp}] Comentario: ${comentario}`;
                    ticket.descripcion = (ticket.descripcion || '') + nuevoComentario;
                    saveToLocalStorage();
                    renderizarTickets();
                    actualizarContadores();
                    abrirDetalleTicket(ticket.id);
                } else {
                    alert("Escribe un comentario primero.");
                }
            };
        }
        // botón eliminar desde detalle
        const deleteDetailBtn = document.getElementById('deleteFromDetailBtn');
        deleteDetailBtn.onclick = () => {
            if(confirm(`Eliminar permanentemente el ticket #${ticket.id} - "${ticket.titulo}"?`)) {
                tickets = tickets.filter(t => t.id !== ticket.id);
                saveToLocalStorage();
                renderizarTickets();
                actualizarContadores();
                modal.hide();
            }
        };
    }

    // Guardar ticket nuevo o editar
    function guardarTicket() {
        const id = document.getElementById('ticketId').value;
        const titulo = document.getElementById('titulo').value.trim();
        const cliente = document.getElementById('cliente').value.trim();
        const prioridad = document.getElementById('prioridad').value;
        const estado = document.getElementById('estado').value;
        const descripcion = document.getElementById('descripcion').value.trim();

        if(!titulo || !cliente) {
            alert("Título y Cliente son obligatorios.");
            return false;
        }

        if(id === "") {
            // Nuevo
            const newTicket = {
                id: generarId(),
                titulo,
                cliente,
                prioridad,
                estado,
                descripcion: descripcion || "Sin detalles adicionales",
                fechaCreacion: new Date().toISOString()
            };
            tickets.push(newTicket);
        } else {
            // Editar existente
            const index = tickets.findIndex(t => t.id == id);
            if(index !== -1) {
                tickets[index].titulo = titulo;
                tickets[index].cliente = cliente;
                tickets[index].prioridad = prioridad;
                tickets[index].estado = estado;
                tickets[index].descripcion = descripcion || "Sin detalles adicionales";
                // mantener fecha original
            }
        }
        saveToLocalStorage();
        renderizarTickets();
        actualizarContadores();
        return true;
    }

    // helpers
    function getStatusText(estado) {
        const map = { 'abierto': 'Abierto', 'en-proceso': 'En Proceso', 'resuelto': 'Resuelto', 'cerrado': 'Cerrado' };
        return map[estado] || 'Abierto';
    }
    function getStatusClass(estado) {
        const map = { 'abierto': 'status-abierto', 'en-proceso': 'status-en-proceso', 'resuelto': 'status-resuelto', 'cerrado': 'status-cerrado' };
        return map[estado] || 'status-abierto';
    }
    function actualizarContadores() {
        const total = tickets.length;
        const abiertos = tickets.filter(t => t.estado === 'abierto').length;
        const proceso = tickets.filter(t => t.estado === 'en-proceso').length;
        const resueltos = tickets.filter(t => t.estado === 'resuelto').length;
        document.getElementById('totalCount').innerText = total;
        document.getElementById('abiertoCount').innerText = abiertos;
        document.getElementById('procesoCount').innerText = proceso;
        document.getElementById('resueltoCount').innerText = resueltos;
    }

    function escapeHtml(str) {
        if(!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if(m === '&') return '&amp;';
            if(m === '<') return '&lt;';
            if(m === '>') return '&gt;';
            return m;
        }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
            return c;
        });
    }

    // eventos globales
    document.addEventListener('DOMContentLoaded', () => {
        loadTicketsFromStorage();

        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn-active', 'btn-primary'));
                btn.classList.add('filter-btn-active', 'btn-primary');
                currentFilter = btn.getAttribute('data-filter');
                renderizarTickets();
            });
            // activar all por defecto
            if(btn.getAttribute('data-filter') === 'all') btn.classList.add('filter-btn-active', 'btn-primary');
        });

        document.getElementById('searchTicket').addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderizarTickets();
        });

        // Botón guardar modal
        const saveBtn = document.getElementById('saveTicketBtn');
        saveBtn.addEventListener('click', () => {
            if(guardarTicket()) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('ticketModal'));
                modal.hide();
                document.getElementById('ticketForm').reset();
                document.getElementById('ticketId').value = '';
            }
        });

        // Botón nuevo ticket: resetear formulario
        document.getElementById('newTicketBtn').addEventListener('click', () => {
            document.getElementById('ticketForm').reset();
            document.getElementById('ticketId').value = '';
            document.getElementById('prioridad').value = 'media';
            document.getElementById('estado').value = 'abierto';
        });
        // Al cerrar modal manualmente limpiar
        document.getElementById('ticketModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('ticketForm').reset();
            document.getElementById('ticketId').value = '';
        });
    });