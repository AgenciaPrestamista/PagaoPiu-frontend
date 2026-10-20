import React, { useState, useEffect } from 'react';
import { api } from './api';
import Navbar from './components/Navbar';
import Login from './components/Login';
import BuscarCliente from './components/BuscarCliente';
import RegistrarPrestamo from './components/RegistrarPrestamo';
import DetallePrestamo from './components/DetallePrestamo';
import PanelGerente from './components/PanelGerente';
import CobranzaPagos from './components/CobranzaPagos';
import AdministracionUsuarios from './components/AdministracionUsuarios';
import RecepcionHermes from './components/RecepcionHermes';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [cajaAbierta, setCajaAbierta] = useState(false);

  // Vistas: 'buscar', 'registrar', 'cobranza', 'detalle', 'caja', 'panel', 'usuarios'
  const [vistaActual, setVistaActualState] = useState(() => {
    return sessionStorage.getItem('pagaopiu_vista') || 'buscar';
  });

  const [datosCliente, setDatosCliente] = useState(() => {
    const d = sessionStorage.getItem('pagaopiu_datos_cliente');
    return d ? JSON.parse(d) : { dni: '', nombre: '', fechaNac: '' };
  });

  const [prestamoSeleccionadoId, setPrestamoSeleccionadoIdState] = useState(() => {
    const val = sessionStorage.getItem('pagaopiu_prestamo_id');
    return val ? Number(val) : null;
  });

  const setVistaActual = (vista, forzar = false) => {
    // Si es asesor y la caja está cerrada, se bloquea cualquier otra pestaña que no sea 'caja'
    if (!forzar && usuario?.rol === 'ASESOR' && !cajaAbierta && vista !== 'caja') {
      return;
    }
    sessionStorage.setItem('pagaopiu_vista', vista);
    setVistaActualState(vista);
  };

  const setPrestamoSeleccionadoId = (id) => {
    if (id) {
      sessionStorage.setItem('pagaopiu_prestamo_id', String(id));
    } else {
      sessionStorage.removeItem('pagaopiu_prestamo_id');
    }
    setPrestamoSeleccionadoIdState(id);
  };

  // Modal global de cambio de contraseña activado desde Ajustes
  const [mostrarModalPassword, setMostrarModalPassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState(null);
  const [exitoPassword, setExitoPassword] = useState(null);

  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const u = await api.auth.me();
        setUsuario(u);
        const vistaGuardada = sessionStorage.getItem('pagaopiu_vista');

        if (u?.rol === 'GERENTE') {
          setCajaAbierta(true);
          if (!vistaGuardada || vistaGuardada === 'buscar' || vistaGuardada === 'caja') {
            setVistaActualState('panel');
            sessionStorage.setItem('pagaopiu_vista', 'panel');
          } else {
            setVistaActualState(vistaGuardada);
          }
        } else if (u?.rol === 'ASESOR') {
          try {
            const estadoCaja = await api.caja.obtenerEstado();
            if (estadoCaja?.abierta) {
              setCajaAbierta(true);
              setVistaActualState(vistaGuardada || 'buscar');
            } else {
              setCajaAbierta(false);
              setVistaActualState('caja');
              sessionStorage.setItem('pagaopiu_vista', 'caja');
            }
          } catch {
            setCajaAbierta(false);
            setVistaActualState('caja');
            sessionStorage.setItem('pagaopiu_vista', 'caja');
          }
        }
      } catch {
        setUsuario(null);
      } finally {
        setCargandoSesion(false);
      }
    };
    verificarSesion();
  }, []);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } finally {
      sessionStorage.removeItem('pagaopiu_vista');
      sessionStorage.removeItem('pagaopiu_prestamo_id');
      sessionStorage.removeItem('pagaopiu_datos_cliente');
      setUsuario(null);
      setCajaAbierta(false);
      setVistaActualState('buscar');
    }
  };

  const handleCajaAbierta = (nuevoEstado) => {
    setCajaAbierta(true);
    sessionStorage.setItem('pagaopiu_vista', 'buscar');
    setVistaActualState('buscar');
  };

  const handleIniciarPrestamo = (dni, nombre, fechaNac = '', datosExtra = {}) => {
    const datos = { dni, nombre, fechaNac, ...(datosExtra || {}) };
    sessionStorage.setItem('pagaopiu_datos_cliente', JSON.stringify(datos));
    setDatosCliente(datos);
    setVistaActual('registrar');
  };

  const handlePrestamoRegistrado = (id) => {
    setPrestamoSeleccionadoId(id);
    setVistaActual('cobranza');
  };

  const handleRetomarContrato = (p) => {
    const datos = {
      dni: p.clienteDni || '',
      nombre: p.clienteNombre || '',
      fechaNac: '',
    };
    sessionStorage.setItem('pagaopiu_datos_cliente', JSON.stringify(datos));
    setDatosCliente(datos);
    setVistaActual('registrar');
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    setErrorPassword(null);
    setExitoPassword(null);

    if (!passwordActual.trim()) {
      setErrorPassword('Ingresa tu contraseña actual.');
      return;
    }
    if (passwordNuevo.length < 6) {
      setErrorPassword('La nueva contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }
    if (passwordNuevo !== passwordConfirmacion) {
      setErrorPassword('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setGuardandoPassword(true);
    try {
      const res = await api.auth.cambiarPassword(passwordActual, passwordNuevo, passwordConfirmacion);
      setExitoPassword(res?.mensaje || 'Contraseña actualizada con éxito.');
      setPasswordActual('');
      setPasswordNuevo('');
      setPasswordConfirmacion('');
      setTimeout(() => {
        setMostrarModalPassword(false);
        setExitoPassword(null);
      }, 1500);
    } catch (err) {
      setErrorPassword(err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setGuardandoPassword(false);
    }
  };

  if (cargandoSesion) {
    return (
      <div className="min-h-screen bg-[#FBF6F0] flex flex-col justify-center items-center">
        <div className="w-6 h-6 border-2 border-[#E3D3C2] border-t-[#9C4A2B] rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-medium text-[#6E625B]">Iniciando PagaOPiu...</p>
      </div>
    );
  }

  if (!usuario) {
    return (
      <Login
        onLoginExitoso={async (u) => {
          setUsuario(u);
          if (u?.rol === 'GERENTE') {
            setCajaAbierta(true);
            setVistaActual('panel', true);
          } else {
            try {
              const estadoCaja = await api.caja.obtenerEstado();
              if (estadoCaja?.abierta) {
                setCajaAbierta(true);
                setVistaActual('buscar', true);
              } else {
                setCajaAbierta(false);
                setVistaActual('caja', true);
              }
            } catch {
              setCajaAbierta(false);
              setVistaActual('caja', true);
            }
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF6F0] text-[#2A2220] flex">
      <Navbar
        usuario={usuario}
        cajaAbierta={cajaAbierta}
        onLogout={handleLogout}
        vistaActual={vistaActual}
        setVistaActual={setVistaActual}
        onAbrirCambiarPassword={() => {
          setErrorPassword(null);
          setExitoPassword(null);
          setPasswordActual('');
          setPasswordNuevo('');
          setPasswordConfirmacion('');
          setMostrarModalPassword(true);
        }}
      />

      <main className="flex-1 overflow-y-auto min-h-screen">
        {usuario.rol === 'GERENTE' ? (
          vistaActual === 'usuarios' ? (
            <AdministracionUsuarios usuario={usuario} />
          ) : (
            <PanelGerente
              usuario={usuario}
              onIrAUsuarios={() => setVistaActual('usuarios')}
            />
          )
        ) : !cajaAbierta ? (
          <RecepcionHermes
            usuario={usuario}
            onCajaAbierta={handleCajaAbierta}
            onIrAOperaciones={() => {
              sessionStorage.setItem('pagaopiu_vista', 'buscar');
              setVistaActualState('buscar');
            }}
          />
        ) : (
          <>
            {vistaActual === 'buscar' && (
              <BuscarCliente
                onIniciarPrestamo={handleIniciarPrestamo}
                onVerPrestamo={(id) => {
                  setPrestamoSeleccionadoId(id);
                  setVistaActual('cobranza');
                }}
              />
            )}

            {vistaActual === 'registrar' && (
              <RegistrarPrestamo
                dniInicial={datosCliente.dni}
                nombreInicial={datosCliente.nombre}
                fechaNacInicial={datosCliente.fechaNac}
                representanteInicial={datosCliente.representanteLegal}
                dniRepInicial={datosCliente.dniRepresentante}
                cargoRepInicial={datosCliente.cargoRepresentante}
                direccionInicial={datosCliente.direccionEmpresa}
                onPrestamoRegistrado={(id) => {
                  setPrestamoSeleccionadoId(id);
                  setVistaActual('cobranza');
                }}
                onCancelar={() => setVistaActual('buscar')}
              />
            )}

            {vistaActual === 'cobranza' && (
              <CobranzaPagos
                usuario={usuario}
                prestamoInicialId={prestamoSeleccionadoId}
                onVerDetalleCompleto={(id) => {
                  setPrestamoSeleccionadoId(id);
                  setVistaActual('detalle');
                }}
                onRetomarContrato={handleRetomarContrato}
              />
            )}

            {vistaActual === 'caja' && (
              <RecepcionHermes
                usuario={usuario}
                onCajaAbierta={handleCajaAbierta}
                onIrAOperaciones={() => {
                  sessionStorage.setItem('pagaopiu_vista', 'buscar');
                  setVistaActualState('buscar');
                }}
              />
            )}

            {vistaActual === 'detalle' && (
              <DetallePrestamo
                prestamoId={prestamoSeleccionadoId}
                onVolver={() => setVistaActual('cobranza')}
                onNuevoPrestamo={() => {
                  setDatosCliente({ dni: '', nombre: '' });
                  setVistaActual('registrar');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modal de Cambio de Contraseña activado desde Ajustes */}
      {mostrarModalPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 max-w-sm w-full shadow-lg">
            <h2 className="text-base font-semibold text-[#2A2220] mb-1">Cambiar contraseña</h2>
            <p className="text-xs text-[#6E625B] mb-4">Ingresa tu contraseña actual y la nueva clave (mín. 6 caracteres).</p>

            {errorPassword && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {errorPassword}
              </div>
            )}

            {exitoPassword && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                {exitoPassword}
              </div>
            )}

            <form onSubmit={handleCambiarPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">Contraseña actual</label>
                <input
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={passwordNuevo}
                  onChange={(e) => setPasswordNuevo(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={passwordConfirmacion}
                  onChange={(e) => setPasswordConfirmacion(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalPassword(false)}
                  className="h-8 px-3 text-xs rounded-lg border border-[#E3D3C2] text-[#6E625B] hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPassword}
                  className="h-8 px-3.5 text-xs font-medium rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer"
                >
                  {guardandoPassword ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
