import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdministracionUsuarios({ usuario }) {
  const [usuarios, setUsuarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');

  // Modal Crear Usuario
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoUsername, setNuevoUsername] = useState('');
  const [nuevoRol, setNuevoRol] = useState('ASESOR');
  const [nuevaSucursalId, setNuevaSucursalId] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [errorModalCrear, setErrorModalCrear] = useState(null);

  // Modal Restablecer Contraseña
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [passwordReset, setPasswordReset] = useState('');
  const [passwordResetConfirm, setPasswordResetConfirm] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [errorModalPassword, setErrorModalPassword] = useState(null);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const [listaUsuarios, listaSucursales] = await Promise.all([
        api.usuarios.listar(),
        api.sucursales.listar().catch(() => []),
      ]);
      setUsuarios(listaUsuarios || []);
      setSucursales(listaSucursales || []);
    } catch (err) {
      setError(err.message || 'Error al cargar la lista de usuarios.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const notificarExito = (msg) => {
    setMensajeExito(msg);
    setTimeout(() => {
      setMensajeExito(null);
    }, 4000);
  };

  // Manejo de Crear Cuenta
  const handleAbrirCrear = () => {
    setNuevoNombre('');
    setNuevoUsername('');
    setNuevoRol('ASESOR');
    setNuevaSucursalId(sucursales.length > 0 ? String(sucursales[0].id) : '');
    setNuevoPassword('');
    setConfirmarPassword('');
    setErrorModalCrear(null);
    setModalCrearAbierto(true);
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setErrorModalCrear(null);

    const nom = nuevoNombre.trim();
    const user = nuevoUsername.trim().toLowerCase();
    const pass = nuevoPassword.trim();

    if (!nom) {
      setErrorModalCrear('El nombre completo es obligatorio.');
      return;
    }
    if (!user) {
      setErrorModalCrear('El nombre de usuario es obligatorio.');
      return;
    }
    if (user.includes(' ')) {
      setErrorModalCrear('El nombre de usuario no puede contener espacios.');
      return;
    }
    if (pass.length < 6) {
      setErrorModalCrear('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pass !== confirmarPassword.trim()) {
      setErrorModalCrear('Las contraseñas no coinciden.');
      return;
    }
    if (nuevoRol === 'ASESOR' && !nuevaSucursalId) {
      setErrorModalCrear('Debe asignar una sucursal para un asesor.');
      return;
    }

    setGuardandoUsuario(true);
    try {
      const data = {
        nombre: nom,
        username: user,
        rol: nuevoRol,
        sucursalId: nuevaSucursalId ? Number(nuevaSucursalId) : null,
        password: pass,
      };
      await api.usuarios.crear(data);
      setModalCrearAbierto(false);
      notificarExito(`¡Cuenta para el usuario '${user}' creada exitosamente!`);
      await cargarDatos();
    } catch (err) {
      setErrorModalCrear(err.message || 'Error al crear el usuario.');
    } finally {
      setGuardandoUsuario(false);
    }
  };

  // Manejo de Activar / Desactivar
  const handleToggleActivo = async (u) => {
    if (u.username === usuario?.username) {
      alert('No puedes desactivar tu propia cuenta en uso.');
      return;
    }

    const accion = u.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} la cuenta de '${u.username}'?`)) {
      return;
    }

    try {
      await api.usuarios.cambiarEstado(u.id, !u.activo);
      notificarExito(`Cuenta de '${u.username}' ${u.activo ? 'desactivada' : 'activada'} correctamente.`);
      await cargarDatos();
    } catch (err) {
      alert(err.message || `No se pudo ${accion} la cuenta.`);
    }
  };

  // Manejo de Reset Password
  const handleAbrirReset = (u) => {
    setUsuarioSeleccionado(u);
    setPasswordReset('');
    setPasswordResetConfirm('');
    setErrorModalPassword(null);
    setModalPasswordAbierto(true);
  };

  const handleGuardarResetPassword = async (e) => {
    e.preventDefault();
    setErrorModalPassword(null);

    const pass = passwordReset.trim();
    if (pass.length < 6) {
      setErrorModalPassword('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (pass !== passwordResetConfirm.trim()) {
      setErrorModalPassword('Las contraseñas no coinciden.');
      return;
    }

    setGuardandoPassword(true);
    try {
      await api.usuarios.resetPassword(usuarioSeleccionado.id, pass);
      setModalPasswordAbierto(false);
      notificarExito(`Contraseña de '${usuarioSeleccionado.username}' restablecida con éxito.`);
    } catch (err) {
      setErrorModalPassword(err.message || 'Error al restablecer contraseña.');
    } finally {
      setGuardandoPassword(false);
    }
  };

  // Filtrado de usuarios
  const usuariosFiltrados = usuarios.filter((u) => {
    const texto = `${u.nombre || ''} ${u.username || ''}`.toLowerCase();
    const coincideBusqueda = !busqueda || texto.includes(busqueda.toLowerCase());
    const coincideRol = !filtroRol || u.rol === filtroRol;
    const coincideSucursal = !filtroSucursal || String(u.sucursalId) === filtroSucursal;
    return coincideBusqueda && coincideRol && coincideSucursal;
  });

  // Estadísticas rápidas
  const totalUsuarios = usuarios.length;
  const totalAsesores = usuarios.filter((u) => u.rol === 'ASESOR').length;
  const totalGerentes = usuarios.filter((u) => u.rol === 'GERENTE').length;
  const totalInactivos = usuarios.filter((u) => !u.activo).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2A2220]">
            Administración de Usuarios y Cuentas
          </h1>
          <p className="text-xs text-[#6E625B] mt-0.5">
            Creación de credenciales, asignación de agencias operativas y control de accesos · Gerencia General
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleAbrirCrear}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#9C4A2B] text-white hover:bg-[#823B20] transition shadow-sm cursor-pointer"
          >
            <span className="text-sm leading-none">➕</span>
            Crear nueva cuenta
          </button>
        </div>
      </div>

      {/* Notificaciones */}
      {mensajeExito && (
        <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span className="font-medium">{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={cargarDatos}
            className="font-medium underline hover:text-red-900 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tarjetas de Resumen KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
          <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
            Total Cuentas
          </span>
          <span className="text-2xl font-bold tracking-tight text-[#2A2220] font-mono">
            {totalUsuarios}
          </span>
          <span className="block text-[11px] text-[#6E625B] mt-1">Registradas en el sistema</span>
        </div>

        <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
          <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
            Asesores de Crédito
          </span>
          <span className="text-2xl font-bold tracking-tight text-blue-700 font-mono">
            {totalAsesores}
          </span>
          <span className="block text-[11px] text-[#6E625B] mt-1">En agencias norte</span>
        </div>

        <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
          <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
            Gerencia General
          </span>
          <span className="text-2xl font-bold tracking-tight text-amber-700 font-mono">
            {totalGerentes}
          </span>
          <span className="block text-[11px] text-[#6E625B] mt-1">Supervisión integral</span>
        </div>

        <div className="bg-white rounded-xl border border-[#E3D3C2] p-4">
          <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-1">
            Cuentas Inactivas
          </span>
          <span className={`text-2xl font-bold tracking-tight font-mono ${totalInactivos > 0 ? 'text-red-700' : 'text-[#2A2220]'}`}>
            {totalInactivos}
          </span>
          <span className="block text-[11px] text-[#6E625B] mt-1">Acceso revocado</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#6E625B] uppercase tracking-wider mb-1">
              Buscar usuario o nombre
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej: asesor.piura o José..."
              className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6E625B] uppercase tracking-wider mb-1">
              Filtrar por Rol
            </label>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
            >
              <option value="">Todos los roles</option>
              <option value="ASESOR">ASESOR</option>
              <option value="GERENTE">GERENTE</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6E625B] uppercase tracking-wider mb-1">
              Filtrar por Agencia
            </label>
            <select
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
            >
              <option value="">Todas las agencias</option>
              {sucursales.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  Agencia {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl border border-[#E3D3C2] overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-[#E3D3C2] flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2A2220]">
            Cuentas del Personal ({usuariosFiltrados.length})
          </h2>
          <button
            type="button"
            onClick={cargarDatos}
            className="text-xs text-[#9C4A2B] hover:underline font-medium cursor-pointer"
          >
            🔄 Actualizar lista
          </button>
        </div>

        {cargando && usuarios.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-6 h-6 border-2 border-[#E3D3C2] border-t-[#9C4A2B] rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-xs text-[#6E625B]">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F1E4D6] border-b border-[#E3D3C2] text-[11px] font-semibold text-[#2A2220] uppercase tracking-wider">
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4 text-center">Rol</th>
                  <th className="py-3 px-4">Agencia Asignada</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-end">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D3C2]/40">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#6E625B]">
                      No se encontraron cuentas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((u) => {
                    const esPropio = u.username === usuario?.username;
                    return (
                      <tr key={u.id} className="hover:bg-[#FFF4E6]/40 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-[#2A2220]">
                          <span className="px-2 py-0.5 rounded bg-[#F1E4D6] border border-[#E3D3C2]">
                            {u.username}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#2A2220]">
                          {u.nombre}
                          {esPropio && (
                            <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-normal">
                              Tú
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.rol === 'GERENTE' ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              GERENTE
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              ASESOR
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#2A2220]">
                          {u.sucursalNombre ? (
                            <span className="font-medium">Agencia {u.sucursalNombre}</span>
                          ) : (
                            <span className="text-[#6E625B] italic">Todas (Alcance Global)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.activo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-end">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAbrirReset(u)}
                              className="px-2.5 py-1 text-[11px] rounded border border-[#E3D3C2] text-[#6E625B] hover:text-[#2A2220] hover:bg-slate-50 transition cursor-pointer"
                              title="Restablecer contraseña"
                            >
                              🔑 Clave
                            </button>

                            <button
                              type="button"
                              disabled={esPropio}
                              onClick={() => handleToggleActivo(u)}
                              className={`px-2.5 py-1 text-[11px] rounded border font-medium transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                u.activo
                                  ? 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                                  : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                              title={esPropio ? 'No puedes desactivar tu propia cuenta' : (u.activo ? 'Desactivar cuenta' : 'Activar cuenta')}
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Nueva Cuenta */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 max-w-md w-full shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3D3C2] mb-4">
              <div>
                <h2 className="text-base font-bold text-[#2A2220]">Crear Nueva Cuenta</h2>
                <p className="text-xs text-[#6E625B]">Registra un nuevo asesor o gerente en la plataforma.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalCrearAbierto(false)}
                className="text-[#6E625B] hover:text-[#2A2220] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorModalCrear && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {errorModalCrear}
              </div>
            )}

            <form onSubmit={handleCrearUsuario} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">
                  Nombre completo <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pedro Ruiz Mendoza"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">
                  Nombre de usuario (Login) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: asesor.huanchaco (sin espacios)"
                  value={nuevoUsername}
                  onChange={(e) => setNuevoUsername(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220] font-mono"
                />
                <span className="text-[10px] text-[#6E625B] mt-0.5 block">
                  Identificador único para iniciar sesión.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-[#2A2220] mb-1">
                    Rol <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={nuevoRol}
                    onChange={(e) => {
                      const r = e.target.value;
                      setNuevoRol(r);
                      if (r === 'GERENTE') {
                        setNuevaSucursalId('');
                      } else if (!nuevaSucursalId && sucursales.length > 0) {
                        setNuevaSucursalId(String(sucursales[0].id));
                      }
                    }}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                  >
                    <option value="ASESOR">ASESOR</option>
                    <option value="GERENTE">GERENTE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A2220] mb-1">
                    Agencia {nuevoRol === 'ASESOR' && <span className="text-red-600">*</span>}
                  </label>
                  <select
                    disabled={nuevoRol === 'GERENTE'}
                    value={nuevaSucursalId}
                    onChange={(e) => setNuevaSucursalId(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220] disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {nuevoRol === 'GERENTE' ? (
                      <option value="">Global (Todas las sedes)</option>
                    ) : (
                      <>
                        <option value="" disabled>Seleccione agencia</option>
                        {sucursales.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.nombre}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">
                  Contraseña inicial <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={nuevoPassword}
                    onChange={(e) => setNuevoPassword(e.target.value)}
                    className="w-full h-9 px-3 pr-10 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6E625B] hover:text-[#2A2220]"
                  >
                    {mostrarPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">
                  Confirmar contraseña <span className="text-red-600">*</span>
                </label>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  placeholder="Repite la contraseña"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3D3C2]">
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  className="h-8 px-3.5 text-xs rounded-lg border border-[#E3D3C2] text-[#6E625B] hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoUsuario}
                  className="h-8 px-4 text-xs font-semibold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer"
                >
                  {guardandoUsuario ? 'Guardando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Restablecer Contraseña */}
      {modalPasswordAbierto && usuarioSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-[#E3D3C2] p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-base font-bold text-[#2A2220] mb-1">
              Restablecer Contraseña
            </h2>
            <p className="text-xs text-[#6E625B] mb-3">
              Usuario: <strong className="font-mono text-[#2A2220]">{usuarioSeleccionado.username}</strong> ({usuarioSeleccionado.nombre})
            </p>

            {errorModalPassword && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {errorModalPassword}
              </div>
            )}

            <form onSubmit={handleGuardarResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">
                  Nueva contraseña (mín. 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  value={passwordReset}
                  onChange={(e) => setPasswordReset(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2A2220] mb-1">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  value={passwordResetConfirm}
                  onChange={(e) => setPasswordResetConfirm(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E3D3C2] focus:outline-none focus:border-[#9C4A2B] bg-white text-[#2A2220]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalPasswordAbierto(false)}
                  className="h-8 px-3 text-xs rounded-lg border border-[#E3D3C2] text-[#6E625B] hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPassword}
                  className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition disabled:opacity-50 cursor-pointer"
                >
                  {guardandoPassword ? 'Guardando...' : 'Actualizar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
