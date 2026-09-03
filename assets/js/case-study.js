import './site.js';
import {projects,getProject} from './projects.js';
const main=document.querySelector('[data-case-study]');
if(main){const{type,slug}=main.dataset,project=getProject(type,slug);if(!project){main.innerHTML='<p>Project not found.</p>';}else{const group=projects.filter(item=>item.type===type),next=group[(group.indexOf(project)+1)%group.length];document.title=`${project.title} — Arvid Shane Scarff`;main.innerHTML=`
  <header class="case-head"><div><p class="page-kicker">${project.type} / ${project.year}</p><h1 class="case-title">${project.title}</h1></div><dl class="facts case-meta"><div class="fact"><dt>Discipline</dt><dd>${project.category}</dd></div><div class="fact"><dt>Role</dt><dd>${project.role}</dd></div><div class="fact"><dt>Client</dt><dd>${project.client}</dd></div><div class="fact"><dt>Year</dt><dd>${project.year}</dd></div></dl></header>
  <div class="media-placeholder" role="img" aria-label="Project hero media placeholder">Hero media / 16:9</div>
  <section class="case-copy"><h2>Context</h2><p>${project.intro} Replace this module with the concise context, problem, and opportunity behind the work.</p></section>
  <div class="media-pair"><div class="media-placeholder media-placeholder--portrait" role="img" aria-label="Portrait project media placeholder">Portrait media</div><div class="media-placeholder media-placeholder--landscape" role="img" aria-label="Landscape project media placeholder">Landscape media</div></div>
  <section class="case-copy"><h2>Approach</h2><p>Describe the strategic hypothesis, creative intervention, and the evidence that shaped the next decision.</p></section>
  <a class="next-project" href="../${next.slug}/"><span>Next ${type}</span><strong>${next.title}</strong></a>`;}}
