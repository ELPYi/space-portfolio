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

// Navbar tab switching
document.querySelectorAll('.landing-nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.landing-nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(`tab-${target}`).classList.remove('hidden');
  });
});

// Lazy-load the entire 3D scene only when the user clicks Launch
let gameLoaded = false;
const launchBtn = document.getElementById('launch-btn');
launchBtn.addEventListener('click', async () => {
  launchBtn.textContent = 'LOADING...';
  launchBtn.disabled = true;
  try {
    const { init, resume } = await import('./game.js');
    if (!gameLoaded) {
      gameLoaded = true;
      init();
    } else {
      resume();
    }
  } catch (err) {
    console.error('Failed to load scene:', err);
    launchBtn.textContent = 'LAUNCH';
    launchBtn.disabled = false;
  }
});
