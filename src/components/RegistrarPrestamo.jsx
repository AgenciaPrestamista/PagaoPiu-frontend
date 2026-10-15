import React, { useState, useEffect } from 'react';
import { api } from '../api';

const EDAD_MINIMA = 18;
const EDAD_MAXIMA = 80;

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

const obtenerFechaMinimaPrestamo = () => {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
};

const obtenerFechaMaximaPrestamo = () => {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function RegistrarPrestamo({ dniInicial, nombreInicial, fechaNacInicial, onPrestamoRegistrado, onCancelar }) {
  const fechaMaxima18 = obtenerFechaMaxima18();
  const fechaMinima80 = obtenerFechaMinima80();
  const fechaMinimaPrestamo = obtenerFechaMinimaPrestamo();
  const fechaMaximaPrestamo = obtenerFechaMaximaPrestamo();
  const [dni, setDni] = useState(dniInicial || '');
  const [nombreCliente, setNombreCliente] = useState(nombreInicial || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(fechaNacInicial || '');
  const [edadCliente, setEdadCliente] = useState(fechaNacInicial ? calcularEdad(fechaNacInicial) : null);
  const [fechaPrestamo, setFechaPrestamo] = useState(new Date().toISOString().split('T')[0]);
  const [plazoMeses, setPlazoMeses] = useState(12);
  const [monto, setMonto] = useState(1000);

  const [simulacion, setSimulacion] = useState(null);
  const [cargandoSimulacion, setCargandoSimulacion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [esElegible, setEsElegible] = useState(true);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const handleFechaNacimientoChange = (e) => {
    const val = e.target.value;
    setFechaNacimiento(val);
    if (val) {
      const edad = calcularEdad(val);
      setEdadCliente(edad);
      if (edad < EDAD_MINIMA) {
        setError(`El cliente debe ser mayor de edad (mínimo ${EDAD_MINIMA} años) para registrarse en el sistema.`);
      } else if (edad > EDAD_MAXIMA) {
        setError(`La edad máxima permitida para otorgar un crédito es de ${EDAD_MAXIMA} años (el cliente tiene ${edad} años).`);
      } else if (error && (error.includes('18 años') || error.includes('80 años'))) {
        setError('');
      }
    } else {
      setEdadCliente(null);
    }
  };

  useEffect(() => {
    if (dniInicial && !nombreInicial) {
      consultarReniec(dniInicial);
    }
  }, [dniInicial]);

  const consultarReniec = async (dniConsultar) => {
    const d = (dniConsultar || dni).trim();
    if (!/^\d{8}$/.test(d)) {
      setError('Ingrese un número de DNI válido de 8 dígitos.');
      return;
    }
    setError('');
    setEsElegible(true);
    setMotivoRechazo('');
    try {
      const data = await api.cliente.buscar(d);
      setNombreCliente(data.nombreCompleto);
      if (!data.elegible) {
        setEsElegible(false);
        setMotivoRechazo(data.motivoRechazo);
        setError(`Cliente no apto para préstamo: ${data.motivoRechazo}`);
      }
    } catch (err) {
      setError(err.message || 'Error al consultar RENIEC');
      setNombreCliente('');
      setEsElegible(false);
    }
  };

  const handleSimular = async () => {
    if (!monto || monto < 1 || monto > 10000) {
      setError('El monto a financiar debe estar entre S/ 1.00 y S/ 10,000.00.');
      return;
    }
    if (!plazoMeses || plazoMeses < 1 || plazoMeses > 60) {
      setError('El plazo debe situarse entre 1 y 60 meses.');
      return;
    }

    setError('');
    setCargandoSimulacion(true);
    try {
      const data = await api.prestamo.simular(monto, plazoMeses, fechaPrestamo);
      setSimulacion(data);
    } catch (err) {
      setError(err.message || 'No fue posible simular el cronograma');
    } finally {
      setCargandoSimulacion(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nombreCliente) {
      setError('Consulte el DNI para autocompletar el nombre verificado del cliente.');
      return;
    }

    if (!fechaNacimiento) {
      setError('Ingrese la fecha de nacimiento del cliente.');
      return;
    }

    const edad = calcularEdad(fechaNacimiento);
    if (edad === null || edad < EDAD_MINIMA) {
      setError(`El cliente debe ser mayor de edad (mínimo ${EDAD_MINIMA} años) para registrarse en el sistema.`);
      return;
    }
    if (edad > EDAD_MAXIMA) {
      setError(`La edad máxima permitida para otorgar un crédito es de ${EDAD_MAXIMA} años (el cliente tiene ${edad} años).`);
      return;
    }

    if (fechaPrestamo < fechaMinimaPrestamo || fechaPrestamo > fechaMaximaPrestamo) {
      setError('La fecha del préstamo debe corresponder exclusivamente al mes y año actual (no futura).');
      return;
    }

    if (!esElegible) {
      setError(`No es posible registrar el préstamo: ${motivoRechazo || 'El cliente no califica según las políticas crediticias.'}`);
      return;
    }

    setGuardando(true);
    try {
      const response = await api.prestamo.registrar({
        dni: dni.trim(),
        nombreCliente: nombreCliente.trim(),
        fechaNacimiento,
        fechaPrestamo,
        plazoMeses: Number(plazoMeses),
        monto: Number(monto),
      });
      onPrestamoRegistrado(response.id);
    } catch (err) {
      setError(err.message || 'Error al registrar el préstamo');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-[#2A2220]">Registro de préstamo</h1>
        <p className="text-xs text-[#6E625B] mt-0.5">
          Parámetros financieros para el cálculo de cronograma bajo el Sistema Francés
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 mb-6 shadow-2xs">
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-5">
              <label className="block text-xs font-medium text-[#2A2220] mb-1">
                DNI del cliente
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength="8"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="8 dígitos"
                  required
                  className="flex-1 h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] placeholder:text-[#6E625B]/60 focus:outline-none focus:border-[#9C4A2B] transition"
                />
                <button
                  type="button"
                  onClick={() => consultarReniec()}
                  className="h-10 px-3.5 text-xs font-medium rounded-lg border border-[#E3D3C2] bg-white hover:bg-[#FBF6F0] text-[#2A2220] transition cursor-pointer"
                >
                  Consultar
                </button>
              </div>
            </div>

            <div className="sm:col-span-7">
              <label className="block text-xs font-medium text-[#2A2220] mb-1">
                Nombre completo (RENIEC)
              </label>
              <input
                type="text"
                value={nombreCliente}
                readOnly
                placeholder="Se autocompleta con RENIEC"
                required
                className="w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-[#FBF6F0] text-[#6E625B] cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-medium text-[#2A2220] mb-1">
                Fecha de nacimiento del cliente
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={handleFechaNacimientoChange}
                  min={fechaMinima80}
                  max={fechaMaxima18}
                  required
                  className="flex-1 h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition"
                />
                {edadCliente !== null && (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${
                      edadCliente >= EDAD_MINIMA && edadCliente <= EDAD_MAXIMA
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {edadCliente} años {edadCliente >= EDAD_MINIMA && edadCliente <= EDAD_MAXIMA ? '✓' : '(No apto)'}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#6E625B] mt-1 block">
                Rango obligatorio: 18 a 80 años cumplidos
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2A2220] mb-1">
                Fecha del préstamo
              </label>
              <input
                type="date"
                value={fechaPrestamo}
                onChange={(e) => setFechaPrestamo(e.target.value)}
                min={fechaMinimaPrestamo}
                max={fechaMaximaPrestamo}
                required
                className="w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition"
              />
              <span className="text-[11px] text-[#6E625B] mt-1 block">
                Restringido al año y mes actual (del 01 al día de hoy)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-medium text-[#2A2220] mb-1">
                Plazo (meses)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={plazoMeses}
                onChange={(e) => setPlazoMeses(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition"
              />
              <span className="text-[11px] text-[#6E625B] mt-1 block">Rango: 1 a 60 meses</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2A2220] mb-1">
                Monto solicitado (S/)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-[#6E625B] font-medium">S/</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="10000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                  className="w-full h-10 pl-8 pr-3 text-sm font-mono font-medium rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] focus:outline-none focus:border-[#9C4A2B] transition"
                />
              </div>
              <span className="text-[11px] text-[#6E625B] mt-1 block">Tope: S/ 10,000.00</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-[#E3D3C2]/40 mt-6">
            <button
              type="button"
              onClick={handleSimular}
              disabled={cargandoSimulacion}
              className="h-10 px-4 text-xs font-medium rounded-lg border border-[#E3D3C2] bg-white hover:bg-[#FBF6F0] text-[#2A2220] transition cursor-pointer"
            >
              {cargandoSimulacion ? 'Calculando...' : 'Simular cronograma'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancelar}
                className="h-10 px-4 text-xs font-medium rounded-lg text-[#6E625B] hover:text-[#2A2220] transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || !esElegible || (edadCliente !== null && (edadCliente < EDAD_MINIMA || edadCliente > EDAD_MAXIMA))}
                className="h-10 px-5 text-xs font-medium rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer"
              >
                {guardando ? 'Registrando...' : 'Registrar préstamo'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Simulación de cronograma */}
      {simulacion && (
        <div className="bg-white rounded-xl border border-[#E3D3C2] overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 border-b border-[#E3D3C2] flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
              Cronograma preliminar simulado
            </h2>
            <span className="text-xs font-medium text-[#6E625B]">TEA referencial: 30.00%</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F1E4D6] border-b border-[#E3D3C2] text-[11px] font-semibold text-[#2A2220] uppercase tracking-wider">
                  <th className="py-2.5 px-4 text-center">N°</th>
                  <th className="py-2.5 px-4">Vencimiento</th>
                  <th className="py-2.5 px-4 text-end">Cuota (S/)</th>
                  <th className="py-2.5 px-4 text-end">Interés (S/)</th>
                  <th className="py-2.5 px-4 text-end">Capital (S/)</th>
                  <th className="py-2.5 px-4 text-end">Saldo (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D3C2]/40">
                {simulacion.map((c) => (
                  <tr key={c.numero} className="hover:bg-[#FFF4E6]/40 transition">
                    <td className="py-2 px-4 text-center font-mono font-medium text-[#2A2220]">{c.numero}</td>
                    <td className="py-2 px-4 text-[#6E625B]">{c.fechaVencimiento}</td>
                    <td className="py-2 px-4 text-end font-mono font-medium text-[#2A2220]">{Number(c.monto).toFixed(2)}</td>
                    <td className="py-2 px-4 text-end font-mono text-[#6E625B]">{Number(c.interes).toFixed(2)}</td>
                    <td className="py-2 px-4 text-end font-mono text-[#2A2220]">{Number(c.capital).toFixed(2)}</td>
                    <td className="py-2 px-4 text-end font-mono text-[#2A2220]">{Number(c.saldoCapital).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
