import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function RecepcionHermes({ usuario, onCajaAbierta, onIrAOperaciones }) {
  const [estadoCaja, setEstadoCaja] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);

  // Campos sin datos mockeados: deben ser ingresados manualmente por el asesor
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
        <h1 className="text-xl font-bold tracking-tight text-[#2A2220]">
          {cajaEstaAbierta ? 'Estado de Caja y Remesas Hermes' : 'Apertura de Caja — Recepción Hermes'}
        </h1>
        <p className="text-xs text-[#6E625B] mt-0.5">
          Agencia {sucursalNombre} · Transporte de caudales y apertura operativa diaria
        </p>
      </div>

      {/* Banner si la caja está CERRADA */}
      {!cajaEstaAbierta && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div className="text-xs">
              <strong className="font-bold text-sm block mb-1">
                Caja Cerrada — Operaciones y consultas bloqueadas
              </strong>
              <p className="leading-relaxed">
                Para habilitar las funciones del sistema (consulta de clientes, generación de préstamos y cobranzas), debe recepcionar la remesa diaria de caudales de <strong>Hermes</strong> y registrar los fondos aptos con los que abrirá la caja. Las demás pestañas se mantendrán bloqueadas hasta completar este paso obligatorio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner si la caja está ABIERTA */}
      {cajaEstaAbierta && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-2xl text-emerald-700">✓</span>
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
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer whitespace-nowrap shadow-xs self-start sm:self-auto"
              >
                Ir a Consulta de Clientes →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Estado Actual de Caja (Datos reales del backend) */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] p-5 mb-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3D3C2]/40 mb-3">
          <span className="text-[11px] font-bold text-[#6E625B] uppercase tracking-wider">
            Resumen de Caja de la Sucursal para Hoy
          </span>
          {cajaEstaAbierta ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Caja Abierta y Operativa
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              ○ Caja Cerrada (Pendiente apertura)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[#6E625B] block text-[11px]">Saldo Disponible en Caja</span>
            <span className="text-base font-bold text-emerald-800">
              {formatoMoneda(estadoCaja?.saldoDisponible)}
            </span>
          </div>
          <div>
            <span className="text-[#6E625B] block text-[11px]">Monto Observado Retenido</span>
            <span className="text-base font-bold text-amber-800">
              {formatoMoneda(estadoCaja?.montoObservadoAcumulado)}
            </span>
          </div>
          <div>
            <span className="text-[#6E625B] block text-[11px]">Sucursal</span>
            <span className="font-semibold text-[#2A2220]">
              {sucursalNombre}
            </span>
          </div>
          <div>
            <span className="text-[#6E625B] block text-[11px]">Aperturado por</span>
            <span className="font-medium text-[#2A2220]">
              {estadoCaja?.usuarioApertura || 'Pendiente de apertura'}
            </span>
          </div>
        </div>
      </div>

      {/* Alertas de error o éxito */}
      {error && (
        <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          <strong className="font-semibold">Error:</strong> {error}
        </div>
      )}

      {mensajeExito && (
        <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <strong className="font-semibold">Éxito:</strong> {mensajeExito}
        </div>
      )}

      {/* Formulario de Recepción Hermes (Requerido si caja cerrada, opcional si caja abierta) */}
      {!cajaEstaAbierta || mostrarFormAdicional ? (
        <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#2A2220]">
                {cajaEstaAbierta
                  ? 'Registrar Entrega Adicional de Hermes'
                  : 'Recepción de Remesa Hermes y Apertura de Caja'}
              </h2>
              <p className="text-xs text-[#6E625B] mt-0.5">
                Monto esperado diario: <strong className="text-[#2A2220]">S/ 50,000.00</strong>. Digite el código de remesa de un solo uso y registre el conteo físico de billetes aptos y observados.
              </p>
            </div>
            {cajaEstaAbierta && (
              <button
                type="button"
                onClick={() => setMostrarFormAdicional(false)}
                className="text-xs text-[#6E625B] hover:text-[#2A2220] transition cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#2A2220] mb-1">
                  Código de remesa Hermes *
                </label>
                <input
                  type="text"
                  value={codigoRemesa}
                  onChange={(e) => setCodigoRemesa(e.target.value.toUpperCase())}
                  placeholder="Código único de remesa"
                  required
                  className="w-full h-10 px-3 text-xs font-mono font-bold rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
                />
                <span className="text-[10px] text-[#6E625B]">Código de un solo uso provisto por el blindado</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A2220] mb-1">
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
                  className="w-full h-10 px-3 text-sm font-bold rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
                />
                <span className="text-[10px] text-[#6E625B]">Ingresa al saldo disponible de caja</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A2220] mb-1">
                  Monto observado / dañado (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoObservado}
                  onChange={(e) => setMontoObservado(e.target.value)}
                  placeholder="0.00 (opcional)"
                  className="w-full h-10 px-3 text-sm font-bold rounded-lg border border-[#E3D3C2] bg-white text-amber-800 focus:outline-none focus:border-[#9C4A2B]"
                />
                <span className="text-[10px] text-[#6E625B]">Fuera del saldo disponible</span>
              </div>
            </div>

            {/* Resumen dinámico del conteo */}
            {tieneDatos && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  requiereMotivo
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span>
                      Total entregado (Apto + Obs): <strong>{formatoMoneda(sumaTotal)}</strong>
                    </span>
                    <span className="mx-2">·</span>
                    <span>
                      Esperado: <strong>S/ 50,000.00</strong>
                    </span>
                    {Math.abs(sumaTotal - 50000) > 0.001 && (
                      <span className="ml-2 font-semibold text-red-700">
                        (Diferencia: {formatoMoneda(sumaTotal - 50000)})
                      </span>
                    )}
                  </div>
                  <div className="font-semibold">
                    {requiereMotivo
                      ? '⚠️ Generará incidencia ABIERTA para resolución del Gerente'
                      : '✓ Conforme (S/ 50,000.00)'}
                  </div>
                </div>
              </div>
            )}

            {requiereMotivo && (
              <div>
                <label className="block text-xs font-semibold text-red-800 mb-1">
                  Motivo obligatorio de la discrepancia / billetes observados *
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                  placeholder="Especifique el motivo (ej. 1 fajo de billetes húmedos o faltante en remesa)"
                  required={requiereMotivo}
                  className="w-full p-2.5 text-xs rounded-lg border border-amber-300 bg-amber-50/40 text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={procesando}
                className="px-6 py-2.5 rounded-lg text-xs font-bold bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer disabled:opacity-50 shadow-xs"
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
        <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 shadow-2xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold mx-auto">
            ✓
          </div>
          <div>
            <h2 className="text-base font-bold text-[#2A2220]">
              La caja de la agencia se encuentra abierta y operativa
            </h2>
            <p className="text-xs text-[#6E625B] max-w-md mx-auto mt-1">
              La remesa diaria de Hermes ya fue ingresada. Puede realizar desembolsos de créditos, consultas y cobro de cuotas con total normalidad.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {onIrAOperaciones && (
              <button
                type="button"
                onClick={onIrAOperaciones}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer shadow-xs"
              >
                Ir a Consulta de Clientes
              </button>
            )}
            <button
              type="button"
              onClick={() => setMostrarFormAdicional(true)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] transition cursor-pointer"
            >
              + Registrar remesa adicional Hermes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
