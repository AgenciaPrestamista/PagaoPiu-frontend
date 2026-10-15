import React, { useState } from 'react';
import { api } from '../api';

export default function Login({ onLoginExitoso }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  const seleccionarDemo = (u) => {
    setUsername(u);
  };

  return (
    <div className="min-h-screen bg-[#FBF6F0] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#2A2220]">PagaOPiu</h1>
          <p className="mt-1 text-sm text-[#6E625B]">Sistema institucional de créditos y cobranzas</p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm border border-[#E3D3C2] rounded-xl sm:px-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-[#2A2220] mb-1">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                autoFocus
                placeholder="Nombre de usuario"
                className="w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] placeholder:text-[#6E625B]/60 focus:outline-none focus:border-[#9C4A2B] transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[#2A2220] mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="Contraseña"
                className="w-full h-10 px-3 text-sm rounded-lg border border-[#E3D3C2] bg-white text-[#2A2220] placeholder:text-[#6E625B]/60 focus:outline-none focus:border-[#9C4A2B] transition"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full h-10 mt-2 rounded-lg bg-[#9C4A2B] text-white text-sm font-medium hover:bg-[#823B20] focus:outline-none focus:ring-2 focus:ring-[#9C4A2B] focus:ring-offset-2 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E3D3C2]/40">
            <span className="block text-[11px] font-medium text-[#6E625B] uppercase tracking-wider mb-2">
              Accesos de demostración
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Gerente', user: 'gerente' },
                { label: 'Chimbote', user: 'asesor.chimbote' },
                { label: 'Trujillo', user: 'asesor.trujillo' },
                { label: 'Chiclayo', user: 'asesor.chiclayo' },
                { label: 'Piura', user: 'asesor.piura' },
                { label: 'Tumbes', user: 'asesor.tumbes' },
              ].map(({ label, user }) => (
                <button
                  key={user}
                  type="button"
                  onClick={() => seleccionarDemo(user)}
                  className="py-1 px-2 text-[11px] font-medium rounded-md border border-[#E3D3C2] text-[#6E625B] hover:bg-[#FBF6F0] hover:text-[#2A2220] transition cursor-pointer text-center truncate"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
