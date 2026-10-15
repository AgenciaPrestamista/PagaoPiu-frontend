import React, { useState } from 'react';
import { api } from '../api';

export default function BuscarCliente({ onIniciarPrestamo, onVerPrestamo }) {
  const [dni, setDni] = useState('');
  const [resultado, setResultado] = useState(null);
  const [prestamosCliente, setPrestamosCliente] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [edadCliente, setEdadCliente] = useState(null);

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nac = new Date(fechaNac + 'T00:00:00');
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
      edad--;
    }
    return edad;
  };

  const EDAD_MINIMA = 18;
  const EDAD_MAXIMA = 80;

  const obtenerFechaMaxima18 = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - EDAD_MINIMA);
    return d.toISOString().split('T')[0];
  };

  const obtenerFechaMinima80 = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - EDAD_MAXIMA);
    return d.toISOString().split('T')[0];
  };

  const handleFechaNacChange = (e) => {
    const val = e.target.value;
    setFechaNacimiento(val);
    if (val) {
      setEdadCliente(calcularEdad(val));
    } else {
      setEdadCliente(null);
    }
  };

  const consultarDni = async (dniConsultar) => {
    const dniLimpio = (dniConsultar || dni).trim();
    if (!/^\d{8}$/.test(dniLimpio)) {
      setError('Ingrese un número de DNI válido de 8 dígitos.');
      setResultado(null);
      return;
    }

    setError('');
    setCargando(true);
    setPrestamosCliente([]);
    try {
      const data = await api.cliente.buscar(dniLimpio);
      setResultado(data);
      try {
        const prestamos = await api.prestamo.listarPorClienteDni(dniLimpio);
        setPrestamosCliente(prestamos || []);
      } catch {
        setPrestamosCliente([]);
      }
    } catch (err) {
      setError(err.message || 'No se pudo obtener información del cliente');
      setResultado(null);
      setPrestamosCliente([]);
    } finally {
      setCargando(false);
    }
  };

  const buscarDemo = (numDni) => {
    setDni(numDni);
    consultarDni(numDni);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#2A2220]">Consulta de cliente</h1>
        <p className="text-xs text-[#6E625B] mt-0.5">
          Verificación de identidad y aptitud crediticia en el padrón nacional
        </p>
      </div>

      {/* Tarjeta de Búsqueda */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] p-5 mb-5 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            consultarDni();
          }}
          className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center"
        >
          <div className="flex-1">
            <input
              type="text"
              placeholder="Número de DNI (8 dígitos)"
              maxLength="8"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required
              className="w-full h-10 px-3.5 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] placeholder:text-[#6E625B]/60 focus:outline-none focus:border-[#9C4A2B] transition"
            />
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="h-10 px-5 text-xs font-medium rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer"
          >
            {cargando ? 'Consultando...' : 'Consultar'}
          </button>
        </form>

        {error && (
          <div className="mt-3.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Accesos de prueba */}
        <div className="mt-4 pt-3.5 border-t border-[#E3D3C2]/40">
          <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-2">
            Casos de prueba
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Pérez López (10000001)', dni: '10000001' },
              { label: 'Castillo Terrones (27427864)', dni: '27427864' },
              { label: 'Núñez Ávila (10000003)', dni: '10000003' },
              { label: 'Fallecido (99999901)', dni: '99999901' },
              { label: 'DNI Vencido (99999902)', dni: '99999902' },
              { label: 'Extranjero (99999903)', dni: '99999903' },
            ].map(({ label, dni }) => (
              <button
                key={dni}
                type="button"
                onClick={() => buscarDemo(dni)}
                className="text-xs py-1 px-2.5 rounded-md border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] hover:text-[#2A2220] transition cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ficha de Resultado */}
      {resultado && (
        <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 shadow-2xs">
          <div className="flex items-start justify-between pb-4 border-b border-[#E3D3C2]/40 mb-4 gap-4">
            <div>
              <span className="text-[11px] font-medium text-[#6E625B] uppercase tracking-wider block">
                Resultado de identidad
              </span>
              <h2 className="text-base font-semibold text-[#2A2220] mt-0.5">
                {resultado.nombreCompleto}
              </h2>
            </div>
            <div>
              {resultado.elegible ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Apto para crédito
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  No elegible
                </span>
              )}
            </div>
          </div>

          {!resultado.elegible && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <span className="font-semibold">Motivo:</span> {resultado.motivoRechazo}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-xs">
            <div>
              <span className="text-[#6E625B] block text-[11px]">DNI</span>
              <span className="font-mono font-medium text-[#2A2220]">{resultado.dni}</span>
            </div>
            <div>
              <span className="text-[#6E625B] block text-[11px]">Nacionalidad</span>
              <span className="font-medium text-[#2A2220]">{resultado.nacionalidad}</span>
            </div>
            <div>
              <span className="text-[#6E625B] block text-[11px]">Vigencia DNI</span>
              <span className={`font-medium ${resultado.dniVigente ? 'text-emerald-700' : 'text-red-700'}`}>
                {resultado.dniVigente ? 'Vigente' : 'Vencido'}
              </span>
            </div>
            <div>
              <span className="text-[#6E625B] block text-[11px]">Condición vital</span>
              <span className={`font-medium ${!resultado.fallecido ? 'text-emerald-700' : 'text-red-700'}`}>
                {!resultado.fallecido ? 'Vivo' : 'Fallecido'}
              </span>
            </div>
          </div>

          {resultado.clienteEstado && (
            <div className="mt-3 pt-3 border-t border-[#E3D3C2]/40 flex items-center gap-2 text-xs">
              <span className="text-[#6E625B]">Estado en la entidad:</span>
              <span className="font-medium text-[#2A2220]">{resultado.clienteEstado}</span>
            </div>
          )}

          {/* Verificación de mayoría de edad (mínimo 18 años) */}
          <div className="mt-4 pt-3.5 border-t border-[#E3D3C2]/40">
            <label className="block text-xs font-medium text-[#2A2220] mb-1">
              Verificación de mayoría de edad (Fecha de nacimiento)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
              <input
                type="date"
                value={fechaNacimiento}
                onChange={handleFechaNacChange}
                min={obtenerFechaMinima80()}
                max={obtenerFechaMaxima18()}
                className="h-10 px-3 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
              />
              {edadCliente !== null && (
                <div>
                  {edadCliente >= EDAD_MINIMA && edadCliente <= EDAD_MAXIMA ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Mayor de edad ({edadCliente} años)
                    </span>
                  ) : edadCliente < EDAD_MINIMA ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      ✕ Menor de edad ({edadCliente} años) — Requiere mínimo 18 años
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      ✕ Excede edad máxima ({edadCliente} años) — Máximo 80 años
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Préstamos registrados del cliente para cobro rápido */}
          {prestamosCliente.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[#E3D3C2]/40">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220] mb-3">
                Préstamos registrados del cliente ({prestamosCliente.length})
              </h3>
              <div className="space-y-2">
                {prestamosCliente.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg border border-[#E3D3C2] bg-[#FBF6F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2A2220]">
                        Préstamo #{p.id} — S/ {Number(p.capital).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-[#6E625B]">
                        Plazo: {p.plazoMeses} meses • Cuota fija: S/ {Number(p.cuotaFija).toFixed(2)} • Agencia: {p.sucursalNombre}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.estado === 'VIGENTE' ? 'bg-emerald-100 text-emerald-800' :
                        p.estado === 'MOROSO' ? 'bg-amber-100 text-amber-800' :
                        p.estado === 'EXTRAJUDICIAL' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {p.estado}
                      </span>
                      {onVerPrestamo && (
                        <button
                          type="button"
                          onClick={() => onVerPrestamo(p.id)}
                          className="h-8 px-3 text-xs font-medium rounded-md bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer"
                        >
                          Cobrar cuota / Ver
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resultado.elegible && (
            <div className="mt-6 pt-4 border-t border-[#E3D3C2]/40 flex justify-end">
              <button
                type="button"
                disabled={edadCliente !== null && (edadCliente < EDAD_MINIMA || edadCliente > EDAD_MAXIMA)}
                onClick={() => onIniciarPrestamo(resultado.dni, resultado.nombreCompleto, fechaNacimiento)}
                className="h-10 px-5 text-xs font-medium rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer"
              >
                Continuar a registrar préstamo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
