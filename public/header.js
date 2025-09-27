(function(){
  const current = window.location.pathname.replace(/\/$/, '') || '/';
  const pages = [
    {href:'/', label:'Home'},
    {href:'/about', label:'About Us'},
    {href:'/contact', label:'Contact'},
    {href:'/faq', label:'FAQ'},
  ];
  const games = [
    {href:'/parquet-puzzle', label:'Parquet Puzzle', icon:'🧩'},
    {href:'#', label:'Coming Soon', icon:'✨', disabled:true},
  ];

  const navLinks = pages.map(p => `<li><a href="${p.href}" ${p.href===current?'aria-current="page"':''}>${p.label}</a></li>`).join('');
  const gameLinks = games.map(g => `<a ${g.disabled?'aria-disabled="true" tabindex="-1"':''} href="${g.disabled?'#':g.href}">${g.icon||''} ${g.label}</a>`).join('');

  const header = `
  <header class="site-topbar">
    <div class="container">
      <a href="/" class="brand"><span class="logo">DP</span> Daily Puzzle</a>
      <nav aria-label="Primary">
        <ul class="site-nav">
          ${navLinks}
          <li class="dropdown">
            <details>
              <summary>Game Picker</summary>
              <div class="menu" role="menu">${gameLinks}</div>
            </details>
          </li>
        </ul>
      </nav>
    </div>
  </header>`;

  const inject = () => {
    if (!document.body) return;
    if (!document.querySelector('.site-topbar')) {
      document.body.insertAdjacentHTML('afterbegin', header);
      document.querySelectorAll('.menu a[aria-disabled="true"]').forEach(a=>{
        a.addEventListener('click', e=>e.preventDefault());
      });
    }
  };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', inject, {once:true});
  else inject();
})();