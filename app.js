//INGRESAR Y GUARDAR OFFLINE CON IndexedDB
const DB_NAME = 'QRDB';
const STORE_NAME = 'Registros';
let db;

const abrirDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject("No se pudo abrir la base local");

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
  });
};

const guardarRegistroEnDB = (registro) => {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.add(registro);
};

const cargarRegistrosDesdeDB = () => {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
};

const borrarTodosLosRegistros = () => {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
};







// SISTEMA DE LECTOR QR Y EXPORTACION EXCEL
  let registros = [];

abrirDB().then(() => {
  cargarRegistrosDesdeDB().then(datos => {
    registros = datos;
    renderCards();
  });
});

  let datosActuales = null;

  let scanner = null;
  const config = { fps: 10, qrbox: { width: 250, height: 400 } };

  // SweetAlert helpers
  const showToast = (msg, icon = 'info') => {
    Swal.fire({
      position: 'center',
      icon,
      title: msg,
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      toast: false,
      backdrop: false,
    });
  };

  const showConfirm = async (msg) => {
    return Swal.fire({
      title: msg,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      reverseButtons: true,
      focusCancel: true,
    });
  };


// ESCANER DE QR
window.iniciarEscaner = () => {
  if (!scanner) {
    scanner = new Html5Qrcode("scanner");
  }

  scanner.start({ facingMode: "environment" }, config, procesarQR)
    .then(() => {
      console.log("Escáner iniciado");
      document.getElementById("btn-escanear").disabled = true;
    })
    .catch(err => {
      showToast("No se pudo acceder a la cámara. Verificá los permisos.", 'error');
      console.error("Error al iniciar escáner", err);
    });
};

function formatearNombreMedicamento(nombre) {
  if (!nombre) return '-';
  
  // Normalización (mayúsculas, sin espacios)
  let texto = nombre.toUpperCase().replace(/\s+/g, '');

  // Patrones para el formato específico "TELMISARTAN 80 MGCOM"
  texto = texto
    .replace(/([A-Z]+)(\d+)/g, '$1 $2')       // Separa letras y números (TELMISARTAN80 → TELMISARTAN 80)
    .replace(/(\d+)(MG|G|ML)/g, '$1 $2')      // Separa dosis y unidad (80MG → 80 MG)
    .replace(/(MG|G|ML)(COM|COMP)/g, '$1$2'); // Junta unidad y forma (MG COM → MGCOM)

  // Limpieza final
  return texto.trim();
}

function procesarQR(qrTexto) {
  console.log('Texto QR escaneado:', qrTexto);
  const data = parseGS1QRCode(qrTexto);
  console.log('Datos parseados:', data);
  if (!data) {
    showToast("QR inválido o con formato inesperado.", 'error');
    return;
  }
  datosActuales = data;

  const ticketInfoEl = document.getElementById("ticketInfo");
ticketInfoEl.innerHTML = `
  <div style="
    display: grid;
    grid-template-columns: minmax(120px, 160px) minmax(150px, 1fr);
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    max-height: 400px;
    overflow-y: auto;
  ">
    <!-- Encabezados -->
    <div style="
      padding: 8px 12px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      border-right: 1px solid #e0e0e0;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 1;
    ">Campo</div>
    <div style="
      padding: 8px 12px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 1;
    ">Valor</div>

    <!-- Filas de datos -->
    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      border-right: 1px solid #e0e0e0;
      color: #555;
      word-break: break-word;
    ">Num Material:</div>
    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      word-break: break-word;
      font-weight: 500;
    ">${data.numMaterial || '-'}</div>

    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      border-right: 1px solid #e0e0e0;
      color: #555;
      word-break: break-word;
    ">Num Ant (SIH):</div>
    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      word-break: break-word;
    ">${data.numAnterior || '-'}</div>

    <div style="padding: 6px 10px; border-bottom: 1px solid #ccc; border-right: 1px solid #ccc;">Medicamento:</div>
    <div style="
    padding: 6px 10px;
    border-bottom: 1px solid #ccc;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    word-break: break-word;
    white-space: normal;
    line-height: 1.4;
  ">
    ${formatearNombreMedicamento(data.nombreMedicamento) || '-'}
    </div>

    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      border-right: 1px solid #e0e0e0;
      color: #555;
      word-break: break-word;
    ">Fecha Exp:</div>
    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      word-break: break-word;
    ">${data.fechaExp || '-'}</div>

    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      border-right: 1px solid #e0e0e0;
      color: #555;
      word-break: break-word;
    ">Lote Interno:</div>
    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      word-break: break-word;
    ">${data.loteInterno || '-'}</div>

    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      border-right: 1px solid #e0e0e0;
      color: #555;
      word-break: break-word;
    ">UMB:</div>
    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      word-break: break-word;
    ">${data.umb || '-'}</div>

    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      border-right: 1px solid #e0e0e0;
      color: #555;
      word-break: break-word;
    ">Lote Prov:</div>
    <div style="
      padding: 8px 12px;
      border-bottom: 1px solid #e0e0e0;
      word-break: break-word;
    ">${data.loteProv || '-'}</div>

    <div style="
      padding: 8px 12px;
      border-right: 1px solid #e0e0e0;
      color: #555;
      word-break: break-word;
    ">Almacén:</div>
    <div style="
      padding: 8px 12px;
      word-break: break-word;
    ">${data.almacen || '-'}</div>
  </div>
`;



  document.getElementById("ticket").classList.remove("hidden");
}

function parseGS1QRCode(qrText) {
  qrText = qrText.replace(/\)\s*\(/g, ")(").replace(/\s+/g, "");
  const aiRegex = /\((\d{2})\)([^\(]+)/g;
  const data = {};
  let match;
  while ((match = aiRegex.exec(qrText)) !== null) {
    const ai = match[1];
    const value = match[2].trim();
    switch (ai) {
  case '01':
    data.numMaterial = value.replace(/^0+/, '');
    break;
  case '02':
    data.numAnterior = value;
    break;
  case '03':
    data.nombreMedicamento = value;
    break;
  case '04':
    // Fecha expiración ahora es AI 04
    if (value.length === 8) {
      const yyyy = value.slice(0, 4);
      const mm = value.slice(4, 6);
      const dd = value.slice(6, 8);
      data.fechaExp = `${dd}.${mm}.${yyyy}`;
    } else {
      data.fechaExp = value;
    }
    break;
  case '05':
    data.loteInterno = value;
    break;
  case '06':
    data.umb = value;
    break;
  case '07':
    data.loteProv = value;
    break;
  case '08':
    data.almacen = value;
    break;
  default:
    data[`AI_${ai}`] = value;
}

  }
  return {
    numMaterial: data.numMaterial || '',
    numAnterior: data.numAnterior || '',
    nombreMedicamento: data.nombreMedicamento || '',
    fechaExp: data.fechaExp || '',
    loteInterno: data.loteInterno || '',
    umb: data.umb || '',
    loteProv: data.loteProv || '',
    almacen: data.almacen || ''
  
  };
}

function renderCards() {
  const cont = document.getElementById("listaRegistros");
  cont.innerHTML = '';
  registros.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "card";
card.innerHTML = `
  <button class="accordion" type="button">
    ${r.numMaterial} - (${r.numAnterior}) - Cant: <span id="cantDisplay${i}">${r.cantidad}</span>
    <button class="btnEliminar" data-index="${i}" style="float:right; margin-left:10px;">Eliminar</button>
  </button>
  <div class="panel" style="display:none; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; font-family: monospace;">
    <div>
      <div style="display: flex; margin-bottom: 4px;"><div style="width: 140px; font-weight: bold;">Num Material:</div><div>${r.numMaterial || ''}</div></div>
      <div style="display: flex; margin-bottom: 4px;"><div style="width: 140px; font-weight: bold;">Num Ant. (SIH):</div><div>${r.numAnterior || ''}</div></div>
      <div style="display: flex; margin-bottom: 4px;">
      <div style="width: 140px; font-weight: bold;">Medicamento:</div>
      <div>${formatearNombreMedicamento(r.nombreMedicamento) || '-'}</div>
      </div>
      <div style="display: flex; margin-bottom: 4px;"><div style="width: 140px; font-weight: bold;">Fecha Exp:</div><div>${r.fechaExp || ''}</div></div>
      <div style="display: flex; margin-bottom: 4px;"><div style="width: 140px; font-weight: bold;">Lote Interno:</div><div>${r.loteInterno || ''}</div></div>
      <div style="display: flex; margin-bottom: 4px;"><div style="width: 140px; font-weight: bold;">UMB:</div><div>${r.umb || ''}</div></div>
      <div style="display: flex; margin-bottom: 4px;"><div style="width: 140px; font-weight: bold;">Lote Prov:</div><div>${r.loteProv || ''}</div></div>
      <div style="display: flex; margin-bottom: 4px;"><div style="width: 140px; font-weight: bold;">Almacén:</div><div>${r.almacen || ''}</div></div>
    </div>
    <div style="margin-top: 10px;">
      <label for="sapNum${i}">N° Inv. SAP:</label>
      <input type="number" id="sapNum${i}" value="${r.sapNum || ''}" class="input-cant-sap sap" inputmode="numeric" pattern="[0-9]*" />
      <button data-index="${i}" class="btnGuardarSap">Guardar</button>
    </div>
    <div style="margin-top: 10px;">
      <label for="cantidad${i}">Cantidad:</label>
      <input type="number" id="cantidad${i}" min="1" value="${r.cantidad}" class="input-cant-sap cant" inputmode="numeric" pattern="[0-9]*" />
      <button data-index="${i}" class="btnGuardarCant">Guardar</button>
    </div>
  </div>
`;




    cont.appendChild(card);
  });

  document.querySelectorAll('.accordion').forEach(button => {
    button.onclick = function (e) {
      if (
        e.target.classList.contains('btnEliminar') ||
        e.target.classList.contains('btnGuardarCant') ||
        e.target.classList.contains('btnGuardarSap')
      ) return;
      const panel = this.nextElementSibling;
      panel.style.display = panel.style.display === "block" ? "none" : "block";
    };
  });

  document.querySelectorAll('.btnEliminar').forEach(btn => {
    btn.onclick = async (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      const result = await showConfirm(`¿Querés eliminar el material ${registros[idx].numMaterial}?`);
      if (result.isConfirmed) {
        registros.splice(idx, 1);
        renderCards();
        showToast('Material eliminado', 'success');
      }
    };
  });

  document.querySelectorAll('.btnGuardarCant').forEach(btn => {
    btn.onclick = (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      const input = document.getElementById(`cantidad${idx}`);
      let val = parseInt(input.value);
      if (isNaN(val) || val <= 0) {
        showToast("Cantidad inválida", 'error');
        return;
      }
      registros[idx].cantidad = val;
      document.getElementById(`cantDisplay${idx}`).textContent = val;
      showToast("Cantidad actualizada", 'success');
    };
  });

  document.querySelectorAll('.btnGuardarSap').forEach(btn => {
    btn.onclick = (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      const input = document.getElementById(`sapNum${idx}`);
      registros[idx].sapNum = input.value.trim();
      showToast("N° SAP actualizado", 'success');
    };
  });
}

window.guardarRegistro = () => {
    const cantidad = document.getElementById("cantidad").value;
    const sapNum = document.getElementById("sapNum")?.value.trim() || '';
    
    // Validaciones
    if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
        showToast("Ingresá una cantidad válida.", 'error');
        return;
    }
    if (!datosActuales) {
        showToast("No hay datos escaneados.", 'error');
        return;
    }
    
    // Verificar si el material ya existe
    const existe = registros.some(r => 
        r.numMaterial === datosActuales.numMaterial && 
        r.loteInterno === datosActuales.loteInterno
    );
    
    if (existe) {
        showToast(`El material ${datosActuales.numMaterial} ya está cargado.`, 'error');
        resetearInterfaz();
        return;
    }
    
    // Guardar registro con todos los datos
    registros.push({
        ...datosActuales,
        cantidad: parseInt(cantidad, 10),
        sapNum,
        fechaHoraEscaneo: new Date().toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        usuario: localStorage.getItem("user_email") || "Anónimo"
    });
    guardarRegistroEnDB(registros[registros.length - 1]);
    renderCards();
    resetearInterfaz();
};

function resetearInterfaz() {
    document.getElementById("ticketInfo").textContent = '';
    document.getElementById("ticket").classList.add("hidden");
    document.getElementById("cantidad").value = '';
    if(document.getElementById("sapNum")) document.getElementById("sapNum").value = '';
    datosActuales = null;
    if(scanner) scanner.resume();
    document.getElementById("btn-escanear").disabled = false;
}

// EXPORTAR EXCEL
window.exportarExcel = async () => {
    if (registros.length === 0) {
        showToast("No hay datos para exportar.", 'error');
        return;
    }

    const { value: filename } = await Swal.fire({
        title: 'Nombre del archivo',
        input: 'text',
        inputPlaceholder: 'stock_deposito',
        showCancelButton: true,
        confirmButtonText: 'Exportar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (value && /[\\/:*?"<>|]/.test(value)) {
                return 'Nombre inválido (no usar \\ / : * ? " < > |)';
            }
        }
    });

    exportExcelWithName(filename ? `${filename}.xlsx` : 'stock_deposito.xlsx');
};

function exportExcelWithName(filename) {
    const ws_data = [
        [
            "N° Material",
            "N° Ant. (SIH)",
            "Medicamento",
            "Unidad",
            "Lote Interno",
            "Lote Proveedor",
            "Fecha Expiración",
            "Almacén",
            "Cantidad",
            "N° SAP",
            "Fecha/Hora Escaneo"
        ],
        ...registros.map(r => [
            r.numMaterial,
            r.numAnterior,
            formatearNombreMedicamento(r.nombreMedicamento) || '-',
            r.umb,
            r.loteInterno || '-',
            r.loteProv || '-',
            r.fechaExp || '-',
            r.almacen || '-',
            r.cantidad,
            r.sapNum,
            r.fechaHoraEscaneo
        ])
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Ajustar el ancho de las columnas
    ws['!cols'] = [
        { wch: 20 }, // N° Material
        { wch: 20 }, // N° Ant.
        { wch: 30 }, // Medicamento
        { wch: 15 }, // Unidad
        { wch: 30 }, // Lote Interno
        { wch: 30 }, // Lote Prov.
        { wch: 30 }, // Fecha Exp.
        { wch: 15 }, // Almacén 
        { wch: 10 }, // Cantidad 
        { wch: 10 }, // N° SAP
        { wch: 30 }  // Fecha/Hora
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    XLSX.writeFile(wb, filename);
    
    showToast("Excel exportado correctamente", 'success');
    registros = [];
    renderCards();
}

window.borrarRegistrosLocales = () => {
  borrarTodosLosRegistros();
  registros = [];
  renderCards();
  showToast("Registros eliminados", "success");
};






// LOGIN EMAIL Y PIN

function showEmailForm() {
  document.getElementById("email-container").style.display = "block";
  document.getElementById("pin-container").style.display = "none";
}

function showPinForm() {
  document.getElementById("email-container").style.display = "none";
  document.getElementById("pin-container").style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  const savedPin = localStorage.getItem("pin_guardado");
  const savedEmail = localStorage.getItem("email_para_pin");
  const pinValidado = localStorage.getItem("pin_validado") === "true";

  if (pinValidado) {
    Swal.fire("Ya estás logueado", "", "info");
    // Mostrar contenido principal
    document.getElementById("email-container").style.display = "none";
    document.getElementById("pin-container").style.display = "none";
    document.getElementById("scannerContainer").style.display = "block";
  } else if (savedPin && savedEmail) {
    showPinForm();
  } else {
    localStorage.clear();
    showEmailForm();
  }

  const inputs = document.querySelectorAll(".pin-digit");
  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      if (input.value.length === 1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && input.value === "" && index > 0) {
        inputs[index - 1].focus();
      }
    });
    input.addEventListener("paste", (e) => {
      const paste = (e.clipboardData || window.clipboardData).getData("text");
      if (/^\d{5}$/.test(paste)) {
        e.preventDefault();
        paste.split("").forEach((num, i) => {
          if (inputs[i]) inputs[i].value = num;
        });
      }
    });
  });

  document.getElementById("form-email-pin").addEventListener("submit", function (e) {
    e.preventDefault();

    // Si ya hay email y PIN guardado, no generes uno nuevo, solo muestra el PIN form
    const savedPin = localStorage.getItem("pin_guardado");
    const savedEmail = localStorage.getItem("email_para_pin");

    if (savedPin && savedEmail) {
      Swal.fire('Ya tenés un PIN activo', 'Usá el PIN que te enviamos antes.', 'info');
      showPinForm();
      return;
    }

    const email = this.email.value.trim();
    if (!email) return;

    const nuevoPin = Math.floor(10000 + Math.random() * 90000).toString();
    localStorage.setItem("pin_guardado", nuevoPin);
    localStorage.setItem("email_para_pin", email);
    localStorage.setItem("pin_validado", "false");

    fetch('enviar_pin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, pin: nuevoPin })
    })
      .then(res => res.text())
      .then(text => {
        try {
          const data = JSON.parse(text);
          if (data.success) {
            showPinForm();
            Swal.fire('PIN enviado', 'Revisá tu email.', 'success');
          } else {
            Swal.fire('Error', data.error || 'Error desconocido', 'error');
          }
        } catch (e) {
          Swal.fire('Error', 'Respuesta inválida del servidor', 'error');
        }
      })
      .catch(() => {
        Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
      });
  });

  document.getElementById("form-validar-pin").addEventListener("submit", function (e) {
    e.preventDefault();
    const ingresado = Array.from(inputs).map(i => i.value).join("");
    const guardado = localStorage.getItem("pin_guardado");

    if (ingresado === guardado) {
      localStorage.setItem("pin_validado", "true");
      Swal.fire("Acceso concedido", "", "success").then(() => {
        document.getElementById("pin-container").style.display = "none";
        document.getElementById("email-container").style.display = "none";
        document.getElementById("scannerContainer").style.display = "block";
      });
    } else {
      Swal.fire("PIN incorrecto", "Volvé a intentarlo", "error");
    }
  });

  document.getElementById("reenviar-pin").addEventListener("click", function (e) {
    e.preventDefault();
    const email = localStorage.getItem("email_para_pin");
    const pin = localStorage.getItem("pin_guardado");

    if (!email || !pin) {
      Swal.fire("Error", "No hay PIN activo para reenviar. Ingresá tu email.", "error").then(() => {
        localStorage.clear();
        showEmailForm();
      });
      return;
    }

    fetch("enviar_pin.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pin })
    })
      .then(res => res.json())
      .then(() => {
        Swal.fire("PIN reenviado", "Revisá tu email.", "success");
      })
      .catch(() => {
        Swal.fire("Error", "No se pudo reenviar el PIN", "error");
      });
  });
});


