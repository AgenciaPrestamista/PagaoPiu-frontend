import React, { useState } from 'react';

export default function Navbar({ usuario, onLogout, vistaActual, setVistaActual, onAbrirCambiarPassword }) {
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
      <nav className="flex-1 p-3.5 space-y-1.5">
        {usuario.rol === 'GERENTE' && (
          <div className="px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-[#823B20] text-white flex items-center justify-between">
            <span>Panel gerencial</span>
            <span className="w-2 h-2 rounded-full bg-[#E0B25A]"></span>
          </div>
        )}

        {usuario.rol === 'ASESOR' && (
          <>
            <button
              type="button"
              onClick={() => setVistaActual('buscar')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                vistaActual === 'buscar'
                  ? 'bg-[#823B20] text-white font-semibold'
                  : 'text-[#F6E6DC] hover:bg-[#823B20]/60 hover:text-white'
              }`}
            >
              Consulta de clientes
            </button>
            <button
              type="button"
              onClick={() => setVistaActual('registrar')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                vistaActual === 'registrar'
                  ? 'bg-[#823B20] text-white font-semibold'
                  : 'text-[#F6E6DC] hover:bg-[#823B20]/60 hover:text-white'
              }`}
            >
              Nuevo préstamo
            </button>
            <button
              type="button"
              onClick={() => setVistaActual('cobranza')}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                vistaActual === 'cobranza'
                  ? 'bg-[#823B20] text-white font-semibold'
                  : 'text-[#F6E6DC] hover:bg-[#823B20]/60 hover:text-white'
              }`}
            >
              Cobranza y pagos
            </button>
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
