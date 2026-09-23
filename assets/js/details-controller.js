const groups=[...document.querySelectorAll('[data-exclusive-details]')];
for(const group of groups){
 const items=[...group.querySelectorAll(':scope > details')];
 for(const item of items)item.addEventListener('toggle',()=>{
  if(!item.open)return;
  for(const other of items)if(other!==item)other.open=false;
 });
}
