export function buildSrcDoc(html: string, scrollY: number, nonce: string): string {
  const css =
    "body{font-family:Georgia,serif;line-height:1.65;max-width:680px;margin:0 auto;padding:28px 24px;color:#1b1b1b;background:#fff}" +
    "a{color:#1a5fb4}h1{line-height:1.2}pre,code{background:#f1f1f1;padding:2px 5px;border-radius:4px}" +
    "blockquote{border-left:3px solid #ccc;margin:0;padding-left:14px;color:#555}";

  const script = `
(function(){
  var y=${Math.max(0, Math.round(scrollY))};
  window.addEventListener('load',function(){window.scrollTo(0,y)});
  window.addEventListener('scroll',function(){
    parent.postMessage({type:'scroll',y:window.scrollY},'*');
  });
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a'):null;
    if(!a)return;
    e.preventDefault();
    var h=a.getAttribute('href');
    if(h)parent.postMessage({type:'link',href:h},'*');
  });
})();`;

  const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'`;

  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<meta http-equiv="Content-Security-Policy" content="${csp}">` +
    `<style>${css}</style></head><body>${html}` +
    `<script nonce="${nonce}">${script}</script></body></html>`
  );
}