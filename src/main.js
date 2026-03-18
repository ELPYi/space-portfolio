// Mobile warning — shown on landing page before any 3D code loads
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

if (isMobile) {
  const warning = document.getElementById('mobile-warning');
  const okBtn = document.getElementById('mobile-warning-ok');
  if (warning && okBtn) {
    warning.classList.remove('hidden');
    okBtn.addEventListener('click', () => warning.classList.add('hidden'));
  }
}

// Lazy-load the entire 3D scene only when the user clicks Launch
const launchBtn = document.getElementById('launch-btn');
launchBtn.addEventListener('click', async () => {
  launchBtn.textContent = 'LOADING...';
  launchBtn.disabled = true;
  try {
    const { init } = await import('./game.js');
    init();
  } catch (err) {
    console.error('Failed to load scene:', err);
    launchBtn.textContent = 'LAUNCH';
    launchBtn.disabled = false;
  }
});
