(() => {
  'use strict';

  const backend = window.MCRBackend;
  const loginView = document.getElementById('adminLoginView');
  const app = document.getElementById('adminApp');
  const loginForm = document.getElementById('adminLoginForm');
  const setupAlert = document.getElementById('adminSetupAlert');
  const loginMessage = document.getElementById('adminLoginMessage');
  const globalMessage = document.getElementById('adminGlobalMessage');

  const state = { clients: [], orders: [], profile: null };

  const stages = [
    { title: 'Medição e Projeto Aprovado', short: 'Projeto', icon: '📐', description: 'Medidas técnicas validadas e projeto liberado para corte.' },
    { title: 'Corte e Separação de Peças', short: 'Corte', icon: '✂️', description: 'Tubos, perfis, chapas e metalon em preparação.' },
    { title: 'Montagem e Soldagem Geral', short: 'Solda', icon: '🛠️', description: 'Montagem da estrutura e execução das soldas.' },
    { title: 'Esmerilhamento e Tratamento Superficial', short: 'Tratamento', icon: '🧹', description: 'Limpeza das soldas e preparação da superfície.' },
    { title: 'Pintura e Acabamento Final', short: 'Pintura', icon: '🎨', description: 'Pintura e acabamento final da peça.' },
    { title: 'Pronto para Entrega / Instalação', short: 'Entrega', icon: '🚛', description: 'Peça finalizada aguardando entrega ou instalação.' }
  ];

  function showMessage(message, type = 'info', target = globalMessage){
    if(!target) return;
    target.textContent = message || '';
    target.dataset.type = type;
    if(message && target === globalMessage){
      clearTimeout(showMessage.timer);
      showMessage.timer = setTimeout(() => { target.textContent = ''; target.removeAttribute('data-type'); }, 4200);
    }
  }

  function escapeText(value){ return String(value ?? ''); }
  function digits(value){ return String(value || '').replace(/\D/g, ''); }
  function formatPhone(value){
    const d = digits(value);
    if(d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if(d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return d;
  }
  function formatDate(value, withTime = false){
    if(!value) return 'A definir';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('pt-BR', withTime ? {dateStyle:'short',timeStyle:'short'} : {dateStyle:'short'}).format(date);
  }

  function orderStatus(order){
    const completed = Number(order.completed_stage) || 0;
    if(completed >= 6) return { label: 'Pronto / Entregue', className: 'done', step: 6 };
    const current = stages[completed];
    if(completed === 4) return { label: 'Pintura / Acabamento', className: 'painting', step: completed + 1 };
    return { label: current?.short || 'Em andamento', className: 'in-progress', step: completed + 1 };
  }

  function getClientOrders(clientId){ return state.orders.filter(order => order.client_id === clientId); }

  function setAppVisible(isLogged){
    if(loginView) loginView.hidden = isLogged;
    if(app) app.hidden = !isLogged;
    document.body.classList.toggle('admin-authenticated', isLogged);
  }

  function switchView(name){
    const titles = { overview: 'Visão Geral', clients: 'Clientes', orders: 'Pedidos / Ordens de Serviço', settings: 'Configurações' };
    document.querySelectorAll('[data-admin-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.adminView === name));
    document.querySelectorAll('[data-view-panel]').forEach(panel => {
      const active = panel.dataset.viewPanel === name;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    const title = document.getElementById('adminViewTitle');
    if(title) title.textContent = titles[name] || 'Painel';
    document.getElementById('adminSidebar')?.classList.remove('mobile-open');
  }

  async function refreshData(){
    const [clients, orders] = await Promise.all([backend.listClients(), backend.listOrders()]);
    state.clients = clients;
    state.orders = orders;
    renderAll();
  }

  function renderAll(){
    renderStats();
    renderProcessSummary();
    renderRecentOrders();
    renderClients();
    renderOrderClientOptions();
    renderOrders();
  }

  function renderStats(){
    const active = state.orders.filter(o => Number(o.completed_stage) < 6);
    const values = {
      statClients: state.clients.length,
      statActiveOrders: active.length,
      statWelding: active.filter(o => Number(o.completed_stage) === 2).length,
      statPainting: active.filter(o => Number(o.completed_stage) === 4).length
    };
    Object.entries(values).forEach(([id, value]) => { const el = document.getElementById(id); if(el) el.textContent = value; });
  }

  function renderProcessSummary(){
    const list = document.getElementById('processSummary');
    if(!list) return;
    list.replaceChildren();
    stages.forEach((stage, index) => {
      const count = state.orders.filter(o => Number(o.completed_stage) === index).length;
      const li = document.createElement('li');
      const num = document.createElement('span'); num.textContent = String(index + 1).padStart(2, '0');
      const body = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = `${stage.title} ${stage.icon}`;
      const desc = document.createElement('small'); desc.textContent = stage.description;
      body.append(title, desc);
      const badge = document.createElement('b'); badge.textContent = `${count} pedido${count === 1 ? '' : 's'}`;
      li.append(num, body, badge);
      list.appendChild(li);
    });
  }

  function renderRecentOrders(){
    const host = document.getElementById('recentOrders');
    if(!host) return;
    host.replaceChildren();
    if(!state.orders.length){ host.innerHTML = '<p class="admin-empty-state">Nenhuma ordem cadastrada ainda.</p>'; return; }
    state.orders.slice(0, 5).forEach(order => {
      const status = orderStatus(order);
      const row = document.createElement('button');
      row.type = 'button'; row.className = 'admin-compact-row';
      const main = document.createElement('div');
      const code = document.createElement('strong'); code.textContent = order.tracking_code;
      const info = document.createElement('span'); info.textContent = `${order.clients?.name || 'Cliente'} • ${order.title}`;
      main.append(code, info);
      const tag = document.createElement('em'); tag.className = `tag ${status.className}`; tag.textContent = status.label;
      row.append(main, tag);
      row.addEventListener('click', () => { switchView('orders'); const search = document.getElementById('orderSearch'); if(search){ search.value = order.tracking_code; renderOrders(); } });
      host.appendChild(row);
    });
  }

  function renderClients(){
    const host = document.getElementById('clientsList');
    const search = document.getElementById('clientSearch')?.value.trim().toLowerCase() || '';
    const filtered = state.clients.filter(client => `${client.name} ${client.phone}`.toLowerCase().includes(search));
    const count = document.getElementById('clientCount'); if(count) count.textContent = filtered.length;
    if(!host) return;
    host.replaceChildren();
    if(!filtered.length){ host.innerHTML = '<p class="admin-empty-state">Nenhum cliente encontrado.</p>'; return; }

    filtered.forEach(client => {
      const orders = getClientOrders(client.id);
      const card = document.createElement('article'); card.className = 'admin-client-card';
      const head = document.createElement('div'); head.className = 'admin-client-card-head';
      const info = document.createElement('div');
      const name = document.createElement('h3'); name.textContent = client.name;
      const phone = document.createElement('span'); phone.textContent = formatPhone(client.phone);
      info.append(name, phone);
      const actions = document.createElement('div'); actions.className = 'admin-mini-actions';
      const wa = document.createElement('a'); wa.className = 'admin-square-button'; wa.target = '_blank'; wa.rel = 'noopener'; wa.href = `https://wa.me/55${digits(client.phone)}`; wa.title = 'Abrir WhatsApp'; wa.textContent = 'WA';
      const edit = document.createElement('button'); edit.className = 'admin-square-button'; edit.type = 'button'; edit.title = 'Editar cliente'; edit.textContent = '✎';
      edit.addEventListener('click', () => openClientForm(client));
      actions.append(wa, edit);
      head.append(info, actions);

      const history = document.createElement('div'); history.className = 'admin-client-history';
      const historyTitle = document.createElement('small'); historyTitle.textContent = `${orders.length} pedido${orders.length === 1 ? '' : 's'} no histórico`;
      history.appendChild(historyTitle);
      if(orders.length){
        const chips = document.createElement('div'); chips.className = 'admin-code-chips';
        orders.slice(0, 4).forEach(order => {
          const chip = document.createElement('button'); chip.type = 'button'; chip.textContent = order.tracking_code;
          chip.addEventListener('click', () => { switchView('orders'); const field = document.getElementById('orderSearch'); if(field){ field.value = order.tracking_code; renderOrders(); } });
          chips.appendChild(chip);
        });
        history.appendChild(chips);
      }
      card.append(head, history);
      host.appendChild(card);
    });
  }

  function renderOrderClientOptions(){
    const select = document.getElementById('orderClient');
    if(!select) return;
    const current = select.value;
    select.replaceChildren();
    const first = document.createElement('option'); first.value = ''; first.textContent = 'Selecione um cliente'; select.appendChild(first);
    state.clients.forEach(client => { const opt = document.createElement('option'); opt.value = client.id; opt.textContent = `${client.name} — ${formatPhone(client.phone)}`; select.appendChild(opt); });
    if(state.clients.some(c => c.id === current)) select.value = current;
  }

  function renderOrderTimeline(order, host){
    host.replaceChildren();
    const completed = Number(order.completed_stage) || 0;
    stages.forEach((stage, index) => {
      const step = index + 1;
      const li = document.createElement('li');
      li.className = step <= completed ? 'done' : step === completed + 1 ? 'current' : 'pending';
      const marker = document.createElement('span'); marker.textContent = step <= completed ? '✓' : String(step);
      const label = document.createElement('strong'); label.textContent = stage.short;
      li.append(marker, label); host.appendChild(li);
    });
  }

  function renderOrders(){
    const host = document.getElementById('ordersList');
    const search = document.getElementById('orderSearch')?.value.trim().toLowerCase() || '';
    const filtered = state.orders.filter(order => `${order.tracking_code} ${order.clients?.name || ''} ${order.service_type} ${order.title}`.toLowerCase().includes(search));
    const count = document.getElementById('orderCount'); if(count) count.textContent = filtered.length;
    if(!host) return;
    host.replaceChildren();
    if(!filtered.length){ host.innerHTML = '<p class="admin-empty-state">Nenhuma ordem encontrada.</p>'; return; }

    filtered.forEach(order => {
      const status = orderStatus(order);
      const completed = Number(order.completed_stage) || 0;
      const card = document.createElement('article'); card.className = 'admin-order-card';

      const top = document.createElement('div'); top.className = 'admin-order-top';
      const idBox = document.createElement('div');
      const code = document.createElement('strong'); code.className = 'admin-order-code'; code.textContent = order.tracking_code;
      const title = document.createElement('h3'); title.textContent = order.title;
      const client = document.createElement('span'); client.textContent = `${order.clients?.name || 'Cliente'} • ${order.service_type}`;
      idBox.append(code, title, client);
      const tag = document.createElement('em'); tag.className = `tag ${status.className}`; tag.textContent = status.label;
      top.append(idBox, tag);

      const meta = document.createElement('div'); meta.className = 'admin-order-meta';
      meta.innerHTML = `<span><small>Previsão</small><b>${formatDate(order.forecast_date)}</b></span><span><small>Atualizado</small><b>${formatDate(order.updated_at, true)}</b></span><span><small>Progresso</small><b>${Math.round((completed/6)*100)}%</b></span>`;

      const timeline = document.createElement('ol'); timeline.className = 'admin-order-timeline'; renderOrderTimeline(order, timeline);

      const actions = document.createElement('div'); actions.className = 'admin-order-actions';
      if(completed < 6){
        const complete = document.createElement('button'); complete.className = 'btn btn-primary'; complete.type = 'button'; complete.textContent = `Concluir etapa ${completed + 1}`;
        complete.addEventListener('click', () => completeNextStage(order));
        actions.appendChild(complete);
      }
      const whatsapp = document.createElement('a'); whatsapp.className = 'btn btn-ghost'; whatsapp.target = '_blank'; whatsapp.rel = 'noopener';
      const trackUrl = `https://mcrserralheria.site/clientes.html?codigo=${encodeURIComponent(order.tracking_code)}`;
      const message = `Olá, ${order.clients?.name || ''}! Seu código de acompanhamento da MCR Serralheria é ${order.tracking_code}. Acompanhe aqui: ${trackUrl}`;
      whatsapp.href = `https://wa.me/55${digits(order.clients?.phone)}?text=${encodeURIComponent(message)}`; whatsapp.textContent = 'Enviar código no WhatsApp';
      actions.appendChild(whatsapp);

      const details = document.createElement('details'); details.className = 'admin-order-details';
      const summary = document.createElement('summary'); summary.textContent = 'Mais opções';
      const detailActions = document.createElement('div'); detailActions.className = 'admin-detail-actions';
      const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copiar código'; copy.addEventListener('click', async () => { await navigator.clipboard?.writeText(order.tracking_code); showMessage(`Código ${order.tracking_code} copiado.`, 'success'); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Excluir ordem'; remove.addEventListener('click', () => removeOrder(order));
      detailActions.append(copy, remove); details.append(summary, detailActions);

      card.append(top, meta, timeline, actions, details);
      host.appendChild(card);
    });
  }

  async function completeNextStage(order){
    const completed = Number(order.completed_stage) || 0;
    if(completed >= 6) return;
    const stage = stages[completed];
    const ok = confirm(`Marcar como concluída a etapa ${completed + 1}: ${stage.title}?`);
    if(!ok) return;
    try{
      await backend.updateOrder(order.id, { completedStage: completed + 1 });
      await refreshData();
      showMessage(`Etapa ${completed + 1} concluída em ${order.tracking_code}.`, 'success');
    }catch(error){ console.error(error); showMessage('Não foi possível atualizar a etapa.', 'error'); }
  }

  async function removeOrder(order){
    if(!confirm(`Excluir a ordem ${order.tracking_code}? Essa ação não pode ser desfeita.`)) return;
    try{ await backend.deleteOrder(order.id); await refreshData(); showMessage('Ordem excluída.', 'success'); }
    catch(error){ console.error(error); showMessage('Não foi possível excluir a ordem.', 'error'); }
  }

  function openClientForm(client = null){
    const card = document.getElementById('clientFormCard');
    if(card) card.hidden = false;
    document.getElementById('clientFormTitle').textContent = client ? 'Editar cliente' : 'Novo cliente';
    document.getElementById('clientId').value = client?.id || '';
    document.getElementById('clientNameAdmin').value = client?.name || '';
    document.getElementById('clientPhoneAdmin').value = client?.phone || '';
    document.getElementById('clientNameAdmin')?.focus();
  }
  function closeClientForm(){ document.getElementById('clientFormCard').hidden = true; document.getElementById('clientForm')?.reset(); document.getElementById('clientId').value = ''; }
  function openOrderForm(){
    if(!state.clients.length){ switchView('clients'); openClientForm(); showMessage('Cadastre um cliente antes de criar a ordem.', 'info'); return; }
    document.getElementById('orderFormCard').hidden = false;
    document.getElementById('orderClient')?.focus();
  }
  function closeOrderForm(){ document.getElementById('orderFormCard').hidden = true; document.getElementById('orderFormAdmin')?.reset(); }

  async function handleLogin(event){
    event.preventDefault();
    if(!backend?.configured){ setupAlert.hidden = false; showMessage('Configure o Supabase antes de entrar.', 'error', loginMessage); return; }
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = 'Entrando...'; showMessage('', 'info', loginMessage);
    try{
      const auth = await backend.signIn(username, password);
      state.profile = auth.profile;
      await startApp();
    }catch(error){
      console.error(error);
      showMessage('Usuário ou senha inválidos, ou o administrador ainda não foi configurado.', 'error', loginMessage);
    }finally{ button.disabled = false; button.textContent = 'Entrar'; }
  }

  async function startApp(){
    state.profile = state.profile || await backend.getProfile();
    if(!state.profile){ setAppVisible(false); return; }
    document.getElementById('adminCurrentUser').textContent = state.profile.username;
    document.getElementById('newUsername').value = state.profile.username;
    setAppVisible(true);
    await refreshData();
  }

  async function logout(){
    try{ await backend.signOut(); }catch(error){ console.error(error); }
    state.clients = []; state.orders = []; state.profile = null;
    setAppVisible(false); loginForm?.reset();
    showMessage('', 'info', loginMessage);
  }

  loginForm?.addEventListener('submit', handleLogin);
  document.querySelectorAll('[data-toggle-password]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    if(!input) return;
    const show = input.type === 'password'; input.type = show ? 'text' : 'password'; button.textContent = show ? 'Ocultar' : 'Mostrar';
  }));

  document.querySelectorAll('[data-admin-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.adminView)));
  document.querySelectorAll('[data-go-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.goView)));
  document.getElementById('adminSidebarToggle')?.addEventListener('click', () => document.getElementById('adminSidebar')?.classList.toggle('collapsed'));
  document.getElementById('adminMobileMenu')?.addEventListener('click', () => document.getElementById('adminSidebar')?.classList.toggle('mobile-open'));
  document.getElementById('sidebarLogout')?.addEventListener('click', logout);
  document.getElementById('settingsLogout')?.addEventListener('click', logout);

  document.getElementById('newClientButton')?.addEventListener('click', () => openClientForm());
  document.getElementById('closeClientForm')?.addEventListener('click', closeClientForm);
  document.getElementById('cancelClientEdit')?.addEventListener('click', closeClientForm);
  document.getElementById('clientSearch')?.addEventListener('input', renderClients);
  document.getElementById('newOrderButton')?.addEventListener('click', openOrderForm);
  document.getElementById('closeOrderForm')?.addEventListener('click', closeOrderForm);
  document.getElementById('cancelOrderCreate')?.addEventListener('click', closeOrderForm);
  document.getElementById('orderSearch')?.addEventListener('input', renderOrders);

  document.getElementById('clientPhoneAdmin')?.addEventListener('input', event => { event.target.value = event.target.value.replace(/[^0-9()+\-\s]/g, ''); });

  document.getElementById('clientForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = { id: document.getElementById('clientId').value || null, name: document.getElementById('clientNameAdmin').value, phone: document.getElementById('clientPhoneAdmin').value };
    try{ await backend.saveClient(payload); closeClientForm(); await refreshData(); showMessage(payload.id ? 'Cliente atualizado.' : 'Cliente cadastrado.', 'success'); }
    catch(error){ console.error(error); showMessage('Não foi possível salvar. Confira nome e WhatsApp.', 'error'); }
  });

  document.getElementById('orderFormAdmin')?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = 'Criando...';
    try{
      const order = await backend.createOrder({
        clientId: document.getElementById('orderClient').value,
        serviceType: document.getElementById('orderServiceType').value,
        title: document.getElementById('orderTitle').value,
        description: document.getElementById('orderDescriptionAdmin').value,
        forecast: document.getElementById('orderForecast').value
      });
      closeOrderForm(); await refreshData(); showMessage(`Ordem criada. Código: ${order.tracking_code}`, 'success');
    }catch(error){ console.error(error); showMessage('Não foi possível criar a ordem.', 'error'); }
    finally{ button.disabled = false; button.textContent = 'Criar ordem e gerar código'; }
  });

  document.getElementById('usernameForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    try{ state.profile = await backend.updateUsername(document.getElementById('newUsername').value); document.getElementById('adminCurrentUser').textContent = state.profile.username; showMessage('Usuário atualizado.', 'success'); }
    catch(error){ console.error(error); showMessage('Use de 3 a 32 caracteres: letras, números, ponto, hífen ou underline.', 'error'); }
  });

  document.getElementById('passwordForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const pass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    if(pass !== confirmPass){ showMessage('As senhas não coincidem.', 'error'); return; }
    if(pass.length < 8){ showMessage('A nova senha precisa ter pelo menos 8 caracteres.', 'error'); return; }
    try{ await backend.updatePassword(pass); event.currentTarget.reset(); showMessage('Senha alterada com sucesso.', 'success'); }
    catch(error){ console.error(error); showMessage('Não foi possível trocar a senha.', 'error'); }
  });

  async function init(){
    if(!backend?.configured){ setupAlert.hidden = false; setAppVisible(false); return; }
    try{
      const session = await backend.getSession();
      if(session){ state.profile = await backend.getProfile(); if(state.profile){ await startApp(); return; } }
    }catch(error){ console.error(error); }
    setAppVisible(false);
  }

  init();
})();
