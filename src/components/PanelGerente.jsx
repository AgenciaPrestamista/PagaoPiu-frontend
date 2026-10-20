import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function PanelGerente({ usuario, onIrAUsuarios }) {
  const [panelData, setPanelData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Incidencias Hermes
  const [incidencias, setIncidencias] = useState([]);
  const [cargandoIncidencias, setCargandoIncidencias] = useState(false);
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('ABIERTA');
  const [sucursales, setSucursales] = useState([]);

  // Modal para cerrar incidencia
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState(null);
  const [resolucionTexto, setResolucionTexto] = useState('');
  const [cerrandoIncidencia, setCerrandoIncidencia] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [exitoIncidencia, setExitoIncidencia] = useState('');

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

  const cargarIncidencias = async () => {
    setCargandoIncidencias(true);
    try {
      const data = await api.incidencias.listar(
        filtroSede ? Number(filtroSede) : undefined,
        filtroEstado || undefined
      );
      setIncidencias(data || []);
    } catch (err) {
      console.warn('Error al cargar incidencias Hermes:', err);
    } finally {
      setCargandoIncidencias(false);
    }
  };

  const cargarSucursales = async () => {
    try {
      const list = await api.sucursales.listar();
      setSucursales(list || []);
    } catch (err) {
      console.warn('Error al cargar sucursales:', err);
    }
  };

  useEffect(() => {
    cargarMetricas();
    cargarSucursales();

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

  useEffect(() => {
    cargarIncidencias();
  }, [filtroSede, filtroEstado]);

  const handleCerrarIncidencia = async (e) => {
    e.preventDefault();
    if (!resolucionTexto.trim()) {
      setErrorModal('Debe ingresar una resolución escrita para cerrar la incidencia.');
      return;
    }

    setCerrandoIncidencia(true);
    setErrorModal('');
    try {
      await api.incidencias.cerrar(incidenciaSeleccionada.id, resolucionTexto.trim());
      setExitoIncidencia(`Incidencia #${incidenciaSeleccionada.id} cerrada satisfactoriamente.`);
      setIncidenciaSeleccionada(null);
      setResolucionTexto('');
      cargarIncidencias();
      cargarMetricas();
    } catch (err) {
      setErrorModal(err.message || 'Error al cerrar la incidencia.');
    } finally {
      setCerrandoIncidencia(false);
    }
  };

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
            Supervisión consolidada de colocación, recaudación e incidencias Hermes · {usuario?.nombre || 'Gerente General'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onIrAUsuarios && (
            <button
              type="button"
              onClick={onIrAUsuarios}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer shadow-xs"
            >
              <span>👥</span>
              Administrar usuarios
            </button>
          )}
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

      {exitoIncidencia && (
        <div className="mb-6 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <span>{exitoIncidencia}</span>
          <button
            type="button"
            onClick={() => setExitoIncidencia('')}
            className="text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
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
              <span className="text-xl font-bold tracking-tight text-[#2A2220]">
                {panelData.totalPrestamosActivos}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
              <span className="block text-[11px] font-medium text-emerald-700 uppercase tracking-wider mb-1">
                Vigentes (Al día)
              </span>
              <span className="text-xl font-bold tracking-tight text-emerald-700">
                {panelData.totalPrestamosVigentes}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
              <span className="block text-[11px] font-medium text-amber-700 uppercase tracking-wider mb-1">
                Morosos
              </span>
              <span className="text-xl font-bold tracking-tight text-amber-700">
                {panelData.totalPrestamosMorosos}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
              <span className="block text-[11px] font-medium text-red-700 uppercase tracking-wider mb-1">
                Extrajudiciales
              </span>
              <span className="text-xl font-bold tracking-tight text-red-700">
                {panelData.totalPrestamosExtrajudiciales}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4 col-span-2 md:col-span-1">
              <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
                Monto recaudado
              </span>
              <span className="text-lg font-bold tracking-tight text-[#2A2220]">
                {formatoMoneda(panelData.totalMontoCobrado)}
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECCIÓN M4: INCIDENCIAS DE REMESAS HERMES               */}
          {/* ======================================================== */}
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 mb-8 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E3D3C2]/40 gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#2A2220]">
                    Incidencias de Remesas Hermes (Transporte de Caudales)
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    M4 Hermes
                  </span>
                </div>
                <p className="text-xs text-[#6E625B] mt-0.5">
                  Supervisión y resolución escrita de diferencias o billetes observados recibidos en sucursales
                </p>
              </div>

              {/* Filtros por Sede y Estado */}
              <div className="flex items-center gap-2">
                <select
                  value={filtroSede}
                  onChange={(e) => setFiltroSede(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] cursor-pointer"
                >
                  <option value="">Todas las sedes</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>

                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] cursor-pointer"
                >
                  <option value="ABIERTA">Solo Abiertas</option>
                  <option value="CERRADA">Solo Cerradas</option>
                  <option value="">Todas</option>
                </select>

                <button
                  type="button"
                  onClick={cargarIncidencias}
                  className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-[#E3D3C2] hover:bg-[#FBF6F0] text-[#2A2220] transition cursor-pointer"
                >
                  Refrescar
                </button>
              </div>
            </div>

            {/* Listado de incidencias */}
            {cargandoIncidencias ? (
              <div className="py-6 text-center text-xs text-[#6E625B]">Cargando incidencias...</div>
            ) : incidencias.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#6E625B] italic bg-[#FBF6F0]/50 rounded-lg">
                No se registran incidencias {filtroEstado === 'ABIERTA' ? 'abiertas' : ''} para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FBF6F0] text-[#6E625B] font-medium border-b border-[#E3D3C2]">
                      <th className="py-2.5 px-3">Fecha / ID</th>
                      <th className="py-2.5 px-3">Sede</th>
                      <th className="py-2.5 px-3">Asesor que reporta</th>
                      <th className="py-2.5 px-3 text-end">Esperado</th>
                      <th className="py-2.5 px-3 text-end">Apto (Caja)</th>
                      <th className="py-2.5 px-3 text-end">Observado</th>
                      <th className="py-2.5 px-3">Motivo reportado</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3D3C2]/40">
                    {incidencias.map((inc) => (
                      <tr key={inc.id} className="hover:bg-[#FFF4E6]/40 transition">
                        <td className="py-3 px-3 font-mono font-medium text-[#2A2220]">
                          #{inc.id} <span className="text-[#6E625B] text-[11px] block">{inc.fecha}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#2A2220]">
                          {inc.sucursalNombre}
                        </td>
                        <td className="py-3 px-3 text-[#2A2220]">
                          {inc.usuarioReporta || '-'}
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-[#6E625B]">
                          {formatoMoneda(inc.montoEsperado)}
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-emerald-700 font-bold">
                          {formatoMoneda(inc.montoApto)}
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-amber-700 font-bold">
                          {formatoMoneda(inc.montoObservado)}
                        </td>
                        <td className="py-3 px-3 text-[#2A2220] max-w-xs break-words">
                          <span className="italic">"{inc.motivo}"</span>
                          {inc.resolucion && (
                            <div className="mt-1 text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                              <strong>Resolución:</strong> {inc.resolucion}
                              <span className="block text-[10px] text-emerald-600 mt-0.5">
                                Por: {inc.usuarioCierre}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {inc.estado === 'ABIERTA' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              ABIERTA
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              CERRADA
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {inc.estado === 'ABIERTA' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setIncidenciaSeleccionada(inc);
                                setResolucionTexto('');
                                setErrorModal('');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer shadow-2xs whitespace-nowrap"
                            >
                              Cerrar incidencia
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#6E625B] italic">Inmutable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal para Cerrar Incidencia con Resolución Escrita */}
          {incidenciaSeleccionada && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 max-w-md w-full shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-[#E3D3C2]/40 mb-4">
                  <h3 className="text-sm font-bold text-[#2A2220]">
                    Cerrar Incidencia #{incidenciaSeleccionada.id} · {incidenciaSeleccionada.sucursalNombre}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIncidenciaSeleccionada(null)}
                    className="text-[#6E625B] hover:text-[#2A2220] font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-4 p-3 bg-[#FBF6F0] rounded-lg text-xs space-y-1">
                  <div><strong>Monto esperado:</strong> {formatoMoneda(incidenciaSeleccionada.montoEsperado)}</div>
                  <div><strong>Monto apto:</strong> {formatoMoneda(incidenciaSeleccionada.montoApto)}</div>
                  <div><strong>Monto observado:</strong> {formatoMoneda(incidenciaSeleccionada.montoObservado)}</div>
                  <div><strong>Motivo del asesor:</strong> {incidenciaSeleccionada.motivo}</div>
                </div>

                {errorModal && (
                  <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {errorModal}
                  </div>
                )}

                <form onSubmit={handleCerrarIncidencia} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#2A2220] mb-1">
                      Resolución escrita del Gerente General *
                    </label>
                    <textarea
                      rows={3}
                      value={resolucionTexto}
                      onChange={(e) => setResolucionTexto(e.target.value)}
                      placeholder="Ingrese la resolución escrita detallada para el cierre de la incidencia..."
                      required
                      className="w-full p-2.5 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
                    />
                    <span className="text-[10px] text-[#6E625B] mt-0.5 block">
                      Una vez cerrada, la resolución queda sellada y no podrá modificarse.
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIncidenciaSeleccionada(null)}
                      disabled={cerrandoIncidencia}
                      className="px-3.5 py-1.5 text-xs rounded-lg border border-[#E3D3C2] text-[#2A2220] hover:bg-[#FBF6F0] transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cerrandoIncidencia}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer disabled:opacity-50"
                    >
                      {cerrandoIncidencia ? 'Sellando...' : 'Confirmar cierre'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabla de Rendimiento por Sucursal */}
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 shadow-2xs">
            <h2 className="text-sm font-semibold text-[#2A2220] mb-4">
              Rendimiento por sucursal
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FBF6F0] text-[#6E625B] font-medium border-b border-[#E3D3C2]">
                    <th className="py-2.5 px-4">Sucursal</th>
                    <th className="py-2.5 px-4 text-center">Total préstamos</th>
                    <th className="py-2.5 px-4 text-center">Vigentes</th>
                    <th className="py-2.5 px-4 text-center">Morosos</th>
                    <th className="py-2.5 px-4 text-center">Extrajudiciales</th>
                    <th className="py-2.5 px-4 text-end">Monto total cobrado</th>
                    <th className="py-2.5 px-4 text-end">Intereses cobrados</th>
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
