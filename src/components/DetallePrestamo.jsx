import React, { useState, useEffect } from 'react';
import { api } from '../api';
import ComprobanteModal from './ComprobanteModal';

export default function DetallePrestamo({ prestamoId, onVolver, onNuevoPrestamo }) {
  const [prestamo, setPrestamo] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [descargandoContrato, setDescargandoContrato] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [error, setError] = useState('');

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError('');
      const dataPrestamo = await api.prestamo.obtener(prestamoId);
      setPrestamo(dataPrestamo);
      const dataPagos = await api.pago.listarPorPrestamo(prestamoId);
      setPagos(dataPagos);
    } catch (err) {
      setError(err.message || 'Error al cargar detalle del préstamo');
    } finally {
      setCargando(false);
    }
  };

  const handleVerContrato = async () => {
    try {
      setDescargandoContrato(true);
      setError('');
      const blob = await api.contratos.descargar(prestamoId);
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank');
    } catch (err) {
      setError(err.message || 'Error al descargar contrato firmado');
    } finally {
      setDescargandoContrato(false);
    }
  };

  useEffect(() => {
    if (prestamoId) {
      cargarDatos();
    }
  }, [prestamoId]);

  const handlePagarSiguienteCuota = async () => {
    if (!window.confirm('¿Está seguro de procesar el pago de la siguiente cuota pendiente?')) {
      return;
    }
    setError('');
    setMensajeExito('');
    setProcesandoPago(true);
    try {
      const pago = await api.pago.pagarCuota(prestamoId);
      setMensajeExito(`Comprobante ${pago.numeroComprobante || '#' + pago.id} emitido con éxito. Monto cobrado: S/ ${Number(pago.monto).toFixed(2)} (${pago.sucursalNombre})`);
      setComprobanteSeleccionado({
        ...pago,
        clienteNombre: prestamo.clienteNombre,
        clienteDocumento: prestamo.clienteDni,
        prestamoId: prestamo.id,
      });
      await cargarDatos();
    } catch (err) {
      setError(err.message || 'Error al procesar el pago de la cuota');
    } finally {
      setProcesandoPago(false);
    }
  };

  const handleCancelarAnticipado = async () => {
    if (!window.confirm('¿Está seguro de CANCELAR ANTICIPADAMENTE este préstamo? Se cobrará la suma de todas las cuotas pendientes.')) {
      return;
    }
    setError('');
    setMensajeExito('');
    setProcesandoPago(true);
    try {
      const pago = await api.pago.cancelarAnticipado(prestamoId);
      setMensajeExito(`Préstamo cancelado con comprobante ${pago.numeroComprobante || '#' + pago.id}. Monto total cobrado: S/ ${Number(pago.monto).toFixed(2)}.`);
      setComprobanteSeleccionado({
        ...pago,
        clienteNombre: prestamo.clienteNombre,
        clienteDocumento: prestamo.clienteDni,
        prestamoId: prestamo.id,
      });
      await cargarDatos();
    } catch (err) {
      setError(err.message || 'Error al procesar la cancelación anticipada');
    } finally {
      setProcesandoPago(false);
    }
  };

  if (cargando) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="w-6 h-6 border-2 border-[#E3D3C2] border-t-[#9C4A2B] rounded-full animate-spin mx-auto"></div>
        <p className="mt-3 text-xs text-[#6E625B]">Cargando expediente del préstamo...</p>
      </div>
    );
  }

  if (!prestamo) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 mb-4">
          {error || 'Préstamo no encontrado'}
        </div>
        <button
          type="button"
          onClick={onVolver}
          className="h-9 px-4 text-xs font-medium rounded-lg border border-[#E3D3C2] bg-white hover:bg-[#FBF6F0] text-[#2A2220] transition cursor-pointer"
        >
          Volver a consulta
        </button>
      </div>
    );
  }

  const cuotasPendientes = (prestamo.cuotas || []).filter((c) => c.estado === 'PENDIENTE');
  const siguienteCuota = cuotasPendientes.length > 0 ? cuotasPendientes[0] : null;
  const totalPendienteCancelar = cuotasPendientes.reduce((acc, c) => acc + Number(c.monto), 0);
  const esCancelado = prestamo.estado === 'CANCELADO';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-medium text-[#6E625B] uppercase tracking-wider block">
            Expediente crediticio
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[#2A2220] mt-0.5">
            Préstamo #{prestamo.id}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onVolver}
            className="h-9 px-3.5 text-xs font-medium rounded-lg border border-[#E3D3C2] bg-white hover:bg-[#FBF6F0] text-[#2A2220] transition cursor-pointer"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onNuevoPrestamo}
            className="h-9 px-3.5 text-xs font-medium rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer"
          >
            Nuevo préstamo
          </button>
          {prestamo.tieneContratoFirmado && (
            <button
              type="button"
              onClick={handleVerContrato}
              disabled={descargandoContrato}
              className="h-9 px-3.5 text-xs font-medium rounded-lg border border-[#9C4A2B] text-[#9C4A2B] hover:bg-[#FFF4E6] transition cursor-pointer"
            >
              {descargandoContrato ? 'Descargando...' : 'Ver contrato firmado'}
            </button>
          )}
        </div>
      </div>

      {mensajeExito && (
        <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {mensajeExito}
        </div>
      )}

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Ficha de Condiciones */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] p-5 mb-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E3D3C2]/40 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
            Condiciones del crédito
          </h2>
          <div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                prestamo.estado === 'EN_ESPERA'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : prestamo.estado === 'ANULADO'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : esCancelado
                  ? 'bg-slate-100 text-slate-600'
                  : prestamo.estado === 'VIGENTE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {prestamo.estado}
            </span>
          </div>
        </div>

        {prestamo.estado === 'ANULADO' && prestamo.motivoAnulacion && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <strong>Motivo de anulación:</strong> {prestamo.motivoAnulacion}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="text-[#6E625B] block text-[11px]">N° Contrato</span>
            <span className="font-mono font-bold text-[#2A2220] block">{prestamo.numeroContrato || '—'}</span>
            <span className="text-[#6E625B] text-[11px]">{prestamo.impreso ? 'Impreso' : 'No impreso'}</span>
          </div>

          <div>
            <span className="text-[#6E625B] block text-[11px]">Titular</span>
            <span className="font-medium text-[#2A2220] block">{prestamo.clienteNombre}</span>
            <span className="text-[#6E625B] font-mono text-[11px]">DNI {prestamo.clienteDni}</span>
          </div>

          <div>
            <span className="text-[#6E625B] block text-[11px]">Agencia y Asesor</span>
            <span className="font-medium text-[#2A2220] block">{prestamo.sucursalNombre}</span>
            <span className="text-[#6E625B] text-[11px]">{prestamo.asesorNombre}</span>
          </div>

          <div>
            <span className="text-[#6E625B] block text-[11px]">Monto y Plazo</span>
            <span className="font-medium text-[#2A2220] font-mono block">
              S/ {Number(prestamo.capital).toFixed(2)}
            </span>
            <span className="text-[#6E625B] text-[11px]">{prestamo.plazoMeses} meses</span>
          </div>

          <div>
            <span className="text-[#6E625B] block text-[11px]">Cuota mensual fija</span>
            <span className="font-medium text-[#2A2220] font-mono block">
              S/ {Number(prestamo.cuotaFija).toFixed(2)}
            </span>
            <span className="text-[#6E625B] text-[11px]">TEA: {(Number(prestamo.tea) * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Operaciones de Cobranza */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] p-5 mb-5 shadow-2xs">
        <div className="mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
            Operaciones de caja y cobranza
          </h2>
          <p className="text-xs text-[#6E625B] mt-0.5">
            Cobro secuencial de cuotas o liquidación anticipada en ventanilla
          </p>
        </div>

        {prestamo.estado === 'EN_ESPERA' ? (
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            Este crédito se encuentra <strong>EN ESPERA</strong> de formalización. No admite pagos ni cobranza en ventanilla.
          </div>
        ) : prestamo.estado === 'ANULADO' ? (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            Este crédito se encuentra <strong>ANULADO</strong>. No registra saldos ni admite operaciones.
          </div>
        ) : esCancelado ? (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Este crédito se encuentra totalmente <strong>CANCELADO</strong>. No registra saldos pendientes.
          </div>
        ) : prestamo.estado === 'EXTRAJUDICIAL' ? (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            <span className="font-bold">CRÉDITO EN COBRANZA EXTRAJUDICIAL (Atraso ≥ 365 días):</span> Conforme a las reglas R10 y R13, este préstamo no admite pagos ordinarios en ventanilla y se encuentra en cobranza jurídica.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {siguienteCuota && (
              <button
                type="button"
                onClick={handlePagarSiguienteCuota}
                disabled={procesandoPago}
                className="h-10 px-4 text-xs font-medium rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer"
              >
                Cobrar cuota N° {siguienteCuota.numero} (S/ {Number(siguienteCuota.monto).toFixed(2)})
              </button>
            )}

            {cuotasPendientes.length > 0 && (
              <button
                type="button"
                onClick={handleCancelarAnticipado}
                disabled={procesandoPago}
                className="h-10 px-4 text-xs font-medium rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] hover:bg-[#FBF6F0] transition disabled:opacity-50 cursor-pointer"
              >
                Liquidación anticipada total (S/ {totalPendienteCancelar.toFixed(2)})
              </button>
            )}

            {cuotasPendientes.length === 0 && (
              <span className="text-xs text-[#6E625B]">No existen cuotas pendientes de pago.</span>
            )}
          </div>
        )}
      </div>

      {/* Historial de Pagos */}
      {pagos.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E3D3C2] overflow-hidden mb-5 shadow-2xs">
          <div className="px-5 py-3.5 border-b border-[#E3D3C2]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
              Historial de pagos registrados
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F1E4D6] border-b border-[#E3D3C2] text-[11px] font-semibold text-[#2A2220] uppercase tracking-wider">
                  <th className="py-2.5 px-4 text-center">N° Recibo</th>
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4 text-end">Monto cobrado</th>
                  <th className="py-2.5 px-4">Agencia</th>
                  <th className="py-2.5 px-4">Asesor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D3C2]/40">
                {pagos.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FFF4E6]/40 transition">
                    <td className="py-2 px-4 text-center font-mono font-medium text-[#2A2220]">#{p.id}</td>
                    <td className="py-2 px-4 text-[#6E625B]">{p.fechaPago}</td>
                    <td className="py-2 px-4">
                      <span className="text-[11px] font-medium text-[#2A2220]">
                        {p.tipo === 'CANCELACION_ANTICIPADA' ? 'Liquidación total' : 'Cuota ordinaria'}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-end font-mono font-medium text-[#2A2220]">
                      S/ {Number(p.monto).toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-[#6E625B]">{p.sucursalNombre}</td>
                    <td className="py-2 px-4 text-[#6E625B]">{p.asesorNombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cronograma Francés */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-[#E3D3C2] flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
            Cronograma de pagos (Sistema Francés)
          </h2>
          <span className="text-xs text-[#6E625B]">Cuotas fijas mensuales</span>
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
                <th className="py-2.5 px-4 text-center">Estado</th>
                <th className="py-2.5 px-4 text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D3C2]/40">
              {(prestamo.cuotas || []).map((c) => (
                <tr key={c.numero} className="hover:bg-[#FFF4E6]/40 transition">
                  <td className="py-2.5 px-4 text-center font-mono font-medium text-[#2A2220]">{c.numero}</td>
                  <td className="py-2.5 px-4 text-[#6E625B]">{c.fechaVencimiento}</td>
                  <td className="py-2.5 px-4 text-end font-mono font-semibold text-[#2A2220]">
                    S/ {Number(c.monto).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-end font-mono text-[#6E625B]">
                    S/ {Number(c.interes).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-end font-mono text-[#2A2220]">
                    S/ {Number(c.capital).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-end font-mono text-[#2A2220]">
                    S/ {Number(c.saldoCapital).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        c.estado === 'PAGADA'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono text-[11px]">
                    {c.pagoId ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const detalle = await api.pago.obtener(c.pagoId);
                            setComprobanteSeleccionado({
                              ...detalle,
                              clienteNombre: prestamo.clienteNombre,
                              clienteDocumento: prestamo.clienteDni,
                              prestamoId: prestamo.id,
                              cuotaNumero: c.numero,
                            });
                          } catch {
                            const pagoLocal = (pagos || []).find((p) => p.id === c.pagoId);
                            setComprobanteSeleccionado({
                              id: c.pagoId,
                              monto: c.monto,
                              montoCapital: c.capital,
                              montoInteres: c.interes,
                              cuotaNumero: c.numero,
                              clienteNombre: prestamo.clienteNombre,
                              clienteDocumento: prestamo.clienteDni,
                              prestamoId: prestamo.id,
                              fechaPago: pagoLocal?.fechaPago || c.fechaVencimiento,
                              sucursalNombre: pagoLocal?.sucursalNombre || prestamo.sucursalNombre,
                              asesorNombre: pagoLocal?.asesorNombre || prestamo.asesorNombre,
                              numeroComprobante: pagoLocal?.numeroComprobante,
                              tipoComprobante: pagoLocal?.tipoComprobante,
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFF4E6] text-[#9C4A2B] border border-[#E3D3C2] hover:bg-[#F1E4D6] transition cursor-pointer"
                        title="Ver / Reimprimir comprobante"
                      >
                        <span>{(pagos || []).find((p) => p.id === c.pagoId)?.numeroComprobante || `#${c.pagoId}`}</span>
                      </button>
                    ) : (
                      <span className="text-[#6E625B]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
