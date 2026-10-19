import React, { useState, useEffect } from 'react';
import { api } from '../api';

const EDAD_MINIMA = 18;
const EDAD_MAXIMA = 80;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const obtenerHoyLima = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(fechaNac + 'T00:00:00');
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return edad;
};

const obtenerFechaMaxima18 = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - EDAD_MINIMA);
  return d.toISOString().split('T')[0];
};

const obtenerFechaMinima80 = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - EDAD_MAXIMA);
  return d.toISOString().split('T')[0];
};

export default function RegistrarPrestamo({
  dniInicial,
  nombreInicial,
  fechaNacInicial,
  representanteInicial,
  dniRepInicial,
  cargoRepInicial,
  direccionInicial,
  onPrestamoRegistrado,
  onCancelar,
}) {
  const fechaMaxima18 = obtenerFechaMaxima18();
  const fechaMinima80 = obtenerFechaMinima80();
  const [tipoDocumento, setTipoDocumento] = useState(
    dniInicial && dniInicial.length === 11 ? 'RUC' : 'DNI'
  );
  const [dni, setDni] = useState(dniInicial || '');
  const [nombreCliente, setNombreCliente] = useState(nombreInicial || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(fechaNacInicial || (dniInicial && dniInicial.length === 11 ? '2015-01-01' : ''));
  const [edadCliente, setEdadCliente] = useState(fechaNacInicial ? calcularEdad(fechaNacInicial) : null);
  const [fechaPrestamo] = useState(obtenerHoyLima());
  const [direccionEmpresa, setDireccionEmpresa] = useState(direccionInicial || '');
  const [representanteLegal, setRepresentanteLegal] = useState(representanteInicial || '');
  const [dniRepresentante, setDniRepresentante] = useState(dniRepInicial || '');
  const [cargoRepresentante, setCargoRepresentante] = useState(cargoRepInicial || 'GERENTE GENERAL');
  const [plazoMeses, setPlazoMeses] = useState(12);
  const [monto, setMonto] = useState(1000);

  const [simulacion, setSimulacion] = useState(null);
  const [cargandoSimulacion, setCargandoSimulacion] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [esElegible, setEsElegible] = useState(true);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Pasos: 1 = Formulario y simulación, 2 = Revisión e impresión, 3 = Subida de firmado
  const [paso, setPaso] = useState(1);
  const [contrato, setContrato] = useState(null);
  const [contratoPendienteDetectado, setContratoPendienteDetectado] = useState(null);
  const [contratoVencidoMsg, setContratoVencidoMsg] = useState('');

  // Subida de contrato firmado
  const [numeroContratoDigitado, setNumeroContratoDigitado] = useState('');
  const [archivoFirmado, setArchivoFirmado] = useState(null);

  // Modal de cancelación
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Determinar si es persona jurídica de forma global y segura para todos los pasos y modales (después de inicializar contrato y dni)
  const esJuridica = (contrato?.clienteDni || dni || '').length === 11 || tipoDocumento === 'RUC';

  useEffect(() => {
    const verificarContratosEnEspera = async () => {
      try {
        const lista = await api.contratos.listarEnEspera();
        if (lista && lista.length > 0) {
          const hoy = obtenerHoyLima();
          const pendiente = dniInicial
            ? lista.find((c) => c.clienteDni === dniInicial)
            : lista[0];
          if (pendiente) {
            if (pendiente.fechaPrestamo < hoy) {
              setContratoVencidoMsg(`El contrato previo ${pendiente.numeroContrato} venció el ${pendiente.fechaPrestamo}. Ha caducado y puede emitir un nuevo contrato hoy.`);
            } else {
              setContratoPendienteDetectado(pendiente);
            }
          }
        }
      } catch {
        // Silencioso en carga inicial
      }
    };
    verificarContratosEnEspera();
  }, [dniInicial]);

  const handleTipoDocumentoChange = (nuevoTipo) => {
    setTipoDocumento(nuevoTipo);
    setDni('');
    setNombreCliente('');
    setDireccionEmpresa('');
    setRepresentanteLegal('');
    setDniRepresentante('');
    setCargoRepresentante('GERENTE GENERAL');
    setError('');
    setEsElegible(true);
    setMotivoRechazo('');
    if (nuevoTipo === 'RUC') {
      if (!fechaNacimiento) {
        setFechaNacimiento('2015-01-01');
      }
      setEdadCliente(null);
    } else {
      setFechaNacimiento(fechaNacInicial || '');
      setEdadCliente(fechaNacInicial ? calcularEdad(fechaNacInicial) : null);
    }
  };

  const handleFechaNacimientoChange = (e) => {
    const val = e.target.value;
    setFechaNacimiento(val);
    if (val && tipoDocumento === 'DNI') {
      const edad = calcularEdad(val);
      setEdadCliente(edad);
      if (edad < EDAD_MINIMA) {
        setError(`El cliente debe ser mayor de edad (mínimo ${EDAD_MINIMA} años) para registrarse en el sistema.`);
      } else if (edad > EDAD_MAXIMA) {
        setError(`La edad máxima permitida para otorgar un crédito es de ${EDAD_MAXIMA} años (el cliente tiene ${edad} años).`);
      } else if (error && (error.includes('18 años') || error.includes('80 años'))) {
        setError('');
      }
    } else {
      setEdadCliente(null);
    }
  };

  const consultarDocumento = async (docConsultar) => {
    const d = (docConsultar || dni).trim();
    if (tipoDocumento === 'DNI') {
      if (!/^\d{8}$/.test(d)) {
        setError('Ingrese un número de DNI válido de 8 dígitos.');
        return;
      }
    } else {
      if (!/^\d{11}$/.test(d)) {
        setError('Ingrese un número de RUC válido de 11 dígitos.');
        return;
      }
    }
    setError('');
    setEsElegible(true);
    setMotivoRechazo('');
    try {
      const data = await api.cliente.buscar(d);
      setNombreCliente(data.nombreCompleto || data.razonSocial || '');
      if (tipoDocumento === 'RUC') {
        if (data.direccion) setDireccionEmpresa(data.direccion);
        if (data.representanteNombre) setRepresentanteLegal(data.representanteNombre);
        if (data.representanteDocumento) setDniRepresentante(data.representanteDocumento);
        if (data.representanteCargo) setCargoRepresentante(data.representanteCargo);
      }
      if (!data.elegible) {
        setEsElegible(false);
        setMotivoRechazo(data.motivoRechazo);
        setError(`Cliente no apto para préstamo: ${data.motivoRechazo}`);
      }
    } catch (err) {
      setError(err.message || (tipoDocumento === 'DNI' ? 'Error al consultar RENIEC' : 'Error al consultar empresa'));
      setNombreCliente('');
      setEsElegible(false);
    }
  };

  const retomarContratoEnEspera = async (c) => {
    try {
      setProcesando(true);
      setError('');
      const detalle = await api.contratos.obtener(c.id);
      setContrato(detalle);
      setContratoPendienteDetectado(null);

      // Sincronizar documento, tipo y datos fiscales del prestatario
      if (detalle.clienteDni) {
        setDni(detalle.clienteDni);
        if (detalle.clienteDni.length === 11) {
          setTipoDocumento('RUC');
          setNombreCliente(detalle.clienteNombre || '');
          try {
            const cliData = await api.cliente.buscar(detalle.clienteDni);
            if (cliData.representanteNombre) setRepresentanteLegal(cliData.representanteNombre);
            if (cliData.representanteDocumento) setDniRepresentante(cliData.representanteDocumento);
            if (cliData.representanteCargo) setCargoRepresentante(cliData.representanteCargo);
            if (cliData.direccion) setDireccionEmpresa(cliData.direccion);
          } catch {
            // Silencioso si la búsqueda adicional falla
          }
        } else {
          setTipoDocumento('DNI');
          setNombreCliente(detalle.clienteNombre || '');
        }
      }

      setPaso(detalle.impreso ? 3 : 2);
    } catch (err) {
      setError(err.message || 'No fue posible retomar el contrato en espera');
    } finally {
      setProcesando(false);
    }
  };

  const handleSimular = async () => {
    const montoNum = Number(monto);
    if (!monto || isNaN(montoNum) || montoNum < 1 || montoNum > 10000) {
      setError('El monto a financiar no puede ser mayor a S/ 10,000.00 (mínimo S/ 1.00).');
      return;
    }
    if (!plazoMeses || plazoMeses < 1 || plazoMeses > 60) {
      setError('El plazo debe situarse entre 1 y 60 meses.');
      return;
    }

    setError('');
    setCargandoSimulacion(true);
    try {
      const data = await api.prestamo.simular(monto, plazoMeses, fechaPrestamo);
      setSimulacion(data);
    } catch (err) {
      setError(err.message || 'No fue posible simular el cronograma');
    } finally {
      setCargandoSimulacion(false);
    }
  };

  const handleGenerarContrato = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (tipoDocumento === 'DNI') {
      if (!nombreCliente.trim()) {
        setError('Consulte el DNI para autocompletar el nombre verificado del cliente.');
        return;
      }
    } else {
      if (!representanteLegal.trim()) {
        setError('Consulte el RUC o ingrese el Representante Legal (Encargado) de la empresa.');
        return;
      }
      if (!nombreCliente.trim()) {
        setError('Ingrese o consulte la Razón Social de la empresa.');
        return;
      }
    }

    if (!fechaNacimiento) {
      setError(tipoDocumento === 'DNI' ? 'Ingrese la fecha de nacimiento del cliente.' : 'Ingrese la fecha de constitución de la empresa.');
      return;
    }

    if (tipoDocumento === 'DNI') {
      const edad = calcularEdad(fechaNacimiento);
      if (edad === null || edad < EDAD_MINIMA) {
        setError(`El cliente debe ser mayor de edad (mínimo ${EDAD_MINIMA} años) para registrarse en el sistema.`);
        return;
      }
      if (edad > EDAD_MAXIMA) {
        setError(`La edad máxima permitida para otorgar un crédito es de ${EDAD_MAXIMA} años (el cliente tiene ${edad} años).`);
        return;
      }
    }

    if (!esElegible) {
      setError(`No es posible registrar el préstamo: ${motivoRechazo || 'El cliente no califica según las políticas crediticias.'}`);
      return;
    }

    const montoNum = Number(monto);
    if (!monto || isNaN(montoNum) || montoNum < 1 || montoNum > 10000) {
      setError('El monto solicitado no puede ser mayor a S/ 10,000.00 (mínimo S/ 1.00).');
      return;
    }

    setProcesando(true);
    try {
      const nuevoContrato = await api.contratos.generar({
        dni: dni.trim(),
        nombreCliente: (nombreCliente || representanteLegal).trim(),
        fechaNacimiento,
        fechaPrestamo,
        plazoMeses: Number(plazoMeses),
        monto: Number(monto),
      });
      const detalle = await api.contratos.obtener(nuevoContrato.id);
      setContrato(detalle);
      setPaso(2);
    } catch (err) {
      setError(err.message || 'Error al generar contrato de préstamo');
    } finally {
      setProcesando(false);
    }
  };

  const handleImprimir = async () => {
    if (!contrato) return;
    setError('');
    try {
      const contratoActualizado = await api.contratos.imprimir(contrato.id);
      setContrato((prev) => ({ ...prev, impreso: true, estado: contratoActualizado.estado }));
      window.print();
      setPaso(3);
    } catch (err) {
      setError(err.message || 'Error al registrar la impresión del contrato');
    }
  };

  const handleConfirmarCancelar = async () => {
    if (!contrato) return;
    setError('');
    if (contrato.impreso && !motivoCancelacion.trim()) {
      setError('Debe ingresar obligatoriamente un motivo de anulación para el contrato impreso.');
      return;
    }

    setProcesando(true);
    try {
      await api.contratos.cancelar(contrato.id, motivoCancelacion.trim());
      setMostrarModalCancelar(false);
      setContrato(null);
      setMotivoCancelacion('');
      setPaso(1);
      setExito(contrato.impreso ? 'El contrato ha sido ANULADO formalmente.' : 'El borrador de contrato fue descartado.');
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('motivo de anulación')) {
        setContrato((prev) => ({ ...prev, impreso: true }));
        setMostrarModalCancelar(true);
      }
      setError(err.message || 'Error al cancelar contrato');
    } finally {
      setProcesando(false);
    }
  };

  const handleSubirFirmado = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (!contrato) return;

    const digitado = numeroContratoDigitado.trim().toUpperCase();
    if (digitado !== contrato.numeroContrato.toUpperCase()) {
      setError(`El número digitado (${digitado || 'vacío'}) no coincide con el contrato asignado (${contrato.numeroContrato}).`);
      return;
    }

    if (!archivoFirmado) {
      setError('Seleccione el archivo escaneado o digitalizado del contrato firmado.');
      return;
    }

    if (archivoFirmado.size > MAX_FILE_SIZE_BYTES) {
      setError('El archivo excede el tamaño máximo permitido de 5 MB.');
      return;
    }

    setProcesando(true);
    try {
      const resultado = await api.contratos.subirFirmado(contrato.id, digitado, archivoFirmado);
      setExito(`¡Contrato formalizado con éxito! Préstamo #${resultado.id} activado en estado VIGENTE. Hash SHA-256: ${resultado.contratoHash || 'registrado'}`);
      setTimeout(() => {
        onPrestamoRegistrado(resultado.id);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al subir el contrato firmado');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Banner de aviso: Contrato previo vencido */}
      {contratoVencidoMsg && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start justify-between gap-3 no-print">
          <div>
            <span className="font-bold block mb-0.5">Aviso: Contrato en espera caducado</span>
            <p>{contratoVencidoMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setContratoVencidoMsg('')}
            className="text-amber-700 font-semibold hover:text-amber-900 cursor-pointer text-xs"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Banner de aviso: Contrato pendiente para retomar */}
      {contratoPendienteDetectado && paso === 1 && (
        <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
          <div>
            <span className="font-bold block text-sm">Contrato en espera detectado</span>
            <p className="mt-0.5 text-blue-700">
              Existe el contrato <strong>{contratoPendienteDetectado.numeroContrato}</strong> para {contratoPendienteDetectado.clienteNombre} (S/ {Number(contratoPendienteDetectado.capital || contratoPendienteDetectado.monto || 0).toFixed(2)}).
              {contratoPendienteDetectado.impreso ? ' Ya fue impreso; listo para subir firmado.' : ' Listo para revisar e imprimir.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={procesando}
              onClick={() => retomarContratoEnEspera(contratoPendienteDetectado)}
              className="h-9 px-4 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition cursor-pointer"
            >
              Retomar contrato
            </button>
            <button
              type="button"
              onClick={() => setContratoPendienteDetectado(null)}
              className="h-9 px-3 text-xs rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
            >
              Ignorar
            </button>
          </div>
        </div>
      )}

      {/* Indicador de Pasos del Flujo */}
      <div className="mb-6 no-print">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3D3C2]/60">
          <div>
            <span className="text-[11px] font-semibold text-[#6E625B] uppercase tracking-wider block">
              Formalización crediticia
            </span>
            <h1 className="text-xl font-bold tracking-tight text-[#2A2220] mt-0.5">
              {paso === 1 && '1. Parámetros y Simulación del Préstamo'}
              {paso === 2 && '2. Revisión e Impresión del Contrato'}
              {paso === 3 && '3. Carga de Contrato Firmado'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              paso >= 1 ? 'bg-[#9C4A2B] text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              1
            </span>
            <span className="h-0.5 w-6 bg-[#E3D3C2]"></span>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              paso >= 2 ? 'bg-[#9C4A2B] text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              2
            </span>
            <span className="h-0.5 w-6 bg-[#E3D3C2]"></span>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              paso === 3 ? 'bg-[#9C4A2B] text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              3
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 no-print">
          {error}
        </div>
      )}

      {exito && (
        <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 no-print">
          {exito}
        </div>
      )}

      {/* ======================================================== */}
      {/* PASO 1: Formulario de Parámetros y Simulación           */}
      {/* ======================================================== */}
      {paso === 1 && (
        <div className="no-print">
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 mb-6 shadow-2xs">
            <form onSubmit={handleGenerarContrato} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-[#2A2220] mb-1">
                    Tipo de prestatario
                  </label>
                  <select
                    value={tipoDocumento}
                    onChange={(e) => handleTipoDocumentoChange(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition cursor-pointer"
                  >
                    <option value="DNI">DNI (Persona Natural)</option>
                    <option value="RUC">RUC (Empresa)</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-[#2A2220] mb-1">
                    {tipoDocumento === 'DNI' ? 'DNI del cliente' : 'RUC de la empresa'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={tipoDocumento === 'DNI' ? 8 : 11}
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      placeholder={tipoDocumento === 'DNI' ? '8 dígitos' : '11 dígitos'}
                      required
                      className="flex-1 h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] placeholder:text-[#6E625B]/60 focus:outline-none focus:border-[#9C4A2B] transition"
                    />
                    <button
                      type="button"
                      onClick={() => consultarDocumento()}
                      className="h-10 px-3.5 text-xs font-medium rounded-lg border border-[#E3D3C2] bg-white hover:bg-[#FBF6F0] text-[#2A2220] transition cursor-pointer whitespace-nowrap"
                    >
                      {tipoDocumento === 'DNI' ? 'RENIEC' : 'Consultar'}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-medium text-[#2A2220] mb-1">
                    {tipoDocumento === 'DNI' ? 'Nombre verificado (RENIEC)' : 'Representante legal / Encargado (SUNAT)'}
                  </label>
                  <input
                    type="text"
                    value={tipoDocumento === 'DNI' ? nombreCliente : representanteLegal}
                    onChange={(e) => {
                      if (tipoDocumento === 'DNI') {
                        setNombreCliente(e.target.value);
                      } else {
                        setRepresentanteLegal(e.target.value);
                      }
                    }}
                    readOnly={tipoDocumento === 'DNI'}
                    placeholder={tipoDocumento === 'DNI' ? 'Se autocompleta con RENIEC' : 'Se autocompleta con SUNAT (Encargado)'}
                    required
                    className={`w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] ${
                      tipoDocumento === 'DNI'
                        ? 'bg-[#FBF6F0] text-[#6E625B] cursor-not-allowed'
                        : 'bg-white text-[#2A2220] font-medium focus:outline-none focus:border-[#9C4A2B]'
                    }`}
                  />
                </div>
              </div>

              {/* Campos específicos de Persona Jurídica (Empresa) */}
              {tipoDocumento === 'RUC' && (
                <div className="p-4 bg-[#FBF6F0] rounded-xl border border-[#E3D3C2] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6E625B] uppercase tracking-wider">
                      Datos de la Empresa y Domicilio Fiscal SUNAT
                    </span>
                    {representanteLegal && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        Representante verificado en SUNAT
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-medium text-[#2A2220] mb-1">
                        Razón Social de la empresa
                      </label>
                      <input
                        type="text"
                        value={nombreCliente}
                        onChange={(e) => setNombreCliente(e.target.value)}
                        placeholder="Ej. AGROLIGHT PERU S.A.C."
                        required={tipoDocumento === 'RUC'}
                        className="w-full h-10 px-3 text-sm font-semibold rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-[#2A2220] mb-1">
                        DNI del representante
                      </label>
                      <input
                        type="text"
                        maxLength={8}
                        value={dniRepresentante}
                        onChange={(e) => setDniRepresentante(e.target.value)}
                        placeholder="DNI (8 dígitos)"
                        className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-[#2A2220] mb-1">
                        Cargo
                      </label>
                      <input
                        type="text"
                        value={cargoRepresentante}
                        onChange={(e) => setCargoRepresentante(e.target.value)}
                        placeholder="Gerente General"
                        className="w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
                      />
                    </div>
                    <div className="sm:col-span-12">
                      <label className="block text-xs font-medium text-[#2A2220] mb-1">
                        Domicilio fiscal registrado en SUNAT
                      </label>
                      <input
                        type="text"
                        value={direccionEmpresa}
                        onChange={(e) => setDireccionEmpresa(e.target.value)}
                        placeholder="Dirección fiscal completa de la empresa"
                        required={tipoDocumento === 'RUC'}
                        className="w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Accesos rápidos de prueba */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
                <span className="text-[11px] font-semibold text-[#6E625B] uppercase mr-1">Casos rápidos:</span>
                {tipoDocumento === 'DNI' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setDni('10000001'); consultarDocumento('10000001'); }}
                      className="px-2 py-0.5 rounded border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] text-[11px] cursor-pointer"
                    >
                      10000001 (Pérez)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDni('27427864'); consultarDocumento('27427864'); }}
                      className="px-2 py-0.5 rounded border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] text-[11px] cursor-pointer"
                    >
                      27427864 (Castillo)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDni('10000003'); consultarDocumento('10000003'); }}
                      className="px-2 py-0.5 rounded border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] text-[11px] cursor-pointer"
                    >
                      10000003 (Núñez)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setDni('20987654321'); consultarDocumento('20987654321'); }}
                      className="px-2 py-0.5 rounded border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] text-[11px] cursor-pointer"
                    >
                      20987654321 (Los Andes)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDni('20123456789'); consultarDocumento('20123456789'); }}
                      className="px-2 py-0.5 rounded border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] text-[11px] cursor-pointer"
                    >
                      20123456789 (Del Norte)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDni('20552103816'); consultarDocumento('20552103816'); }}
                      className="px-2 py-0.5 rounded border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] text-[11px] cursor-pointer"
                    >
                      20552103816 (Agrolight)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDni('20141878477'); consultarDocumento('20141878477'); }}
                      className="px-2 py-0.5 rounded border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] text-[11px] cursor-pointer"
                    >
                      20141878477 (El Sol)
                    </button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-medium text-[#2A2220] mb-1">
                    {tipoDocumento === 'DNI' ? 'Fecha de nacimiento del cliente' : 'Fecha de constitución de la empresa'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={fechaNacimiento}
                      onChange={handleFechaNacimientoChange}
                      min={tipoDocumento === 'DNI' ? fechaMinima80 : undefined}
                      max={tipoDocumento === 'DNI' ? fechaMaxima18 : obtenerHoyLima()}
                      required
                      className="flex-1 h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition"
                    />
                    {tipoDocumento === 'DNI' && edadCliente !== null && (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${
                          edadCliente >= EDAD_MINIMA && edadCliente <= EDAD_MAXIMA
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {edadCliente} años {edadCliente >= EDAD_MINIMA && edadCliente <= EDAD_MAXIMA ? '(Apto)' : '(No apto)'}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#6E625B] mt-1 block">
                    {tipoDocumento === 'DNI'
                      ? 'Rango obligatorio: 18 a 80 años cumplidos'
                      : 'Fecha de registro o inicio de actividades'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A2220] mb-1">
                    Fecha del préstamo (Fija - Hoy Lima)
                  </label>
                  <input
                    type="text"
                    value={fechaPrestamo}
                    readOnly
                    className="w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-[#FBF6F0] text-[#6E625B] font-mono cursor-not-allowed"
                  />
                  <span className="text-[11px] text-[#6E625B] mt-1 block">
                    Restringido exclusivamente a la fecha actual (America/Lima)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-medium text-[#2A2220] mb-1">
                    Plazo (meses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={plazoMeses}
                    onChange={(e) => setPlazoMeses(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition"
                  />
                  <span className="text-[11px] text-[#6E625B] mt-1 block">Rango: 1 a 60 meses</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A2220] mb-1">
                    Monto solicitado (S/)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-[#6E625B] font-medium">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max="10000"
                      value={monto}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setMonto('');
                          return;
                        }
                        const num = parseFloat(val);
                        if (!isNaN(num) && num > 10000) {
                          setMonto('10000');
                          setError('El monto máximo permitido es S/ 10,000.00. No se permite ingresar más.');
                        } else {
                          setMonto(val);
                          if (error && error.includes('10,000')) setError('');
                        }
                      }}
                      onBlur={() => {
                        const num = parseFloat(monto);
                        if (!isNaN(num) && num > 10000) {
                          setMonto('10000');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      required
                      className="w-full h-10 pl-8 pr-3 text-sm font-mono font-medium rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition"
                    />
                  </div>
                  <span className="text-[11px] text-[#6E625B] mt-1 block">Tope máximo: S/ 10,000.00</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-[#E3D3C2]/40 mt-6">
                <button
                  type="button"
                  onClick={handleSimular}
                  disabled={cargandoSimulacion}
                  className="h-10 px-4 text-xs font-medium rounded-lg border border-[#E3D3C2] bg-white hover:bg-[#FBF6F0] text-[#2A2220] transition cursor-pointer"
                >
                  {cargandoSimulacion ? 'Calculando...' : 'Simular cronograma'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCancelar}
                    className="h-10 px-4 text-xs font-medium rounded-lg text-[#6E625B] hover:text-[#2A2220] transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={procesando || !esElegible || (tipoDocumento === 'DNI' && (edadCliente === null || edadCliente < EDAD_MINIMA || edadCliente > EDAD_MAXIMA))}
                    className="h-10 px-5 text-xs font-semibold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {procesando ? 'Generando contrato...' : 'Generar contrato'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Simulación previa */}
          {simulacion && (
            <div className="bg-white rounded-xl border border-[#E3D3C2] overflow-hidden shadow-2xs">
              <div className="px-5 py-3.5 border-b border-[#E3D3C2] flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
                  Cronograma preliminar simulado
                </h2>
                <span className="text-xs font-medium text-[#6E625B]">TEA referencial: 30.00%</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F1E4D6] border-b border-[#E3D3C2] text-[11px] font-semibold text-[#2A2220] uppercase tracking-wider">
                      <th className="py-2.5 px-4 text-center">N°</th>
                      <th className="py-2.5 px-4">Vencimiento</th>
                      <th className="py-2.5 px-4 text-end">Cuota (S/)</th>
                      <th className="py-2.5 px-4 text-end">Interés (S/)</th>
                      <th className="py-2.5 px-4 text-end">Capital (S/)</th>
                      <th className="py-2.5 px-4 text-end">Saldo (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3D3C2]/40">
                    {simulacion.map((c) => (
                      <tr key={c.numero} className="hover:bg-[#FFF4E6]/40 transition">
                        <td className="py-2 px-4 text-center font-mono font-medium text-[#2A2220]">{c.numero}</td>
                        <td className="py-2 px-4 text-[#6E625B]">{c.fechaVencimiento}</td>
                        <td className="py-2 px-4 text-end font-mono font-medium text-[#2A2220]">{Number(c.monto).toFixed(2)}</td>
                        <td className="py-2 px-4 text-end font-mono text-[#6E625B]">{Number(c.interes).toFixed(2)}</td>
                        <td className="py-2 px-4 text-end font-mono text-[#2A2220]">{Number(c.capital).toFixed(2)}</td>
                        <td className="py-2 px-4 text-end font-mono text-[#2A2220]">{Number(c.saldoCapital).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PASO 2: Revisión e Impresión del Contrato                */}
      {/* ======================================================== */}
      {paso === 2 && contrato && (
        <div>
          {/* Barra de Acciones Superior */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-[#F1E4D6] text-[#2A2220] px-3 py-1 rounded-lg border border-[#E3D3C2]">
                {contrato.numeroContrato}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                EN_ESPERA
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarModalCancelar(true)}
                disabled={procesando}
                className="h-10 px-4 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition cursor-pointer"
              >
                Cancelar contrato
              </button>
              <button
                type="button"
                onClick={handleImprimir}
                disabled={procesando}
                className="h-10 px-5 text-xs font-bold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer shadow-xs flex items-center gap-2"
              >
                <span>Imprimir contrato</span>
              </button>
            </div>
          </div>

          {/* Documento Imprimible del Contrato */}
          {(() => {
            const cuotasLista = contrato.cuotas || [];
            const totalIntereses = cuotasLista.reduce((acc, c) => acc + (Number(c.interes) || 0), 0);
            const totalPagar = cuotasLista.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
            const primeraCuotaFecha = cuotasLista[0]?.fechaVencimiento || '-';
            const ultimaCuotaFecha = cuotasLista[cuotasLista.length - 1]?.fechaVencimiento || '-';
            const esJuridica = (contrato.clienteDni || '').length === 11;
            const ciudad = contrato.sucursalNombre || 'Trujillo';
            const prestamoCodigo = `PRE-${String(contrato.id).padStart(6, '0')}`;

            return (
              <div id="contrato-imprimible" className="printable-contract bg-white rounded-xl border border-[#E3D3C2] p-8 sm:p-12 shadow-2xs text-[#2A2220] font-sans text-xs leading-relaxed">
                {/* Encabezado Principal */}
                <div className="text-center pb-5 border-b-2 border-[#2A2220] mb-6">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide uppercase">
                    MODELO DE CONTRATO DE PRÉSTAMO DE DINERO
                  </h1>
                  <h2 className="text-sm sm:text-base font-semibold text-[#6E625B] mt-1 italic">
                    Contrato de mutuo dinerario
                  </h2>
                  <div className="mt-4 flex flex-wrap justify-between items-center text-xs font-mono border-t border-gray-200 pt-3 text-gray-700">
                    <div><strong>N.º de contrato:</strong> {contrato.numeroContrato}</div>
                    <div><strong>Fecha de celebración:</strong> {contrato.fechaPrestamo}</div>
                    <div><strong>Lugar:</strong> {ciudad}, Perú</div>
                  </div>
                </div>

                <p className="mb-4 text-justify">
                  Conste por el presente documento el contrato de mutuo dinerario celebrado entre las siguientes partes:
                </p>

                {/* PRIMERA: EL PRESTAMISTA */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    PRIMERA: IDENTIFICACIÓN DEL PRESTAMISTA
                  </h3>
                  <p className="mb-1 text-justify">
                    EL PRESTAMISTA es la empresa que otorga el préstamo y cuyos datos son:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2 text-gray-800">
                    <li><strong>Razón social:</strong> PRÉSTAMOS DEL NORTE S.A.C. / PagaOPiu Financiera</li>
                    <li><strong>RUC:</strong> 20123456789</li>
                    <li><strong>Domicilio fiscal:</strong> Av. Principal 123, Trujillo, La Libertad</li>
                    <li><strong>Representante legal / Asesor:</strong> {contrato.asesorNombre || 'Asesor Comercial Autorizado'} (Agencia {contrato.sucursalNombre})</li>
                    <li><strong>DNI del representante:</strong> 41238901</li>
                  </ul>
                  <p className="mt-1 italic text-gray-600">En adelante, se denominará EL PRESTAMISTA.</p>
                </div>

                {/* SEGUNDA: EL PRESTATARIO */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    SEGUNDA: IDENTIFICACIÓN DEL PRESTATARIO
                  </h3>
                  <p className="mb-1 text-justify">
                    Para identificar al cliente, se utilizará la sección que corresponda según su tipo:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div className={`p-3 rounded-lg border ${!esJuridica ? 'border-[#9C4A2B] bg-[#FFF4E6]/30' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
                      <div className="font-bold text-[11px] uppercase mb-1">A. Si el prestatario es una persona natural {!esJuridica && '(Aplica)'}</div>
                      <ul className="list-disc list-inside space-y-0.5 ml-1">
                        <li><strong>Nombres y apellidos:</strong> {!esJuridica ? contrato.clienteNombre : '-'}</li>
                        <li><strong>DNI o doc. identidad:</strong> {!esJuridica ? contrato.clienteDni : '-'}</li>
                        <li><strong>RUC, si corresponde:</strong> No aplica</li>
                        <li><strong>Domicilio:</strong> Dirección registrada en RENIEC / Trujillo</li>
                        <li><strong>Teléfono:</strong> 944-123456</li>
                        <li><strong>Correo electrónico:</strong> cliente@email.com</li>
                      </ul>
                    </div>

                    <div className={`p-3 rounded-lg border ${esJuridica ? 'border-[#9C4A2B] bg-[#FFF4E6]/30' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
                      <div className="font-bold text-[11px] uppercase mb-1">B. Si el prestatario es una persona jurídica {esJuridica && '(Aplica)'}</div>
                      <ul className="list-disc list-inside space-y-0.5 ml-1">
                        <li><strong>Razón social:</strong> {esJuridica ? contrato.clienteNombre : '-'}</li>
                        <li><strong>RUC:</strong> {esJuridica ? contrato.clienteDni : '-'}</li>
                        <li><strong>Domicilio fiscal:</strong> {esJuridica ? (direccionEmpresa || 'Dirección fiscal registrada en SUNAT') : '-'}</li>
                        <li><strong>Representante legal / Encargado:</strong> {esJuridica ? (representanteLegal || 'Representante Legal debidamente facultado') : '-'}</li>
                        <li><strong>DNI del representante:</strong> {esJuridica ? (dniRepresentante || '-') : '-'}</li>
                        <li><strong>Cargo del representante:</strong> {esJuridica ? (cargoRepresentante || 'Gerente General') : '-'}</li>
                        <li><strong>Inscripción registral:</strong> Partida Electrónica N.° 11029384</li>
                      </ul>
                    </div>
                  </div>
                  <p className="mt-1.5 italic text-gray-600">En adelante, cualquiera de los dos tipos de cliente se denominará EL PRESTATARIO.</p>
                </div>

                <p className="mb-4 text-justify font-medium">
                  Ambas partes acuerdan celebrar el presente contrato conforme a las siguientes cláusulas:
                </p>

                {/* TERCERA: OBJETO DEL CONTRATO */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    TERCERA: OBJETO DEL CONTRATO
                  </h3>
                  <p className="text-justify mb-1">
                    EL PRESTAMISTA se compromete a entregar a EL PRESTATARIO una cantidad determinada de dinero en calidad de préstamo.
                  </p>
                  <p className="text-justify">
                    EL PRESTATARIO se obliga a devolver el capital recibido y pagar los intereses y demás conceptos que correspondan, de acuerdo con las condiciones pactadas en el presente contrato y la legislación aplicable.
                  </p>
                </div>

                {/* CUARTA: MONTO Y DESEMBOLSO DEL PRÉSTAMO */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    CUARTA: MONTO Y DESEMBOLSO DEL PRÉSTAMO
                  </h3>
                  <p className="mb-2 text-justify">
                    Las partes establecen las siguientes condiciones:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-300 text-left">
                          <th className="p-2 border-r border-gray-300 font-bold w-1/3">Concepto</th>
                          <th className="p-2 font-bold">Información</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Código del préstamo</td>
                          <td className="p-2 font-mono font-bold">{prestamoCodigo}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Capital prestado</td>
                          <td className="p-2 font-mono font-bold">S/ {Number(contrato.capital).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Moneda</td>
                          <td className="p-2">Soles peruanos (PEN)</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Fecha de desembolso</td>
                          <td className="p-2 font-mono">{contrato.fechaPrestamo}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Medio de desembolso</td>
                          <td className="p-2">Transferencia bancaria / Abono en cuenta / Efectivo en ventanilla</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Plazo</td>
                          <td className="p-2 font-bold">{contrato.plazoMeses} meses</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Destino del préstamo</td>
                          <td className="p-2">Libre disponibilidad / Capital de trabajo</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-1.5 text-justify italic text-gray-600">
                    EL PRESTAMISTA dejará constancia del desembolso mediante el registro o documento que corresponda.
                  </p>
                </div>

                {/* QUINTA: INTERESES Y CONDICIONES FINANCIERAS */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    QUINTA: INTERESES Y CONDICIONES FINANCIERAS
                  </h3>
                  <p className="mb-2 text-justify">
                    El préstamo tendrá las siguientes condiciones financieras:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-300 text-left">
                          <th className="p-2 border-r border-gray-300 font-bold w-1/3">Concepto</th>
                          <th className="p-2 font-bold">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Tasa de interés compensatorio</td>
                          <td className="p-2 font-bold">{(Number(contrato.tea) * 100).toFixed(2)}% (TEA) / 2.2104% (TEM ref.)</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Periodicidad de la tasa</td>
                          <td className="p-2">Anual (TEA) con capitalización mensual</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Método de amortización</td>
                          <td className="p-2 font-semibold">Sistema Francés (cuotas mensuales fijas)</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Número de cuotas</td>
                          <td className="p-2 font-bold">{contrato.plazoMeses} cuotas</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Importe estimado de cada cuota</td>
                          <td className="p-2 font-mono font-bold">S/ {Number(contrato.cuotaFija).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Intereses totales estimados</td>
                          <td className="p-2 font-mono font-bold">S/ {totalIntereses.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-r border-gray-300 font-medium">Otros cargos aplicables, si corresponden</td>
                          <td className="p-2 font-mono">S/ 0.00 (Sin comisiones ocultas)</td>
                        </tr>
                        <tr className="bg-amber-50/50">
                          <td className="p-2 border-r border-gray-300 font-bold">Total estimado por pagar</td>
                          <td className="p-2 font-mono font-bold text-[#9C4A2B]">S/ {totalPagar.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-1.5 text-justify italic text-gray-600">
                    Las condiciones financieras deberán respetar los límites y las disposiciones legales aplicables. Las tasas, los cargos y el costo total del préstamo deberán comunicarse al prestatario de manera clara.
                  </p>
                </div>

                {/* SEXTA: PLAZO Y FORMA DE PAGO */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    SEXTA: PLAZO Y FORMA DE PAGO
                  </h3>
                  <p className="text-justify mb-1">
                    EL PRESTATARIO devolverá el préstamo mediante <strong>{contrato.plazoMeses}</strong> cuotas, de acuerdo con el cronograma de pagos incorporado como <strong>ANEXO 1</strong>, que forma parte integrante del presente contrato.
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li><strong>Primera cuota:</strong> {primeraCuotaFecha}</li>
                    <li><strong>Última cuota:</strong> {ultimaCuotaFecha}</li>
                    <li><strong>Frecuencia de pago:</strong> Mensual</li>
                    <li><strong>Medio de pago:</strong> En ventanilla de agencias autorizadas o transferencia bancaria</li>
                  </ul>
                  <p className="mt-1 text-justify text-gray-600">
                    Cada cuota detallará el capital amortizado, los intereses y los demás conceptos aplicables, así como el saldo pendiente.
                  </p>
                </div>

                {/* SÉPTIMA: INCUMPLIMIENTO DE PAGO */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    SÉPTIMA: INCUMPLIMIENTO DE PAGO
                  </h3>
                  <p className="text-justify mb-1">
                    Si EL PRESTATARIO incumple las fechas de pago, se aplicarán las consecuencias previstas en el contrato, respetando la legislación vigente.
                  </p>
                  <p className="text-justify text-gray-600">
                    Los intereses moratorios y otros cargos, cuando correspondan, deberán estar debidamente establecidos y no podrán exceder los límites legales aplicables fijados por el Banco Central de Reserva del Perú (BCRP).
                  </p>
                </div>

                {/* OCTAVA: PAGO ANTICIPADO */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    OCTAVA: PAGO ANTICIPADO
                  </h3>
                  <p className="text-justify mb-1">
                    EL PRESTATARIO podrá efectuar pagos anticipados o cancelar el saldo pendiente antes del vencimiento, conforme a las condiciones pactadas y las disposiciones legales aplicables, con la consiguiente liquidación y reducción de intereses compensatorios al día de la cancelación.
                  </p>
                  <p className="text-justify text-gray-600">
                    Cuando corresponda, EL PRESTAMISTA actualizará el saldo pendiente y los intereses del préstamo emitiendo la liquidación respectiva.
                  </p>
                </div>

                {/* NOVENA: OBLIGACIONES DE LAS PARTES */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    NOVENA: OBLIGACIONES DE LAS PARTES
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    <div className="p-2.5 rounded border border-gray-200 bg-gray-50/50">
                      <div className="font-bold text-[11px] text-gray-800 mb-1">Obligaciones de EL PRESTAMISTA:</div>
                      <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
                        <li>Entregar el dinero conforme a las condiciones pactadas.</li>
                        <li>Proporcionar información clara sobre el préstamo.</li>
                        <li>Registrar los pagos realizados.</li>
                        <li>Mantener disponible el estado de cuenta del préstamo.</li>
                        <li>Emitir los comprobantes y las constancias que correspondan conforme a la normativa aplicable.</li>
                      </ol>
                    </div>
                    <div className="p-2.5 rounded border border-gray-200 bg-gray-50/50">
                      <div className="font-bold text-[11px] text-gray-800 mb-1">Obligaciones de EL PRESTATARIO:</div>
                      <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
                        <li>Proporcionar información veraz.</li>
                        <li>Cumplir con las condiciones pactadas.</li>
                        <li>Efectuar los pagos dentro de los plazos establecidos.</li>
                        <li>Comunicar cualquier cambio de información relevante para la gestión del préstamo.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* DÉCIMA: COMPROBANTES Y CONSTANCIAS DE PAGO */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    DÉCIMA: COMPROBANTES Y CONSTANCIAS DE PAGO
                  </h3>
                  <p className="text-justify mb-1">
                    EL PRESTAMISTA registrará los pagos realizados y emitirá los comprobantes de pago que correspondan conforme a las disposiciones tributarias aplicables (Boleta de Venta Electrónica para personas naturales o Factura Electrónica para personas jurídicas).
                  </p>
                  <p className="text-justify text-gray-600">
                    Los comprobantes, cuando sean exigibles, deberán reflejar correctamente la operación realizada y el desglose de intereses y amortización.
                  </p>
                </div>

                {/* DÉCIMA PRIMERA: TRATAMIENTO DE DATOS PERSONALES */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    DÉCIMA PRIMERA: TRATAMIENTO DE DATOS PERSONALES
                  </h3>
                  <p className="text-justify text-gray-700">
                    Los datos recopilados para la gestión del préstamo serán tratados conforme a la legislación peruana de protección de datos personales (Ley N.° 29733) y para las finalidades legítimas relacionadas con la operación financiera y crediticia.
                  </p>
                </div>

                {/* DÉCIMA SEGUNDA: RESOLUCIÓN DE CONTROVERSIAS */}
                <div className="mb-4">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    DÉCIMA SEGUNDA: RESOLUCIÓN DE CONTROVERSIAS
                  </h3>
                  <p className="text-justify text-gray-700">
                    Las partes procurarán resolver de manera directa cualquier controversia relacionada con el presente contrato. De no alcanzar un acuerdo, procederán conforme a los mecanismos legalmente aplicables sometiéndose a la competencia de los jueces y tribunales del distrito judicial de {ciudad}.
                  </p>
                </div>

                {/* DÉCIMA TERCERA: ACEPTACIÓN Y FIRMA */}
                <div className="mb-8">
                  <h3 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-1">
                    DÉCIMA TERCERA: ACEPTACIÓN Y FIRMA
                  </h3>
                  <p className="text-justify mb-2">
                    Las partes declaran haber leído y comprendido las condiciones del presente contrato y manifiestan su conformidad con ellas firmándolo en señal de aceptación.
                  </p>
                  <p className="font-mono text-[11px] text-gray-600 mb-8">
                    Lugar y fecha: {ciudad}, {contrato.fechaPrestamo}.
                  </p>

                  {/* Firmas */}
                  <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50/30">
                      <div className="font-bold uppercase text-[11px] text-gray-500 mb-12">EL PRESTAMISTA</div>
                      <div className="border-t border-gray-800 mx-4 pt-2">
                        <div className="font-bold text-sm">Firma: ________________________</div>
                        <div className="mt-2 text-gray-700 font-medium">Empresa: PRÉSTAMOS DEL NORTE S.A.C.</div>
                        <div className="text-gray-600">Representante: {contrato.asesorNombre || 'Asesor Comercial'}</div>
                        <div className="text-gray-600 font-mono">DNI: 41238901</div>
                      </div>
                    </div>

                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50/30">
                      <div className="font-bold uppercase text-[11px] text-gray-500 mb-12">EL PRESTATARIO</div>
                      <div className="border-t border-gray-800 mx-4 pt-2">
                        <div className="font-bold text-sm">Firma: ________________________</div>
                        <div className="mt-2 text-gray-700 font-medium">
                          {esJuridica ? 'Razón Social: ' : 'Nombre: '}
                          {contrato.clienteNombre}
                        </div>
                        <div className="text-gray-600 font-mono">
                          {esJuridica ? 'RUC: ' : 'DNI: '}
                          {contrato.clienteDni}
                        </div>
                        {esJuridica ? (
                          <>
                            <div className="text-gray-800 font-semibold mt-1">
                              Representante: {representanteLegal || 'Representante Legal'}
                            </div>
                            {dniRepresentante && (
                              <div className="text-gray-600 font-mono">
                                DNI Rep.: {dniRepresentante}
                              </div>
                            )}
                            <div className="text-gray-600 text-[11px]">
                              Cargo: {cargoRepresentante || 'Gerente General'}
                            </div>
                          </>
                        ) : (
                          <div className="text-gray-600">Calidad: Titular</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ANEXO 1. CRONOGRAMA DE PAGOS */}
                <div className="pt-6 border-t-2 border-[#2A2220] page-break-before">
                  <div className="text-center mb-4">
                    <h2 className="text-base font-serif font-bold uppercase tracking-wider">
                      ANEXO 1. CRONOGRAMA DE PAGOS
                    </h2>
                    <p className="text-xs text-gray-500 italic mt-0.5">
                      Este anexo se genera automáticamente a partir de las condiciones financieras registradas en el sistema.
                    </p>
                  </div>

                  <table className="w-full text-left border-collapse text-xs border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 text-[11px] font-bold uppercase">
                        <th className="py-2 px-3 border-r border-gray-300 text-center">N°</th>
                        <th className="py-2 px-3 border-r border-gray-300">Vencimiento</th>
                        <th className="py-2 px-3 border-r border-gray-300 text-end">Cuota (S/)</th>
                        <th className="py-2 px-3 border-r border-gray-300 text-end">Interés (S/)</th>
                        <th className="py-2 px-3 border-r border-gray-300 text-end">Capital (S/)</th>
                        <th className="py-2 px-3 text-end">Saldo Capital (S/)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {cuotasLista.map((c) => (
                        <tr key={c.numero}>
                          <td className="py-1.5 px-3 text-center font-mono border-r border-gray-300">{c.numero}</td>
                          <td className="py-1.5 px-3 border-r border-gray-300 font-mono">{c.fechaVencimiento}</td>
                          <td className="py-1.5 px-3 text-end font-mono font-bold border-r border-gray-300">{Number(c.monto).toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-end font-mono border-r border-gray-300">{Number(c.interes).toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-end font-mono border-r border-gray-300">{Number(c.capital).toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-end font-mono">{Number(c.saldoCapital).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold border-t border-gray-300 text-[11px]">
                        <td colSpan={2} className="py-2 px-3 text-end uppercase border-r border-gray-300">Totales:</td>
                        <td className="py-2 px-3 text-end font-mono border-r border-gray-300">S/ {totalPagar.toFixed(2)}</td>
                        <td className="py-2 px-3 text-end font-mono border-r border-gray-300">S/ {totalIntereses.toFixed(2)}</td>
                        <td className="py-2 px-3 text-end font-mono border-r border-gray-300">S/ {Number(contrato.capital).toFixed(2)}</td>
                        <td className="py-2 px-3 text-end font-mono">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* PASO 3: Carga de Contrato Firmado                        */}
      {/* ======================================================== */}
      {paso === 3 && contrato && (
        <div className="no-print">
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 mb-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E3D3C2]/60 gap-3 mb-5">
              <div>
                <span className="text-[11px] font-semibold text-[#6E625B] uppercase tracking-wider block">
                  Contrato emitido e impreso
                </span>
                <h2 className="text-base font-bold text-[#2A2220] mt-0.5 font-mono">
                  {contrato.numeroContrato}
                </h2>
                <div className="text-xs text-[#6E625B]">
                  Cliente: <strong>{contrato.clienteNombre}</strong> ({esJuridica ? 'RUC' : 'DNI'} {contrato.clienteDni}) • S/ {Number(contrato.capital).toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="h-9 px-3.5 text-xs font-medium rounded-lg border border-[#E3D3C2] bg-white hover:bg-[#FBF6F0] text-[#2A2220] transition cursor-pointer"
                >
                  Reimprimir contrato
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarModalCancelar(true)}
                  className="h-9 px-3.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition cursor-pointer"
                >
                  Cancelar contrato
                </button>
              </div>
            </div>

            <form onSubmit={handleSubirFirmado} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">
                  1. Digite el número de contrato asignado (para verificar autenticidad)
                </label>
                <input
                  type="text"
                  placeholder={`Ej. ${contrato.numeroContrato}`}
                  value={numeroContratoDigitado}
                  onChange={(e) => setNumeroContratoDigitado(e.target.value)}
                  required
                  className="w-full sm:w-80 h-10 px-3.5 text-sm font-mono uppercase font-bold rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition"
                />
                <span className="text-[11px] text-[#6E625B] mt-1 block">
                  El número digitado debe coincidir exactamente con el contrato impreso: <strong>{contrato.numeroContrato}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">
                  2. Adjunte el contrato firmado digitalizado (PDF, JPG o PNG - Máx. 5 MB)
                </label>
                <input
                  type="file"
                  accept=".pdf, .png, .jpg, .jpeg"
                  onChange={(e) => setArchivoFirmado(e.target.files[0] || null)}
                  required
                  className="block w-full text-xs text-[#2A2220] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#9C4A2B] file:text-white hover:file:bg-[#823B20] file:cursor-pointer cursor-pointer border border-[#E3D3C2] rounded-lg p-2 bg-[#FBF6F0]"
                />
                <span className="text-[11px] text-[#6E625B] mt-1 block">
                  El sistema calculará automáticamente el hash SHA-256 para garantizar la inmutabilidad jurídica.
                </span>
              </div>

              <div className="pt-4 border-t border-[#E3D3C2]/40 flex justify-end">
                <button
                  type="submit"
                  disabled={procesando || !numeroContratoDigitado || !archivoFirmado}
                  className="h-11 px-6 text-xs font-bold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {procesando ? 'Verificando y activando préstamo...' : 'Subir contrato firmado y activar préstamo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Cancelación de Contrato                          */}
      {/* ======================================================== */}
      {mostrarModalCancelar && contrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 no-print">
          <div className="bg-white rounded-xl border border-[#E3D3C2] max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#2A2220]">
              {contrato.impreso ? 'Anular contrato emitido' : 'Descartar borrador de contrato'}
            </h3>
            <p className="text-xs text-[#6E625B] mt-1">
              {contrato.impreso
                ? 'El contrato ya fue impreso con número oficial. Para darlo de baja debe ingresar obligatoriamente un motivo de anulación formal.'
                : 'El contrato no ha sido impreso. Se descartará el borrador sin penalización.'}
            </p>

            {contrato.impreso && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-[#2A2220] mb-1">
                  Motivo de anulación <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows="3"
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Ej. El cliente desistió del crédito por motivos personales..."
                  required
                  className="w-full p-2.5 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
                ></textarea>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMostrarModalCancelar(false)}
                disabled={procesando}
                className="h-9 px-4 text-xs font-medium rounded-lg border border-[#E3D3C2] bg-white hover:bg-[#FBF6F0] text-[#2A2220] transition cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmarCancelar}
                disabled={procesando || (contrato.impreso && !motivoCancelacion.trim())}
                className="h-9 px-4 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
              >
                {procesando ? 'Procesando...' : contrato.impreso ? 'Confirmar anulación' : 'Descartar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
