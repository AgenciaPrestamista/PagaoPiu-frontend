import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function RecepcionHermes({ usuario }) {
  const [estadoCaja, setEstadoCaja] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);

  const [codigoRemesa, setCodigoRemesa] = useState('');
  const [montoApto, setMontoApto] = useState('50000.00');
  const [montoObservado, setMontoObservado] = useState('0.00');
  const [motivo, setMotivo] = useState('');

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

  const aptoNum = parseFloat(montoApto) || 0;
  const obsNum = parseFloat(montoObservado) || 0;
  const sumaTotal = aptoNum + obsNum;
  const requiereMotivo = obsNum > 0 || Math.abs(sumaTotal - 50000) > 0.001;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);

    if (!codigoRemesa.trim()) {
      setError('Ingrese el código de remesa de un solo uso provisto por Hermes.');
      return;
    }

    if (aptoNum < 0 || obsNum < 0) {
      setError('Los montos no pueden ser negativos.');
      return;
    }

    if (requiereMotivo && !motivo.trim()) {
      setError('El motivo es obligatorio cuando hay monto observado o diferencia con respecto a los S/ 50,000.00 esperados.');
      return;
    }

    setProcesando(true);
    try {
      const resp = await api.caja.recepcionHermes({
        codigoRemesa: codigoRemesa.trim(),
        montoApto: aptoNum,
        montoObservado: obsNum,
        motivo: motivo.trim() || undefined,
      });

      setMensajeExito(resp.mensaje || 'Remesa Hermes procesada correctamente.');
      setCodigoRemesa('');
      setMotivo('');
      cargarEstadoCaja();
    } catch (err) {
      setError(err.message || 'Error al registrar recepción de Hermes.');
    } finally {
      setProcesando(false);
    }
  };

  const formatoMoneda = (val) => {
    if (val === null || val === undefined) return 'S/ 0.00';
    return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#2A2220]">
          Recepción de Remesa Hermes y Apertura de Caja
        </h1>
        <p className="text-xs text-[#6E625B] mt-0.5">
          Agencia {usuario?.sucursalNombre || 'Asignada'} · Registro diario de entrega de fondos por vehículo blindado Hermes
        </p>
      </div>

      {/* Estado Actual de Caja */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] p-5 mb-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3D3C2]/40 mb-3">
          <span className="text-[11px] font-bold text-[#6E625B] uppercase tracking-wider">
            Estado de Caja de la Sucursal para Hoy
          </span>
          {cargandoCaja ? (
            <span className="text-xs text-[#6E625B]">Cargando...</span>
          ) : estadoCaja?.abierta ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Caja Abierta y Operativa
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              ○ Pendiente de Recepción Hermes
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
              {estadoCaja?.sucursalNombre || 'Trujillo'}
            </span>
          </div>
          <div>
            <span className="text-[#6E625B] block text-[11px]">Abierto por</span>
            <span className="font-medium text-[#2A2220]">
              {estadoCaja?.usuarioApertura || 'Sin apertura aún'}
            </span>
          </div>
        </div>
      </div>

      {/* Alertas */}
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

      {/* Formulario de Recepción */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 shadow-2xs">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[#2A2220]">Registrar Entrega de Remesa (Hermes)</h2>
          <p className="text-xs text-[#6E625B] mt-0.5">
            Monto esperado diario programado: <strong className="text-[#2A2220]">S/ 50,000.00</strong>. Solo el monto apto entra al saldo disponible de la caja; el observado queda fuera de caja y genera una incidencia para el Gerente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#2A2220] mb-1">
                Código de remesa Hermes (único uso) *
              </label>
              <input
                type="text"
                value={codigoRemesa}
                onChange={(e) => setCodigoRemesa(e.target.value.toUpperCase())}
                placeholder="Ej. HERMES-TRU-1029"
                required
                className="w-full h-10 px-3 text-xs font-mono font-bold rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2A2220] mb-1">
                Monto recibido apto (S/) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={montoApto}
                onChange={(e) => setMontoApto(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-bold rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
              />
              <span className="text-[10px] text-[#6E625B]">Ingresa al saldo disponible</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2A2220] mb-1">
                Monto observado / dañado (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={montoObservado}
                onChange={(e) => setMontoObservado(e.target.value)}
                className="w-full h-10 px-3 text-sm font-bold rounded-lg border border-[#E3D3C2] bg-white text-amber-800 focus:outline-none focus:border-[#9C4A2B]"
              />
              <span className="text-[10px] text-[#6E625B]">Fuera del saldo disponible</span>
            </div>
          </div>

          {/* Resumen de verificación */}
          <div className={`p-3 rounded-lg text-xs border ${
            requiereMotivo
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span>Suma entregada: <strong>{formatoMoneda(sumaTotal)}</strong></span>
                <span className="mx-2">·</span>
                <span>Esperado: <strong>S/ 50,000.00</strong></span>
                {Math.abs(sumaTotal - 50000) > 0.001 && (
                  <span className="ml-2 font-semibold text-red-700">
                    (Diferencia: {formatoMoneda(sumaTotal - 50000)})
                  </span>
                )}
              </div>
              <div className="font-semibold">
                {requiereMotivo
                  ? '⚠️ Requiere motivo obligatorio (Se creará incidencia ABIERTA)'
                  : '✓ Conforme sin incidencias'}
              </div>
            </div>
          </div>

          {requiereMotivo && (
            <div>
              <label className="block text-xs font-medium text-red-800 mb-1">
                Motivo obligatorio de la discrepancia / observación *
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                placeholder="Detalle el motivo (ej. 1 fajo de S/ 10,000 mojado o billetes rotos entregados por el blindado Hermes)"
                required={requiereMotivo}
                className="w-full p-2.5 text-xs rounded-lg border border-amber-300 bg-amber-50/40 text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={procesando}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer disabled:opacity-50"
            >
              {procesando ? 'Procesando entrega...' : 'Registrar recepción y actualizar caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
