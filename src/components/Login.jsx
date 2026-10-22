import React, { useState } from 'react';
import { api } from '../api';

export default function Login({ onLoginExitoso, aviso = '' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const data = await api.auth.login(username, password);
      onLoginExitoso(data);
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panel de marca (solo escritorio) */}
      <aside className="sidebar-bg relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/12 border border-white/25 flex items-center justify-center backdrop-blur-sm">
            <i className="bi bi-bank2 text-xl"></i>
          </div>
          <span className="text-lg font-bold tracking-tight">PagaOPiu</span>
        </div>

        <div className="max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E0B25A] mb-4">
            Créditos y microfinanzas
          </p>
          <h2 className="titulo-display text-4xl leading-[1.1] mb-5">
            Cada préstamo, cada cuota y cada caja bajo control.
          </h2>
          <p className="text-sm text-white/75 leading-relaxed">
            Formalización crediticia, cobranza y cierre diario de caja de todas las agencias en una sola plataforma.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-3">
              <i className="bi bi-shield-check text-[#E0B25A]"></i>
              Validación de clientes con RENIEC y SUNAT
            </li>
            <li className="flex items-center gap-3">
              <i className="bi bi-safe2 text-[#E0B25A]"></i>
              Apertura y cierre de caja por agencia
            </li>
            <li className="flex items-center gap-3">
              <i className="bi bi-file-earmark-text text-[#E0B25A]"></i>
              Contratos y comprobantes en línea
            </li>
          </ul>
        </div>

        <p className="text-xs text-white/50">Plataforma institucional de créditos y cobranzas</p>

        {/* Círculos decorativos */}
        <div className="pointer-events-none absolute -bottom-32 -right-24 w-96 h-96 rounded-full border border-white/10"></div>
        <div className="pointer-events-none absolute -bottom-16 -right-8 w-64 h-64 rounded-full border border-white/10"></div>
      </aside>

      {/* Columna del formulario */}
      <div className="min-h-screen lg:min-h-0 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-16">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Identidad compacta (móvil) */}
        <div className="text-center mb-8 lg:hidden">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl sidebar-bg text-white shadow-md mb-4 ring-4 ring-white/60">
            <i className="bi bi-bank2 text-2xl"></i>
          </div>
          <h1 className="titulo-display text-3xl tracking-tight text-[#1F1B1A]">
            PagaOPiu
          </h1>
          <p className="mt-1 text-xs text-[#655E5A] font-medium tracking-wide uppercase">
            Plataforma Institucional de Créditos y Cobranzas
          </p>
        </div>

        <div className="hidden lg:block mb-8">
          <h1 className="titulo-display text-3xl text-[#1F1B1A]">Bienvenido</h1>
          <p className="mt-1.5 text-sm text-[#655E5A]">Ingrese con su usuario institucional para continuar.</p>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <div className="bg-white py-8 px-6 shadow-md border border-stone-200/90 rounded-2xl sm:px-10">
          <div className="mb-6 pb-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1F1B1A]">Iniciar Sesión</h2>
              <p className="text-xs text-[#655E5A]">Ingrese sus credenciales de empleado</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <i className="bi bi-shield-check text-xs"></i>
              Acceso Seguro
            </span>
          </div>

          {aviso && !error && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2" role="status">
              <i className="bi bi-clock-history text-amber-700 mt-0.5 shrink-0"></i>
              <span>{aviso}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2" role="alert">
              <i className="bi bi-exclamation-circle-fill text-rose-600 mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-[#1F1B1A] mb-1.5">
                Usuario Institucional
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <i className="bi bi-person text-sm"></i>
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
                  placeholder="ej. asesor.trujillo"
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-stone-300 bg-stone-50/50 text-[#1F1B1A] placeholder:text-stone-400 focus:outline-none focus:border-[#8D3B20] focus:bg-white focus:ring-2 focus:ring-[#8D3B20]/15 transition font-sans"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#1F1B1A] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <i className="bi bi-key text-sm"></i>
                </span>
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-10 text-sm rounded-xl border border-stone-300 bg-stone-50/50 text-[#1F1B1A] placeholder:text-stone-400 focus:outline-none focus:border-[#8D3B20] focus:bg-white focus:ring-2 focus:ring-[#8D3B20]/15 transition font-sans"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  <i className={`bi bi-eye${mostrarPassword ? '-slash' : ''} text-sm`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full h-10 mt-3 rounded-xl bg-[#752F17] hover:bg-[#5C220E] text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#752F17] focus:ring-offset-2 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {cargando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right text-sm"></i>
                  <span>Ingresar a la Plataforma</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stone-100 text-center">
            <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
              <i className="bi bi-lock text-[10px]"></i>
              Cifrado SHA-256 / SSL de Alta Seguridad Bancaria
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
