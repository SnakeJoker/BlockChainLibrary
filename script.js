// Archivo: script.js (Completo)

// ----------------------------------------------------
// 1. Configuración Central
// ----------------------------------------------------

// *** ¡IMPORTANTE! Pega tus valores reales aquí ***
const GIST_ID = "e289169bf8a72521e459f75a28050340";
const GITHUB_TOKEN = "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";
const NOMBRE_ARCHIVO_JSON = "estado_biblioteca.json";

// --- No toques debajo de esta línea ---
const URL_API_GIST = `https://api.github.com/gists/${GIST_ID}`;
const TIEMPO_DE_REFRESCO = 300000; // 5 minutos

// ----------------------------------------------------
// 2. Datos del Sistema
// ----------------------------------------------------
let sistemaGlobal = {
	balanceTotalSistema: 0,
	usuarios: {},
	codigosDeDeposito: {},
};
let usuarioActual = null;
let isSaving = false; // Flag para evitar guardados simultáneos
let paisDetectadoIP = "Desconocido"; // Variable para guardar el país detectado por IP

// ----------------------------------------------------
// 3. Lógica de Carga y Guardado (API Gist)
// ----------------------------------------------------

/**
 * Carga el estado del sistema desde la API del Gist.
 */
async function cargarDatosDesdeURL() {
	console.log("Actualizando datos desde la API de Gist...");
	try {
		const respuesta = await fetch(URL_API_GIST, {
			headers: {
				Authorization: `token ${GITHUB_TOKEN}`,
				Accept: "application/vnd.github.v3+json",
			},
			cache: "no-store", // No usar caché
		});

		if (!respuesta.ok) {
			throw new Error(
				`Error HTTP: ${respuesta.status}. ¿Gist ID y Token correctos?`
			);
		}

		const datosGist = await respuesta.json();

		if (!datosGist.files[NOMBRE_ARCHIVO_JSON]) {
			throw new Error(
				`Error: No se encontró el archivo "${NOMBRE_ARCHIVO_JSON}" en tu Gist.`
			);
		}

		const contenidoArchivo = datosGist.files[NOMBRE_ARCHIVO_JSON].content;
		sistemaGlobal = JSON.parse(contenidoArchivo);

		console.log("¡Datos cargados y actualizados!");
		actualizarInterfacesGlobales();
	} catch (e) {
		console.error("Error al cargar el estado desde la API:", e);
		alert("Error crítico al cargar los datos del sistema. Revisa la consola.");
	}
}

/**
 * Actualiza las interfaces globales Y MUESTRA el panel correcto.
 */
function actualizarInterfacesGlobales() {
	// Si el usuario es un usuario normal
	if (usuarioActual && usuarioActual !== "admin") {
		document.getElementById("seccion-balance").style.display = "block";
		actualizarInterfazUsuario();
	}
	// Si el usuario es el admin
	if (usuarioActual === "admin") {
		document.getElementById("seccion-admin").style.display = "block";
		cargarPanelAdmin();
	}
}

/**
 * Guarda el estado "silenciosamente" y automáticamente.
 */
window.guardarEstado = async function () {
	// Evitar guardados múltiples si uno ya está en proceso
	if (isSaving) {
		console.warn("Guardado ya en progreso. Omitiendo.");
		return;
	}

	isSaving = true;
	console.log("Guardando estado en Gist...");

	try {
		const contenidoNuevo = JSON.stringify(sistemaGlobal, null, 4);
		const bodyPeticion = {
			files: {
				[NOMBRE_ARCHIVO_JSON]: { content: contenidoNuevo },
			},
		};

		const respuesta = await fetch(URL_API_GIST, {
			method: "PATCH",
			headers: {
				Authorization: `token ${GITHUB_TOKEN}`,
				Accept: "application/vnd.github.v3+json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(bodyPeticion),
		});

		if (!respuesta.ok) {
			throw new Error(`Error HTTP: ${respuesta.status} ${await respuesta.text()}`);
		}
		console.log("¡Cambios publicados en el sistema central!");
	} catch (e) {
		console.error("Error al guardar el estado en Gist:", e);
		// Informar al usuario que el guardado automático falló
		alert(`Error al guardar el cambio: ${e.message}`);
	} finally {
		isSaving = false; // Liberar el flag
	}
};

// ----------------------------------------------------
// 4. Detección de País por IP
// ----------------------------------------------------
/**
 * Detecta el país y guarda el resultado en la variable global.
 */
async function detectarPais() {
	try {
		const respuesta = await fetch("https://ipapi.co/json/");
		if (!respuesta.ok) throw new Error("Respuesta de API no fue OK");

		const data = await respuesta.json();

		if (data && data.country_name) {
			console.log(`País detectado: ${data.country_name}`);

			// Guarda el país detectado por IP en la variable global
			paisDetectadoIP = data.country_name;

			const selectPais = document.getElementById("retiro-pais");
			let paisEncontrado = Array.from(selectPais.options).find(
				(opt) => opt.value === data.country_name
			);

			if (paisEncontrado) {
				selectPais.value = data.country_name;
			} else {
				// Si el país no está en nuestra lista corta, lo añadimos
				const nuevaOpcion = new Option(
					data.country_name,
					data.country_name,
					true,
					true
				);
				selectPais.add(nuevaOpcion);
			}
		}
	} catch (e) {
		console.error("Error al detectar el país:", e);
		paisDetectadoIP = "Error al detectar"; // Guarda el error
	}
}

// ----------------------------------------------------
// 5. Funciones de Ayuda (Formato, Códigos y POPUP)
// ----------------------------------------------------

function generarCodigoUnico() {
	const timestamp = Date.now().toString(36).toUpperCase();
	const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
	return `COMPROBANTE-${timestamp}-${randomPart}`;
}

function formatoMoneda(valor) {
	if (typeof valor !== "number") valor = 0;
	return valor.toLocaleString("es-ES", { minimumFractionDigits: 2 });
}

function formatoFecha(fechaISO) {
	return new Date(fechaISO).toLocaleString("es-ES", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function mostrarPopup(titulo, contenidoHTML) {
	document.getElementById("popup-titulo").textContent = titulo;
	document.getElementById("popup-cuerpo").innerHTML = contenidoHTML;
	document.getElementById("popup-modal").style.display = "flex";
}

window.cerrarPopup = function () {
	document.getElementById("popup-modal").style.display = "none";
};

// ----------------------------------------------------
// 6. Lógica de Autenticación y Sesión (Persistente)
// ----------------------------------------------------

function actualizarNavbar() {
	const contenedorNav = document.getElementById("info-usuario-nav");
	if (usuarioActual) {
		contenedorNav.innerHTML = `
            <span>Bienvenido, <strong>${usuarioActual}</strong></span>
            <button onclick="cerrarSesion()">Cerrar Sesión</button>
        `;
	} else {
		contenedorNav.innerHTML = "";
	}
}

window.iniciarSesion = function () {
	const usuario = document.getElementById("username").value;
	const clave = document.getElementById("password").value;
	const mensajeError = document.getElementById("login-message");

	if (!sistemaGlobal.usuarios) {
		mensajeError.textContent = "Error: El sistema de usuarios no ha cargado.";
		mensajeError.style.color = "red";
		return;
	}

	if (
		sistemaGlobal.usuarios[usuario] &&
		sistemaGlobal.usuarios[usuario].password === clave
	) {
		usuarioActual = usuario;
		sessionStorage.setItem("usuarioLogueado", usuarioActual); // Guarda la sesión
		document.getElementById("seccion-login").style.display = "none";
		actualizarNavbar();
		actualizarInterfacesGlobales(); // Llama a esta para mostrar el panel correcto
	} else {
		usuarioActual = null;
		sessionStorage.removeItem("usuarioLogueado");
		mensajeError.textContent = "Error: Credenciales inválidas.";
		mensajeError.style.color = "red";
	}
};

window.cerrarSesion = function () {
	usuarioActual = null;
	sessionStorage.removeItem("usuarioLogueado"); // Borra la sesión
	document.getElementById("seccion-balance").style.display = "none";
	document.getElementById("seccion-admin").style.display = "none";
	document.getElementById("seccion-login").style.display = "block";
	actualizarNavbar();

	// Limpiar campos
	document.getElementById("username").value = "";
	document.getElementById("password").value = "";
	document.getElementById("login-message").textContent = "";
	document.getElementById("transaccion-message").innerHTML = "";
	document.getElementById("deposito-message").textContent = "";
};

// ----------------------------------------------------
// 7. Lógica del Panel de Usuario
// ----------------------------------------------------

/**
 * Actualiza la interfaz de usuario, incluyendo el historial con datos bancarios.
 */
function actualizarInterfazUsuario() {
	if (
		!usuarioActual ||
		usuarioActual === "admin" ||
		!sistemaGlobal.usuarios[usuarioActual]
	)
		return;

	const datosUsuario = sistemaGlobal.usuarios[usuarioActual];

	// Si 'historial' no existe por un error, inicialízalo
	if (!datosUsuario.historial || !Array.isArray(datosUsuario.historial)) {
		datosUsuario.historial = [];
	}

	document.getElementById("balance-aprobado").textContent = formatoMoneda(
		datosUsuario.balanceAprobado
	);
	document.getElementById("balance-pendiente").textContent = formatoMoneda(
		datosUsuario.balancePendiente
	);

	const contenedorHistorial = document.getElementById("historial-transacciones");
	contenedorHistorial.innerHTML = "";

	if (datosUsuario.historial.length === 0) {
		contenedorHistorial.innerHTML = "<p>No tienes transacciones.</p>";
	} else {
		// Mostrar transacciones de la MÁS NUEVA a la más vieja
		datosUsuario.historial
			.slice()
			.reverse()
			.forEach((tx) => {
				const item = document.createElement("div");
				item.className = "item-historial";
				let tipo = tx.tipo,
					montoClase = "",
					montoSigno = "",
					estadoHTML = "",
					infoExtra = "";

				if (tx.tipo === "deposito") {
					tipo = "Depósito";
					montoClase = "monto-deposito";
					montoSigno = "+";
					estadoHTML =
						tx.estado === "pendiente"
							? `<span class="estado-pendiente">Pendiente de Aprobación</span>`
							: `<span class="estado-aprobado">Aprobado</span>`;
				} else if (tx.tipo === "retiro") {
					tipo = "Retiro";
					montoClase = "monto-retiro";
					montoSigno = "-";
					estadoHTML =
						tx.estado === "pendiente"
							? `<span class="estado-pendiente">Pendiente (Admin)</span>`
							: `<span class="estado-aprobado">Completado</span>`;

					// Añadir info de banco al historial del usuario
					if (tx.banco) {
						infoExtra = `<div class="info-banco-historial">
                        ${tx.banco} (${tx.pais})<br>Cta: ${tx.cuenta}
                    </div>`;
					}
				}

				item.innerHTML = `
                <div class="info">
                    <strong>${tipo}</strong>
                    <span>${formatoFecha(tx.fecha)}</span>
                    ${estadoHTML}
                    ${infoExtra}
                </div>
                <div class="monto-historial ${montoClase}">
                    ${montoSigno} ${formatoMoneda(tx.monto)}
                </div>`;
				contenedorHistorial.appendChild(item);
			});
	}
}

/**
 * El usuario canjea un código y guarda el cambio en el Gist.
 */
window.canjearCodigo = async function () {
	const codigo = document.getElementById("codigo-deposito").value.toUpperCase();
	const mensajeDeposito = document.getElementById("deposito-message");
	const datosUsuario = sistemaGlobal.usuarios[usuarioActual];

	if (!datosUsuario.historial) datosUsuario.historial = [];
	if (!sistemaGlobal.codigosDeDeposito) {
		mensajeDeposito.textContent = "Error: El sistema de códigos no está cargado.";
		mensajeDeposito.style.color = "red";
		return;
	}

	if (sistemaGlobal.codigosDeDeposito[codigo]) {
		if (!sistemaGlobal.codigosDeDeposito[codigo].usado) {
			const valor = sistemaGlobal.codigosDeDeposito[codigo].valor;

			// 1. Modificar el estado local
			sistemaGlobal.codigosDeDeposito[codigo].usado = true;
			sistemaGlobal.codigosDeDeposito[codigo].usuarioAsignado = usuarioActual;
			datosUsuario.balancePendiente += valor;
			const transaccion = {
				tipo: "deposito",
				monto: valor,
				fecha: new Date().toISOString(),
				estado: "pendiente",
				codigo: codigo,
			};
			datosUsuario.historial.push(transaccion);

			// 2. Actualizar la UI local
			mensajeDeposito.textContent = `Solicitud enviada. ${formatoMoneda(
				valor
			)} Satochis están PENDIENTES.`;
			mensajeDeposito.style.color = "blue";
			actualizarInterfazUsuario();
			document.getElementById("codigo-deposito").value = "";

			// 3. ¡GUARDAR EL CAMBIO EN EL GIST!
			await guardarEstado();

			// 4. Mostrar Popup
			mostrarPopup(
				"Solicitud Enviada",
				`
                <p>Tu solicitud de depósito ha sido enviada al administrador.</p>
                <p><strong>Monto:</strong> ${formatoMoneda(valor)} Satochis</p>
                <p><strong>Estado:</strong> Pendiente</p>
            `
			);
		} else {
			mensajeDeposito.textContent = "Error: Este código ya ha sido utilizado.";
			mensajeDeposito.style.color = "red";
		}
	} else {
		mensajeDeposito.textContent = "Error: El código ingresado no es válido.";
		mensajeDeposito.style.color = "red";
	}
};

/**
 * El usuario solicita un retiro y guarda el cambio en el Gist.
 */
window.realizarTransferencia = async function () {
	const monto = parseFloat(document.getElementById("monto-transferir").value);
	const mensajeTransaccion = document.getElementById("transaccion-message");
	const datosUsuario = sistemaGlobal.usuarios[usuarioActual];

	// Leer los campos adicionales
	const pais = document.getElementById("retiro-pais").value;
	const banco = document.getElementById("retiro-banco").value;
	const cuenta = document.getElementById("retiro-cuenta").value;

	if (!datosUsuario.historial) datosUsuario.historial = [];

	// Validación de los campos
	if (isNaN(monto) || monto <= 0 || !pais || !banco || !cuenta) {
		mensajeTransaccion.textContent =
			"Error: Debes completar todos los campos (monto, país, banco y cuenta).";
		mensajeTransaccion.style.color = "red";
		return;
	}
	if (monto > datosUsuario.balanceAprobado) {
		mensajeTransaccion.textContent = `Error: Balance aprobado insuficiente.`;
		mensajeTransaccion.style.color = "red";
		return;
	}

	// 1. Modificar el estado local
	datosUsuario.balanceAprobado -= monto;
	const serialUnico = generarCodigoUnico();

	// Guardar los datos bancarios en la transacción
	const transaccion = {
		tipo: "retiro",
		monto: monto,
		fecha: new Date().toISOString(),
		estado: "pendiente",
		token: serialUnico,
		pais: pais, // País que el usuario SELECCIONÓ
		banco: banco,
		cuenta: cuenta,
		paisDetectado: paisDetectadoIP, // País que detectamos por IP
	};
	datosUsuario.historial.push(transaccion);

	// 2. Actualizar la UI local
	mensajeTransaccion.innerHTML = "";
	document.getElementById("monto-transferir").value = "";
	document.getElementById("retiro-banco").value = "";
	document.getElementById("retiro-cuenta").value = "";
	// No reseteamos el país, ya que fue detectado
	actualizarInterfazUsuario();

	// 3. ¡GUARDAR EL CAMBIO EN EL GIST!
	await guardarEstado();

	// 4. Mostrar Popup
	mostrarPopup(
		"Factura de Retiro (Pendiente)",
		`
        <p>Tu solicitud de retiro ha sido enviada al administrador.</p>
        <p><strong>Monto:</strong> ${formatoMoneda(monto)} Satochis</p>
        <p><strong>País:</strong> ${pais}</p>
        <p><strong>Banco:</strong> ${banco}</p>
        <p><strong>Cuenta:</strong> ${cuenta}</p>
        <hr>
        <p><strong>Token (Factura):</strong></p>
        <div class="token-popup">${serialUnico}</div>
    `
	);
};

// ----------------------------------------------------
// 8. Lógica del Panel de Administrador
// ----------------------------------------------------

/**
 * Carga los paneles de admin, mostrando AMBOS países.
 */
function cargarPanelAdmin() {
	if (!sistemaGlobal.usuarios) return;
	document.getElementById("balance-sistema-admin").textContent = formatoMoneda(
		sistemaGlobal.balanceTotalSistema
	);

	// --- Cargar Depósitos Pendientes ---
	const contPendientes = document.getElementById("lista-pendientes");
	contPendientes.innerHTML = "";
	let hayPendientes = false;
	for (const keyUsuario in sistemaGlobal.usuarios) {
		if (
			keyUsuario !== "admin" &&
			sistemaGlobal.usuarios[keyUsuario].balancePendiente > 0
		) {
			hayPendientes = true;
			const montoPendiente = sistemaGlobal.usuarios[keyUsuario].balancePendiente;
			const item = document.createElement("div");
			item.className = "item-pendiente";
			item.innerHTML = `
                <span>Usuario: <strong>${keyUsuario}</strong></span>
                <span>Monto: <strong>${formatoMoneda(
																	montoPendiente
																)}</strong></span>
                <button onclick="aprobarDeposito('${keyUsuario}')">Aprobar Depósito</button>
            `;
			contPendientes.appendChild(item);
		}
	}
	if (!hayPendientes)
		contPendientes.innerHTML = "<p>No hay depósitos pendientes.</p>";

	// --- Cargar Retiros Pendientes ---
	const contRetiros = document.getElementById("lista-retiros-pendientes");
	contRetiros.innerHTML = "";
	let hayRetiros = false;
	for (const keyUsuario in sistemaGlobal.usuarios) {
		if (keyUsuario === "admin") continue;
		const datosUsuario = sistemaGlobal.usuarios[keyUsuario];
		if (datosUsuario.historial && Array.isArray(datosUsuario.historial)) {
			datosUsuario.historial.forEach((tx) => {
				if (tx.tipo === "retiro" && tx.estado === "pendiente") {
					hayRetiros = true;
					const item = document.createElement("div");
					item.className = "item-pendiente";

					item.innerHTML = `
                        <span>Usuario: <strong>${keyUsuario}</strong></span>
                        <span>Monto: <strong>${formatoMoneda(
																									tx.monto
																								)}</strong></span>
                        <div class="info-banco">
                            <strong>Destino (Seleccionado):</strong> ${
																													tx.banco
																												} (${tx.pais})<br>
                            <strong>Cuenta:</strong> ${tx.cuenta}<br>
                            <strong style="color: #dc3545;">País (Detectado IP):</strong> ${
																													tx.paisDetectado || "N/A"
																												}
                        </div>
                        <button onclick="aprobarRetiro('${keyUsuario}', '${
						tx.token
					}')">Aprobar Retiro</button>
                    `;
					contRetiros.appendChild(item);
				}
			});
		}
	}
	if (!hayRetiros) contRetiros.innerHTML = "<p>No hay retiros pendientes.</p>";
}

/**
 * El Admin aprueba el depósito y guarda el cambio.
 */
window.aprobarDeposito = async function (usuarioKey) {
	const datosUsuario = sistemaGlobal.usuarios[usuarioKey];
	const monto = datosUsuario.balancePendiente;

	if (monto > sistemaGlobal.balanceTotalSistema) {
		alert(
			`Error: El Balance del Sistema (${formatoMoneda(
				sistemaGlobal.balanceTotalSistema
			)}) es insuficiente.`
		);
		return;
	}

	// 1. Modificar el estado local
	sistemaGlobal.balanceTotalSistema -= monto;
	datosUsuario.balanceAprobado += monto;
	datosUsuario.balancePendiente = 0;
	if (datosUsuario.historial && Array.isArray(datosUsuario.historial)) {
		datosUsuario.historial.forEach((tx) => {
			if (tx.tipo === "deposito" && tx.estado === "pendiente") {
				tx.estado = "aprobado";
			}
		});
	}

	// 2. Actualizar la UI local
	cargarPanelAdmin();
	alert(`¡Depósito aprobado! Guardando cambio...`);

	// 3. ¡GUARDAR EL CAMBIO EN EL GIST!
	await guardarEstado();
};

/**
 * El Admin aprueba el retiro y guarda el cambio.
 */
window.aprobarRetiro = async function (usuarioKey, token) {
	const datosUsuario = sistemaGlobal.usuarios[usuarioKey];
	if (!datosUsuario.historial || !Array.isArray(datosUsuario.historial)) {
		alert("Error: El historial de este usuario no existe.");
		return;
	}

	const transaccion = datosUsuario.historial.find(
		(tx) => tx.token === token && tx.estado === "pendiente"
	);

	if (transaccion) {
		// 1. Modificar el estado local
		transaccion.estado = "completado";

		// 2. Actualizar la UI local
		cargarPanelAdmin();
		alert(
			`Retiro de ${formatoMoneda(
				transaccion.monto
			)} para ${keyUsuario} marcado como completado. Guardando...`
		);

		// 3. ¡GUARDAR EL CAMBIO EN EL GIST!
		await guardarEstado();
	} else {
		alert(
			"Error: No se encontró la transacción de retiro pendiente (o ya fue aprobada)."
		);
	}
};

// ----------------------------------------------------
// 9. Ejecución Inicial (con persistencia de sesión)
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", (event) => {
	// Restaurar sesión si existe
	const usuarioGuardado = sessionStorage.getItem("usuarioLogueado");
	if (usuarioGuardado) {
		usuarioActual = usuarioGuardado;
		document.getElementById("seccion-login").style.display = "none";
	}

	actualizarNavbar(); // Actualiza el header
	cargarDatosDesdeURL(); // Carga los datos del Gist
	detectarPais(); // Detecta la IP/País
	setInterval(cargarDatosDesdeURL, TIEMPO_DE_REFRESCO); // Configura el refresco automático
});
