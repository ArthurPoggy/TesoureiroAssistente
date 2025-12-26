// Serviço de API centralizado

export const fetchJSON = async (url, options = {}) => {
  const config = { ...options };
  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }
  const headers = { ...(options.headers || {}) };
  if (config.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (Object.keys(headers).length) {
    config.headers = headers;
  }
  const response = await fetch(url, config);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Não foi possível completar a ação.');
  }
  return response.json();
};

export const downloadBinary = async (url, filename, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error('Falha ao gerar arquivo');
  }
  const blob = await res.blob();
  const fileUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(fileUrl);
};

// Cria uma instância de API com token
export const createApiClient = (token) => {
  return async (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetchJSON(url, { ...options, headers });
  };
};
