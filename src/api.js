const BASE_URL = import.meta.env.API_BASE_URL;

async function request(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = (data && data.error) || (data && data.message) || `Error ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  auth: {
    login: (username, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    me: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
    cambiarPassword: (passwordActual, passwordNuevo, passwordConfirmacion) =>
      request('/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify({ passwordActual, passwordNuevo, passwordConfirmacion }),
      }),
  },
  cliente: {
    buscar: (dni) => request(`/cliente/buscar?dni=${encodeURIComponent(dni)}`),
  },
  prestamo: {
    registrar: (data) =>
      request('/prestamo', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    obtener: (id) => request(`/prestamo/${id}`),
    listarPorClienteDni: (dni) => request(`/prestamo/cliente/${encodeURIComponent(dni)}`),
    listarRecientes: () => request('/prestamo/recientes'),
    simular: (capital, plazoMeses, fechaPrestamo) => {
      let url = `/prestamo/simular?capital=${capital}&plazoMeses=${plazoMeses}`;
      if (fechaPrestamo) {
        url += `&fechaPrestamo=${fechaPrestamo}`;
      }
      return request(url);
    },
  },
  pago: {
    pagarCuota: (prestamoId) =>
      request(`/pago/cuota/${prestamoId}`, {
        method: 'POST',
      }),
    cancelarAnticipado: (prestamoId) =>
      request(`/pago/cancelar/${prestamoId}`, {
        method: 'POST',
      }),
    listarPorPrestamo: (prestamoId) => request(`/pago/prestamo/${prestamoId}`),
  },
  panel: {
    obtener: () => request('/panel'),
  },
};
