(() => {
  'use strict';

  const stages = [
    {
      title: 'Medição e Projeto Aprovado',
      icon: '📐',
      description: 'Medidas técnicas validadas no local e projeto liberado para corte.'
    },
    {
      title: 'Corte e Separação de Peças',
      icon: '✂️',
      description: 'Tubos, perfis, chapas e metalon sendo cortados no gabarito.'
    },
    {
      title: 'Montagem e Soldagem Geral',
      icon: '🛠️',
      description: 'Estrutura na bancada ou no gabarito recebendo os pontos e cordões de solda, conforme o processo adequado.'
    },
    {
      title: 'Esmerilhamento e Tratamento Superficial',
      icon: '🧹',
      description: 'Limpeza das soldas, remoção de resíduos e preparação com fundo ou proteção anticorrosiva quando aplicável.'
    },
    {
      title: 'Pintura e Acabamento Final',
      icon: '🎨',
      description: 'Aplicação do acabamento definido para a peça, incluindo pintura e finalização dos detalhes.'
    },
    {
      title: 'Pronto para Entrega / Instalação no Local',
      icon: '🚛',
      description: 'Peça finalizada na oficina, aguardando transporte, retirada ou equipe de instalação.'
    }
  ];

  const backend = window.MCRBackend;
  const form = document.getElementById('clientLookupForm');
  const input = document.getElementById('clientCode');
  const emptyState = document.getElementById('clientResultEmpty');
  const result = document.getElementById('clientResult');
  const errorState = document.getElementById('clientResultError');
  const backendError = document.getElementById('clientBackendError');

  function setView(view){
    if(emptyState) emptyState.hidden = view !== 'empty';
    if(result) result.hidden = view !== 'result';
    if(errorState) errorState.hidden = view !== 'error';
    if(backendError) backendError.hidden = view !== 'backend';
  }

  function setText(id, text){
    const el = document.getElementById(id);
    if(el) el.textContent = text || '—';
  }

  function formatDate(value, includeTime = false){
    if(!value) return 'A definir';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('pt-BR', includeTime
      ? { dateStyle: 'short', timeStyle: 'short' }
      : { dateStyle: 'short' }
    ).format(date);
  }

  function renderTimeline(completedStage){
    const list = document.getElementById('clientTimeline');
    if(!list) return;
    list.replaceChildren();

    stages.forEach((stage, index) => {
      const stepNumber = index + 1;
      const isDone = stepNumber <= completedStage;
      const isCurrent = !isDone && stepNumber === completedStage + 1;

      const item = document.createElement('li');
      item.className = isDone ? 'done' : isCurrent ? 'current' : 'pending';

      const marker = document.createElement('span');
      marker.className = 'timeline-marker';
      marker.textContent = isDone ? '✓' : String(stepNumber);

      const body = document.createElement('div');
      body.className = 'timeline-body';

      const meta = document.createElement('small');
      meta.textContent = `Etapa ${stepNumber}`;

      const title = document.createElement('strong');
      title.textContent = `${stage.title} ${stage.icon}`;

      const description = document.createElement('p');
      description.textContent = stage.description;

      const tag = document.createElement('em');
      tag.textContent = isDone ? 'Concluída' : isCurrent ? 'Em andamento' : 'Aguardando';

      body.append(meta, title, description, tag);
      item.append(marker, body);
      list.appendChild(item);
    });
  }

  function render(record){
    const completed = Math.max(0, Math.min(6, Number(record.completed_stage) || 0));
    const currentStage = completed >= 6 ? null : stages[completed];

    setText('resultCode', record.tracking_code);
    setText('resultClient', record.client_name);
    setText('resultProduct', record.order_title || record.service_type);
    setText('resultStatus', completed >= 6 ? 'Todas as etapas concluídas' : currentStage?.title);
    setText('resultForecast', formatDate(record.forecast_date));
    setText('resultUpdated', formatDate(record.updated_at, true));

    const badge = document.getElementById('resultStatusBadge');
    if(badge){
      badge.textContent = completed >= 6 ? 'Pronto / Entregue' : 'Em andamento';
      badge.classList.toggle('is-complete', completed >= 6);
    }

    const progress = document.getElementById('resultProgress');
    if(progress) progress.style.width = `${Math.round((completed / stages.length) * 100)}%`;

    renderTimeline(completed);
    setView('result');
    result?.classList.remove('result-pop');
    requestAnimationFrame(() => result?.classList.add('result-pop'));
  }

  async function lookup(rawCode){
    const code = backend?.formatTrackingCode(rawCode);
    if(!code){
      input?.focus();
      return;
    }
    if(input) input.value = code;

    if(!backend?.configured){
      setView('backend');
      return;
    }

    const submit = form?.querySelector('button[type="submit"]');
    if(submit){ submit.disabled = true; submit.textContent = 'Consultando...'; }
    try{
      const record = await backend.trackOrder(code);
      if(record) render(record);
      else setView('error');
    }catch(error){
      console.error('Erro ao consultar pedido:', error);
      setView('backend');
    }finally{
      if(submit){ submit.disabled = false; submit.textContent = 'Consultar'; }
    }
  }

  input?.addEventListener('input', () => {
    input.value = backend?.formatTrackingCode(input.value) || '';
  });

  form?.addEventListener('submit', event => {
    event.preventDefault();
    lookup(input?.value);
  });

  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = params.get('codigo') || params.get('code');
  if(codeFromUrl){
    if(input) input.value = backend?.formatTrackingCode(codeFromUrl) || codeFromUrl;
    setTimeout(() => lookup(codeFromUrl), 180);
  }
})();
