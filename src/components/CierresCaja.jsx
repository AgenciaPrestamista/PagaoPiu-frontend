import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const hoyLima = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

const haceDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
};

const moneda = (v) =>
  v === null || v === undefined || isNaN(Number(v))
    ? '—'
    : `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fechaCorta = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const hora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—';

const ESTADOS = {
  CERRADA: { texto: 'Cerrada', clase: 'bg-emerald-50 text-emerald-800 border-emerald-200', punto: 'bg-emerald-500' },
  ABIERTA: { texto: 'Abierta', clase: 'bg-amber-50 text-amber-800 border-amber-200', punto: 'bg-amber-500' },
  SIN_APERTURA: { texto: 'Sin apertura', clase: 'bg-stone-100 text-stone-600 border-stone-200', punto: 'bg-stone-400' },
};

const estadoDe = (c) => (c.cerrada ? 'CERRADA' : c.abierta ? 'ABIERTA' : 'SIN_APERTURA');

function Insignia({ estado }) {
  const e = ESTADOS[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${e.clase}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${e.punto}`}></span>
      {e.texto}
    </span>
  );
}

function Indicador({ etiqueta, valor, nota, acento }) {
  return (
    <div className="kpi-card bg-white rounded-xl border border-stone-200 px-4 py-3.5 shadow-xs">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">{etiqueta}</span>
      <span className={`block mt-1 text-2xl font-bold cifra ${acento || 'text-[#1F1B1A]'}`}>{valor}</span>
      {nota && <span className="block mt-0.5 text-[11px] text-stone-500">{nota}</span>}
    </div>
  );
}

export default function CierresCaja() {
  const [desde, setDesde] = useState(haceDias(7));
  const [hasta, setHasta] = useState(hoyLima());
  const [sucursalId, setSucursalId] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [sucursales, setSucursales] = useState([]);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [expandida, setExpandida] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setSinPermiso(false);
    try {
      const data = await api.caja.cierres({ desde, hasta, sucursalId: sucursalId || undefined });
      setFilas(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.message || 'No se pudieron cargar los cierres de caja.';
      if (/403|forbidden|acceso denegado|solo el gerente/i.test(msg)) setSinPermiso(true);
      else setError(msg);
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, sucursalId]);

  useEffect(() => {
    api.sucursales.listar().then((s) => setSucursales(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const hoy = hoyLima();

  // Agencias sin ninguna caja registrada hoy (solo aplica si el rango incluye hoy)
  const sinAperturaHoy = useMemo(() => {
    if (hasta < hoy || desde > hoy) return [];
    const conCaja = new Set(filas.filter((f) => f.fecha === hoy).map((f) => f.sucursalId));
    return sucursales
      .filter((s) => (!sucursalId || String(s.id) === String(sucursalId)) && !conCaja.has(s.id))
      .map((s) => s.nombre);
  }, [filas, sucursales, sucursalId, desde, hasta, hoy]);

  const visibles = useMemo(
    () => (filtroEstado === 'TODOS' ? filas : filas.filter((f) => estadoDe(f) === filtroEstado)),
    [filas, filtroEstado]
  );

  const resumen = useMemo(() => {
    const cerradas = filas.filter((f) => f.cerrada);
    return {
      cerradas: cerradas.length,
      pendientes: filas.filter((f) => !f.cerrada && f.abierta).length,
      vencidas: filas.filter((f) => !f.cerrada && f.abierta && f.fecha < hoy).length,
      cobrado: cerradas.reduce((a, f) => a + Number(f.totalCobradoCierre || 0), 0),
      saldo: cerradas.reduce((a, f) => a + Number(f.saldoCierre || 0), 0),
    };
  }, [filas, hoy]);

  const rangoInvalido = desde > hasta;

  const campo =
    'h-9 px-2.5 text-xs rounded-lg border border-stone-300 bg-white text-[#1F1B1A] focus:outline-none focus:border-[#8D3B20] focus:ring-2 focus:ring-[#8D3B20]/15';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#1F1B1A]">Cierres de caja</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Control diario por agencia: quién abrió, quién cerró y cuánto se cobró.
        </p>
      </div>

      {/* Filtros */}
      <form
        onSubmit={(e) => { e.preventDefault(); cargar(); }}
        className="bg-white rounded-xl border border-stone-200 p-3.5 mb-5 flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-stone-600">
          Desde
          <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-stone-600">
          Hasta
          <input type="date" value={hasta} min={desde} max={hoy} onChange={(e) => setHasta(e.target.value)} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-stone-600">
          Agencia
          <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={`${campo} min-w-40`}>
            <option value="">Todas</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-1.5 sm:ml-auto" role="group" aria-label="Filtrar por estado">
          {[['TODOS', 'Todas'], ['CERRADA', 'Cerradas'], ['ABIERTA', 'Abiertas']].map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtroEstado === valor}
              onClick={() => setFiltroEstado(valor)}
              className={`h-9 px-3 text-xs font-semibold rounded-lg border transition cursor-pointer focus-visible:outline-2 focus-visible:outline-[#8D3B20] ${
                filtroEstado === valor
                  ? 'bg-[#8D3B20] border-[#8D3B20] text-white'
                  : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      </form>

      {rangoInvalido && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          La fecha inicial no puede ser posterior a la fecha final.
        </div>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Indicador etiqueta="Cajas cerradas" valor={resumen.cerradas} nota="en el periodo" acento="text-emerald-800" />
        <Indicador
          etiqueta="Pendientes de cierre"
          valor={resumen.pendientes}
          nota={resumen.vencidas ? `${resumen.vencidas} de días anteriores` : 'abiertas ahora'}
          acento={resumen.vencidas ? 'text-rose-700' : 'text-amber-800'}
        />
        <Indicador etiqueta="Total cobrado" valor={moneda(resumen.cobrado)} nota="en cajas cerradas" />
        <Indicador etiqueta="Saldo al cierre" valor={moneda(resumen.saldo)} nota="suma de agencias" />
      </div>

      {/* Datos parciales: agencias sin apertura hoy */}
      {!cargando && !error && sinAperturaHoy.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 flex items-start gap-2.5">
          <i className="bi bi-info-circle text-stone-500 mt-0.5"></i>
          <span>
            <strong className="font-semibold">Sin apertura hoy:</strong> {sinAperturaHoy.join(', ')}.
          </span>
        </div>
      )}

      {/* Contenido */}
      {sinPermiso ? (
        <div role="alert" className="bg-white rounded-xl border border-stone-200 p-8 text-center text-sm text-stone-600">
          <i className="bi bi-shield-lock text-2xl text-stone-400"></i>
          <p className="mt-2 font-semibold text-[#1F1B1A]">Solo el Gerente General puede ver los cierres de caja.</p>
          <p className="text-xs mt-1">Inicie sesión con una cuenta de gerencia para continuar.</p>
        </div>
      ) : error ? (
        <div role="alert" className="bg-white rounded-xl border border-rose-200 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <button
            type="button"
            onClick={cargar}
            className="mt-3 h-9 px-4 text-xs font-semibold rounded-lg bg-[#8D3B20] hover:bg-[#752F17] text-white cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : cargando ? (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100" aria-busy="true" aria-label="Cargando cierres">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-4 flex items-center gap-4">
              <div className="h-3 w-20 rounded bg-stone-200 animate-pulse"></div>
              <div className="h-3 w-32 rounded bg-stone-200 animate-pulse"></div>
              <div className="h-3 flex-1 rounded bg-stone-100 animate-pulse"></div>
            </div>
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-stone-300 p-10 text-center">
          <i className="bi bi-inbox text-2xl text-stone-400"></i>
          <p className="mt-2 text-sm font-semibold text-[#1F1B1A]">No hay cajas en este periodo</p>
          <p className="text-xs text-stone-500 mt-1">
            Pruebe ampliando el rango de fechas o quitando el filtro de estado.
          </p>
          <button
            type="button"
            onClick={() => { setDesde(haceDias(30)); setFiltroEstado('TODOS'); setSucursalId(''); }}
            className="mt-3 h-9 px-4 text-xs font-semibold rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            Ver últimos 30 días
          </button>
        </div>
      ) : (
        <>
          {/* Tabla (escritorio) */}
          <div className="hidden md:block bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-xs">
              <caption className="sr-only">Cierres de caja por agencia y fecha</caption>
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th scope="col" className="text-left font-bold px-4 py-2.5">Fecha</th>
                  <th scope="col" className="text-left font-bold px-3 py-2.5">Agencia</th>
                  <th scope="col" className="text-left font-bold px-3 py-2.5">Estado</th>
                  <th scope="col" className="text-left font-bold px-3 py-2.5">Apertura</th>
                  <th scope="col" className="text-left font-bold px-3 py-2.5">Cierre</th>
                  <th scope="col" className="text-right font-bold px-3 py-2.5">Cobrado</th>
                  <th scope="col" className="text-right font-bold px-4 py-2.5">Saldo final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibles.map((f) => {
                  const clave = `${f.fecha}-${f.sucursalId}`;
                  const abierta = expandida === clave;
                  const vencida = !f.cerrada && f.abierta && f.fecha < hoy;
                  return (
                    <React.Fragment key={clave}>
                      <tr className={`hover:bg-[#F7EFEA]/50 ${vencida ? 'bg-rose-50/40' : ''}`}>
                        <td className="px-4 py-3 font-mono tabular-nums">{fechaCorta(f.fecha)}</td>
                        <td className="px-3 py-3 font-semibold text-[#1F1B1A]">{f.sucursalNombre}</td>
                        <td className="px-3 py-3">
                          <Insignia estado={estadoDe(f)} />
                          {vencida && <span className="ml-1.5 text-[10px] font-semibold text-rose-700">sin cerrar</span>}
                        </td>
                        <td className="px-3 py-3 text-stone-600">{f.usuarioApertura || '—'}</td>
                        <td className="px-3 py-3 text-stone-600">
                          {f.cerrada ? (
                            <>
                              {f.usuarioCierre || '—'} <span className="text-stone-400">· {hora(f.fechaCierre)}</span>
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">
                          {moneda(f.cerrada ? f.totalCobradoCierre : f.totalCobradoHoy)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                          {moneda(f.cerrada ? f.saldoCierre : f.saldoDisponible)}
                          {f.observacionCierre && (
                            <button
                              type="button"
                              aria-expanded={abierta}
                              aria-label="Ver observación del cierre"
                              onClick={() => setExpandida(abierta ? null : clave)}
                              className="ml-2 text-[#8D3B20] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#8D3B20]"
                            >
                              <i className="bi bi-chat-left-text"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                      {abierta && f.observacionCierre && (
                        <tr className="bg-[#F7EFEA]/60">
                          <td colSpan={7} className="px-4 py-2.5 text-xs text-stone-700">
                            <strong className="font-semibold">Observación:</strong> {f.observacionCierre}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tarjetas (móvil) */}
          <ul className="md:hidden space-y-2.5">
            {visibles.map((f) => {
              const vencida = !f.cerrada && f.abierta && f.fecha < hoy;
              return (
                <li
                  key={`${f.fecha}-${f.sucursalId}`}
                  className={`bg-white rounded-xl border p-3.5 ${vencida ? 'border-rose-200' : 'border-stone-200'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1F1B1A] truncate">{f.sucursalNombre}</p>
                      <p className="text-[11px] text-stone-500 font-mono">{fechaCorta(f.fecha)}</p>
                    </div>
                    <Insignia estado={estadoDe(f)} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-xs">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Cobrado</dt>
                      <dd className="font-mono tabular-nums">{moneda(f.cerrada ? f.totalCobradoCierre : f.totalCobradoHoy)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Saldo final</dt>
                      <dd className="font-mono tabular-nums font-semibold">{moneda(f.cerrada ? f.saldoCierre : f.saldoDisponible)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Abrió</dt>
                      <dd className="truncate">{f.usuarioApertura || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Cerró</dt>
                      <dd className="truncate">{f.cerrada ? `${f.usuarioCierre || '—'} · ${hora(f.fechaCierre)}` : '—'}</dd>
                    </div>
                  </dl>
                  {f.observacionCierre && (
                    <p className="mt-2.5 pt-2.5 border-t border-stone-100 text-xs text-stone-600">
                      <strong className="font-semibold">Observación:</strong> {f.observacionCierre}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
