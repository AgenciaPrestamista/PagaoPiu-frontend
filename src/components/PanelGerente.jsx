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
          <h1 className="text-xl font-bold tracking-tight text-[#1F1B1A]">Panel de Control Gerencial</h1>
          <p className="text-xs text-[#655E5A] mt-0.5">
            Supervisión institucional consolidada y por agencia · {usuario?.nombre || 'Gerente General'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Sede Global */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-stone-300 shadow-xs">
            <i className="bi bi-building text-xs text-[#752F17]"></i>
            <span className="text-xs font-semibold text-stone-500">Sede:</span>
            <select
              value={sedeFiltro}
              onChange={(e) => {
                setSedeFiltro(e.target.value);
                setFiltroSedeHermes(e.target.value);
              }}
              className="text-xs font-bold text-[#1F1B1A] bg-transparent focus:outline-none cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#752F17] hover:bg-[#5C220E] text-white transition cursor-pointer shadow-xs"
            >
              <i className="bi bi-people-fill text-xs"></i>
              <span>Personal y Cuentas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              cargarMetricas();
              cargarPrestamos();
              cargarIncidencias();
            }}
            title="Actualizar datos"
            className="p-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer shadow-xs flex items-center justify-center"
          >
            <i className="bi bi-arrow-clockwise text-sm"></i>
          </button>
        </div>
      </div>

      {/* Indicador de Filtro de Sede Activo */}
      {sedeFiltro && sucursalActiva && (
        <div className="mb-5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <i className="bi bi-geo-alt-fill text-[#752F17] text-sm"></i>
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
            className="text-xs font-bold underline hover:text-[#752F17] cursor-pointer ml-3"
          >
            Ver consolidado general
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill text-rose-600"></i>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={cargarMetricas}
            className="font-medium underline hover:text-rose-900 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {exitoIncidencia && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bi bi-check-circle-fill text-emerald-600"></i>
            <span>{exitoIncidencia}</span>
          </div>
          <button
            type="button"
            onClick={() => setExitoIncidencia('')}
            className="text-emerald-900 font-bold ml-2 cursor-pointer p-1"
          >
            <i className="bi bi-x-lg text-xs"></i>
          </button>
        </div>
      )}

      {cargando && !panelData && (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center my-6">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-[#752F17] rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs text-stone-500">Cargando métricas consolidadas...</p>
        </div>
      )}

      {panelData && (
        <>
          {/* ======================================================== */}
          {/* TARJETAS DE MÉTRICAS KPI (Dinero Colocado, Clientes, Estados) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {/* 1. Dinero Total Colocado */}
            <div className="kpi-card bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Dinero colocado
                  </span>
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <i className="bi bi-cash-stack text-xs"></i>
                  </div>
                </div>
                <span className="text-xl font-bold tracking-tight text-stone-900 block font-mono cifra">
                  {formatoMoneda(kpiMontoColocado)}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">Capital desembolsado</span>
            </div>

            {/* 2. Cantidad de Clientes Prestatarios */}
            <div className="kpi-card bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Clientes prestados
                  </span>
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
                    <i className="bi bi-person-check text-xs"></i>
                  </div>
                </div>
                <span className="text-xl font-bold tracking-tight text-stone-900 block font-mono cifra">
                  {kpiCantidadClientes}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">Prestatarios únicos</span>
            </div>

            {/* 3. Préstamos Vigentes (Al día) */}
            <div className="kpi-card bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Vigentes (Al día)
                  </span>
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <i className="bi bi-check-circle text-xs"></i>
                  </div>
                </div>
                <span className="text-xl font-bold tracking-tight text-emerald-700 block font-mono cifra">
                  {kpiPrestamosVigentes}
                </span>
              </div>
              <span className="text-[10px] text-emerald-800 mt-1 block">Sin atraso de cuotas</span>
            </div>

            {/* 4. Préstamos Morosos */}
            <div className="kpi-card bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                    Morosos
                  </span>
                  <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                    <i className="bi bi-exclamation-triangle text-xs"></i>
                  </div>
                </div>
                <span className="text-xl font-bold tracking-tight text-amber-700 block font-mono cifra">
                  {kpiPrestamosMorosos}
                </span>
              </div>
              <span className="text-[10px] text-amber-800 mt-1 block">1 a 364 días de mora</span>
            </div>

            {/* 5. Préstamos Judiciales (Extrajudiciales) */}
            <div className="kpi-card bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                    Judiciales
                  </span>
                  <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center">
                    <i className="bi bi-shield-exclamation text-xs"></i>
                  </div>
                </div>
                <span className="text-xl font-bold tracking-tight text-rose-700 block font-mono cifra">
                  {kpiPrestamosExtrajudiciales}
                </span>
              </div>
              <span className="text-[10px] text-rose-800 mt-1 block">≥ 365 días en cobro</span>
            </div>

            {/* 6. Monto Total Recaudado */}
            <div className="kpi-card bg-white rounded-xl border border-stone-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Monto cobrado
                  </span>
                  <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <i className="bi bi-graph-up-arrow text-xs"></i>
                  </div>
                </div>
                <span className="text-xl font-bold tracking-tight text-stone-900 block font-mono cifra">
                  {formatoMoneda(kpiMontoRecaudado)}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">Capital + intereses</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECCIÓN: PADRÓN DE CLIENTES PRESTATARIOS Y ESTADO CRÉDITO */}
          {/* ======================================================== */}
          <div className="bg-white rounded-xl border border-stone-200/90 p-6 mb-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#1F1B1A] flex items-center gap-2">
                  <span>Padrón de Clientes Prestatarios y Situación Crediticia</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono font-medium">
                    {prestamosFiltrados.length}
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Consulta nominal de prestatarios, montos colocados y estado del crédito (Vigentes, Morosos y Judiciales)
                </p>
              </div>

              {/* Buscador de Prestatario con Icono */}
              <div className="w-full sm:w-72 relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                  <i className="bi bi-search text-xs"></i>
                </span>
                <input
                  type="text"
                  placeholder="Buscar por DNI, RUC o Nombre..."
                  value={busquedaPrestatario}
                  onChange={(e) => setBusquedaPrestatario(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-stone-300 bg-stone-50/50 text-[#1F1B1A] placeholder:text-stone-400 focus:outline-none focus:border-[#752F17] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Pestañas de Filtro por Estado de Préstamo (Sin Emojis) */}
            <div className="flex items-center gap-1.5 flex-wrap pb-4">
              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('TODOS')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'TODOS'
                    ? 'bg-[#752F17] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <i className="bi bi-layers text-xs"></i>
                <span>Todos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">{conteoTodos}</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('VIGENTE')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'VIGENTE'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Vigentes (Al día)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 font-mono font-bold">
                  {conteoVigentes}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('MOROSO')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'MOROSO'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Morosos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-mono font-bold">
                  {conteoMorosos}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('EXTRAJUDICIAL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'EXTRAJUDICIAL'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Judiciales</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900 font-mono font-bold">
                  {conteoJudiciales}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoCredito('CANCELADO')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filtroEstadoCredito === 'CANCELADO'
                    ? 'bg-stone-700 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <i className="bi bi-check2-circle text-xs"></i>
                <span>Cancelados</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-800 font-mono font-bold">
                  {conteoCancelados}
                </span>
              </button>
            </div>

            {/* Tabla de Clientes Prestatarios */}
            {cargandoPrestamos ? (
              <div className="py-8 text-center text-xs text-stone-500">Cargando padrón de prestatarios...</div>
            ) : prestamosFiltrados.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-500 bg-stone-50 rounded-xl">
                No se registraron préstamos que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 text-stone-500 font-semibold border-b border-stone-200">
                      <th className="py-3 px-3">Cliente / Prestatario</th>
                      <th className="py-3 px-3">Documento</th>
                      <th className="py-3 px-3">Sede</th>
                      <th className="py-3 px-3 text-end">Monto Colocado</th>
                      <th className="py-3 px-3 text-end">Saldo Pendiente</th>
                      <th className="py-3 px-3 text-center">Progreso Cuotas</th>
                      <th className="py-3 px-3">Desembolso</th>
                      <th className="py-3 px-3 text-center">Estado del Crédito</th>
                      <th className="py-3 px-3 text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {prestamosFiltrados.map((p) => {
                      const esJuridica = (p.clienteDni || '').length === 11;
                      return (
                        <tr key={p.id} className="hover:bg-amber-50/30 transition">
                          <td className="py-3 px-3 font-semibold text-[#1F1B1A]">
                            {p.clienteNombre}
                          </td>
                          <td className="py-3 px-3 font-mono text-[#1F1B1A]">
                            <div className="flex items-center gap-1.5">
                              <span>{p.clienteDni}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  esJuridica ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/50' : 'bg-stone-100 text-stone-600 border border-stone-200/50'
                                }`}
                              >
                                {esJuridica ? 'RUC' : 'DNI'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#1F1B1A]">
                            {p.sucursalNombre || '—'}
                          </td>
                          <td className="py-3 px-3 text-end font-mono font-bold text-emerald-800">
                            {formatoMoneda(p.capital)}
                          </td>
                          <td className="py-3 px-3 text-end font-mono text-[#1F1B1A]">
                            {formatoMoneda(p.saldoPendiente || p.capital)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-stone-500">
                            <span className="font-semibold text-[#1F1B1A]">{p.cuotasPagadas || 0}</span> / {p.cuotasTotales || p.plazoMeses}
                          </td>
                          <td className="py-3 px-3 text-stone-500 font-mono">
                            {formatearFecha(p.fechaPrestamo)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {p.estado === 'VIGENTE' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Vigente
                              </span>
                            )}
                            {p.estado === 'MOROSO' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Moroso
                              </span>
                            )}
                            {p.estado === 'EXTRAJUDICIAL' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Judicial
                              </span>
                            )}
                            {p.estado === 'CANCELADO' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                                <i className="bi bi-check2 text-xs"></i>
                                Cancelado
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setPrestamoModal(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-stone-300 text-[#752F17] hover:bg-[#752F17] hover:text-white transition cursor-pointer"
                            >
                              <i className="bi bi-calendar3 text-[10px]"></i>
                              <span>Cronograma</span>
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
          <div className="bg-white rounded-xl border border-stone-200/90 p-6 mb-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#1F1B1A]">
                    Incidencias de Remesas Hermes (Transporte de Caudales)
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    M4 Hermes
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Supervisión y resolución escrita de diferencias o billetes observados recibidos en sucursales
                </p>
              </div>

              {/* Filtros por Sede y Estado de Incidencia */}
              <div className="flex items-center gap-2">
                <select
                  value={filtroSedeHermes}
                  onChange={(e) => setFiltroSedeHermes(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-stone-300 bg-white text-[#1F1B1A] focus:outline-none focus:border-[#752F17] cursor-pointer"
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
                  className="h-8 px-2.5 text-xs rounded-lg border border-stone-300 bg-white text-[#1F1B1A] focus:outline-none focus:border-[#752F17] cursor-pointer"
                >
                  <option value="">Todos los estados</option>
                  <option value="ABIERTA">Solo ABIERTAS</option>
                  <option value="CERRADA">Solo CERRADAS</option>
                </select>

                <button
                  type="button"
                  onClick={cargarIncidencias}
                  className="h-8 px-2.5 text-xs rounded-lg border border-stone-300 bg-white text-stone-600 hover:text-stone-900 transition cursor-pointer flex items-center justify-center"
                  title="Recargar incidencias"
                >
                  <i className="bi bi-arrow-clockwise text-xs"></i>
                </button>
              </div>
            </div>

            {/* Listado de incidencias */}
            {cargandoIncidencias ? (
              <div className="py-6 text-center text-xs text-stone-500">Cargando incidencias...</div>
            ) : incidencias.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl">
                No se registran incidencias {filtroEstadoHermes === 'ABIERTA' ? 'abiertas' : ''} para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 text-stone-500 font-semibold border-b border-stone-200">
                      <th className="py-3 px-3">Fecha</th>
                      <th className="py-3 px-3">Sucursal</th>
                      <th className="py-3 px-3">Reportado por</th>
                      <th className="py-3 px-3 text-end">Esperado</th>
                      <th className="py-3 px-3 text-end">Apto (Caja)</th>
                      <th className="py-3 px-3 text-end">Observado</th>
                      <th className="py-3 px-3">Motivo del asesor</th>
                      <th className="py-3 px-3 text-center">Estado</th>
                      <th className="py-3 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {incidencias.map((inc) => (
                      <tr key={inc.id} className="hover:bg-amber-50/30 transition">
                        <td className="py-3 px-3 font-mono text-stone-600">{formatearFecha(inc.fecha)}</td>
                        <td className="py-3 px-3 font-semibold text-[#1F1B1A]">{inc.sucursalNombre}</td>
                        <td className="py-3 px-3 text-stone-500">{inc.usuarioReporta}</td>
                        <td className="py-3 px-3 text-end font-mono text-[#1F1B1A]">{formatoMoneda(inc.montoEsperado)}</td>
                        <td className="py-3 px-3 text-end font-mono text-emerald-700 font-semibold">
                          {formatoMoneda(inc.montoApto)}
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-amber-800 font-semibold">
                          {formatoMoneda(inc.montoObservado)}
                        </td>
                        <td className="py-3 px-3 text-[#1F1B1A] max-w-xs truncate" title={inc.motivo}>
                          {inc.motivo}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {inc.estado === 'ABIERTA' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              ABIERTA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <i className="bi bi-check-circle-fill text-[11px] text-emerald-600"></i>
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#752F17] hover:bg-[#5C220E] text-white transition cursor-pointer shadow-xs"
                            >
                              <i className="bi bi-pencil-square text-[11px]"></i>
                              <span>Cerrar</span>
                            </button>
                          ) : (
                            <span
                              className="text-[11px] text-stone-500 hover:text-stone-800 italic cursor-help inline-flex items-center gap-1"
                              title={`Resolución: ${inc.resolucion || 'Sin texto'} (Cerrada por ${inc.usuarioCierreNombre || 'Gerente'})`}
                            >
                              <i className="bi bi-info-circle text-[11px]"></i>
                              <span>Ver resolución</span>
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
          <div className="bg-white rounded-xl border border-stone-200/90 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#1F1B1A]">
                  Rendimiento Comparativo por Sucursal
                </h2>
                <p className="text-xs text-stone-500">Métricas agregadas de colocación y cartera activa por agencia</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50/80 text-stone-500 font-semibold border-b border-stone-200">
                    <th className="py-3 px-4">Sucursal</th>
                    <th className="py-3 px-4 text-end">Dinero Colocado</th>
                    <th className="py-3 px-4 text-center">Clientes</th>
                    <th className="py-3 px-4 text-center">Préstamos activos</th>
                    <th className="py-3 px-4 text-center">Vigentes</th>
                    <th className="py-3 px-4 text-center">Morosos</th>
                    <th className="py-3 px-4 text-center">Judiciales</th>
                    <th className="py-3 px-4 text-end">Monto cobrado</th>
                    <th className="py-3 px-4 text-end">Intereses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {panelData.sucursales &&
                    panelData.sucursales.map((suc) => (
                      <tr
                        key={suc.sucursalId}
                        onClick={() => setSedeFiltro(String(suc.sucursalId))}
                        className={`hover:bg-amber-50/40 transition cursor-pointer ${
                          String(sedeFiltro) === String(suc.sucursalId) ? 'bg-amber-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-[#1F1B1A]">
                          Agencia {suc.sucursalNombre}
                        </td>
                        <td className="py-3 px-4 text-end font-mono font-bold text-emerald-800">
                          {formatoMoneda(suc.montoTotalColocado)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[#1F1B1A]">
                          {suc.cantidadClientes || 0}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[#1F1B1A]">
                          {suc.prestamosActivos}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-700 font-semibold">
                          {suc.prestamosVigentes}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-amber-700 font-semibold">
                          {suc.prestamosMorosos}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-rose-700 font-semibold">
                          {suc.prestamosExtrajudiciales}
                        </td>
                        <td className="py-3 px-4 text-end font-mono text-[#1F1B1A]">
                          {formatoMoneda(suc.montoTotalCobrado)}
                        </td>
                        <td className="py-3 px-4 text-end font-mono text-stone-500">
                          {formatoMoneda(suc.interesesCobrados)}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100/80 border-t-2 border-stone-200 font-bold text-[#1F1B1A]">
                    <td className="py-3 px-4 uppercase text-[11px] tracking-wider">Total Consolidado</td>
                    <td className="py-3 px-4 text-end font-mono text-emerald-900 font-bold">
                      {formatoMoneda(panelData.totalMontoColocado)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{panelData.totalClientes || 0}</td>
                    <td className="py-3 px-4 text-center font-mono">{panelData.totalPrestamosActivos}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-700">{panelData.totalPrestamosVigentes}</td>
                    <td className="py-3 px-4 text-center font-mono text-amber-700">{panelData.totalPrestamosMorosos}</td>
                    <td className="py-3 px-4 text-center font-mono text-rose-700">{panelData.totalPrestamosExtrajudiciales}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="text-sm font-bold text-[#1F1B1A]">
                Cerrar Incidencia #{incidenciaSeleccionada.id} · {incidenciaSeleccionada.sucursalNombre}
              </h3>
              <button
                type="button"
                onClick={() => setIncidenciaSeleccionada(null)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <div className="space-y-2 text-xs mb-4 p-3.5 bg-stone-50 rounded-xl border border-stone-100">
              <div className="flex justify-between">
                <span className="text-stone-500">Monto esperado:</span>
                <span className="font-mono font-semibold">{formatoMoneda(incidenciaSeleccionada.montoEsperado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Monto apto:</span>
                <span className="font-mono font-semibold text-emerald-700">{formatoMoneda(incidenciaSeleccionada.montoApto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Monto observado:</span>
                <span className="font-mono font-semibold text-amber-800">{formatoMoneda(incidenciaSeleccionada.montoObservado)}</span>
              </div>
              <div className="pt-1 border-t border-stone-200/60">
                <span className="text-stone-500 block mb-0.5">Motivo reportado por asesor:</span>
                <span className="text-stone-900 italic font-medium">{incidenciaSeleccionada.motivo}</span>
              </div>
            </div>

            {errorModal && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorModal}
              </div>
            )}

            <form onSubmit={handleCerrarIncidencia} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F1B1A] mb-1.5">
                  Resolución Escrita Obligatoria del Gerente *
                </label>
                <textarea
                  rows={3}
                  value={resolucionTexto}
                  onChange={(e) => setResolucionTexto(e.target.value)}
                  placeholder="Ingrese la resolución escrita detallada para el cierre formal de la incidencia..."
                  required
                  className="w-full p-3 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-[#752F17] focus:ring-2 focus:ring-[#752F17]/15 bg-white text-[#1F1B1A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIncidenciaSeleccionada(null)}
                  disabled={cerrandoIncidencia}
                  className="px-3.5 py-2 text-xs rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cerrandoIncidencia}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#752F17] hover:bg-[#5C220E] text-white transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {cerrandoIncidencia ? 'Sellando...' : 'Confirmar Cierre Formal'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#1F1B1A]">
                  Detalle del Crédito · Contrato {prestamoModal.numeroContrato || '#' + prestamoModal.id}
                </h3>
                <p className="text-xs text-stone-500">
                  Prestatario: <strong>{prestamoModal.clienteNombre}</strong> ({prestamoModal.clienteDni}) · Agencia {prestamoModal.sucursalNombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrestamoModal(null)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs mb-4 shrink-0">
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider">Monto Colocado</span>
                <span className="font-bold text-emerald-800 text-sm font-mono">{formatoMoneda(prestamoModal.capital)}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider">Saldo Pendiente</span>
                <span className="font-bold text-[#1F1B1A] text-sm font-mono">{formatoMoneda(prestamoModal.saldoPendiente || prestamoModal.capital)}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider">Plazo</span>
                <span className="font-semibold text-[#1F1B1A]">{prestamoModal.plazoMeses} meses</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider">Estado</span>
                <span className="font-bold text-[#1F1B1A]">{prestamoModal.estado}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50/80 text-stone-500 font-semibold border-b border-stone-200">
                    <th className="py-2.5 px-3 text-center">N° Cuota</th>
                    <th className="py-2.5 px-3">Vencimiento</th>
                    <th className="py-2.5 px-3 text-end">Capital</th>
                    <th className="py-2.5 px-3 text-end">Interés</th>
                    <th className="py-2.5 px-3 text-end">Monto Cuota</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {prestamoModal.cuotas && prestamoModal.cuotas.length > 0 ? (
                    prestamoModal.cuotas.map((c) => (
                      <tr key={c.id || c.numero} className="hover:bg-amber-50/30 transition">
                        <td className="py-2 px-3 text-center font-mono text-stone-500">{c.numero}</td>
                        <td className="py-2 px-3 font-mono text-stone-600">{formatearFecha(c.fechaVencimiento)}</td>
                        <td className="py-2 px-3 text-end font-mono text-stone-800">{formatoMoneda(c.capital)}</td>
                        <td className="py-2 px-3 text-end font-mono text-stone-500">{formatoMoneda(c.interes)}</td>
                        <td className="py-2 px-3 text-end font-mono font-semibold text-[#1F1B1A]">{formatoMoneda(c.monto)}</td>
                        <td className="py-2 px-3 text-center">
                          {c.estado === 'PAGADA' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <i className="bi bi-check2 text-xs"></i>
                              Pagada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-stone-500">
                        No hay cronograma disponible para este crédito.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-stone-100 mt-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPrestamoModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#752F17] hover:bg-[#5C220E] text-white transition cursor-pointer shadow-xs"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
