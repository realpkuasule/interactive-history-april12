import {filterProjects,validateCatalog} from './library-filter.mjs';
const form=document.querySelector('#filters');
try{
 const catalog=validateCatalog(await fetch('catalog.json').then(r=>{if(!r.ok)throw Error('catalog');return r.json();}));
 function filter(){const values=Object.fromEntries(new FormData(form)),matches=filterProjects(catalog.projects,values),ids=new Set(matches.map(p=>p.id));for(const el of document.querySelectorAll('[data-project]'))el.hidden=!ids.has(el.dataset.project);document.querySelector('#result-count').textContent='共 '+matches.length+' 部作品';document.querySelector('#empty-results').hidden=matches.length>0;}
 form.addEventListener('input',filter);form.addEventListener('change',filter);form.addEventListener('submit',e=>{e.preventDefault();filter();});
 // The reset event fires before the browser restores control values. Run after its default action.
 form.addEventListener('reset',()=>setTimeout(filter,0));filter();
}catch{document.querySelector('#result-count').textContent='目录筛选暂时不可用，仍可浏览全部作品。';}
