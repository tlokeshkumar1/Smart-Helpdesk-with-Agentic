import fetch from 'node-fetch';

export async function httpPostJson(url, body, { timeoutMs = 8000, headers = {} } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      const e = new Error(`HTTP ${res.status}`);
      e.status = res.status;
      e.data = data;
      throw e;
    }
    
    return data;
  } finally { 
    clearTimeout(t); 
  }
}
