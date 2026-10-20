import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function RecepcionHermes({ usuario, onCajaAbierta, onIrAOperaciones }) {
  const [estadoCaja, setEstadoCaja] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);

  // Campos obligatorios ingresados manualmente por el asesor
  const [codigoRemesa, setCodigoRemesa] = useState('');
  const [montoApto, setMontoApto] = useState('');
  const [montoObservado, setMontoObservado] = useState('');
  const [motivo, setMotivo] = useState('');

  const [mostrarFormAdicional, setMostrarFormAdicional] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [error, setError] = useState(null);

  const cargarEstadoCaja = async () => {
    setCargandoCaja(true);
    try {
      const data = await api.caja.obtenerEstado();
      setEstadoCaja(data);
    } catch (err) {
      console.warn('Error al obtener estado de caja:', err);
    } finally {
      setCargandoCaja(false);
    }
  };

  useEffect(() => {
    cargarEstadoCaja();
  }, []);

  const aptoNum = montoApto === '' ? 0 : parseFloat(montoApto);
  const obsNum = montoObservado === '' ? 0 : parseFloat(montoObservado);
  const sumaTotal = (isNaN(aptoNum) ? 0 : aptoNum) + (isNaN(obsNum) ? 0 : obsNum);
  const tieneDatos = montoApto !== '' || montoObservado !== '';
  const requiereMotivo = tieneDatos && (obsNum > 0 || Math.abs(sumaTotal - 50000) > 0.001);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);

    if (!codigoRemesa.trim()) {
      setError('Ingrese el código de remesa de un solo uso provisto por Hermes.');
      return;
    }

    if (montoApto === '' || isNaN(aptoNum) || aptoNum < 0) {
      setError('Ingrese el monto recibido apto (no puede ser negativo).');
      return;
    }

    if (montoObservado !== '' && (isNaN(obsNum) || obsNum < 0)) {
      setError('El monto observado no puede ser negativo.');
      return;
    }

    if (requiereMotivo && !motivo.trim()) {
      setError('El motivo es obligatorio cuando existe monto observado o diferencia con respecto al monto esperado de S/ 50,000.00.');
      return;
    }

    setProcesando(true);
    try {
      const resp = await api.caja.recepcionHermes({
        codigoRemesa: codigoRemesa.trim(),
        montoApto: aptoNum,
        montoObservado: isNaN(obsNum) ? 0 : obsNum,
        motivo: motivo.trim() || undefined,
      });

      setMensajeExito(
        resp.mensaje ||
        `Recepción registrada con éxito. La caja se encuentra abierta con saldo disponible de S/ ${aptoNum.toFixed(2)}.`
      );
      setCodigoRemesa('');
      setMontoApto('');
      setMontoObservado('');
      setMotivo('');
      setMostrarFormAdicional(false);

      // Actualizar estado de caja y notificar apertura para desbloquear navegación
      const nuevoEstado = await api.caja.obtenerEstado();
      setEstadoCaja(nuevoEstado);
      if (onCajaAbierta) {
        onCajaAbierta(nuevoEstado);
      }
    } catch (err) {
      setError(err.message || 'Error al registrar recepción de Hermes.');
    } finally {
      setProcesando(false);
    }
  };

  const formatoMoneda = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return 'S/ 0.00';
    return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (cargandoCaja) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E3D3C2] border-t-[#9C4A2B] rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-medium text-[#6E625B]">Consultando estado de caja y remesa Hermes...</p>
      </div>
    );
  }

  const sucursalNombre = estadoCaja?.sucursalNombre || usuario?.sucursalNombre || 'Sucursal';
  const cajaEstaAbierta = Boolean(estadoCaja?.abierta);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#1F1B1A]">
          {cajaEstaAbierta ? 'Estado de Caja y Remesas Hermes' : 'Apertura de Caja — Recepción Hermes'}
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Agencia {sucursalNombre} · Transporte de caudales y apertura operativa diaria
        </p>
      </div>

      {/* Banner si la caja está CERRADA */}
      {!cajaEstaAbierta && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <i className="bi bi-shield-lock text-xl"></i>
            </div>
            <div className="text-xs">
              <strong className="font-bold text-sm block mb-1">
                Caja Cerrada — Operaciones y consultas bloqueadas
              </strong>
              <p className="leading-relaxed text-amber-950/80">
                Para habilitar las funciones del sistema (consulta de clientes, generación de préstamos y cobranzas), debe recepcionar la remesa diaria de caudales de <strong>Hermes</strong> y registrar los fondos aptos con los que abrirá la caja. Las demás pestañas se mantendrán bloqueadas hasta completar este paso obligatorio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner si la caja está ABIERTA */}
      {cajaEstaAbierta && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5 text-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <i className="bi bi-check2-circle text-2xl text-emerald-700"></i>
              </div>
              <div>
                <strong className="font-bold text-sm block">Caja Abierta y Operativa</strong>
                <p className="text-emerald-800">
                  La entrega de Hermes fue confirmada y la caja cuenta con saldo para desembolsos. Todas las pestañas del sistema están habilitadas.
                </p>
              </div>
            </div>
            {onIrAOperaciones && (
              <button
                type="button"
                onClick={onIrAOperaciones}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer whitespace-nowrap shadow-xs self-start sm:self-auto"
              >
                <span>Ir a Consulta de Clientes</span>
                <i className="bi bi-arrow-right text-xs"></i>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Estado Actual de Caja (Datos reales del backend) */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-5 mb-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
            Resumen de Caja de la Sucursal para Hoy
          </span>
          {cajaEstaAbierta ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Caja Abierta y Operativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Caja Cerrada (Pendiente apertura)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Saldo Disponible en Caja</span>
            <span className="text-base font-bold text-emerald-800 font-mono">
              {formatoMoneda(estadoCaja?.saldoDisponible)}
            </span>
          </div>
          <div>
            <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Monto Observado Retenido</span>
            <span className="text-base font-bold text-amber-800 font-mono">
              {formatoMoneda(estadoCaja?.montoObservadoAcumulado)}
            </span>
          </div>
          <div>
            <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Sucursal</span>
            <span className="font-semibold text-[#1F1B1A]">
              {sucursalNombre}
            </span>
          </div>
          <div>
            <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Aperturado por</span>
            <span className="font-medium text-[#1F1B1A]">
              {estadoCaja?.usuarioApertura || 'Pendiente de apertura'}
            </span>
          </div>
        </div>
      </div>

      {/* Alertas de error o éxito */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <i className="bi bi-exclamation-circle-fill text-rose-600 shrink-0"></i>
          <div><strong className="font-semibold">Error:</strong> {error}</div>
        </div>
      )}

      {mensajeExito && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <i className="bi bi-check-circle-fill text-emerald-600 shrink-0"></i>
          <div><strong className="font-semibold">Éxito:</strong> {mensajeExito}</div>
        </div>
      )}

      {/* Formulario de Recepción Hermes (Requerido si caja cerrada, opcional si caja abierta) */}
      {!cajaEstaAbierta || mostrarFormAdicional ? (
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#1F1B1A]">
                {cajaEstaAbierta
                  ? 'Registrar Entrega Adicional de Hermes'
                  : 'Recepción de Remesa Hermes y Apertura de Caja'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Monto esperado diario: <strong className="text-[#1F1B1A] font-mono">S/ 50,000.00</strong>. Digite el código de remesa de un solo uso y registre el conteo físico de billetes aptos y observados.
              </p>
            </div>
            {cajaEstaAbierta && (
              <button
                type="button"
                onClick={() => setMostrarFormAdicional(false)}
                className="text-xs text-stone-500 hover:text-stone-800 transition cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F1B1A] mb-1.5">
                  Código de remesa Hermes *
                </label>
                <input
                  type="text"
                  value={codigoRemesa}
                  onChange={(e) => setCodigoRemesa(e.target.value.toUpperCase())}
                  placeholder="ej. HERMES-TRU-1029"
                  required
                  className="w-full h-10 px-3 text-xs font-mono font-bold rounded-xl border border-stone-300 bg-white text-[#1F1B1A] focus:outline-none focus:border-[#752F17] focus:ring-2 focus:ring-[#752F17]/15"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">Código de un solo uso provisto por el blindado</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1B1A] mb-1.5">
                  Monto recibido apto (S/) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoApto}
                  onChange={(e) => setMontoApto(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full h-10 px-3 text-sm font-bold font-mono rounded-xl border border-stone-300 bg-white text-[#1F1B1A] focus:outline-none focus:border-[#752F17] focus:ring-2 focus:ring-[#752F17]/15"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">Ingresa al saldo disponible de caja</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1B1A] mb-1.5">
                  Monto observado / dañado (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoObservado}
                  onChange={(e) => setMontoObservado(e.target.value)}
                  placeholder="0.00 (opcional)"
                  className="w-full h-10 px-3 text-sm font-bold font-mono rounded-xl border border-stone-300 bg-white text-amber-800 focus:outline-none focus:border-[#752F17] focus:ring-2 focus:ring-[#752F17]/15"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">Fuera del saldo disponible</span>
              </div>
            </div>

            {/* Resumen dinámico del conteo */}
            {tieneDatos && (
              <div
                className={`p-3.5 rounded-xl text-xs border ${
                  requiereMotivo
                    ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                    : 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span>
                      Total entregado (Apto + Obs): <strong className="font-mono">{formatoMoneda(sumaTotal)}</strong>
                    </span>
                    <span className="mx-2">·</span>
                    <span>
                      Esperado: <strong className="font-mono">S/ 50,000.00</strong>
                    </span>
                    {Math.abs(sumaTotal - 50000) > 0.001 && (
                      <span className="ml-2 font-semibold text-rose-700 font-mono">
                        (Diferencia: {formatoMoneda(sumaTotal - 50000)})
                      </span>
                    )}
                  </div>
                  <div className="font-semibold flex items-center gap-1">
                    {requiereMotivo ? (
                      <>
                        <i className="bi bi-exclamation-triangle-fill text-amber-600"></i>
                        <span>Generará incidencia ABIERTA para resolución del Gerente</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill text-emerald-600"></i>
                        <span>Conforme (S/ 50,000.00)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {requiereMotivo && (
              <div>
                <label className="block text-xs font-semibold text-rose-800 mb-1.5">
                  Motivo obligatorio de la discrepancia / billetes observados *
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                  placeholder="Especifique detalladamente el motivo de la discrepancia o billetes observados..."
                  required={requiereMotivo}
                  className="w-full p-3 text-xs rounded-xl border border-amber-300 bg-amber-50/30 text-[#1F1B1A] focus:outline-none focus:border-[#752F17] focus:ring-2 focus:ring-[#752F17]/15"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={procesando}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#752F17] hover:bg-[#5C220E] text-white transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {procesando
                  ? 'Procesando entrega y abriendo caja...'
                  : cajaEstaAbierta
                  ? 'Registrar Entrega Adicional'
                  : 'Registrar recepción y Abrir Caja'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/90 p-8 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-2xl font-bold mx-auto">
            <i className="bi bi-check2"></i>
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F1B1A]">
              La caja de la agencia se encuentra abierta y operativa
            </h2>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
              La remesa diaria de Hermes ya fue ingresada. Puede realizar desembolsos de créditos, consultas y cobro de cuotas con total normalidad.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {onIrAOperaciones && (
              <button
                type="button"
                onClick={onIrAOperaciones}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#752F17] hover:bg-[#5C220E] text-white transition cursor-pointer shadow-xs"
              >
                <span>Ir a Consulta de Clientes</span>
                <i className="bi bi-arrow-right text-xs"></i>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMostrarFormAdicional(true)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 transition cursor-pointer"
            >
              + Registrar remesa adicional Hermes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
