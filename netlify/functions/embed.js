(function() {
  const iframe = document.createElement('iframe');
  iframe.src = 'https://frolicking-daffodil-ab69de.netlify.app/';
  iframe.style.position = 'fixed';
  iframe.style.bottom = '24px';
  iframe.style.right = '24px';
  iframe.style.width = '360px';
  iframe.style.height = '520px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '16px';
  iframe.style.zIndex = '9999';
  iframe.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
  document.body.appendChild(iframe);
})();
