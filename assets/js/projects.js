export const projects=[
  {slug:'project-one',title:'Project One',year:'2026',type:'work',category:'Growth Strategy',role:'Role to be added',client:'Client to be added',intro:'Case-study introduction to be added.',featured:true},
  {slug:'project-two',title:'Project Two',year:'2026',type:'work',category:'Creative Direction',role:'Role to be added',client:'Client to be added',intro:'Case-study introduction to be added.'},
  {slug:'project-three',title:'Project Three',year:'2025',type:'work',category:'Brand Systems',role:'Role to be added',client:'Client to be added',intro:'Case-study introduction to be added.'},
  {slug:'experiment-one',title:'Experiment One',year:'2026',type:'lab',category:'Visual Study',role:'Independent',client:'—',intro:'Experiment notes to be added.'},
  {slug:'experiment-two',title:'Experiment Two',year:'2025',type:'lab',category:'Prototype',role:'Independent',client:'—',intro:'Experiment notes to be added.'}
];
export const getProject=(type,slug)=>projects.find(project=>project.type===type&&project.slug===slug);
export const getProjects=type=>projects.filter(project=>project.type===type);
