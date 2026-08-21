(() => {
  'use strict';
  const WHATSAPP = '5567981036563';

  function openWhatsApp(message){
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
    const opened = window.open(url, '_blank', 'noopener');
    if(!opened) window.location.href = url;
  }
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.tech-nav');
  const siteHeader = document.querySelector('.site-header');


  function emitMenuBurst(){
    if(!siteHeader || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = menuToggle?.getBoundingClientRect();
    if(!rect) return;
    const points = [
      [rect.left + rect.width/2, rect.top + rect.height/2],
      [Math.max(20, rect.left - 14), rect.top + rect.height/2]
    ];
    points.forEach(([x,y],group)=>{
      const count = group === 0 ? 9 : 6;
      for(let i=0;i<count;i++){
        const spark=document.createElement('span');
        spark.className='menu-open-spark';
        spark.style.left=`${x}px`; spark.style.top=`${y}px`;
        const angle=(Math.PI*2*i/count)+(Math.random()-.5)*.35;
        const distance=18+Math.random()*42;
        spark.style.setProperty('--menu-spark-x',`${Math.cos(angle)*distance}px`);
        spark.style.setProperty('--menu-spark-y',`${Math.sin(angle)*distance}px`);
        document.body.appendChild(spark);
        spark.addEventListener('animationend',()=>spark.remove(),{once:true});
      }
    });
  }

  let lastScrollY = window.scrollY;
  let scrollTicking = false;

  function updateHeaderOnScroll(){
    if(!siteHeader){ scrollTicking = false; return; }
    const currentY = Math.max(window.scrollY, 0);
    const menuOpen = menuToggle?.getAttribute('aria-expanded') === 'true';

    if(currentY <= 24 || menuOpen){
      siteHeader.classList.remove('is-hidden');
    }else if(currentY > lastScrollY + 8 && currentY > 120){
      siteHeader.classList.add('is-hidden');
    }else if(currentY < lastScrollY - 8){
      siteHeader.classList.remove('is-hidden');
    }

    lastScrollY = currentY;
    scrollTicking = false;
  }

  window.addEventListener('scroll',()=>{
    if(!scrollTicking){
      window.requestAnimationFrame(updateHeaderOnScroll);
      scrollTicking = true;
    }
  },{passive:true});

  function closeMenu(){
    if(!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded','false');
    menuToggle.setAttribute('aria-label','Abrir menu');
    nav.classList.remove('is-open');
    siteHeader?.classList.remove('menu-open');
  }
  if(menuToggle && nav){
    menuToggle.addEventListener('click',()=>{
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      const nextOpen = !open;
      siteHeader?.classList.remove('is-hidden');
      menuToggle.setAttribute('aria-expanded', String(nextOpen));
      menuToggle.setAttribute('aria-label', nextOpen ? 'Fechar menu' : 'Abrir menu');
      nav.classList.toggle('is-open', nextOpen);
      siteHeader?.classList.toggle('menu-open', nextOpen);
      if(nextOpen){ emitMenuBurst(); setTimeout(emitMenuBurst,180); }
    });
    document.addEventListener('click',(e)=>{
      if(!nav.contains(e.target) && !menuToggle.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown',(e)=>{ if(e.key === 'Escape') closeMenu(); });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  }

  document.querySelectorAll('[data-back]').forEach(button=>{
    button.addEventListener('click',()=>{
      const fallback = button.dataset.backHref || 'index.html';
      document.body.classList.add('page-leaving');
      document.body.classList.remove('page-ready');
      setTimeout(()=>{
        try{
          const ref = document.referrer ? new URL(document.referrer) : null;
          if(ref && ref.origin === window.location.origin && history.length > 1) history.back();
          else window.location.href = fallback;
        }catch{ window.location.href = fallback; }
      },300);
    });
  });

  const currentPage = document.body.dataset.page;
  document.querySelectorAll('.tech-nav a').forEach(link => {
    if(link.dataset.page === currentPage) link.classList.add('active');
  });

  document.querySelectorAll('img[data-fallback]').forEach(img => {
    img.addEventListener('error',()=>{ if(!img.dataset.failed){ img.dataset.failed='1'; img.src=img.dataset.fallback; } });
  });

  const modal = document.getElementById('orderModal');
  const form = document.getElementById('orderForm');
  const selectedService = document.getElementById('selectedService');
  const selectedInput = document.getElementById('serviceSelected');
  const nameInput = document.getElementById('clientName');
  const descriptionInput = document.getElementById('orderDescription');
  const descriptionLabel = document.querySelector('label[for="orderDescription"]');
  const orderFormHelp = form?.querySelector('.form-help');

  function isCustomOrder(service){
    return /personalizado/i.test(String(service));
  }

  function updateOrderRequirements(service){
    if(!descriptionInput) return;
    const custom = isCustomOrder(service);
    descriptionInput.required = custom;
    descriptionInput.setAttribute('aria-required', String(custom));
    if(descriptionLabel){
      descriptionLabel.textContent = custom ? 'Descrição do pedido *' : 'Descrição (opcional)';
    }
    descriptionInput.placeholder = custom
      ? 'Descreva sua ideia, medidas aproximadas, local e outros detalhes importantes.'
      : 'Opcional: informe medidas aproximadas, bairro, prazo ou outros detalhes.';
    if(orderFormHelp){
      orderFormHelp.textContent = custom
        ? 'No pedido personalizado, nome e descrição são obrigatórios. O WhatsApp abrirá com a mensagem pronta.'
        : 'Neste serviço, somente o nome é obrigatório. A descrição pode ser deixada em branco.';
    }
  }

  function openOrder(service='Projeto personalizado'){
    if(!modal || !form) return;
    if(selectedService) selectedService.textContent = service;
    if(selectedInput) selectedInput.value = service;
    updateOrderRequirements(service);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    setTimeout(()=>nameInput?.focus(),150);
  }
  function closeOrder(){
    if(!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  document.querySelectorAll('[data-order]').forEach(btn=>{
    btn.addEventListener('click',(e)=>{ e.preventDefault(); openOrder(btn.dataset.order || 'Projeto personalizado'); });
  });
  document.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click',closeOrder));
  modal?.addEventListener('click',(e)=>{ if(e.target === modal) closeOrder(); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeOrder(); });

  form?.addEventListener('submit',(e)=>{
    e.preventDefault();
    if(!form.checkValidity()){ form.reportValidity(); return; }
    const data = new FormData(form);
    const service = data.get('service');
    const name = String(data.get('name')).trim();
    const description = String(data.get('description') || '').trim();
    const message = [
      'Olá, MCR Serralheria! Gostaria de solicitar um orçamento.',
      '',
      `Nome: ${name}`,
      `Serviço: ${service}`,
      `Descrição: ${description || 'Não informada'}`,
      '',
      'Aguardo o retorno. Obrigado!'
    ].join('\n');
    openWhatsApp(message);
  });

  const contactForm = document.getElementById('contactForm');
  contactForm?.addEventListener('submit',(e)=>{
    e.preventDefault();
    if(!contactForm.checkValidity()){ contactForm.reportValidity(); return; }
    const data = new FormData(contactForm);
    const msg = [
      'Olá, MCR Serralheria! Vim pelo site.', '',
      `Nome: ${String(data.get('name')).trim()}`,
      `Assunto: ${String(data.get('subject')).trim()}`,
      `Mensagem: ${String(data.get('message')).trim()}`
    ].join('\n');
    openWhatsApp(msg);
  });

  const filters = document.querySelectorAll('.filter-btn');
  const servicesGrid = document.querySelector('.services-grid');
  let categoryAnimating = false;
  filters.forEach(btn=>{
    btn.setAttribute('aria-pressed', String(btn.classList.contains('active')));
    btn.addEventListener('click',()=>{
      if(categoryAnimating || btn.classList.contains('active')) return;
      categoryAnimating = true;
      filters.forEach(b=>{
        const active = b === btn;
        b.classList.toggle('active',active);
        b.setAttribute('aria-pressed', String(active));
      });
      const cat = btn.dataset.filter;
      const cards = [...document.querySelectorAll('.service-card')];
      servicesGrid?.classList.add('category-switching');
      cards.filter(card=>!card.hidden).forEach((card,index)=>{
        card.style.setProperty('--category-delay', `${Math.min(index,5)*28}ms`);
        card.classList.add('category-leaving');
      });
      setTimeout(()=>{
        cards.forEach(card=>{
          const show = cat === 'todos' || card.dataset.category === cat;
          card.hidden = !show;
          card.classList.remove('category-leaving','category-entering');
          if(show){
            card.style.setProperty('--category-delay', `${Math.min(cards.filter(c=>!c.hidden).indexOf(card),5)*45}ms`);
            card.classList.add('category-entering');
          }
        });
        servicesGrid?.classList.remove('category-switching');
        setTimeout(()=>{
          cards.forEach(card=>card.classList.remove('category-entering'));
          categoryAnimating = false;
        },520);
      },260);
    });
  });

  const revealItems = document.querySelectorAll('.reveal');
  revealItems.forEach((el,index)=>{
    el.classList.add('reveal-ready');
    el.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 42}ms`);
  });
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
  },{threshold:.12}) : null;
  revealItems.forEach(el=> observer ? observer.observe(el) : el.classList.add('visible'));



  /* Revelação das imagens em estilo Blueprint/CAD */
  function blueprintSVG(){
    return `<svg class="blueprint-overlay" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
      <rect class="bp-line" x="5" y="5" width="90" height="60"/>
      <path class="bp-line" d="M12 57V18h20v39M32 57V12h36v45M68 57V23h20v34M12 30h20M68 37h20M5 57h90"/>
      <path class="bp-thin" d="M8 9h84M8 62h84M9 7v56M91 7v56M3 35h94M50 3v64"/>
      <path class="bp-thin" d="M8 12l3-3-3-3M92 12l-3-3 3-3M15 65l-3-3 3-3M85 65l3-3-3-3"/>
    </svg><span class="blueprint-scan" aria-hidden="true"></span>`;
  }

  const blueprintContainers = [...document.querySelectorAll('.service-image,.about-photo')];
  document.querySelectorAll('.service-mini > img').forEach(img=>{
    const wrap = document.createElement('div');
    wrap.className = 'service-mini-media';
    img.parentNode.insertBefore(wrap,img);
    wrap.appendChild(img);
    blueprintContainers.push(wrap);
  });

  const blueprintObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('blueprint-visible');
        blueprintObserver.unobserve(entry.target);
      }
    });
  },{threshold:.24,rootMargin:'0px 0px -5% 0px'}) : null;

  blueprintContainers.forEach((container,index)=>{
    if(container.dataset.blueprintReady) return;
    container.dataset.blueprintReady='1';
    container.classList.add('blueprint-ready');
    container.insertAdjacentHTML('beforeend',blueprintSVG());
    if(blueprintObserver) blueprintObserver.observe(container);
    else setTimeout(()=>container.classList.add('blueprint-visible'),120 + index*60);
  });

  /* Faíscas leves nos botões ao passar o mouse */
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(!reduceMotion){
    function createButtonSparks(button,event,count=4){
      const rect = button.getBoundingClientRect();
      const originX = event ? event.clientX - rect.left : rect.width*.72;
      const originY = event ? event.clientY - rect.top : rect.height*.45;
      for(let i=0;i<count;i++){
        const spark = document.createElement('span');
        spark.className='heat-spark';
        spark.style.left=`${originX + (Math.random()-.5)*10}px`;
        spark.style.top=`${originY + (Math.random()-.5)*8}px`;
        spark.style.setProperty('--spark-x',`${(Math.random()-.5)*55}px`);
        spark.style.setProperty('--spark-y',`${-12-Math.random()*36}px`);
        button.appendChild(spark);
        spark.addEventListener('animationend',()=>spark.remove(),{once:true});
      }
    }
    document.querySelectorAll('.btn,.floating-order,.filter-btn,.menu-toggle,.header-social,.tech-nav a').forEach(button=>{
      let lastSpark=0;
      button.addEventListener('pointerenter',e=>createButtonSparks(button,e,5));
      button.addEventListener('pointermove',e=>{
        const now=performance.now();
        if(now-lastSpark<135) return;
        lastSpark=now;
        createButtonSparks(button,e,1);
      });
      button.addEventListener('click',e=>createButtonSparks(button,e,8));
    });
  }


  /* Transição rápida entre páginas, com uma linha de solda. */
  requestAnimationFrame(()=>document.body.classList.add('page-ready'));
  window.addEventListener('pageshow',()=>{
    document.body.classList.remove('page-leaving');
    requestAnimationFrame(()=>document.body.classList.add('page-ready'));
  });

  document.querySelectorAll('a[href]').forEach(link=>{
    link.addEventListener('click',event=>{
      if(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if(link.target === '_blank' || link.hasAttribute('download') || link.hasAttribute('data-no-transition')) return;
      const rawHref = link.getAttribute('href') || '';
      if(!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) return;
      const url = new URL(link.href, window.location.href);
      if(url.origin !== window.location.origin) return;
      if(url.pathname === window.location.pathname && url.hash){ return; }
      event.preventDefault();
      closeMenu();
      document.body.classList.add('page-leaving');
      document.body.classList.remove('page-ready');
      setTimeout(()=>{ window.location.href = url.href; },360);
    });
  });

  document.querySelectorAll('[data-year]').forEach(el=>el.textContent = new Date().getFullYear());
})();
