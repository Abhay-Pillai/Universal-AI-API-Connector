async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options
  });
  let data;
  try { data = await res.json(); } catch (e) { data = { success: false, error: 'Invalid server response' }; }
  if (res.status === 401 && !location.pathname.endsWith('index.html') && location.pathname !== '/') {
    location.href = '/index.html';
  }
  return { status: res.status, ...data };
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}
