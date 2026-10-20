import React, { useState, useEffect } from 'react';
import { api } from '../api';
import ComprobanteModal from './ComprobanteModal';

export default function CobranzaPagos({ usuario, prestamoInicialId, onVerDetalleCompleto, onRetomarContrato }) {
  const [criterioBusqueda, setCriterioBusqueda] = useState('');
  const [tipoBusqueda, setTipoBusqueda] = useState('dni'); // 'dni' o 'id'
  const [prestamosEncontrados, setPrestamosEncontrados] = useState([]);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [error, setError] = useState('');
  const [alertaReactivacion, setAlertaReactivacion] = useState(false);



  const cargarPrestamoPorId = async (id) => {
    try {
      setCargando(true);
      setError('');
      setMensajeExito('');
      setAlertaReactivacion(false);

      const dataPrestamo = await api.prestamo.obtener(id);
      setPrestamoSeleccionado(dataPrestamo);

      const dataPagos = await api.pago.listarPorPrestamo(id);
      setPagos(dataPagos || []);
    } catch (err) {
      setError(err.message || 'No fue posible cargar el préstamo');
      setPrestamoSeleccionado(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (prestamoInicialId) {
      cargarPrestamoPorId(prestamoInicialId);
    }
  }, [prestamoInicialId]);

  const handleBuscar = async (e) => {
    if (e) e.preventDefault();
    const query = criterioBusqueda.trim();
    if (!query) {
      setError('Por favor ingrese un número de DNI o ID de préstamo para buscar.');
      return;
    }

    setError('');
    setMensajeExito('');
    setCargando(true);
    setPrestamosEncontrados([]);
    setPrestamoSeleccionado(null);

    try {
      if (tipoBusqueda === 'id' || (/^\d+$/.test(query) && query.length < 8)) {
        await cargarPrestamoPorId(Number(query));
      } else {
        const prestamos = await api.prestamo.listarPorClienteDni(query);
        if (!prestamos || prestamos.length === 0) {
          setError(`No se encontraron préstamos registrados para el DNI ${query}.`);
        } else if (prestamos.length === 1) {
          await cargarPrestamoPorId(prestamos[0].id);
        } else {
          setPrestamosEncontrados(prestamos);
        }
      }
    } catch (err) {
      setError(err.message || 'Error al buscar préstamos');
    } finally {
      setCargando(false);
    }
  };



  // R10: Cobro secuencial de la cuota pendiente más antigua
  const handlePagarSiguienteCuota = async () => {
    if (!prestamoSeleccionado) return;

    if (prestamoSeleccionado.estado === 'EXTRAJUDICIAL') {
      setError('Operación denegada: El préstamo está en estado EXTRAJUDICIAL y no admite pagos en ventanilla.');
      return;
    }

    const estadoPrevioCliente = prestamoSeleccionado.clienteEstado;
    const estadoPrevioPrestamo = prestamoSeleccionado.estado;

    if (!window.confirm(`¿Confirmar cobro de la siguiente cuota por S/ ${Number(siguienteCuota.monto).toFixed(2)}?\n\nSucursal de cobro: ${usuario?.sucursalNombre || 'Agencia actual'}`)) {
      return;
    }

    setError('');
    setMensajeExito('');
    setProcesandoPago(true);

    try {
      const pago = await api.pago.pagarCuota(prestamoSeleccionado.id);
      setMensajeExito(
        `Comprobante ${pago.numeroComprobante || '#' + pago.id} emitido con éxito. Monto cobrado: S/ ${Number(pago.monto).toFixed(2)} en Agencia ${pago.sucursalNombre} por el asesor ${pago.asesorNombre}.`
      );

      // Mostrar modal de comprobante inmediatamente
      setComprobanteSeleccionado({
        ...pago,
        clienteNombre: prestamoSeleccionado.clienteNombre,
        clienteDocumento: prestamoSeleccionado.clienteDni,
        prestamoId: prestamoSeleccionado.id,
      });

      // Recargar datos actualizados
      const prestamoActualizado = await api.prestamo.obtener(prestamoSeleccionado.id);
      const pagosActualizados = await api.pago.listarPorPrestamo(prestamoSeleccionado.id);
      setPrestamoSeleccionado(prestamoActualizado);
      setPagos(pagosActualizados || []);

      // Notificar si hubo reversión de moroso a activo
      if ((estadoPrevioPrestamo === 'MOROSO' || estadoPrevioCliente === 'MOROSO') &&
          prestamoActualizado.estado === 'VIGENTE' &&
          prestamoActualizado.clienteEstado === 'ACTIVO') {
        setAlertaReactivacion(true);
      }
    } catch (err) {
      setError(err.message || 'No fue posible registrar el pago');
    } finally {
      setProcesandoPago(false);
    }
  };

  // R12: Liquidación total anticipada de todas las cuotas pendientes
  const handleCancelarAnticipado = async () => {
    if (!prestamoSeleccionado) return;

    if (prestamoSeleccionado.estado === 'EXTRAJUDICIAL') {
      setError('Operación denegada: El crédito está en cobranza EXTRAJUDICIAL y no admite cancelación en ventanilla.');
      return;
    }

    if (!window.confirm(`¿Confirmar la CANCELACIÓN ANTICIPADA TOTAL del préstamo #${prestamoSeleccionado.id}?\n\nMonto total a liquidar: S/ ${totalPendienteCancelar.toFixed(2)}\nSucursal recaudadora: ${usuario?.sucursalNombre || 'Agencia actual'}`)) {
      return;
    }

    setError('');
    setMensajeExito('');
    setProcesandoPago(true);

    try {
      const pago = await api.pago.cancelarAnticipado(prestamoSeleccionado.id);
      setMensajeExito(
        `Cancelación anticipada procesada con éxito. Comprobante ${pago.numeroComprobante || '#' + pago.id}. Monto total liquidado: S/ ${Number(pago.monto).toFixed(2)}.`
      );

      // Mostrar modal de comprobante
      setComprobanteSeleccionado({
        ...pago,
        clienteNombre: prestamoSeleccionado.clienteNombre,
        clienteDocumento: prestamoSeleccionado.clienteDni,
        prestamoId: prestamoSeleccionado.id,
      });

      const prestamoActualizado = await api.prestamo.obtener(prestamoSeleccionado.id);
      const pagosActualizados = await api.pago.listarPorPrestamo(prestamoSeleccionado.id);
      setPrestamoSeleccionado(prestamoActualizado);
      setPagos(pagosActualizados || []);
    } catch (err) {
      setError(err.message || 'Error al procesar la cancelación anticipada');
    } finally {
      setProcesandoPago(false);
    }
  };

  const cuotas = prestamoSeleccionado?.cuotas || [];
  const cuotasPendientes = cuotas.filter((c) => c.estado === 'PENDIENTE');
  const cuotasPagadas = cuotas.filter((c) => c.estado === 'PAGADA');
  const siguienteCuota = cuotasPendientes.length > 0 ? cuotasPendientes[0] : null;
  const totalPendienteCancelar = cuotasPendientes.reduce((acc, c) => acc + Number(c.monto), 0);
  const esCancelado = prestamoSeleccionado?.estado === 'CANCELADO';
  const esExtrajudicial = prestamoSeleccionado?.estado === 'EXTRAJUDICIAL';
  const esMoroso = prestamoSeleccionado?.estado === 'MOROSO';

  // Fecha actual para verificar cuotas vencidas
  const hoyStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-[#6E625B] uppercase tracking-wider block">
            Módulo de Ventanilla y Caja
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[#2A2220] mt-0.5">
            Cobranza y pagos de préstamos
          </h1>
          <p className="text-xs text-[#6E625B] mt-0.5">
            Cobro secuencial de cuotas (R10), recaudación intersucursales (R11) y liquidación anticipada (R12).
          </p>
        </div>

        {usuario?.sucursalNombre && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E3D3C2] bg-white text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[#6E625B]">Punto de cobro:</span>
            <span className="font-semibold text-[#2A2220]">Agencia {usuario.sucursalNombre}</span>
          </div>
        )}
      </div>



      {/* Barra de Búsqueda */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] p-5 mb-6 shadow-2xs">
        <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex rounded-lg border border-[#E3D3C2] p-0.5 bg-[#FBF6F0] shrink-0">
            <button
              type="button"
              onClick={() => setTipoBusqueda('dni')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                tipoBusqueda === 'dni' ? 'bg-white text-[#2A2220] shadow-xs font-semibold' : 'text-[#6E625B]'
              }`}
            >
              Buscar por DNI
            </button>
            <button
              type="button"
              onClick={() => setTipoBusqueda('id')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                tipoBusqueda === 'id' ? 'bg-white text-[#1F1B1A] shadow-xs font-semibold' : 'text-stone-500'
              }`}
            >
              Por N° Préstamo
            </button>
          </div>

          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <i className="bi bi-search text-xs"></i>
            </span>
            <input
              type="text"
              placeholder={tipoBusqueda === 'dni' ? 'Ingrese número de DNI del cliente (8 dígitos)' : 'Ingrese número de préstamo'}
              value={criterioBusqueda}
              onChange={(e) => setCriterioBusqueda(e.target.value)}
              className="w-full h-10 pl-8 pr-3 text-xs rounded-xl border border-stone-300 bg-white text-[#1F1B1A] placeholder:text-stone-400 focus:outline-none focus:border-[#752F17] transition font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="h-10 px-5 text-xs font-semibold rounded-xl bg-[#752F17] hover:bg-[#5C220E] text-white transition disabled:opacity-50 cursor-pointer shrink-0 shadow-xs inline-flex items-center gap-1.5"
          >
            {cargando ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <i className="bi bi-search text-xs"></i>
                <span>Buscar préstamo</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <i className="bi bi-exclamation-circle-fill text-rose-600 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {mensajeExito && (
          <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <i className="bi bi-check-circle-fill text-emerald-600 shrink-0"></i>
            <span>{mensajeExito}</span>
          </div>
        )}

        {alertaReactivacion && (
          <div className="mt-3.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-medium flex items-center gap-2">
            <i className="bi bi-check-circle-fill text-emerald-600 shrink-0"></i>
            <span>DEUDA REGULARIZADA: Al saldar las cuotas morosas, el crédito y el cliente han revertido automáticamente a estado <strong>ACTIVO / VIGENTE</strong>.</span>
          </div>
        )}
      </div>

      {/* Lista de Préstamos múltiples encontrados si un DNI tiene más de 1 préstamo */}
      {prestamosEncontrados.length > 1 && !prestamoSeleccionado && (
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 mb-6 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1F1B1A] mb-3">
            El cliente tiene {prestamosEncontrados.length} préstamos registrados. Seleccione uno para cobrar:
          </h2>
          <div className="divide-y divide-stone-100">
            {prestamosEncontrados.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-xs text-[#1F1B1A]">
                    Préstamo #{p.id} — S/ {Number(p.capital).toFixed(2)} ({p.plazoMeses} meses)
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Agencia: {p.sucursalNombre} · Asesor: {p.asesorNombre} · Fecha: {p.fechaPrestamo}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    p.estado === 'VIGENTE' ? 'bg-emerald-100 text-emerald-800' :
                    p.estado === 'MOROSO' ? 'bg-amber-100 text-amber-800' :
                    p.estado === 'EXTRAJUDICIAL' ? 'bg-red-100 text-red-800' :
                    p.estado === 'EN_ESPERA' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    p.estado === 'ANULADO' ? 'bg-gray-100 text-gray-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {p.estado}
                  </span>
                  <button
                    type="button"
                    onClick={() => cargarPrestamoPorId(p.id)}
                    className="h-8 px-3 text-xs font-semibold rounded-lg bg-[#752F17] hover:bg-[#5C220E] text-white transition cursor-pointer shadow-xs"
                  >
                    Seleccionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expediente del Préstamo Seleccionado */}
      {prestamoSeleccionado && (
        <div className="space-y-6">
          {/* Ficha Resumen */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-stone-100 gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Expediente de crédito para cobranza
                </span>
                <h2 className="text-base font-bold text-[#1F1B1A] mt-0.5">
                  Préstamo #{prestamoSeleccionado.id} — {prestamoSeleccionado.clienteNombre}
                </h2>
                <div className="text-xs text-stone-500 mt-0.5 font-mono">
                  DNI: {prestamoSeleccionado.clienteDni} · Agencia Origen: {prestamoSeleccionado.sucursalNombre}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  prestamoSeleccionado.estado === 'EN_ESPERA' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  prestamoSeleccionado.estado === 'ANULADO' ? 'bg-red-100 text-red-800 border border-red-300' :
                  esCancelado ? 'bg-slate-100 text-slate-700' :
                  esMoroso ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  esExtrajudicial ? 'bg-red-100 text-red-800 border border-red-300' :
                  'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  Estado: {prestamoSeleccionado.estado}
                </span>

                <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-600 font-medium">
                  Cliente: {prestamoSeleccionado.clienteEstado}
                </span>
              </div>
            </div>

            {/* Métricas clave */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Capital otorgado</span>
                <span className="font-bold text-[#1F1B1A] font-mono text-sm">
                  S/ {Number(prestamoSeleccionado.capital).toFixed(2)}
                </span>
                <span className="text-[#6E625B] block text-[11px]">{prestamoSeleccionado.plazoMeses} meses</span>
              </div>

              <div>
                <span className="text-[#6E625B] block text-[11px]">Cuota fija mensual</span>
                <span className="font-bold text-[#2A2220] font-mono text-sm">
                  S/ {Number(prestamoSeleccionado.cuotaFija).toFixed(2)}
                </span>
                <span className="text-[#6E625B] block text-[11px]">TEA: {(Number(prestamoSeleccionado.tea) * 100).toFixed(2)}%</span>
              </div>

              <div>
                <span className="text-[#6E625B] block text-[11px]">Avance de pagos</span>
                <span className="font-bold text-[#2A2220] text-sm">
                  {cuotasPagadas.length} de {cuotas.length} cuotas
                </span>
                <span className="text-[#6E625B] block text-[11px]">{cuotasPendientes.length} cuotas pendientes</span>
              </div>

              <div>
                <span className="text-[#6E625B] block text-[11px]">Saldo pendiente total</span>
                <span className="font-bold text-[#9C4A2B] font-mono text-sm">
                  S/ {totalPendienteCancelar.toFixed(2)}
                </span>
                <span className="text-[#6E625B] block text-[11px]">{esCancelado ? 'Totalmente pagado' : 'Por liquidar'}</span>
              </div>
            </div>
          </div>

          {/* Panel de Operaciones de Pago */}
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
                  Acciones de caja
                </h3>
                <p className="text-xs text-[#6E625B] mt-0.5">
                  Ejecute el cobro de la siguiente cuota secuencial o la liquidación anticipada
                </p>
              </div>

              <div className="text-[11px] text-[#6E625B]">
                Recaudación asignada a: <strong>Agencia {usuario?.sucursalNombre || 'Ventanilla'}</strong> (R11)
              </div>
            </div>

            {prestamoSeleccionado.estado === 'EN_ESPERA' ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="font-bold mb-1">PRÉSTAMO EN ESPERA DE CONTRATO FIRMADO</div>
                  <p>
                    Este crédito se encuentra en estado <strong>EN_ESPERA</strong> ({prestamoSeleccionado.numeroContrato || 'sin contrato'}). No admite pagos en ventanilla hasta ser formalizado con la subida del contrato firmado.
                  </p>
                </div>
                {onRetomarContrato && (
                  <button
                    type="button"
                    onClick={() => onRetomarContrato(prestamoSeleccionado)}
                    className="h-9 px-4 text-xs font-semibold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Retomar contrato
                  </button>
                )}
              </div>
            ) : prestamoSeleccionado.estado === 'ANULADO' ? (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                <div className="font-bold mb-1">PRÉSTAMO ANULADO</div>
                <p>
                  Este préstamo fue <strong>ANULADO</strong>{prestamoSeleccionado.motivoAnulacion ? `: ${prestamoSeleccionado.motivoAnulacion}` : ''}. No registra saldos pendientes ni admite operaciones de cobranza.
                </p>
              </div>
            ) : esCancelado ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                Este crédito se encuentra totalmente <strong>CANCELADO</strong>. No registra saldos pendientes de cobro.
              </div>
            ) : esExtrajudicial ? (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                <div className="font-bold mb-1">CRÉDITO EN COBRANZA EXTRAJUDICIAL (Atraso ≥ 365 días)</div>
                <p>
                  Conforme a las reglas R10 y R13, este préstamo se encuentra derivado a cobranza legal y <strong>NO ADMITE pagos ordinarios en ventanilla</strong>. Requiere gestión por el área de cobranza jurídica especializada.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                {siguienteCuota && (
                  <button
                    type="button"
                    onClick={handlePagarSiguienteCuota}
                    disabled={procesandoPago}
                    className="h-11 px-5 text-xs font-bold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Cobrar cuota N° {siguienteCuota.numero}</span>
                    <span className="font-mono bg-[#823B20] px-2 py-0.5 rounded text-[11px]">
                      S/ {Number(siguienteCuota.monto).toFixed(2)}
                    </span>
                  </button>
                )}

                {cuotasPendientes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCancelarAnticipado}
                    disabled={procesandoPago}
                    className="h-11 px-5 text-xs font-semibold rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] hover:bg-[#FBF6F0] transition disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Liquidación total anticipada</span>
                    <span className="font-mono text-[#6E625B] bg-[#FBF6F0] px-2 py-0.5 rounded text-[11px]">
                      S/ {totalPendienteCancelar.toFixed(2)}
                    </span>
                  </button>
                )}

                <div className="text-xs text-[#6E625B] sm:ml-auto">
                  {esMoroso && (
                    <span className="text-amber-700 font-semibold">
                      Préstamo con cuota vencida. Cobrar la cuota regularizará la mora.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Cronograma de Cuotas */}
          <div className="bg-white rounded-xl border border-[#E3D3C2] overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-[#E3D3C2] flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
                Cronograma de amortización francés
              </h3>
              <span className="text-[11px] text-[#6E625B]">Regla R10: Cobro secuencial estricto</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F1E4D6] border-b border-[#E3D3C2] text-[11px] font-semibold text-[#2A2220] uppercase tracking-wider">
                    <th className="py-2.5 px-4 text-center">N°</th>
                    <th className="py-2.5 px-4">Vencimiento</th>
                    <th className="py-2.5 px-4 text-end">Saldo inicial</th>
                    <th className="py-2.5 px-4 text-end">Capital</th>
                    <th className="py-2.5 px-4 text-end">Interés</th>
                    <th className="py-2.5 px-4 text-end">Cuota fija</th>
                    <th className="py-2.5 px-4 text-end">Saldo capital</th>
                    <th className="py-2.5 px-4 text-center">Estado</th>
                    <th className="py-2.5 px-4 text-center">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3D3C2]/40">
                  {cuotas.map((c) => {
                    const estaVencida = c.estado === 'PENDIENTE' && c.fechaVencimiento < hoyStr;
                    const esLaSiguiente = siguienteCuota && siguienteCuota.id === c.id;

                    return (
                      <tr
                        key={c.id}
                        className={`transition ${
                          esLaSiguiente ? 'bg-[#FFF4E6] font-medium' : 'hover:bg-[#FBF6F0]/60'
                        }`}
                      >
                        <td className="py-2 px-4 text-center font-mono">
                          {c.numero}
                          {esLaSiguiente && (
                            <span className="ml-1.5 text-[10px] font-bold text-[#9C4A2B]">▶</span>
                          )}
                        </td>
                        <td className="py-2 px-4 font-mono">
                          {c.fechaVencimiento}
                          {estaVencida && (
                            <span className="ml-1.5 text-[10px] font-bold text-red-600 uppercase">
                              (Vencida)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-4 text-end font-mono">
                          S/ {(c.saldoInicial != null ? Number(c.saldoInicial) : ((Number(c.saldoCapital) || 0) + (Number(c.capital) || 0))).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-end font-mono">S/ {Number(c.capital).toFixed(2)}</td>
                        <td className="py-2 px-4 text-end font-mono">S/ {Number(c.interes).toFixed(2)}</td>
                        <td className="py-2 px-4 text-end font-mono font-bold text-[#2A2220]">
                          S/ {Number(c.monto).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-end font-mono text-[#6E625B]">
                          S/ {Number(c.saldoCapital).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-800' :
                            estaVencida ? 'bg-red-100 text-red-800 animate-pulse' :
                            'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {c.estado === 'PAGADA' ? 'PAGADA' : estaVencida ? 'EN MORA' : 'PENDIENTE'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center font-mono text-[11px] text-[#6E625B]">
                          {c.pagoId ? `#${c.pagoId}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historial de Recibos de Pago */}
          {pagos.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E3D3C2] overflow-hidden shadow-2xs">
              <div className="px-5 py-3.5 border-b border-[#E3D3C2]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
                  Historial de pagos recaudados para este préstamo
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F1E4D6] border-b border-[#E3D3C2] text-[11px] font-semibold text-[#2A2220] uppercase tracking-wider">
                      <th className="py-2.5 px-4 text-center">N° Comprobante</th>
                      <th className="py-2.5 px-4">Fecha</th>
                      <th className="py-2.5 px-4">Tipo</th>
                      <th className="py-2.5 px-4 text-end">Monto cobrado</th>
                      <th className="py-2.5 px-4">Agencia recaudadora</th>
                      <th className="py-2.5 px-4">Asesor</th>
                      <th className="py-2.5 px-4 text-center no-print">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3D3C2]/40">
                    {pagos.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FBF6F0]/60 transition">
                        <td className="py-2 px-4 text-center font-mono font-bold text-[#2A2220]">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.tipoComprobante === 'FACTURA' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {p.numeroComprobante || `#${p.id}`}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-[#6E625B] font-mono">{p.fechaPago}</td>
                        <td className="py-2 px-4">
                          <span className="text-[11px] font-medium text-[#2A2220]">
                            {p.tipo === 'CANCELACION_ANTICIPADA' ? 'Liquidación anticipada' : 'Cuota ordinaria'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-end font-mono font-bold text-[#2A2220]">
                          S/ {Number(p.monto).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-[#6E625B] font-medium">{p.sucursalNombre}</td>
                        <td className="py-2 px-4 text-[#6E625B]">{p.asesorNombre}</td>
                        <td className="py-2 px-4 text-center no-print">
                          <button
                            type="button"
                            onClick={() => setComprobanteSeleccionado({
                              ...p,
                              clienteNombre: prestamoSeleccionado?.clienteNombre,
                              clienteDocumento: prestamoSeleccionado?.clienteDni,
                              prestamoId: prestamoSeleccionado?.id,
                            })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer shadow-2xs"
                          >
                            <span>Ver</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Comprobante / Voucher de Pago */}
      {comprobanteSeleccionado && (
        <ComprobanteModal
          pago={comprobanteSeleccionado}
          onCerrar={() => setComprobanteSeleccionado(null)}
        />
      )}
    </div>
  );
}
