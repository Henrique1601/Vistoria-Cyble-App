// Theme initialization - runs before React to prevent flash
(function() {
  try {
    var t = localStorage.getItem('vistoria_theme');
    if (t === 'light') {
      document.documentElement.classList.replace('dark', 'light');
    }
  } catch(e) {}
})();
