/* Presentation and shortcuts only; existing forms and server permissions own all writes. */
(function(PF){
'use strict';
const nav=document.querySelector('#nav'),aside=nav.closest('aside'),layout=document.querySelector('.layout'),main=document.querySelector('#main');
const groups=[['Work',['dashboard','projects','requests','tasks','files']],['Clients',['clients','messages','portal']],['Business',['billing','time','services','documents']],['Workspace',['history','reports','activity','pricing','settings']]];
const agency=()=>!PF.shared?.active||PF.shared.role==='agency';
const toggle=document.createElement('button');toggle.id='pf-nav-toggle';toggle.type='button';toggle.setAttribute('aria-controls','nav');toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span aria-hidden="true">☰</span> Menu';aside.insertBefore(toggle,nav);
const create=document.createElement('details');create.id='pf-quick-create';create.className='pf-quick-create';create.innerHTML='<summary>+ Create</summary><div class="pf-create-items"></div>';document.querySelector('.top .actions').prepend(create);
const search=document.querySelector('#pf-search'),searchForm=document.querySelector('#pf-search-form');search.placeholder='Search workspace…';search.setAttribute('aria-keyshortcuts','Control+k Meta+k');search.title='Search workspace · Ctrl or ⌘ K';
const clear=document.createElement('button');clear.id='pf-search-clear';clear.type='button';clear.setAttribute('aria-label','Clear search');clear.textContent='×';clear.hidden=!search.value;searchForm.insertBefore(clear,searchForm.querySelector('button[type="submit"]')||searchForm.querySelector('button'));
function closeMenu(restore=false){aside.classList.remove('pf-menu-open');toggle.setAttribute('aria-expanded','false');if(restore&&!toggle.hidden)toggle.focus();}
toggle.onclick=()=>{const open=aside.classList.toggle('pf-menu-open');toggle.setAttribute('aria-expanded',String(open));if(open)nav.querySelector('[aria-current="page"],button')?.focus();};
clear.onclick=()=>{search.value='';PF.search='';clear.hidden=true;if(view==='search')PF.go('dashboard');search.focus();};
search.addEventListener('input',()=>{clear.hidden=!search.value;});
function sync(){
 const buttons=Array.from(nav.querySelectorAll('button')),isAgency=agency(),single=buttons.length<=1;
 nav.dataset.single=String(single);toggle.hidden=!isAgency||single;create.hidden=!isAgency;
 if(!isAgency){create.open=false;closeMenu();}
 if(!single){
  const fragment=document.createDocumentFragment();
  for(const [title,ids] of groups){const items=ids.map(id=>buttons.find(b=>b.dataset.id===id)).filter(Boolean);if(!items.length)continue;const group=document.createElement('div');group.className='pf-nav-group';group.setAttribute('role','group');group.setAttribute('aria-label',title);const label=document.createElement('span');label.className='pf-nav-label';label.textContent=title;label.setAttribute('aria-hidden','true');group.append(label,...items);fragment.append(group);}
  nav.replaceChildren(fragment);
 }
 if(isAgency){const projectDisabled=!PF.db.clients.length,invoiceDisabled=!PF.db.projects.length;create.querySelector('.pf-create-items').innerHTML=PF.button('New client','new-client')+PF.button('New project','new-project')+PF.button('New task','pf-add-task')+PF.button('New invoice','pf-add-invoice')+'<p class="meta">'+(projectDisabled?'Start with a client, then add their project.':invoiceDisabled?'Add a project before creating an invoice.':'Choose an action from any workspace page.')+'</p>';const items=create.querySelectorAll('button');items[1].disabled=projectDisabled;items[3].disabled=invoiceDisabled;}
 if(isAgency&&view==='dashboard'&&!PF.db.clients.length){const first=main.querySelector('.heading [data-action="new-project"]');if(first){first.dataset.action='new-client';first.textContent='Add your first client';}}
 clear.hidden=!search.value;
}
const previousRender=render;render=function(){previousRender();sync();};PF.render=()=>render();
document.addEventListener('click',event=>{
 const action=event.target.closest('[data-action]');
 if(action&&create.contains(action)){create.open=false;closeMenu();}
 if(!create.contains(event.target))create.open=false;
 if(action&&['nav','project','open-portal'].includes(action.dataset.action)&&!action.disabled){closeMenu();queueMicrotask(()=>{if(!layout.hidden){main.focus({preventScroll:true});document.querySelector('.workspace').scrollIntoView({block:'start',behavior:'instant'});}});}
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){if(document.querySelector('#modal').open)return;const open=create.open;create.open=false;if(open){event.preventDefault();create.querySelector('summary').focus();}if(aside.classList.contains('pf-menu-open')){event.preventDefault();closeMenu(true);}return;}
 const shortcut=(event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='k';
 const typing=event.target.closest('input,textarea,select,[contenteditable="true"]');
 if((shortcut||event.key==='/'&&!typing&&!event.ctrlKey&&!event.metaKey&&!event.altKey)&&agency()&&!layout.hidden&&!document.querySelector('#modal').open&&!searchForm.hidden){event.preventDefault();search.focus();search.select();}
});
sync();
})(window.PF);
