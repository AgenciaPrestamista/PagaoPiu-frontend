import React, { useState } from 'react';
import { api } from '../api';

export default function Login({ onLoginExitoso }) {
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
    <div className="min-h-screen bg-[#F4EFEB] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo e Identidad Corporativa */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#752F17] text-white shadow-md mb-4 ring-4 ring-white/60">
            <i className="bi bi-bank2 text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F1B1A]">
            PagaOPiu
          </h1>
          <p className="mt-1 text-xs text-[#655E5A] font-medium tracking-wide uppercase">
            Plataforma Institucional de Créditos y Cobranzas
          </p>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200/90 rounded-2xl sm:px-10">
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
  );
}
