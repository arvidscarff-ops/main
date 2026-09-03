import './site.js';
import {getProjects} from './projects.js';
const container=document.querySelector('[data-project-list]');
if(container){const type=container.dataset.projectList;container.innerHTML=getProjects(type).map((project,index)=>`<a class="project-row" href="${project.slug}/"><span class="project-row__title">${project.title}</span><span class="project-row__meta project-row__year">${project.year}</span><span class="project-row__meta project-row__category">${project.category}</span><span class="project-row__meta project-row__index">0${index+1}</span><span class="project-row__preview" aria-hidden="true"></span></a>`).join('');}
