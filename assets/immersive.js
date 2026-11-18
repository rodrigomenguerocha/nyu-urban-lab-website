/* Progressive enhancement: every page and link remains usable without motion. */
(() => {
 'use strict';
 const root=document.getElementById('urbanlab-home'); if(!root)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const header=root.querySelector('.ul-header');
 const setHeader=()=>{const h=Math.ceil(header.getBoundingClientRect().height);root.style.setProperty('--header-height',`${h}px`);document.documentElement.style.scrollPaddingTop=`${h+76}px`;};
 new ResizeObserver(setHeader).observe(header); setHeader();
 const progress=root.querySelector('.reading-progress');
 let scheduled=false;
 function onScroll(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{
   const distance=document.documentElement.scrollHeight-innerHeight;
   if(progress)progress.style.transform=`scaleX(${distance>0?Math.min(1,scrollY/distance):0})`;
   scheduled=false;
 });}
 addEventListener('scroll',onScroll,{passive:true});onScroll();
 if(!reduced.matches&&'IntersectionObserver' in window){
   const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:0.06,rootMargin:'0px 0px 35px 0px'});
   root.querySelectorAll('.city-manifesto h2,.manifesto-detail,.ul-section-head,.ul-research-item,.latest-publication>div,.illustrated-tools .ul-tool,.field-copy,.archive-feature>div,.page-body>.feature-row,.page-body>.related').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});
   // Hash navigation, keyboard focus, and find-in-page should never conceal content.
   root.addEventListener('focusin',e=>e.target.closest('.reveal-ready')?.classList.add('is-visible'));
 }
 const chapterLinks=[...root.querySelectorAll('.chapter-nav a')];
 if(chapterLinks.length){
  const sections=chapterLinks.map(a=>root.querySelector(a.hash));
  const selectChapter=()=>{
   const cutoff=header.getBoundingClientRect().height+105;
   let active=sections[0]; sections.forEach(s=>{if(s&&s.getBoundingClientRect().top<=cutoff)active=s;});
   chapterLinks.forEach(a=>{if(a.hash==='#'+active?.id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
  };
  addEventListener('scroll',selectChapter,{passive:true}); selectChapter();
 }
})();
