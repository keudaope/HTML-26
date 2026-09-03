document.querySelectorAll('.menu').forEach(btn=>btn.addEventListener('click',()=>{const links=document.getElementById('navlinks');const open=links.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));}));
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const form=document.getElementById('event-form');
if(form){
 const range=form.querySelector('#kokemus'); const out=form.querySelector('#kokemusOut');
 if(range&&out){const sync=()=>out.value=range.value+' / 10';sync();range.addEventListener('input',sync)}
 form.addEventListener('submit',e=>{e.preventDefault(); const box=document.getElementById('form-result'); box.classList.add('show'); box.innerHTML='<strong>Kiitos!</strong> Tämä on harjoituslomake: tietoja ei lähetetty palvelimelle. Lomake on kuitenkin validoitu selaimessa ja kaikki elementit toimivat käyttöliittymässä.'; box.focus();});
}
