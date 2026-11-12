/* 侧栏署名外观模块：由 index.html 加载，随版本库同步。
   移除本模块即可回到中性界面。 */
(function () {
    var box = document.querySelector('.author-box');
    if (!box || document.getElementById('localBrand')) return;

    var css = [
        '.author-box .localBrand{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:100%;height:100%;}',
        '.author-box .localBadge{height:13px;width:auto;flex:0 0 auto;filter:drop-shadow(0 1px 2px rgba(200,16,46,.35));}',
        '.author-box .localName{font-size:9px;font-weight:700;letter-spacing:.5px;line-height:1;white-space:nowrap;color:var(--text,#3C4149);opacity:.8;}',
        '@media (max-height:660px){.author-box .localName{display:none;}}'
    ].join('\n');
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    var wrap = document.createElement('div');
    wrap.className = 'localBrand';
    wrap.id = 'localBrand';
    wrap.innerHTML =
        '<svg class="localBadge" viewBox="0 0 56 20" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="UDG">' +
        '<rect x="0" y="0.5" width="56" height="19" rx="4" fill="#C8102E"></rect>' +
        '<text x="28" y="14.6" text-anchor="middle" fill="#FFFFFF" font-size="11.5" font-weight="800" letter-spacing="1.5" font-family="Arial, Helvetica, sans-serif">UDG</text>' +
        '</svg>' +
        '<span class="localName">建筑设计四院</span>';
    box.appendChild(wrap);
})();
