import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function PanelGerente({ usuario, onIrAUsuarios }) {
  const [panelData, setPanelData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Sucursales y Filtro Global por Sede
  const [sucursales, setSucursales] = useState([]);
  const [sedeFiltro, setSedeFiltro] = useState(''); // '' = Todas las sedes (Consolidado General)

  // Préstamos y Padrón de Clientes Prestatarios
  const [prestamos, setPrestamos] = useState([]);
  const [cargandoPrestamos, setCargandoPrestamos] = useState(false);
  const [filtroEstadoCredito, setFiltroEstadoCredito] = useState('TODOS');
  const [busquedaPrestatario, setBusquedaPrestatario] = useState('');
  const [prestamoModal, setPrestamoModal] = useState(null);

  // Incidencias Hermes
  const [incidencias, setIncidencias] = useState([]);
  const [cargandoIncidencias, setCargandoIncidencias] = useState(false);
  const [filtroSedeHermes, setFiltroSedeHermes] = useState('');
  const [filtroEstadoHermes, setFiltroEstadoHermes] = useState('ABIERTA');

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

  const cargarPrestamos = async () => {
    setCargandoPrestamos(true);
    try {
      const lista = await api.prestamo.listarRecientes();
      setPrestamos(lista || []);
    } catch (err) {
      console.warn('Error al cargar lista de préstamos:', err);
    } finally {
      setCargandoPrestamos(false);
    }
  };

  const cargarIncidencias = async () => {
    setCargandoIncidencias(true);
    try {
      const data = await api.incidencias.listar(
        filtroSedeHermes ? Number(filtroSedeHermes) : undefined,
        filtroEstadoHermes || undefined
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
    cargarPrestamos();

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
  }, [filtroSedeHermes, filtroEstadoHermes]);

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
    if (val === null || val === undefined || isNaN(Number(val))) return 'S/ 0.00';
    return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatearFecha = (str) => {
    if (!str) return '—';
    const partes = String(str).split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return str;
  };

  // Cálculo de Métricas Dinámicas según Filtro de Sede
  const sucursalActiva = sedeFiltro
    ? panelData?.sucursales?.find((s) => String(s.sucursalId) === String(sedeFiltro))
    : null;

  const kpiMontoColocado = sucursalActiva
    ? (sucursalActiva.montoTotalColocado || 0)
    : (panelData?.totalMontoColocado || 0);

  const kpiCantidadClientes = sucursalActiva
    ? (sucursalActiva.cantidadClientes || 0)
    : (panelData?.totalClientes || 0);

  const kpiPrestamosActivos = sucursalActiva
    ? (sucursalActiva.prestamosActivos || 0)
    : (panelData?.totalPrestamosActivos || 0);

  const kpiPrestamosVigentes = sucursalActiva
    ? (sucursalActiva.prestamosVigentes || 0)
    : (panelData?.totalPrestamosVigentes || 0);

  const kpiPrestamosMorosos = sucursalActiva
    ? (sucursalActiva.prestamosMorosos || 0)
    : (panelData?.totalPrestamosMorosos || 0);

  const kpiPrestamosExtrajudiciales = sucursalActiva
    ? (sucursalActiva.prestamosExtrajudiciales || 0)
    : (panelData?.totalPrestamosExtrajudiciales || 0);

  const kpiMontoRecaudado = sucursalActiva
    ? (sucursalActiva.montoTotalCobrado || 0)
    : (panelData?.totalMontoCobrado || 0);

  // Filtrado de Préstamos para el Padrón de Prestatarios
  const prestamosDeLaSede = prestamos.filter((p) => {
    if (!sedeFiltro) return true;
    return String(p.sucursalId) === String(sedeFiltro);
  });

  const conteoTodos = prestamosDeLaSede.length;
  const conteoVigentes = prestamosDeLaSede.filter((p) => p.estado === 'VIGENTE').length;
  const conteoMorosos = prestamosDeLaSede.filter((p) => p.estado === 'MOROSO').length;
  const conteoJudiciales = prestamosDeLaSede.filter((p) => p.estado === 'EXTRAJUDICIAL').length;
  const conteoCancelados = prestamosDeLaSede.filter((p) => p.estado === 'CANCELADO').length;

  const prestamosFiltrados = prestamosDeLaSede.filter((p) => {
    if (filtroEstadoCredito !== 'TODOS' && p.estado !== filtroEstadoCredito) {
      return false;
    }
    if (busquedaPrestatario.trim()) {
      const q = busquedaPrestatario.toLowerCase().trim();
      const nom = (p.clienteNombre || '').toLowerCase();
      const doc = (p.clienteDni || '').toLowerCase();
      const num = (p.numeroContrato || '').toLowerCase();
      if (!nom.includes(q) && !doc.includes(q) && !num.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Encabezado y Barra de Filtro Global por Sede */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2A2220]">Panel de control gerencial</h1>
          <p className="text-xs text-[#6E625B] mt-0.5">
            Supervisión institucional consolidada y por agencia · {usuario?.nombre || 'Gerente General'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Sede Global */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border-2 border-[#9C4A2B] shadow-2xs">
            <span className="text-xs font-bold text-[#9C4A2B]">🏢 Sede:</span>
            <select
              value={sedeFiltro}
              onChange={(e) => {
                setSedeFiltro(e.target.value);
                setFiltroSedeHermes(e.target.value);
              }}
              className="text-xs font-bold text-[#2A2220] bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Todas las sedes (Consolidado General)</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  Agencia {s.nombre}
                </option>
              ))}
            </select>
          </div>

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

          <button
            type="button"
            onClick={() => {
              cargarMetricas();
              cargarPrestamos();
              cargarIncidencias();
            }}
            title="Recargar datos"
            className="p-1.5 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#6E625B] hover:text-[#2A2220] hover:bg-[#FBF6F0] transition cursor-pointer"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Indicador de Filtro de Sede Activo */}
      {sedeFiltro && sucursalActiva && (
        <div className="mb-5 p-3 rounded-xl bg-[#FFF4E6] border border-[#E0B25A] flex items-center justify-between text-xs text-[#823B20]">
          <div className="flex items-center gap-2">
            <span className="text-base">📍</span>
            <span>
              Filtrado activo por <strong>Agencia {sucursalActiva.sucursalNombre}</strong>. Visualizando métricas y créditos correspondientes a esta sede.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSedeFiltro('');
              setFiltroSedeHermes('');
            }}
            className="text-xs font-bold underline hover:text-[#9C4A2B] cursor-pointer ml-3"
          >
            Ver consolidado general
          </button>
        </div>
      )}

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
          {/* ======================================================== */}
          {/* TARJETAS DE MÉTRICAS KPI (Dinero Colocado, Clientes, Estados) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {/* 1. Dinero Total Colocado */}
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4 shadow-2xs">
              <span className="block text-[11px] font-bold text-[#9C4A2B] uppercase tracking-wider mb-1">
                Dinero colocado
              </span>
              <span className="text-lg font-bold tracking-tight text-[#2A2220] block">
                {formatoMoneda(kpiMontoColocado)}
              </span>
              <span className="text-[10px] text-[#6E625B] mt-0.5 block">Capital total desembolsado</span>
            </div>

            {/* 2. Cantidad de Clientes Prestatarios */}
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4 shadow-2xs">
              <span className="block text-[11px] font-bold text-[#6E625B] uppercase tracking-wider mb-1">
                Clientes prestados
              </span>
              <span className="text-xl font-bold tracking-tight text-[#2A2220] block">
                {kpiCantidadClientes}
              </span>
              <span className="text-[10px] text-[#6E625B] mt-0.5 block">Prestatarios únicos</span>
            </div>

            {/* 3. Préstamos Vigentes (Al día) */}
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4 shadow-2xs">
              <span className="block text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                Vigentes (Al día)
              </span>
              <span className="text-xl font-bold tracking-tight text-emerald-700 block">
                {kpiPrestamosVigentes}
              </span>
              <span className="text-[10px] text-emerald-800 mt-0.5 block">Sin atraso de cuotas</span>
            </div>

            {/* 4. Préstamos Morosos */}
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4 shadow-2xs">
              <span className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                Morosos
              </span>
              <span className="text-xl font-bold tracking-tight text-amber-700 block">
                {kpiPrestamosMorosos}
              </span>
              <span className="text-[10px] text-amber-800 mt-0.5 block">1 a 364 días mora</span>
            </div>

            {/* 5. Préstamos Judiciales (Extrajudiciales) */}
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4 shadow-2xs">
              <span className="block text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">
                Judiciales
              </span>
              <span className="text-xl font-bold tracking-tight text-red-700 block">
                {kpiPrestamosExtrajudiciales}
              </span>
              <span className="text-[10px] text-red-800 mt-0.5 block">≥ 365 días en cobro</span>
            </div>

            {/* 6. Monto Total Recaudado */}
            <div className="bg-white rounded-xl border border-[#E3D3C2] p-4 shadow-2xs">
              <span className="block text-[11px] font-bold text-[#6E625B] uppercase tracking-wider mb-1">
                Monto cobrado
              </span>
              <span className="text-lg font-bold tracking-tight text-[#2A2220] block">
                {formatoMoneda(kpiMontoRecaudado)}
              </span>
              <span className="text-[10px] text-[#6E625B] mt-0.5 block">Capital + intereses</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECCIÓN: PADRÓN DE CLIENTES PRESTATARIOS Y ESTADO CRÉDITO */}
          {/* ======================================================== */}
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 mb-8 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E3D3C2]/40 gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#2A2220] flex items-center gap-2">
                  <span>Padrón de Clientes Prestatarios y Estado de Préstamos</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F1E4D6] text-[#2A2220] font-mono">
                    {prestamosFiltrados.length}
                  </span>
                </h2>
                <p className="text-xs text-[#6E625B] mt-0.5">
                  Consulta nominal de prestatarios, colocación de fondos y situación crediticia (Vigentes, Morosos y Judiciales)
                </p>
              </div>

              {/* Buscador de Prestatario */}
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Buscar por DNI, RUC o Nombre..."
                  value={busquedaPrestatario}
                  onChange={(e) => setBusquedaPrestatario(e.target.value)}
                  className="w-full h-8 px-3 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] placeholder:text-[#6E625B]/60 focus:outline-none focus:border-[#9C4A2B]"
                />
              </div>
            </div>

            {/* Pestañas de Filtro por Estado de Préstamo */}
            <div className="flex items-center gap-1.5 flex-wrap pb-4">
              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('TODOS')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'TODOS'
                    ? 'bg-[#9C4A2B] text-white shadow-xs'
                    : 'bg-[#FBF6F0] text-[#6E625B] hover:bg-[#E3D3C2]'
                }`}
              >
                <span>Todos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{conteoTodos}</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('VIGENTE')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'VIGENTE'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span>● Vigentes (Al día)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                  {conteoVigentes}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('MOROSO')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'MOROSO'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <span>● Morosos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-bold">
                  {conteoMorosos}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('EXTRAJUDICIAL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'EXTRAJUDICIAL'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                <span>● Judiciales (Extrajudicial)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-200 text-red-900 font-bold">
                  {conteoJudiciales}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('CANCELADO')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'CANCELADO'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>✓ Cancelados</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-bold">
                  {conteoCancelados}
                </span>
              </button>
            </div>

            {/* Tabla de Clientes Prestatarios */}
            {cargandoPrestamos ? (
              <div className="py-8 text-center text-xs text-[#6E625B]">Cargando padrón de prestatarios...</div>
            ) : prestamosFiltrados.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#6E625B] bg-[#FBF6F0] rounded-lg">
                No se registraron préstamos que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FBF6F0] text-[#6E625B] font-medium border-b border-[#E3D3C2]">
                      <th className="py-2.5 px-3">Cliente / Prestatario</th>
                      <th className="py-2.5 px-3">Documento</th>
                      <th className="py-2.5 px-3">Sede</th>
                      <th className="py-2.5 px-3 text-end">Monto Colocado</th>
                      <th className="py-2.5 px-3 text-end">Saldo Pendiente</th>
                      <th className="py-2.5 px-3 text-center">Progreso Cuotas</th>
                      <th className="py-2.5 px-3">Desembolso</th>
                      <th className="py-2.5 px-3 text-center">Estado del Crédito</th>
                      <th className="py-2.5 px-3 text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3D3C2]/40">
                    {prestamosFiltrados.map((p) => {
                      const esJuridica = (p.clienteDni || '').length === 11;
                      return (
                        <tr key={p.id} className="hover:bg-[#FFF4E6]/40 transition">
                          <td className="py-3 px-3 font-semibold text-[#2A2220]">
                            {p.clienteNombre}
                          </td>
                          <td className="py-3 px-3 font-mono text-[#2A2220]">
                            <div className="flex items-center gap-1.5">
                              <span>{p.clienteDni}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  esJuridica ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {esJuridica ? 'RUC' : 'DNI'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#2A2220]">
                            {p.sucursalNombre || '—'}
                          </td>
                          <td className="py-3 px-3 text-end font-mono font-bold text-emerald-800">
                            {formatoMoneda(p.capital)}
                          </td>
                          <td className="py-3 px-3 text-end font-mono text-[#2A2220]">
                            {formatoMoneda(p.saldoPendiente || p.capital)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[#6E625B]">
                            <span className="font-semibold text-[#2A2220]">{p.cuotasPagadas || 0}</span> / {p.cuotasTotales || p.plazoMeses}
                          </td>
                          <td className="py-3 px-3 text-[#6E625B]">
                            {formatearFecha(p.fechaPrestamo)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {p.estado === 'VIGENTE' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ● Vigente (Al día)
                              </span>
                            )}
                            {p.estado === 'MOROSO' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                                ● Moroso (En mora)
                              </span>
                            )}
                            {p.estado === 'EXTRAJUDICIAL' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                ● Judicial (Extrajudicial)
                              </span>
                            )}
                            {p.estado === 'CANCELADO' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                ✓ Cancelado
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPrestamoModal(p)}
                              className="px-2 py-1 text-[11px] font-medium rounded border border-[#E3D3C2] text-[#9C4A2B] hover:bg-[#9C4A2B] hover:text-white transition cursor-pointer"
                            >
                              Cronograma
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

              {/* Filtros por Sede y Estado de Incidencia */}
              <div className="flex items-center gap-2">
                <select
                  value={filtroSedeHermes}
                  onChange={(e) => setFiltroSedeHermes(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] cursor-pointer"
                >
                  <option value="">Todas las sedes</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroEstadoHermes}
                  onChange={(e) => setFiltroEstadoHermes(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] cursor-pointer"
                >
                  <option value="">Todos los estados</option>
                  <option value="ABIERTA">Solo ABIERTAS</option>
                  <option value="CERRADA">Solo CERRADAS</option>
                </select>

                <button
                  type="button"
                  onClick={cargarIncidencias}
                  className="h-8 px-2.5 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#6E625B] hover:text-[#2A2220] transition cursor-pointer"
                >
                  ↻
                </button>
              </div>
            </div>

            {/* Listado de incidencias */}
            {cargandoIncidencias ? (
              <div className="py-6 text-center text-xs text-[#6E625B]">Cargando incidencias...</div>
            ) : incidencias.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#6E625B] bg-[#FBF6F0] rounded-lg">
                No se registran incidencias {filtroEstadoHermes === 'ABIERTA' ? 'abiertas' : ''} para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FBF6F0] text-[#6E625B] font-medium border-b border-[#E3D3C2]">
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Sucursal</th>
                      <th className="py-2.5 px-3">Reportado por</th>
                      <th className="py-2.5 px-3 text-end">Esperado</th>
                      <th className="py-2.5 px-3 text-end">Apto (Caja)</th>
                      <th className="py-2.5 px-3 text-end">Observado</th>
                      <th className="py-2.5 px-3">Motivo del asesor</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3D3C2]/40">
                    {incidencias.map((inc) => (
                      <tr key={inc.id} className="hover:bg-[#FFF4E6]/40 transition">
                        <td className="py-3 px-3 font-mono">{formatearFecha(inc.fecha)}</td>
                        <td className="py-3 px-3 font-medium text-[#2A2220]">{inc.sucursalNombre}</td>
                        <td className="py-3 px-3 text-[#6E625B]">{inc.usuarioReportaNombre}</td>
                        <td className="py-3 px-3 text-end font-mono">{formatoMoneda(inc.montoEsperado)}</td>
                        <td className="py-3 px-3 text-end font-mono text-emerald-700 font-medium">
                          {formatoMoneda(inc.montoApto)}
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-amber-800 font-medium">
                          {formatoMoneda(inc.montoObservado)}
                        </td>
                        <td className="py-3 px-3 text-[#2A2220] max-w-xs truncate" title={inc.motivo}>
                          {inc.motivo}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {inc.estado === 'ABIERTA' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                              ● ABIERTA
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✓ CERRADA
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
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer"
                            >
                              Cerrar Incidencia
                            </button>
                          ) : (
                            <span
                              className="text-[11px] text-[#6E625B] italic cursor-help"
                              title={`Resolución: ${inc.resolucion || 'Sin texto'} (Cerrada por ${inc.usuarioCierreNombre || 'Gerente'})`}
                            >
                              Ver resolución
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* TABLA COMPARATIVA DE RENDIMIENTO POR SUCURSAL            */}
          {/* ======================================================== */}
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 shadow-2xs">
            <h2 className="text-sm font-semibold text-[#2A2220] mb-4">
              Rendimiento comparativo por sucursal
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FBF6F0] text-[#6E625B] font-medium border-b border-[#E3D3C2]">
                    <th className="py-2.5 px-4">Sucursal</th>
                    <th className="py-2.5 px-4 text-end">Dinero Colocado</th>
                    <th className="py-2.5 px-4 text-center">Clientes</th>
                    <th className="py-2.5 px-4 text-center">Préstamos activos</th>
                    <th className="py-2.5 px-4 text-center">Vigentes</th>
                    <th className="py-2.5 px-4 text-center">Morosos</th>
                    <th className="py-2.5 px-4 text-center">Judiciales</th>
                    <th className="py-2.5 px-4 text-end">Monto cobrado</th>
                    <th className="py-2.5 px-4 text-end">Intereses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3D3C2]/40">
                  {panelData.sucursales &&
                    panelData.sucursales.map((suc) => (
                      <tr
                        key={suc.sucursalId}
                        onClick={() => setSedeFiltro(String(suc.sucursalId))}
                        className={`hover:bg-[#FFF4E6]/60 transition cursor-pointer ${
                          String(sedeFiltro) === String(suc.sucursalId) ? 'bg-[#FFF4E6] font-semibold' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-[#2A2220]">
                          Agencia {suc.sucursalNombre}
                        </td>
                        <td className="py-3 px-4 text-end font-mono font-bold text-emerald-800">
                          {formatoMoneda(suc.montoTotalColocado)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[#2A2220]">
                          {suc.cantidadClientes || 0}
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
                    <td className="py-3 px-4 text-end font-mono text-emerald-900 font-bold">
                      {formatoMoneda(panelData.totalMontoColocado)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{panelData.totalClientes || 0}</td>
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

      {/* ======================================================== */}
      {/* MODAL: RESOLUCIÓN Y CIERRE DE INCIDENCIA HERMES          */}
      {/* ======================================================== */}
      {incidenciaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3D3C2]/40 mb-3">
              <h3 className="text-sm font-bold text-[#2A2220]">
                Cerrar Incidencia #{incidenciaSeleccionada.id} · {incidenciaSeleccionada.sucursalNombre}
              </h3>
              <button
                type="button"
                onClick={() => setIncidenciaSeleccionada(null)}
                className="text-[#6E625B] hover:text-[#2A2220] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs mb-4 p-3 bg-[#FBF6F0] rounded-lg">
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

            <form onSubmit={handleCerrarIncidencia} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#2A2220] mb-1">
                  Resolución escrita obligatoria del Gerente *
                </label>
                <textarea
                  rows={3}
                  value={resolucionTexto}
                  onChange={(e) => setResolucionTexto(e.target.value)}
                  placeholder="Ingrese la resolución escrita detallada para el cierre de la incidencia..."
                  required
                  className="w-full p-2.5 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
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

      {/* ======================================================== */}
      {/* MODAL: CRONOGRAMA DE CUOTAS DEL CRÉDITO CONSULTADO       */}
      {/* ======================================================== */}
      {prestamoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3D3C2]/40 mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#2A2220]">
                  Detalle del Crédito · Contrato {prestamoModal.numeroContrato || '#' + prestamoModal.id}
                </h3>
                <p className="text-xs text-[#6E625B]">
                  Prestatario: <strong>{prestamoModal.clienteNombre}</strong> ({prestamoModal.clienteDni}) · Agencia {prestamoModal.sucursalNombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrestamoModal(null)}
                className="text-[#6E625B] hover:text-[#2A2220] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#FBF6F0] rounded-lg text-xs mb-4 shrink-0">
              <div>
                <span className="text-[#6E625B] block text-[10px] uppercase">Monto Colocado</span>
                <span className="font-bold text-emerald-800 text-sm">{formatoMoneda(prestamoModal.capital)}</span>
              </div>
              <div>
                <span className="text-[#6E625B] block text-[10px] uppercase">Saldo Pendiente</span>
                <span className="font-bold text-[#2A2220] text-sm">{formatoMoneda(prestamoModal.saldoPendiente || prestamoModal.capital)}</span>
              </div>
              <div>
                <span className="text-[#6E625B] block text-[10px] uppercase">Plazo</span>
                <span className="font-semibold text-[#2A2220]">{prestamoModal.plazoMeses} meses</span>
              </div>
              <div>
                <span className="text-[#6E625B] block text-[10px] uppercase">Estado</span>
                <span className="font-bold text-[#2A2220]">{prestamoModal.estado}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FBF6F0] text-[#6E625B] font-medium border-b border-[#E3D3C2]">
                    <th className="py-2 px-3 text-center">N° Cuota</th>
                    <th className="py-2 px-3">Vencimiento</th>
                    <th className="py-2 px-3 text-end">Capital</th>
                    <th className="py-2 px-3 text-end">Interés</th>
                    <th className="py-2 px-3 text-end">Monto Cuota</th>
                    <th className="py-2 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3D3C2]/40">
                  {prestamoModal.cuotas && prestamoModal.cuotas.length > 0 ? (
                    prestamoModal.cuotas.map((c) => (
                      <tr key={c.id || c.numero} className="hover:bg-[#FFF4E6]/40 transition">
                        <td className="py-2 px-3 text-center font-mono">{c.numero}</td>
                        <td className="py-2 px-3 font-mono">{formatearFecha(c.fechaVencimiento)}</td>
                        <td className="py-2 px-3 text-end font-mono">{formatoMoneda(c.capital)}</td>
                        <td className="py-2 px-3 text-end font-mono text-[#6E625B]">{formatoMoneda(c.interes)}</td>
                        <td className="py-2 px-3 text-end font-mono font-semibold text-[#2A2220]">{formatoMoneda(c.monto)}</td>
                        <td className="py-2 px-3 text-center">
                          {c.estado === 'PAGADA' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800">
                              ✓ Pagada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-[#6E625B]">
                        No hay cronograma disponible para este crédito.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-[#E3D3C2]/40 mt-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPrestamoModal(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
