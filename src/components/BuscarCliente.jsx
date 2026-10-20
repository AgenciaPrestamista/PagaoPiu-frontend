import React, { useState } from 'react';
import { api } from '../api';

export default function BuscarCliente({ onIniciarPrestamo, onVerPrestamo }) {
  const [tipoDocumento, setTipoDocumento] = useState('DNI');
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

  const handleTipoDocumentoChange = (tipo) => {
    setTipoDocumento(tipo);
    setDni('');
    setResultado(null);
    setPrestamosCliente([]);
    setError('');
    if (tipo === 'RUC') {
      setFechaNacimiento('2015-01-01');
      setEdadCliente(null);
    } else {
      setFechaNacimiento('');
      setEdadCliente(null);
    }
  };

  const handleFechaNacChange = (e) => {
    const val = e.target.value;
    setFechaNacimiento(val);
    if (val && tipoDocumento === 'DNI') {
      setEdadCliente(calcularEdad(val));
    } else {
      setEdadCliente(null);
    }
  };

  const consultarDocumento = async (docConsultar) => {
    const docLimpio = (docConsultar || dni).trim();
    if (tipoDocumento === 'DNI') {
      if (!/^\d{8}$/.test(docLimpio)) {
        setError('Ingrese un número de DNI válido de 8 dígitos.');
        setResultado(null);
        return;
      }
    } else {
      if (!/^\d{11}$/.test(docLimpio)) {
        setError('Ingrese un número de RUC válido de 11 dígitos.');
        setResultado(null);
        return;
      }
    }

    setError('');
    setCargando(true);
    setPrestamosCliente([]);
    try {
      const data = await api.cliente.buscar(docLimpio);
      setResultado(data);
      try {
        const prestamos = await api.prestamo.listarPorClienteDni(docLimpio);
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

  const buscarDemo = (numDoc) => {
    setDni(numDoc);
    consultarDocumento(numDoc);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#2A2220]">Consulta de cliente</h1>
        <p className="text-xs text-[#6E625B] mt-0.5">
          Verificación de identidad y aptitud crediticia de Personas Naturales (RENIEC) y Empresas (SUNAT)
        </p>
      </div>

      {/* Tarjeta de Búsqueda */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] p-5 mb-5 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            consultarDocumento();
          }}
          className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center"
        >
          <div className="w-full sm:w-56">
            <select
              value={tipoDocumento}
              onChange={(e) => handleTipoDocumentoChange(e.target.value)}
              className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition cursor-pointer"
            >
              <option value="DNI">DNI (Persona Natural)</option>
              <option value="RUC">RUC (Empresa)</option>
            </select>
          </div>

          <div className="flex-1">
            <input
              type="text"
              placeholder={tipoDocumento === 'DNI' ? 'Número de DNI (8 dígitos)' : 'Número de RUC (11 dígitos)'}
              maxLength={tipoDocumento === 'DNI' ? 8 : 11}
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
            Casos de prueba {tipoDocumento === 'DNI' ? '(Personas Naturales)' : '(Empresas)'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tipoDocumento === 'DNI' ? (
              [
                { label: 'Pérez López (10000001)', doc: '10000001' },
                { label: 'Castillo Terrones (27427864)', doc: '27427864' },
                { label: 'Núñez Ávila (10000003)', doc: '10000003' },
                { label: 'Fallecido (99999901)', doc: '99999901' },
                { label: 'DNI Vencido (99999902)', doc: '99999902' },
                { label: 'Extranjero (99999903)', doc: '99999903' },
              ].map(({ label, doc }) => (
                <button
                  key={doc}
                  type="button"
                  onClick={() => buscarDemo(doc)}
                  className="text-xs py-1 px-2.5 rounded-md border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] hover:text-[#2A2220] transition cursor-pointer"
                >
                  {label}
                </button>
              ))
            ) : (
              [
                { label: 'Agrolight Perú S.A.C. (20552103816)', doc: '20552103816' },
                { label: 'El Sol S.A.C. (20141878477)', doc: '20141878477' },
                { label: 'Comercial Los Andes S.A.C. (20987654321)', doc: '20987654321' },
                { label: 'Préstamos del Norte S.A.C. (20123456789)', doc: '20123456789' },
                { label: 'Distribuidora Norteña S.R.L. (20555666771)', doc: '20555666771' },
              ].map(({ label, doc }) => (
                <button
                  key={doc}
                  type="button"
                  onClick={() => buscarDemo(doc)}
                  className="text-xs py-1 px-2.5 rounded-md border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] hover:text-[#2A2220] transition cursor-pointer"
                >
                  {label}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ficha de Resultado */}
      {resultado && (() => {
        const esJuridica = (resultado.dni || '').length === 11;
        return (
        <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 shadow-2xs">
          <div className="flex items-start justify-between pb-4 border-b border-[#E3D3C2]/40 mb-4 gap-4">
            <div>
              <span className="text-[11px] font-medium text-[#6E625B] uppercase tracking-wider block">
                {esJuridica ? 'Empresa / Razón Social' : 'Resultado de identidad'}
              </span>
              <h2 className="text-base font-semibold text-[#2A2220] mt-0.5">
                {resultado.nombreCompleto}
              </h2>
              {esJuridica && (
                <div className="mt-1 text-xs text-[#2A2220]">
                  <span className="text-[#6E625B]">Cargo de representación requerido:</span>{' '}
                  <strong className="text-[#9C4A2B]">{resultado.representanteCargo || 'GERENTE GENERAL'}</strong>
                </div>
              )}
            </div>
            <div>
              {resultado.elegible ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {esJuridica ? 'Empresa apta para crédito' : 'Apto para crédito'}
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
              <span className="text-[#6E625B] block text-[11px]">{esJuridica ? 'RUC' : 'DNI'}</span>
              <span className="font-mono font-medium text-[#2A2220]">{resultado.dni}</span>
            </div>
            <div>
              <span className="text-[#6E625B] block text-[11px]">{esJuridica ? 'Tipo de entidad' : 'Nacionalidad'}</span>
              <span className="font-medium text-[#2A2220]">{esJuridica ? 'Persona Jurídica' : resultado.nacionalidad}</span>
            </div>
            <div>
              <span className="text-[#6E625B] block text-[11px]">{esJuridica ? 'Condición RUC' : 'Vigencia DNI'}</span>
              <span className={`font-medium ${resultado.dniVigente ? 'text-emerald-700' : 'text-red-700'}`}>
                {esJuridica ? (resultado.dniVigente ? 'Habido / Activo' : 'No habido') : (resultado.dniVigente ? 'Vigente' : 'Vencido')}
              </span>
            </div>
            <div>
              <span className="text-[#6E625B] block text-[11px]">{esJuridica ? 'Estado fiscal' : 'Condición vital'}</span>
              <span className={`font-medium ${!resultado.fallecido ? 'text-emerald-700' : 'text-red-700'}`}>
                {esJuridica ? 'OPERATIVO' : (!resultado.fallecido ? 'Vivo' : 'Fallecido')}
              </span>
            </div>
          </div>

          {esJuridica && (
            <div className="mt-3 pt-3 border-t border-[#E3D3C2]/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#6E625B] block text-[11px]">Cargo requerido para representación:</span>
                <span className="font-semibold text-[#2A2220]">
                  {resultado.representanteCargo || 'GERENTE GENERAL'}
                </span>
                <span className="text-[#6E625B] block text-[11px] mt-0.5">
                  El DNI de la persona que se presenta se validará directamente contra SUNAT y RENIEC en el servidor al formalizar el crédito.
                </span>
              </div>
              <div>
                <span className="text-[#6E625B] block text-[11px]">Domicilio fiscal SUNAT:</span>
                <span className="font-medium text-[#2A2220]">{resultado.direccion || 'Dirección fiscal registrada en SUNAT'}</span>
              </div>
            </div>
          )}

          {resultado.clienteEstado && (
            <div className="mt-3 pt-3 border-t border-[#E3D3C2]/40 flex items-center gap-2 text-xs">
              <span className="text-[#6E625B]">Estado en la entidad:</span>
              <span className="font-medium text-[#2A2220]">{resultado.clienteEstado}</span>
            </div>
          )}

          {/* Verificación de fecha */}
          <div className="mt-4 pt-3.5 border-t border-[#E3D3C2]/40">
            <label className="block text-xs font-medium text-[#2A2220] mb-1">
              {esJuridica ? 'Fecha de constitución de la empresa' : 'Verificación de mayoría de edad (Fecha de nacimiento)'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
              <input
                type="date"
                value={fechaNacimiento}
                onChange={handleFechaNacChange}
                min={!esJuridica ? obtenerFechaMinima80() : undefined}
                max={!esJuridica ? obtenerFechaMaxima18() : new Date().toISOString().split('T')[0]}
                className="h-10 px-3 text-xs rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B]"
              />
              {!esJuridica && edadCliente !== null && (
                <div>
                  {edadCliente >= EDAD_MINIMA && edadCliente <= EDAD_MAXIMA ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Mayor de edad ({edadCliente} años)
                    </span>
                  ) : edadCliente < EDAD_MINIMA ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      Menor de edad ({edadCliente} años) — Requiere mínimo 18 años
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      Excede edad máxima ({edadCliente} años) — Máximo 80 años
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-[11px] text-[#6E625B] mt-1 block">
              {esJuridica ? 'Fecha de constitución o inscripción en Registros Públicos' : 'Rango obligatorio: 18 a 80 años cumplidos'}
            </span>
          </div>

          {/* Préstamos registrados del cliente para cobro rápido */}
          {prestamosCliente.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[#E3D3C2]/40">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
                  Préstamos registrados del cliente ({prestamosCliente.length})
                </h3>
                <span className="text-[11px] font-medium text-[#6E625B]">
                  Deuda activa:{' '}
                  <strong className={prestamosCliente.some((p) => ['VIGENTE', 'MOROSO', 'EXTRAJUDICIAL'].includes(p.estado)) ? 'text-[#9C4A2B]' : 'text-emerald-700'}>
                    {prestamosCliente.some((p) => ['VIGENTE', 'MOROSO', 'EXTRAJUDICIAL'].includes(p.estado)) ? 'Con préstamo activo' : 'Sin deuda activa'}
                  </strong>
                </span>
              </div>
              <div className="space-y-2">
                {prestamosCliente.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg border border-[#E3D3C2] bg-[#FBF6F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2A2220]">
                        Préstamo #{p.id} {p.numeroContrato ? `(${p.numeroContrato})` : ''} — S/ {Number(p.capital).toFixed(2)}
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
                        p.estado === 'EN_ESPERA' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        p.estado === 'ANULADO' ? 'bg-gray-100 text-gray-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {p.estado}
                      </span>
                      {p.estado === 'EN_ESPERA' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onIniciarPrestamo) {
                              onIniciarPrestamo(p.clienteDni || resultado.dni, p.clienteNombre || resultado.nombreCompleto);
                            } else if (onVerPrestamo) {
                              onVerPrestamo(p.id);
                            }
                          }}
                          className="h-8 px-3 text-xs font-semibold rounded-md bg-blue-700 text-white hover:bg-blue-800 transition cursor-pointer"
                        >
                          Retomar contrato
                        </button>
                      ) : (
                        onVerPrestamo && (
                          <button
                            type="button"
                            onClick={() => onVerPrestamo(p.id)}
                            className="h-8 px-3 text-xs font-medium rounded-md bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer"
                          >
                            Cobrar cuota / Ver
                          </button>
                        )
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
                disabled={!esJuridica && edadCliente !== null && (edadCliente < EDAD_MINIMA || edadCliente > EDAD_MAXIMA)}
                onClick={() => onIniciarPrestamo(
                  resultado.dni,
                  resultado.nombreCompleto,
                  esJuridica ? (fechaNacimiento || '2015-01-01') : fechaNacimiento,
                  esJuridica ? {
                    representanteLegal: resultado.representanteNombre,
                    dniRepresentante: resultado.representanteDocumento,
                    cargoRepresentante: resultado.representanteCargo,
                    direccionEmpresa: resultado.direccion,
                  } : {}
                )}
                className="h-10 px-5 text-xs font-medium rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer"
              >
                Continuar a registrar préstamo
              </button>
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}
