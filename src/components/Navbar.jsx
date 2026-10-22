import React, { useState } from 'react';

export default function Navbar({
  usuario,
  cajaAbierta = true,
  cajaCerrada = false,
  onLogout,
  vistaActual,
  setVistaActual,
  onAbrirCambiarPassword,
}) {
  const [ajustesAbierto, setAjustesAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (!usuario) return null;

  const sucursalTexto = usuario.rol === 'GERENTE'
    ? 'Gerencia General'
    : (usuario.sucursalNombre ? `Agencia ${usuario.sucursalNombre}` : 'Asesor de Crédito');

  // Iniciales para el avatar
  const iniciales = (usuario.nombre || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  return (
    <>
    {/* Barra superior móvil */}
    <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-[#752F17] text-white flex items-center gap-3 px-4 shadow-sm">
      <button
        type="button"
        onClick={() => setMenuAbierto(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={menuAbierto}
        aria-controls="menu-lateral"
        className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer"
      >
        <i className="bi bi-list text-2xl"></i>
      </button>
      <i className="bi bi-bank2 text-lg"></i>
      <span className="font-bold tracking-tight">PagaOPiu</span>
      {!cajaAbierta && usuario.rol === 'ASESOR' && (
        <span className="ml-auto text-[10px] bg-[#E0B25A] text-[#2A2220] px-2 py-0.5 rounded font-bold uppercase tracking-wide">
          Caja cerrada
        </span>
      )}
    </header>

    {/* Fondo oscuro del menú móvil */}
    {menuAbierto && (
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/50"
        onClick={() => setMenuAbierto(false)}
        aria-hidden="true"
      ></div>
    )}

    <aside
      id="menu-lateral"
      onClick={(e) => { if (e.target.closest('nav button')) setMenuAbierto(false); }}
      className={`w-64 sidebar-bg text-white flex flex-col shrink-0 select-none border-r border-[#5C220E]/40 shadow-sm fixed inset-y-0 left-0 z-50 h-screen transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 md:z-auto ${
        menuAbierto ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Cabecera Institucional */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#5C220E]/30">
        <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-xs">
          <i className="bi bi-bank2 text-lg"></i>
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-white leading-tight truncate">
            PagaOPiu
          </h1>
          <p className="text-[10px] text-white/70 uppercase tracking-wider font-medium truncate">
            Créditos y Microfinanzas
          </p>
        </div>
      </div>

      {/* Navegación según Rol */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {usuario.rol === 'GERENTE' && (
          <>
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
              Supervisión
            </div>

            <button
              type="button"
              onClick={() => setVistaActual('panel')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                vistaActual === 'panel' || (!vistaActual || vistaActual === 'buscar')
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="bi bi-speedometer2 text-sm text-[#F1E4D6]"></i>
                <span>Panel gerencial</span>
              </div>
              {(vistaActual === 'panel' || (!vistaActual || vistaActual === 'buscar')) && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E0B25A]"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setVistaActual('usuarios')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                vistaActual === 'usuarios'
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="bi bi-people text-sm text-[#F1E4D6]"></i>
                <span>Administración de personal</span>
              </div>
              {vistaActual === 'usuarios' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E0B25A]"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setVistaActual('cierres')}
              aria-current={vistaActual === 'cierres' ? 'page' : undefined}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between focus-visible:outline-2 focus-visible:outline-[#E0B25A] ${
                vistaActual === 'cierres'
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="bi bi-safe2 text-sm text-[#F1E4D6]"></i>
                <span>Cierres de caja</span>
              </div>
              {vistaActual === 'cierres' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E0B25A]"></span>
              )}
            </button>
          </>
        )}

        {usuario.rol === 'ASESOR' && (
          <>
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
              Operaciones de Agencia
            </div>

            {/* Consulta de clientes */}
            <button
              type="button"
              disabled={!cajaAbierta}
              onClick={() => cajaAbierta && setVistaActual('buscar')}
              title={!cajaAbierta ? 'Caja cerrada: debe recepcionar la remesa Hermes para operar' : ''}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                !cajaAbierta
                  ? 'opacity-40 cursor-not-allowed text-white/60'
                  : vistaActual === 'buscar'
                  ? 'bg-white/15 text-white font-semibold cursor-pointer shadow-xs'
                  : 'text-white/80 hover:bg-white/10 hover:text-white cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="bi bi-search text-sm text-[#F1E4D6]"></i>
                <span>Consulta de clientes</span>
              </div>
              {!cajaAbierta && <i className="bi bi-lock-fill text-xs text-amber-300"></i>}
            </button>

            {/* Nuevo préstamo */}
            <button
              type="button"
              disabled={!cajaAbierta}
              onClick={() => cajaAbierta && setVistaActual('registrar')}
              title={!cajaAbierta ? 'Caja cerrada: debe recepcionar la remesa Hermes para operar' : ''}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                !cajaAbierta
                  ? 'opacity-40 cursor-not-allowed text-white/60'
                  : vistaActual === 'registrar'
                  ? 'bg-white/15 text-white font-semibold cursor-pointer shadow-xs'
                  : 'text-white/80 hover:bg-white/10 hover:text-white cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="bi bi-file-earmark-plus text-sm text-[#F1E4D6]"></i>
                <span>Nuevo préstamo</span>
              </div>
              {!cajaAbierta && <i className="bi bi-lock-fill text-xs text-amber-300"></i>}
            </button>

            {/* Cobranza y pagos */}
            <button
              type="button"
              disabled={!cajaAbierta}
              onClick={() => cajaAbierta && setVistaActual('cobranza')}
              title={!cajaAbierta ? 'Caja cerrada: debe recepcionar la remesa Hermes para operar' : ''}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                !cajaAbierta
                  ? 'opacity-40 cursor-not-allowed text-white/60'
                  : vistaActual === 'cobranza'
                  ? 'bg-white/15 text-white font-semibold cursor-pointer shadow-xs'
                  : 'text-white/80 hover:bg-white/10 hover:text-white cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="bi bi-cash-stack text-sm text-[#F1E4D6]"></i>
                <span>Cobranza y pagos</span>
              </div>
              {!cajaAbierta && <i className="bi bi-lock-fill text-xs text-amber-300"></i>}
            </button>

            <div className="px-3 pt-3 pb-1 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
              Caja y Bóveda
            </div>

            {/* Recepción Hermes (Caja) */}
            <button
              type="button"
              onClick={() => setVistaActual('caja')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                vistaActual === 'caja'
                  ? 'bg-white/15 text-white font-semibold ring-1 ring-[#E0B25A]/50 shadow-xs'
                  : !cajaAbierta
                  ? 'bg-amber-500/20 text-[#FFE5A3] font-semibold border border-[#E0B25A]/40'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="bi bi-safe text-sm text-[#F1E4D6]"></i>
                <span>{cajaCerrada ? 'Caja del día' : 'Recepción Hermes'}</span>
              </div>
              {!cajaAbierta ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                  cajaCerrada ? 'bg-white/20 text-white' : 'bg-[#E0B25A] text-[#2A2220]'
                }`}>
                  {cajaCerrada ? 'Cerrada' : 'Requerido'}
                </span>
              ) : (
                vistaActual === 'caja' && <span className="w-1.5 h-1.5 rounded-full bg-[#E0B25A]"></span>
              )}
            </button>

            {/* Banner si la caja está cerrada */}
            {!cajaAbierta && (
              <div className="mx-1 mt-3 p-3 rounded-xl bg-black/20 border border-amber-400/30 text-[11px] text-white/90 leading-relaxed shadow-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#FFE5A3] mb-1">
                  <i className="bi bi-shield-lock-fill text-xs text-amber-300"></i>
                  <span>{cajaCerrada ? 'Caja cerrada por hoy' : 'Apertura pendiente'}</span>
                </div>
                {cajaCerrada
                  ? 'Las operaciones se habilitan mañana al recibir la remesa de Hermes.'
                  : 'Recepcione la remesa diaria de Hermes para habilitar las operaciones de agencia.'}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Perfil de Usuario y Pie */}
      <div className="p-3 border-t border-white/10 bg-[#5C220E]/40 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-xs font-bold text-[#F1E4D6] shrink-0">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate leading-tight">
              {usuario.nombre}
            </div>
            <div className="text-[10px] text-white/70 truncate leading-tight">
              {sucursalTexto}
            </div>
          </div>
        </div>

        {/* Menú de Ajustes / Contraseña */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setAjustesAbierto(!ajustesAbierto)}
            className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <i className="bi bi-gear text-xs text-white/70"></i>
              <span>Configuración</span>
            </div>
            <i className={`bi bi-chevron-${ajustesAbierto ? 'up' : 'down'} text-[10px] text-white/60`}></i>
          </button>

          {ajustesAbierto && (
            <div className="pl-4 pr-1 py-1 space-y-1 border-l border-white/15 ml-3">
              <button
                type="button"
                onClick={() => {
                  setAjustesAbierto(false);
                  if (onAbrirCambiarPassword) onAbrirCambiarPassword();
                }}
                className="w-full text-left px-2 py-1 rounded text-xs text-white/85 hover:text-white hover:bg-white/10 transition flex items-center gap-2 cursor-pointer"
              >
                <i className="bi bi-key text-xs"></i>
                <span>Cambiar contraseña</span>
              </button>
            </div>
          )}
        </div>

        {/* Cerrar Sesión */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-rose-200 hover:bg-rose-500/20 transition flex items-center gap-2 cursor-pointer"
        >
          <i className="bi bi-box-arrow-right text-xs"></i>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
    </>
  );
}
