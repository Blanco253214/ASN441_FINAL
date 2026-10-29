const API_URL = '/api/v1';

document.addEventListener('DOMContentLoaded', () => {
    cargarViajes();
});

async function cargarViajes() {
    const tbody = document.getElementById('tabla-viajes-body');
    try {
        const response = await fetch(`${API_URL}/viajes`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            tbody.innerHTML = '';
            result.data.forEach(viaje => {
                tbody.innerHTML += `
                    <tr>
                        <td class="fw-bold text-primary">${viaje.codigo_seguimiento}</td>
                        <td>${viaje.cliente}</td>
                        <td><small>${viaje.origen} &rarr; ${viaje.destino}</small></td>
                        <td><span class="badge ${obtenerBadgeColor(viaje.estado_actual)}">${viaje.estado_actual}</span></td>
                        <td>
                            <select class="form-select form-select-sm" onchange="actualizarEstado(${viaje.id_viaje}, this.value)">
                                <option value="" disabled selected>Cambiar estado...</option>
                                <option value="Programada">Programada</option>
                                <option value="En aduana">En aduana</option>
                                <option value="Despachada">Despachada</option>
                                <option value="En camino">En camino</option>
                                <option value="Entregada">Entregada</option>
                                <option value="Lista para retiro">Lista para retiro</option>
                            </select>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No hay viajes registrados.</td></tr>`;
        }
    } catch (error) {
        console.error('Error cargando viajes:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error al conectar con la API Backend.</td></tr>`;
    }
}

async function actualizarEstado(idViaje, nuevoEstado) {
    try {
        const response = await fetch(`${API_URL}/viajes/${idViaje}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nuevo_estado: nuevoEstado,
                registrado_por: 'Operador Logístico',
                nota: `Cambio manual desde panel web`
            })
        });

        const result = await response.json();
        if (result.success) {
            cargarViajes();
        } else {
            alert('Error actualizando el estado: ' + result.error);
        }
    } catch (error) {
        alert('Error de conexión con el servidor.');
    }
}

async function consultarTracking() {
    const codigo = document.getElementById('input-codigo-tracking').value.trim();
    if (!codigo) return alert('Ingrese un código de seguimiento válido.');

    const contenedorResultado = document.getElementById('resultado-tracking');
    try {
        const response = await fetch(`${API_URL}/viajes/rastreo/${codigo}`);
        const result = await response.json();

        if (result.success) {
            contenedorResultado.classList.remove('d-none');
            const data = result.data.detalles;
            const historial = result.data.historial;

            document.getElementById('track-codigo').innerText = data.codigo_seguimiento;
            document.getElementById('track-cliente').innerText = data.cliente;
            document.getElementById('track-ruta').innerText = `${data.origen} a ${data.destino}`;
            document.getElementById('track-estado-actual').innerText = data.estado_actual;

            const listHistorial = document.getElementById('track-historial-list');
            listHistorial.innerHTML = '';
            historial.forEach(item => {
                listHistorial.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong class="text-dark">${item.estado}</strong>
                            <div class="small text-muted">${item.nota} - <em>${item.registrado_por}</em></div>
                        </div>
                        <span class="badge bg-light text-dark">${new Date(item.fecha_hora).toLocaleString()}</span>
                    </li>
                `;
            });
        } else {
            alert('Código de seguimiento no encontrado.');
            contenedorResultado.classList.add('d-none');
        }
    } catch (error) {
        alert('Error consultando el seguimiento.');
    }
}

function obtenerBadgeColor(estado) {
    switch (estado) {
        case 'Programada': return 'bg-secondary';
        case 'En aduana': return 'bg-warning text-dark';
        case 'Despachada': return 'bg-info text-dark';
        case 'En camino': return 'bg-primary';
        case 'Entregada': return 'bg-success';
        case 'Lista para retiro': return 'bg-dark';
        default: return 'bg-light text-dark';
    }
}