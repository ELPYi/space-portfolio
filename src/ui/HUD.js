export class HUD {
  constructor(onLaunch) {
    this.introScreen = document.getElementById('intro-screen');
    this.crosshair = document.getElementById('crosshair');
    this.launchBtn = document.getElementById('launch-btn');

    this.launchBtn.addEventListener('click', () => {
      const docEl = document.documentElement;
      if (docEl && docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      }
      this.introScreen.classList.add('hidden');
      onLaunch();
    });
  }

  showCrosshair(visible) {
    this.crosshair.style.display = visible ? 'block' : 'none';
  }
}
