const envBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.API_BASE_URL || '').replace(/\/+$/, '');
const BASE_URL = envBase ? (envBase.endsWith('/api') ? envBase : `${envBase}/api`) : '/api';

async function request(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const defaultHeaders = isFormData ? {} : {
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
  contratos: {
    generar: (data) =>
      request('/contratos/generar', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    obtener: (id) => request(`/contratos/${id}`),
    imprimir: (id) =>
      request(`/contratos/${id}/imprimir`, {
        method: 'POST',
      }),
    cancelar: (id, motivo) =>
      request(`/contratos/${id}/cancelar`, {
        method: 'POST',
        body: JSON.stringify(motivo ? { motivo } : {}),
      }),
    subirFirmado: (id, numeroContrato, archivo) => {
      const formData = new FormData();
      formData.append('numeroContrato', numeroContrato);
      formData.append('archivo', archivo);
      return request(`/contratos/${id}/subir-firmado`, {
        method: 'POST',
        body: formData,
      });
    },
    listarEnEspera: () => request('/contratos/en-espera'),
    descargar: async (id) => {
      const response = await fetch(`${BASE_URL}/contratos/${id}/descargar`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const errorMsg = (data && data.error) || (data && data.message) || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }
      return await response.blob();
    },
    firmaGerenteBlob: async () => {
      const response = await fetch(`${BASE_URL}/contratos/firma-gerente`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        return null;
      }
      return await response.blob();
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
    obtener: (id) => request(`/pago/${id}`),
  },
  panel: {
    obtener: () => request('/panel'),
  },
};

api.contrato = api.contratos;
