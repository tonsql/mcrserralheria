(() => {
  const params=new URLSearchParams(window.location.search);
  const cat=params.get('categoria') || 'todos';
  const labels=window.MCR_SERVICE_CATEGORIES || {};
  const services=(window.MCR_SERVICES || []).filter(s=>cat==='todos' || s.cat===cat);
  const label=labels[cat] || 'Serviços';
  document.title=`${label} | MCR Serralheria`;
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  set('categoryBreadcrumb',label);set('categoryTitle',label+'.');set('categoryLead',`Veja somente os serviços da categoria ${label.toLowerCase()}. Abra um deles para ver imagens, detalhes e fazer o pedido.`);
  const grid=document.getElementById('categoryGrid');
  if(!grid) return;
  if(!services.length){grid.innerHTML='<div class="category-empty">Nenhum serviço foi encontrado nesta categoria.</div>';return;}
  grid.innerHTML=services.map((s,i)=>`<article class="service-card reveal"><div class="service-image"><img alt="${s.title}" data-fallback="img/placeholder-metal.svg" loading="lazy" src="${s.image}"></div><div class="service-content"><span class="service-number">SERVIÇO ${String(i+1).padStart(2,'0')}</span><span class="service-category">${s.catlabel}</span><h2>${s.title}</h2><p>${s.short}</p><a class="btn btn-primary" href="servico.html?servico=${s.id}">Pedir <svg aria-hidden="true" class="icon-line" viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"></path></svg></a></div></article>`).join('');
})();
