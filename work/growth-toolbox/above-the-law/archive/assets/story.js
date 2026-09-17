/* Static, dependency-free editorial UI. Chart.js and source data are local. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!window.Chart || !window.STORY_DATA) { $('load-error').hidden = false; return; }
  const D = window.STORY_DATA;
  const C = {orange:'#b6472c', teal:'#2e6c68', ink:'#232820', muted:'#61655b', line:'#e0e2d8', paper:'#fdfbf6'};
  const charts = {}, configs = {}, exports = {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  Chart.defaults.font.family = 'Arial, Helvetica, sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.color = C.muted;
  // Preserve Chart.js's easing defaults; replacing this object breaks hover animations.
  Chart.defaults.animation.duration = reduced ? 0 : 350;
  const fmt = (v,n=1) => v === null || v === undefined || !Number.isFinite(v) ? 'Not available' : v.toFixed(n);
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const table = (headers, rows) => `<table><thead><tr>${headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${escape(v ?? 'Not available')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  function endpointTicks(scale){
    const ticks=scale.ticks;
    if(ticks.length<=6)return;
    const keep=new Set([0,.25,.5,.75,1].map(f=>Math.round(f*(ticks.length-1))));
    scale.ticks=ticks.filter((_tick,index)=>keep.has(index));
  }
  const axes = (max=100) => ({x:{grid:{display:false},border:{display:false},afterBuildTicks:endpointTicks,ticks:{maxRotation:0,autoSkip:false}},y:{min:0,max,grid:{color:C.line},border:{display:false},ticks:{maxTicksLimit:5}}});
  const base = () => ({responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:C.ink,padding:12,displayColors:true}},scales:axes()});
  function plot(id,config,metadata) {
    configs[id]=copyConfig(config); exports[id]=metadata;
    const chart=charts[id];
    if(chart){
      chart.stop();
      chart.setActiveElements([]);
      chart.tooltip?.setActiveElements([],{x:0,y:0});
      chart.data=config.data;
      chart.options=config.options;
      chart.update('none');
    }else charts[id]=new Chart($(`${id}-chart`),config);
  }
  function line(label, data, color, extra={}) {
    return {label,data,borderColor:color,backgroundColor:color,pointRadius:0,pointHoverRadius:4,borderWidth:2.5,tension:0,spanGaps:false,...extra};
  }
  const incomeYears = [...new Set(D.income.map(r=>r.year))].sort((a,b)=>a-b);
  const groups=[['p90p100','Top 10%',C.orange],['p0p50','Bottom 50%',C.teal],['p99p100','Top 1%',C.ink]];
  const incomeValue=(g,y)=>D.income.find(r=>r.group===g&&r.year===y)?.value??null;
  $('income-stat').textContent=fmt(incomeValue('p90p100',2023))+'%';
  const incomeOptions=base(); incomeOptions.scales=axes(60);
  incomeOptions.plugins.tooltip.callbacks={label:c=>`${c.dataset.label}: ${fmt(c.parsed.y,2)}%`};
  plot('income',{type:'line',data:{labels:incomeYears,datasets:groups.map(([g,l,c],i)=>line(l,incomeYears.map(y=>incomeValue(g,y)),c,i===2?{borderDash:[4,4]}:{}))},options:incomeOptions},{title:'Who receives the world’s income?',subtitle:'World · 1980–2023 · Pre-tax income shares (%)',note:'Source: WID.world, sptincj992, WO. Equal-split adults over 20; estimated global distribution. Top 1% is included in top 10%. Income, not wealth; no causal inference.'});
  $('income-table').innerHTML=table(['Year','Top 10% (%)','Bottom 50% (%)','Top 1% (%)'],incomeYears.map(y=>[y,...groups.map(([g])=>fmt(incomeValue(g,y),2))]));
  $('internet-stat').textContent=fmt(D.internet.find(r=>r.year===2025)?.value)+'%';
  const internetOptions=base();internetOptions.plugins.tooltip.callbacks={label:c=>`${fmt(c.parsed.y,1)}% of population`};
  plot('internet',{type:'line',data:{labels:D.internet.map(r=>r.year),datasets:[line('Internet users (% of population)',D.internet.map(r=>r.value),C.teal,{fill:true,backgroundColor:'#2e6c6810'})]},options:internetOptions},{title:'The internet became everyday life',subtitle:'World · 2000–2025 · Internet users (% of population)',note:'Source: ITU via World Bank, IT.NET.USER.ZS, WLD. Internet use is not entertainment time or political disengagement. Global aggregate; no causal inference.'});
  $('internet-table').innerHTML=table(['Year','Population using internet (%)'],D.internet.map(r=>[r.year,fmt(r.value,1)]));
  const netflixOptions=base();netflixOptions.scales=axes(350);netflixOptions.plugins.tooltip.callbacks={label:c=>`${fmt(c.parsed.y,3)} million memberships`};
  plot('netflix',{type:'bar',data:{labels:D.netflix.observations.map(r=>r.year),datasets:[{label:'Paid memberships (millions)',data:D.netflix.observations.map(r=>r.value),backgroundColor:C.orange,borderRadius:2,maxBarThickness:34}]},options:netflixOptions},{title:'Netflix’s worldwide membership base grew',subtitle:'Worldwide operations · 2019–2024 · Year-end paid memberships (millions)',note:'Source: Netflix 2021 and 2024 annual reports. Memberships are not unique people or hours watched; extra-member subaccounts excluded. One platform, not the whole market.'});
  $('netflix-table').innerHTML=table(['Year-end','Paid memberships (millions)'],D.netflix.observations.map(r=>[r.year,fmt(r.value,3)]));

  function historyRows() {
    const period={all:[1945,2013],early:[1945,1969],middle:[1970,1989],late:[1990,2013]}[$('era').value];
    return D.campaigns.filter(r=>!r.ongoing && r.end>=period[0] && r.end<=period[1] && (!$('stable-only').checked || !r.changedMethod));
  }
  function updateHistory() {
    const rows=historyRows();
    const totals=[1,0].map(m=>rows.filter(r=>r.method===m&&[0,1].includes(r.success)));
    const counts=totals.map(a=>a.filter(r=>r.success===1).length);
    const percentages=totals.map((a,i)=>a.length?100*counts[i]/a.length:null);
    const labels=['Primarily nonviolent','Primarily violent'];
    const options=base();options.indexAxis='y';options.scales={x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:C.line},border:{display:false}},y:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}}};
    options.plugins.tooltip.callbacks={label:c=>`${fmt(c.parsed.x)}% · ${counts[c.dataIndex]} of ${totals[c.dataIndex].length} campaigns`};
    plot('history',{type:'bar',data:{labels,datasets:[{label:'Successful campaigns (%)',data:percentages,backgroundColor:[C.teal,C.orange],barThickness:48,borderRadius:2}]},options},{title:'Historical campaign outcomes, not inevitable revolutions',subtitle:`Worldwide NAVCO sample · End period ${$('era').selectedOptions[0].text} · ${rows.length} completed campaigns`,note:`NAVCO 2.1. Final-year primary method; success = achieving a stated maximalist goal. Nonviolent: ${counts[0]}/${totals[0].length}; violent: ${counts[1]}/${totals[1].length}. ${$('stable-only').checked?'Method-switching campaigns excluded. ':''}Ongoing campaigns excluded. Not a causal comparison or a measure of lasting democracy.`});
    $('history-count').textContent=`${rows.length} completed campaigns in this view · 53 ongoing campaigns excluded from the full sample${$('stable-only').checked?' · Method-switching campaigns removed':''}.`;
    $('history-table').innerHTML=table(['Final-year method','Successful','Completed','Success rate (%)'],labels.map((l,i)=>[l,counts[i],totals[i].length,fmt(percentages[i],2)]));
    $('history-chart').setAttribute('aria-label',labels.map((l,i)=>`${l}: ${fmt(percentages[i])}% (${counts[i]} of ${totals[i].length})`).join('; '));
  }
  $('era').addEventListener('change',updateHistory);$('stable-only').addEventListener('change',updateHistory);updateHistory();
  const campaignList=[...D.campaigns].sort((a,b)=>a.name.localeCompare(b.name));
  function campaignDetail() {
    const r=D.campaigns.find(r=>r.id===$('campaign-select').value);
    if(!r){$('campaign-detail').textContent='No matching campaigns.';return;}
    $('campaign-detail').innerHTML=`<div class="campaign-name">${escape(r.name)}</div><p class="meta">${escape(r.location)} · ${r.start}–${r.end}${r.ongoing?' (still ongoing at dataset endpoint)':''}</p><span class="campaign-badge">${r.ongoing?'Ongoing · excluded from outcome comparison':r.success===1?'Coded successful':'Coded unsuccessful'}</span><p class="small-copy">Final observed method: ${r.method===1?'primarily nonviolent':'primarily violent'}. ${r.changedMethod?'Primary method changed during the recorded years.':'No primary-method switch recorded.'}</p>`;
  }
  function filterCampaigns() {
    const query=$('campaign-search').value.toLocaleLowerCase().trim();
    const old=$('campaign-select').value;
    const rows=campaignList.filter(r=>(r.name+' '+r.location).toLocaleLowerCase().includes(query));
    $('campaign-select').replaceChildren(...rows.map(r=>new Option(`${r.name} · ${r.location} · ${r.end}`,r.id)));
    if(rows.some(r=>r.id===old))$('campaign-select').value=old;
    $('campaign-select').disabled=!rows.length;campaignDetail();
  }
  filterCampaigns();
  const firstCase=D.campaigns.find(r=>r.name==='Active Forces');
  if(firstCase){$('campaign-select').value=firstCase.id;campaignDetail();}
  $('campaign-search').addEventListener('input',filterCampaigns);$('campaign-select').addEventListener('change',campaignDetail);

  const metrics={I_IUVOD:'Commercial video-on-demand',I_IUSNET:'Social network participation',I_IUCPP:'Online civic / political activity',I_IUVOTE:'Online consultations / petitions',I_IUPOL2:'Expressing political opinions online',deprivation:'Severe material & social deprivation'};
  const sortedCountries=Object.entries(D.countries).sort((a,b)=>a[1].name.localeCompare(b[1].name));
  for(const [code,country]of sortedCountries)$('country').add(new Option(country.name,code));
  let comparison=[];
  const state=()=>({x:$('x-metric').value,y:$('y-metric').value,year:+$('year').value,country:$('country').value});
  const obs=(code,metric,year)=>D.countries[code].series[metric].find(r=>r.year===year)??{value:null,flag:''};
  function pearson(rows) {
    if(rows.length<3)return null;
    const mx=rows.reduce((s,r)=>s+r.x,0)/rows.length,my=rows.reduce((s,r)=>s+r.y,0)/rows.length;
    let a=0,b=0,c=0;for(const r of rows){a+=(r.x-mx)*(r.y-my);b+=(r.x-mx)**2;c+=(r.y-my)**2;}
    return b&&c?a/Math.sqrt(b*c):null;
  }
  function updateCountryDetail() {
    const s=state();const r=comparison.find(r=>r.code===s.country);
    if(!r){$('country-detail').textContent='Choose a country to inspect its values. Each dot represents one country, not one person.';return;}
    $('country-detail').innerHTML=`<h3>${escape(r.name)} · ${s.year}</h3><p>${escape(metrics[s.x])}: <strong>${fmt(r.x,2)}${r.x===null?'':'%'}</strong>${r.xflag?' ['+escape(r.xflag)+']':''}</p><p>${escape(metrics[s.y])}: <strong>${fmt(r.y,2)}${r.y===null?'':'%'}</strong>${r.yflag?' ['+escape(r.yflag)+']':''}</p>`;
  }
  function rememberState() {
    const s=state();const url=new URL(location.href);url.searchParams.set('x',s.x);url.searchParams.set('y',s.y);url.searchParams.set('year',s.year);
    if(s.country)url.searchParams.set('country',s.country);else url.searchParams.delete('country');
    try{history.replaceState(null,'',url);}catch{/* file:// preview can restrict history changes. */}
  }
  function updateExplorer() {
    const s=state();comparison=sortedCountries.map(([code,c])=>{const a=obs(code,s.x,s.year),b=obs(code,s.y,s.year);return {code,name:c.name,x:a.value,y:b.value,xflag:a.flag,yflag:b.flag};});
    const complete=comparison.filter(r=>r.x!==null&&r.y!==null);
    const omitted=comparison.filter(r=>r.x===null||r.y===null).map(r=>r.name);
    const r=pearson(complete);$('correlation').textContent=r===null?'r = —':`r = ${r>=0?'+':''}${r.toFixed(2)}`;
    $('relationship').textContent=r===null?'Too little variation or too few paired observations to compute a correlation.':Math.abs(r)<0.1?'Little linear association in this view.':r>0?'The two measures are positively associated across the countries shown.':'The two measures are negatively associated across the countries shown.';
    $('sample-size').textContent=`${complete.length} of 27 countries · equal country weights · ${s.year}${omitted.length?' · Missing pairs: '+omitted.join(', '):' · No missing pairs'}.`;
    const options=base();options.interaction={mode:'nearest',intersect:true};
    options.scales={x:{type:'linear',min:0,max:s.x==='deprivation'?25:100,title:{display:true,text:`${metrics[s.x]} (%)`,font:{size:11}},grid:{color:C.line},border:{display:false}},y:{min:0,max:60,title:{display:true,text:'Online activity (%)',font:{size:11}},grid:{color:C.line},border:{display:false}}};
    options.plugins.tooltip.callbacks={title:items=>`${items[0].raw.name} · ${s.year}`,label:c=>[`${metrics[s.x]}: ${fmt(c.raw.x,2)}%${c.raw.xflag?' ['+c.raw.xflag+']':''}`,`${metrics[s.y]}: ${fmt(c.raw.y,2)}%${c.raw.yflag?' ['+c.raw.yflag+']':''}`]};
    options.onClick=(_event,elements)=>{
      if(!elements.length)return;
      const point=charts.scatter.data.datasets[elements[0].datasetIndex].data[elements[0].index];
      // Finish the pointer event before updating chart data or active elements.
      if(point.code!==$('country').value)queueMicrotask(()=>{$('country').value=point.code;updateExplorer();});
    };
    const other=complete.filter(r=>r.code!==s.country),selected=complete.filter(r=>r.code===s.country);
    const datasets=[{label:'EU countries',data:other,pointRadius:7,pointHoverRadius:10,backgroundColor:'#2e6c68b0',borderColor:C.teal,borderWidth:1.5},{label:s.country?D.countries[s.country].name:'Selected country',data:selected,pointRadius:10,pointHoverRadius:12,backgroundColor:C.orange,borderColor:C.ink,borderWidth:1.5}];
    const denominator=s.x==='deprivation'?'Deprivation: all ages (EU-SILC). Online activity: ages 16–74 (ICT survey). Different populations; not a direct comfort measure.':'Both measures: % of individuals aged 16–74, activity in previous three months. Categories can overlap; not percentages of time spent.';
    const note=`Eurostat · ${s.year} · ${denominator} Pearson’s r uses complete same-year pairs with equal country weights. Source flags are preserved. EU only; online activity is not offline protest.`;
    plot('scatter',{type:'scatter',data:{datasets},options},{title:'Does entertainment mean less participation?',subtitle:`EU countries · ${s.year} · ${complete.length} paired observations · Pearson r = ${r===null?'not available':r.toFixed(2)}`,note:`X: ${metrics[s.x]}. Y: ${metrics[s.y]}. ${note}`});
    $('scatter-note').textContent=note;
    $('scatter-table').innerHTML=table(['Country',metrics[s.x]+' (%)','X flag',metrics[s.y]+' (%)','Y flag'],comparison.map(r=>[r.name,fmt(r.x,2),r.xflag||'—',fmt(r.y,2),r.yflag||'—']));
    $('scatter-chart').setAttribute('aria-label',`${metrics[s.x]} versus ${metrics[s.y]}, ${s.year}, EU countries. ${$('relationship').textContent} ${$('sample-size').textContent}`);
    updateCountryDetail();rememberState();
  }
  const params=new URLSearchParams(location.search);
  for(const [param,id] of [['x','x-metric'],['y','y-metric'],['year','year'],['country','country']]){
    const value=params.get(param);if(value!==null&&[...$(id).options].some(o=>o.value===value))$(id).value=value;
    $(id).addEventListener('change',updateExplorer);
  }
  updateExplorer();
  $('reset-view').addEventListener('click',()=>{$('x-metric').value='I_IUVOD';$('y-metric').value='I_IUCPP';$('year').value='2024';$('country').value='';updateExplorer();});
  let toastTimeout;function toast(message){$('toast').textContent=message;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').textContent='',4500);}
  function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  $('download-comparison').addEventListener('click',()=>{
    const s=state();const rows=[['country','year',s.x+'_percent','x_flag',s.y+'_percent','y_flag','source'],...comparison.map(r=>[r.name,s.year,r.x??'',r.xflag,r.y??'',r.yflag,'Eurostat isoc_ci_ac_i; deprivation from ilc_mdsd11'])];
    const csv=rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');download(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),`eu-comparison-${s.year}-${s.x}-${s.y}.csv`);
  });
  $('share-view').addEventListener('click',async()=>{rememberState();const url=new URL(location.href);url.hash='explorer';if(url.protocol==='file:'){toast('This is a local preview. Publish the page before sharing its link.');return;}try{await navigator.clipboard.writeText(url.href);toast('Link copied with the selected indicators, year and country.');}catch{window.prompt('Copy this link:',url.href);}});
  function copyConfig(value){if(Array.isArray(value))return value.map(copyConfig);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copyConfig(v)]));return value;}
  function wrapText(ctx,text,x,y,maxWidth,lineHeight){let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){ctx.fillText(line,x,y);line=word;y+=lineHeight;}else line=next;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
  async function exportChart(id,button){
    button.disabled=true;let temporaryChart;
    try{
      const metadata=exports[id];const output=document.createElement('canvas');output.width=1600;output.height=1160;const ctx=output.getContext('2d');ctx.fillStyle=C.paper;ctx.fillRect(0,0,1600,1160);
      ctx.fillStyle=C.orange;ctx.font='bold 17px Arial';ctx.fillText('TOO COMFORTABLE TO REVOLT?  /  ARVID SCARFF',70,55);
      ctx.fillStyle=C.ink;ctx.font='42px Georgia';let y=wrapText(ctx,metadata.title,70,119,1460,48);ctx.font='20px Arial';ctx.fillStyle=C.muted;wrapText(ctx,metadata.subtitle,70,y+8,1460,26);
      const canvas=document.createElement('canvas');canvas.width=1460;canvas.height=680;const config=copyConfig(configs[id]);config.options.responsive=false;config.options.animation=false;config.options.devicePixelRatio=1;config.options.onClick=undefined;
      config.options.plugins.legend={display:id==='income'||id==='scatter',position:'bottom',labels:{font:{size:16},boxWidth:14,padding:20,filter:item=>id!=='scatter'||item.text!=='Selected country'}};
      for(const scale of Object.values(config.options.scales)){scale.ticks={...scale.ticks,font:{size:16}};if(scale.title)scale.title.font={size:17};}
      temporaryChart=new Chart(canvas,config);temporaryChart.update('none');ctx.drawImage(canvas,70,220);
      ctx.strokeStyle='#c9cdbf';ctx.beginPath();ctx.moveTo(70,939);ctx.lineTo(1530,939);ctx.stroke();ctx.font='19px Arial';ctx.fillStyle=C.muted;wrapText(ctx,metadata.note,70,979,1460,28);
      ctx.font='16px Arial';ctx.fillText('Snapshot: 15 Sep 2026 · Sources & methodology: arvidscarff-ops.github.io/main/attention-gap/',70,1124);
      const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw new Error('Image creation failed');download(blob,`attention-gap-${id}.png`);toast('Chart image downloaded with units, date, source and interpretation notes.');
    }catch(error){console.error(error);toast('The image could not be created. Try a modern browser or download the CSV.');}finally{temporaryChart?.destroy();button.disabled=false;}
  }
  document.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>exportChart(button.dataset.export,button)));
  const chapterObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('.chapter-nav a').forEach(a=>{const active=a.hash==='#'+entry.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-15% 0px -60% 0px'});
  ['global','history','explorer','verdict'].forEach(id=>chapterObserver.observe($(id)));
  // Exposed read-only handles make automated numerical and interaction checks possible.
  window.STORY_TEST={charts,pearson,historyRows,state};
})();
