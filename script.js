const grupos = {
    "1111": { nombre: "Grupo A", lider: "Juan Perez" },
    "2222": { nombre: "Grupo B", lider: "Andrés López" },
    "3333": { nombre: "Grupo C", lider: "Carlos Ruiz" },
    "0000": { nombre: "Admin", lider: "Pastor Central" }
};

let grupoActivo = null;
let movimientos = [];
let historialActividad = [];
const PIN_ADMIN = "0000";

// --- ACCESO Y SEGURIDAD ---

function togglePassword() {
    const p = document.getElementById('pinAcceso');
    const eye = document.getElementById('eyeIcon');
    p.type = p.type === "password" ? "text" : "password";
    if(eye) eye.classList.toggle('fa-eye-slash');
}

function validarAcceso() {
    const pin = document.getElementById('pinAcceso').value;
    if (grupos[pin]) {
        grupoActivo = grupos[pin];
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('appContent').classList.remove('hidden');
        document.getElementById('infoGrupo').innerText = `Vendedor: ${grupoActivo.lider} | ${grupoActivo.nombre}`;
        
        registrarEnHistorial("SESIÓN", `El líder ${grupoActivo.lider} inició sesión`, "blue");
    } else {
        document.getElementById('errorLogin').classList.remove('hidden');
    }
}

// --- LÓGICA DE FORMULARIO ---

function toggleManualPrice() {
    const s = document.getElementById('selectActividad');
    const divManual = document.getElementById('divManual');
    if(divManual) divManual.classList.toggle('hidden', s.value !== 'manual');
}

function agregarMovimiento() {
    const cliInput = document.getElementById('cliente');
    const tipoInput = document.getElementById('tipoMov');
    const s = document.getElementById('selectActividad');
    const cantInput = document.getElementById('cant');
    const precManualInput = document.getElementById('precManual');
    const fotoInput = document.getElementById('foto');

    const cli = cliInput.value.trim() || "General";
    const tipo = tipoInput.value;
    const cant = parseInt(cantInput.value) || 1;
    
    let unitario = s.value === 'manual' ? parseFloat(precManualInput.value) : parseFloat(s.value);

    if (isNaN(unitario) || unitario <= 0) {
        return alert("Por favor, ingrese un valor válido");
    }

    const nuevo = {
        id: Date.now(),
        vendedor: grupoActivo.lider,
        cliente: cli.toUpperCase(),
        tipo: tipo,
        cantidad: cant,
        concepto: s.options[s.selectedIndex].text.split(' (')[0],
        total: unitario * cant,
        saldo: tipo === 'DEUDA' ? unitario * cant : 0,
        fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidencia: fotoInput && fotoInput.files[0] ? URL.createObjectURL(fotoInput.files[0]) : null 
    };

    movimientos.unshift(nuevo);
    
    // Historial dinámico según el tipo
    const emoji = tipo === 'DEUDA' ? '⚠️' : '✅';
    registrarEnHistorial(tipo, `${emoji} ${nuevo.vendedor} registró ${nuevo.concepto} a ${nuevo.cliente} por $${nuevo.total.toLocaleString()}`, tipo === 'DEUDA' ? "yellow" : "green");
    
    actualizarTodo();
    
    // Resetear formulario
    cliInput.value = "";
    precManualInput.value = "";
    if(fotoInput) fotoInput.value = "";
    cantInput.value = 1;
}

// --- SISTEMA DE HISTORIAL (LOG) ---

function registrarEnHistorial(accion, detalle, color) {
    const entrada = {
        fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        accion: accion,
        detalle: detalle,
        color: color
    };
    historialActividad.unshift(entrada); 
    renderizarHistorial();
}

function renderizarHistorial() {
    const contenedor = document.getElementById('logHistorial');
    if (!contenedor) return;

    contenedor.innerHTML = historialActividad.map(item => `
        <div class="border-l-4 border-${item.color}-500 bg-gray-800/60 p-2 mb-2 rounded shadow-sm text-[11px] animate-fade-in">
            <span class="text-gray-500 font-bold">${item.fecha}</span> 
            <span class="text-${item.color}-400 font-black ml-2">${item.accion}:</span> 
            <span class="text-gray-200 ml-1">${item.detalle}</span>
        </div>
    `).join('');
    contenedor.scrollTop = 0;
}

// --- ACCIONES DE TABLA ---

function eliminarMov(id) {
    const pin = prompt("SEGURIDAD: Ingrese PIN de Administrador para eliminar:");
    if (pin === PIN_ADMIN) {
        const m = movimientos.find(mov => mov.id === id);
        
        registrarEnHistorial(
            "ELIMINADO", 
            `❌ ${grupoActivo.lider} borró registro de ${m.cliente} ($${m.total.toLocaleString()})`, 
            "red"
        );

        movimientos = movimientos.filter(m => m.id !== id);
        actualizarTodo();
    } else if (pin !== null) {
        alert("PIN Incorrecto");
    }
}

function pagarDeuda(id) {
    const mov = movimientos.find(m => m.id === id);
    const abonoInput = prompt(`Saldo de ${mov.cliente}: $${mov.saldo}. ¿Cuánto paga?`, mov.saldo);
    
    if (abonoInput !== null) {
        const abono = parseFloat(abonoInput);
        if (!isNaN(abono) && abono > 0 && abono <= mov.saldo) {
            mov.saldo -= abono;
            
            registrarEnHistorial(
                "PAGO", 
                `💰 ${grupoActivo.lider} recibió abono de $${abono.toLocaleString()} de ${mov.cliente}`, 
                "blue"
            );

            actualizarTodo();
        } else {
            alert("Cantidad no válida");
        }
    }
}

// --- RENDERIZADO Y CÁLCULOS ---

function actualizarTodo() {
    let v = 0, d = 0, r = 0;
    const cuerpo = document.getElementById('tablaCuerpo');
    if(!cuerpo) return;
    
    cuerpo.innerHTML = "";

    movimientos.forEach(m => {
        // Lógica financiera: Solo sumamos a ventas lo que NO es deuda, 
        // o la diferencia pagada de una deuda.
        if (m.tipo === 'VENTA') v += m.total;
        if (m.tipo === 'DEUDA') {
            d += m.saldo;
            v += (m.total - m.saldo); // Lo que ya se abonó de la deuda cuenta como venta
        }
        if (m.tipo === 'RETIRO') r += m.total;

        cuerpo.innerHTML += `
            <tr class="hover:bg-gray-800 transition border-b border-gray-700">
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-[10px] font-bold ${getBadge(m.tipo)}">${m.tipo}</span>
                    <div class="text-[9px] text-gray-500 mt-1 uppercase font-bold">Líder: ${m.vendedor}</div>
                </td>
                <td class="p-4">
                    <div class="flex flex-col">
                        <strong class="text-blue-300 text-sm">${m.cliente}</strong>
                        <span class="text-[10px] text-gray-400 italic">${m.concepto} (x${m.cantidad}) - ${m.fecha}</span>
                        ${m.evidencia ? `<a href="${m.evidencia}" target="_blank" class="text-[9px] text-blue-400 underline mt-1 font-bold italic">📎 Ver Evidencia</a>` : ''}
                    </div>
                </td>
                <td class="p-4 font-bold text-gray-100">$${m.total.toLocaleString()}</td>
                <td class="p-4 font-bold text-yellow-500">$${m.saldo.toLocaleString()}</td>
                <td class="p-4 text-center no-print acciones-col">
                    <div class="flex justify-center gap-4">
                        ${m.tipo === 'DEUDA' && m.saldo > 0 ? `
                            <button onclick="pagarDeuda(${m.id})" class="text-green-500 hover:scale-125 transition" title="Abonar Pago">
                                <i class="fas fa-money-bill-wave fa-lg"></i>
                            </button>` : ''}
                        <button onclick="eliminarMov(${m.id})" class="text-red-500 hover:scale-125 transition" title="Eliminar Registro">
                            <i class="fas fa-trash-alt fa-lg"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    document.getElementById('totalVentas').innerText = `$${v.toLocaleString()}`;
    document.getElementById('totalDeudas').innerText = `$${d.toLocaleString()}`;
    document.getElementById('totalRetiros').innerText = `$${r.toLocaleString()}`;
    document.getElementById('saldoCaja').innerText = `$${(v - r).toLocaleString()}`;
}

function getBadge(t) {
    switch(t) {
        case 'VENTA': return 'bg-green-900 text-green-300';
        case 'DEUDA': return 'bg-yellow-900 text-yellow-300';
        case 'RETIRO': return 'bg-red-900 text-red-300';
        default: return 'bg-gray-700 text-gray-300';
    }
}