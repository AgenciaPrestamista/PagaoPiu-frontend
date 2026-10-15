import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function PanelGerente({ usuario }) {
  const [panelData, setPanelData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarMetricas = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.panel.obtener();
      setPanelData(data);
    } catch (err) {
      setError(err.message || 'Error al sincronizar las métricas del panel.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMetricas();

    // Actualización automática periódica cada 15 segundos en segundo plano sin interrumpir la UI
    const intervalo = setInterval(() => {
      api.panel.obtener()
        .then(data => {
          setPanelData(data);
          setError(null);
        })
        .catch(err => {
          console.warn('Error en sincronización automática:', err);
        });
    }, 15000);

    return () => clearInterval(intervalo);
  }, []);

  const formatoMoneda = (val) => {
    if (val === null || val === undefined) return 'S/ 0.00';
    return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2A2220]">Panel de control gerencial</h1>
          <p className="text-xs text-[#6E625B] mt-0.5">
            Supervisión consolidada de colocación y recaudación · {usuario?.nombre || 'Gerente General'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-[#F1E4D6] text-[#2A2220] border border-[#E3D3C2]">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Actualización automática activa
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={cargarMetricas}
            className="font-medium underline hover:text-red-900 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {cargando && !panelData && (
        <div className="bg-white rounded-xl border border-[#E3D3C2] p-12 text-center my-6">
          <div className="w-6 h-6 border-2 border-[#E3D3C2] border-t-[#9C4A2B] rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs text-[#6E625B]">Cargando métricas consolidadas...</p>
        </div>
      )}

      {panelData && (
        <>
          {/* Métricas clave */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
              <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
                Préstamos activos
              </span>
              <span className="text-2xl font-bold tracking-tight text-[#2A2220] font-mono">
                {panelData.totalPrestamosActivos}
              </span>
              <span className="block text-[11px] text-[#6E625B] mt-1">Colocación vigente</span>
            </div>

            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
              <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
                Total recaudado
              </span>
              <span className="text-2xl font-bold tracking-tight text-[#2A2220] font-mono">
                {formatoMoneda(panelData.totalMontoCobrado)}
              </span>
              <span className="block text-[11px] text-[#6E625B] mt-1">Capital e intereses</span>
            </div>

            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
              <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
                Intereses cobrados
              </span>
              <span className="text-2xl font-bold tracking-tight text-[#2A2220] font-mono">
                {formatoMoneda(panelData.totalInteresesCobrados)}
              </span>
              <span className="block text-[11px] text-[#6E625B] mt-1">Rendimiento cobrado</span>
            </div>

            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
              <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
                Clientes morosos
              </span>
              <span className="text-2xl font-bold tracking-tight text-amber-700 font-mono">
                {panelData.clientesMorosos}
              </span>
              <span className="block text-[11px] text-[#6E625B] mt-1">Cuotas atrasadas</span>
            </div>

            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
              <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
                Extrajudicial
              </span>
              <span className={`text-2xl font-bold tracking-tight font-mono ${panelData.clientesExtrajudiciales > 0 ? 'text-red-700' : 'text-[#2A2220]'}`}>
                {panelData.clientesExtrajudiciales}
              </span>
              <span className="block text-[11px] text-[#6E625B] mt-1">Atraso ≥ 365 días</span>
            </div>
          </div>

          {/* Tabla de Sucursales */}
          <div className="bg-white rounded-xl border border-[#E3D3C2] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E3D3C2] flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
                Distribución por agencia
              </h2>
              <span className="text-xs text-[#6E625B]">5 agencias activas</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F1E4D6] border-b border-[#E3D3C2] text-[11px] font-semibold text-[#2A2220] uppercase tracking-wider">
                    <th className="py-3 px-4">Agencia</th>
                    <th className="py-3 px-4 text-center">Préstamos activos</th>
                    <th className="py-3 px-4 text-center">Vigentes</th>
                    <th className="py-3 px-4 text-center">Morosos</th>
                    <th className="py-3 px-4 text-center">Extrajudicial</th>
                    <th className="py-3 px-4 text-end">Monto cobrado</th>
                    <th className="py-3 px-4 text-end">Intereses cobrados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3D3C2]/40">
                  {panelData.sucursales && panelData.sucursales.map((suc) => (
                    <tr key={suc.sucursalId} className="hover:bg-[#FFF4E6]/40 transition">
                      <td className="py-3 px-4 font-medium text-[#2A2220]">
                        {suc.sucursalNombre}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[#2A2220]">
                        {suc.prestamosActivos}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 font-medium">
                        {suc.prestamosVigentes}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-700 font-medium">
                        {suc.prestamosMorosos}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-red-700 font-medium">
                        {suc.prestamosExtrajudiciales}
                      </td>
                      <td className="py-3 px-4 text-end font-mono text-[#2A2220]">
                        {formatoMoneda(suc.montoTotalCobrado)}
                      </td>
                      <td className="py-3 px-4 text-end font-mono text-[#6E625B]">
                        {formatoMoneda(suc.interesesCobrados)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F1E4D6] border-t-2 border-[#E3D3C2] font-semibold text-[#2A2220]">
                    <td className="py-3 px-4">Total consolidado</td>
                    <td className="py-3 px-4 text-center font-mono">{panelData.totalPrestamosActivos}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-700">{panelData.totalPrestamosVigentes}</td>
                    <td className="py-3 px-4 text-center font-mono text-amber-700">{panelData.totalPrestamosMorosos}</td>
                    <td className="py-3 px-4 text-center font-mono text-red-700">{panelData.totalPrestamosExtrajudiciales}</td>
                    <td className="py-3 px-4 text-end font-mono">{formatoMoneda(panelData.totalMontoCobrado)}</td>
                    <td className="py-3 px-4 text-end font-mono">{formatoMoneda(panelData.totalInteresesCobrados)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
