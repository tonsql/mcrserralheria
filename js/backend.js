(() => {
  'use strict';

  const cfg = window.MCR_SUPABASE || {};
  const baseUrl = String(cfg.url || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  const apiKey = String(cfg.anonKey || '').trim();
  const configured = Boolean(
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl) &&
    apiKey &&
    !baseUrl.includes('COLE_AQUI') &&
    !apiKey.includes('COLE_AQUI')
  );

  const STORAGE_KEY = 'mcr_admin_session_v1';
  let session = loadSession();

  const cleanPhone = value => String(value || '').replace(/\D/g, '');
  const formatTrackingCode = value => {
    const raw = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const digits = raw.replace(/^MCR/, '').replace(/\D/g, '').slice(0, 4);
    return digits ? `MCR-${digits}` : '';
  };

  function loadSession(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
  }

  function saveSession(value){
    session = value || null;
    if(session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }

  function requireConfigured(){
    if(!configured) throw new Error('BACKEND_NOT_CONFIGURED');
  }

  function headers(auth = false, extra = {}){
    const h = {
      apikey: apiKey,
      'Content-Type': 'application/json',
      ...extra
    };
    if(auth && session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
    return h;
  }

  async function readError(response){
    let payload = null;
    try { payload = await response.json(); } catch {}
    const err = new Error(payload?.msg || payload?.message || payload?.error_description || payload?.error || `HTTP_${response.status}`);
    err.status = response.status;
    err.code = payload?.code || payload?.error_code || '';
    err.details = payload;
    return err;
  }

  async function request(path, options = {}, auth = false, retry = true){
    requireConfigured();
    if(auth) await ensureSession();
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: headers(auth, options.headers || {})
    });
    if(response.status === 401 && auth && retry && session?.refresh_token){
      const refreshed = await refreshSession().catch(() => null);
      if(refreshed) return request(path, options, auth, false);
    }
    if(!response.ok) throw await readError(response);
    if(response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function refreshSession(){
    if(!session?.refresh_token) return null;
    const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if(!response.ok){ saveSession(null); throw await readError(response); }
    const data = await response.json();
    saveSession(data);
    return data;
  }

  async function ensureSession(){
    if(!session?.access_token) throw new Error('AUTH_REQUIRED');
    if(session.expires_at && Number(session.expires_at) * 1000 < Date.now() + 30000){
      await refreshSession();
    }
    return session;
  }

  async function rpc(name, payload, auth = false){
    return request(`/rest/v1/rpc/${encodeURIComponent(name)}`, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    }, auth);
  }

  async function signIn(username, password){
    requireConfigured();
    const cleanUsername = String(username || '').trim();
    if(!cleanUsername || !password) throw new Error('LOGIN_REQUIRED');

    const resolved = await rpc('resolve_admin_email', { p_username: cleanUsername }, false);
    const email = Array.isArray(resolved) ? resolved[0]?.email : resolved?.email || resolved;
    if(!email) throw new Error('INVALID_LOGIN');

    const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify({ email: String(email), password: String(password) })
    });
    if(!response.ok) throw await readError(response);
    const data = await response.json();
    saveSession(data);

    const profile = await getProfile();
    if(!profile){
      await signOut();
      throw new Error('NOT_ADMIN');
    }
    return { session: data, user: data.user, profile };
  }

  async function getSession(){
    if(!configured || !session?.access_token) return null;
    try { await ensureSession(); return session; }
    catch { saveSession(null); return null; }
  }

  async function getProfile(){
    const current = await getSession();
    if(!current?.user?.id) return null;
    const data = await request(`/rest/v1/admin_profiles?id=eq.${encodeURIComponent(current.user.id)}&select=id,username&limit=1`, {
      method: 'GET'
    }, true);
    return Array.isArray(data) ? data[0] || null : data || null;
  }

  async function signOut(){
    if(session?.access_token){
      try { await request('/auth/v1/logout', { method: 'POST' }, true, false); } catch {}
    }
    saveSession(null);
  }

  async function updateUsername(username){
    const current = await getSession();
    if(!current?.user?.id) throw new Error('AUTH_REQUIRED');
    const clean = String(username || '').trim();
    if(!/^[a-zA-Z0-9._-]{3,32}$/.test(clean)) throw new Error('INVALID_USERNAME');
    const data = await request(`/rest/v1/admin_profiles?id=eq.${encodeURIComponent(current.user.id)}&select=id,username`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ username: clean, updated_at: new Date().toISOString() })
    }, true);
    return Array.isArray(data) ? data[0] : data;
  }

  async function updatePassword(password){
    if(String(password || '').length < 8) throw new Error('WEAK_PASSWORD');
    const data = await request('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify({ password: String(password) })
    }, true);
    return data;
  }

  async function listClients(){
    return await request('/rest/v1/clients?select=id,name,phone,created_at,updated_at&order=name.asc', { method: 'GET' }, true) || [];
  }

  async function saveClient(payload){
    const item = {
      name: String(payload.name || '').trim(),
      phone: cleanPhone(payload.phone),
      updated_at: new Date().toISOString()
    };
    if(!item.name || item.phone.length < 10) throw new Error('INVALID_CLIENT');

    if(payload.id){
      const data = await request(`/rest/v1/clients?id=eq.${encodeURIComponent(payload.id)}&select=id,name,phone,created_at,updated_at`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item)
      }, true);
      return Array.isArray(data) ? data[0] : data;
    }

    const data = await request('/rest/v1/clients?select=id,name,phone,created_at,updated_at', {
      method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item)
    }, true);
    return Array.isArray(data) ? data[0] : data;
  }

  async function deleteClient(id){
    await request(`/rest/v1/clients?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
  }

  async function listOrders(){
    const select = encodeURIComponent('id,client_id,tracking_code,service_type,title,description,forecast_date,completed_stage,created_at,updated_at,clients(id,name,phone)');
    return await request(`/rest/v1/service_orders?select=${select}&order=updated_at.desc`, { method: 'GET' }, true) || [];
  }

  function randomTrackingCode(){
    const values = new Uint32Array(1);
    if(window.crypto?.getRandomValues) window.crypto.getRandomValues(values);
    else values[0] = Math.floor(Math.random() * 0xffffffff);
    return `MCR-${String(values[0] % 10000).padStart(4, '0')}`;
  }

  async function createOrder(payload){
    const base = {
      client_id: payload.clientId,
      service_type: String(payload.serviceType || '').trim(),
      title: String(payload.title || '').trim(),
      description: String(payload.description || '').trim() || null,
      forecast_date: payload.forecast || null,
      completed_stage: 0,
      updated_at: new Date().toISOString()
    };
    if(!base.client_id || !base.service_type || !base.title) throw new Error('INVALID_ORDER');

    let lastError = null;
    for(let attempt = 0; attempt < 12; attempt++){
      try {
        const tracking_code = randomTrackingCode();
        const select = 'id,client_id,tracking_code,service_type,title,description,forecast_date,completed_stage,created_at,updated_at';
        const data = await request(`/rest/v1/service_orders?select=${encodeURIComponent(select)}`, {
          method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...base, tracking_code })
        }, true);
        return Array.isArray(data) ? data[0] : data;
      } catch(error){
        lastError = error;
        if(error.code !== '23505') break;
      }
    }
    throw lastError || new Error('TRACKING_CODE_ERROR');
  }

  async function updateOrder(id, patch){
    const allowed = {};
    if(patch.serviceType !== undefined) allowed.service_type = String(patch.serviceType).trim();
    if(patch.title !== undefined) allowed.title = String(patch.title).trim();
    if(patch.description !== undefined) allowed.description = String(patch.description).trim() || null;
    if(patch.forecast !== undefined) allowed.forecast_date = patch.forecast || null;
    if(patch.completedStage !== undefined) allowed.completed_stage = Math.max(0, Math.min(6, Number(patch.completedStage) || 0));
    allowed.updated_at = new Date().toISOString();
    const select = 'id,client_id,tracking_code,service_type,title,description,forecast_date,completed_stage,created_at,updated_at';
    const data = await request(`/rest/v1/service_orders?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(select)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(allowed)
    }, true);
    return Array.isArray(data) ? data[0] : data;
  }

  async function deleteOrder(id){
    await request(`/rest/v1/service_orders?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
  }

  async function trackOrder(code){
    const normalized = formatTrackingCode(code);
    if(!normalized) return null;
    const data = await rpc('track_order', { p_code: normalized }, false);
    if(Array.isArray(data)) return data[0] || null;
    return data || null;
  }

  window.MCRBackend = {
    configured,
    client: null,
    cleanPhone,
    formatTrackingCode,
    signIn,
    getSession,
    getProfile,
    signOut,
    updateUsername,
    updatePassword,
    listClients,
    saveClient,
    deleteClient,
    listOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    trackOrder
  };
})();
