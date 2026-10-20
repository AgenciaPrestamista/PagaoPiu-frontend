import React, { useState } from 'react';

export default function Navbar({
  usuario,
  cajaAbierta = true,
  onLogout,
  vistaActual,
  setVistaActual,
  onAbrirCambiarPassword,
}) {
  const [ajustesAbierto, setAjustesAbierto] = useState(false);

  if (!usuario) return null;

  const sucursalTexto = usuario.rol === 'GERENTE'
    ? 'Gerencia general'
    : (usuario.sucursalNombre ? `Agencia ${usuario.sucursalNombre}` : 'Asesor');

  return (
    <aside className="w-64 bg-[#9C4A2B] text-white flex flex-col min-h-screen shrink-0 sticky top-0 h-screen select-none border-r border-[#823B20]">
      {/* Cabecera del Panel Izquierdo */}
      <div className="p-5 border-b border-[#823B20]">
        <h1 className="text-xl font-bold tracking-tight text-white">PagaOPiu</h1>
        <p className="text-xs text-[#F6E6DC] mt-0.5">Sistema de Gestión de Créditos</p>
      </div>

      {/* Navegación según Rol */}
      <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
        {usuario.rol === 'GERENTE' && (
          <>
            <button
              type="button"
              onClick={() => setVistaActual('panel')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                vistaActual === 'panel' || (!vistaActual || vistaActual === 'buscar')
                  ? 'bg-[#823B20] text-white font-semibold'
                  : 'text-[#F6E6DC] hover:bg-[#823B20]/60 hover:text-white'
              }`}
            >
              <span>Panel gerencial</span>
              {(vistaActual === 'panel' || (!vistaActual || vistaActual === 'buscar')) && (
                <span className="w-2 h-2 rounded-full bg-[#E0B25A]"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setVistaActual('usuarios')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                vistaActual === 'usuarios'
                  ? 'bg-[#823B20] text-white font-semibold'
                  : 'text-[#F6E6DC] hover:bg-[#823B20]/60 hover:text-white'
              }`}
            >
              <span>Administración de usuarios</span>
              {vistaActual === 'usuarios' && (
                <span className="w-2 h-2 rounded-full bg-[#E0B25A]"></span>
              )}
            </button>
          </>
        )}

        {usuario.rol === 'ASESOR' && (
          <>
            {/* Pestaña: Consulta de clientes */}
            <button
              type="button"
              disabled={!cajaAbierta}
              onClick={() => cajaAbierta && setVistaActual('buscar')}
              title={!cajaAbierta ? 'Caja cerrada: debe recepcionar la remesa Hermes para operar' : ''}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                !cajaAbierta
                  ? 'opacity-40 cursor-not-allowed text-[#F6E6DC]'
                  : vistaActual === 'buscar'
                  ? 'bg-[#823B20] text-white font-semibold cursor-pointer'
                  : 'text-[#F6E6DC] hover:bg-[#823B20]/60 hover:text-white cursor-pointer'
              }`}
            >
              <span>Consulta de clientes</span>
              {!cajaAbierta && <span className="text-xs opacity-75">🔒</span>}
            </button>

            {/* Pestaña: Nuevo préstamo */}
            <button
              type="button"
              disabled={!cajaAbierta}
              onClick={() => cajaAbierta && setVistaActual('registrar')}
              title={!cajaAbierta ? 'Caja cerrada: debe recepcionar la remesa Hermes para operar' : ''}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                !cajaAbierta
                  ? 'opacity-40 cursor-not-allowed text-[#F6E6DC]'
                  : vistaActual === 'registrar'
                  ? 'bg-[#823B20] text-white font-semibold cursor-pointer'
                  : 'text-[#F6E6DC] hover:bg-[#823B20]/60 hover:text-white cursor-pointer'
              }`}
            >
              <span>Nuevo préstamo</span>
              {!cajaAbierta && <span className="text-xs opacity-75">🔒</span>}
            </button>

            {/* Pestaña: Cobranza y pagos */}
            <button
              type="button"
              disabled={!cajaAbierta}
              onClick={() => cajaAbierta && setVistaActual('cobranza')}
              title={!cajaAbierta ? 'Caja cerrada: debe recepcionar la remesa Hermes para operar' : ''}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                !cajaAbierta
                  ? 'opacity-40 cursor-not-allowed text-[#F6E6DC]'
                  : vistaActual === 'cobranza'
                  ? 'bg-[#823B20] text-white font-semibold cursor-pointer'
                  : 'text-[#F6E6DC] hover:bg-[#823B20]/60 hover:text-white cursor-pointer'
              }`}
            >
              <span>Cobranza y pagos</span>
              {!cajaAbierta && <span className="text-xs opacity-75">🔒</span>}
            </button>

            {/* Pestaña: Recepción Hermes (Caja) */}
            <button
              type="button"
              onClick={() => setVistaActual('caja')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                vistaActual === 'caja'
                  ? 'bg-[#823B20] text-white font-semibold ring-1 ring-[#E0B25A]/50'
                  : !cajaAbierta
                  ? 'bg-[#823B20]/70 text-[#FFE5A3] font-semibold border border-[#E0B25A]/50'
                  : 'text-[#F6E6DC] hover:bg-[#823B20]/60 hover:text-white'
              }`}
            >
              <span>Recepción Hermes (Caja)</span>
              {!cajaAbierta ? (
                <span className="text-[10px] bg-[#E0B25A] text-[#2A2220] px-1.5 py-0.5 rounded-full font-bold">
                  Requerido
                </span>
              ) : (
                vistaActual === 'caja' && <span className="w-2 h-2 rounded-full bg-[#E0B25A]"></span>
              )}
            </button>

            {/* Aviso visual en el Navbar si la caja está cerrada */}
            {!cajaAbierta && (
              <div className="mx-1 mt-3 p-3 rounded-xl bg-[#823B20]/80 border border-[#E0B25A]/40 text-[11px] text-[#F6E6DC] leading-relaxed shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#FFE5A3] mb-1">
                  <span>🔒</span>
                  <span>Caja cerrada</span>
                </div>
                Recepcione la remesa Hermes para desbloquear las operaciones de la agencia.
              </div>
            )}
          </>
        )}
      </nav>

      {/* Sección Inferior: Usuario, Ajustes y Cerrar Sesión */}
      <div className="p-4 border-t border-[#823B20] space-y-2">
        <div className="px-2 py-1 text-xs">
          <div className="font-semibold text-white truncate">{usuario.nombre}</div>
          <div className="text-[#F6E6DC] text-[11px] truncate">{sucursalTexto}</div>
        </div>

        {/* Botón Ajustes */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setAjustesAbierto(!ajustesAbierto)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#F6E6DC] hover:text-white hover:bg-[#823B20] transition flex items-center justify-between cursor-pointer"
          >
            <span>Ajustes</span>
            <span className="text-[10px]">{ajustesAbierto ? '▲' : '▼'}</span>
          </button>

          {ajustesAbierto && (
            <div className="pl-2 pt-0.5 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setAjustesAbierto(false);
                  if (onAbrirCambiarPassword) onAbrirCambiarPassword();
                }}
                className="w-full text-left px-3 py-1.5 rounded-md text-xs text-[#F6E6DC] hover:text-white hover:bg-[#823B20] transition cursor-pointer"
              >
                Cambiar contraseña
              </button>
            </div>
          )}
        </div>

        {/* Debajo de Ajustes: Cerrar Sesión */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#F6E6DC] hover:text-white hover:bg-[#823B20] transition cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
