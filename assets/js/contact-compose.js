const form=document.querySelector('[data-contact-compose]');
const link=form?.querySelector('[data-compose-email]');
const update=()=>{
  if(!form||!link)return;
  const subject=form.elements.subject.value.trim();
  const body=form.elements.body.value.trim();
  const query=[];
  if(subject)query.push(`subject=${encodeURIComponent(subject)}`);
  if(body)query.push(`body=${encodeURIComponent(body)}`);
  link.href=`mailto:arvidscarff@gmail.com${query.length?`?${query.join('&')}`:''}`;
};
form?.addEventListener('input',update);
update();
