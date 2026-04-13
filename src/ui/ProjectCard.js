import * as THREE from 'three';

export class ProjectCard {
  constructor() {
    this.card = document.getElementById('project-card');
    this.title = document.getElementById('card-title');
    this.description = document.getElementById('card-description');
    this.tech = document.getElementById('card-tech');
    this.githubLink = document.getElementById('card-github');
    this.liveLink = document.getElementById('card-live');
    this.hint = this.card.querySelector('.card-hint');
    this.currentProject = null;
    this.isEntered = false;
  }

  show(project, entered) {
    const changed = this.currentProject !== project.id;
    this.currentProject = project.id;

    if (changed) {
      const color = new THREE.Color(project.accentColor);
      const hex = '#' + color.getHexString();

      this.title.textContent = project.name;
      this.title.style.color = hex;
      this.description.textContent = project.description;

      this.tech.innerHTML = '';
      for (const t of project.techStack) {
        const span = document.createElement('span');
        span.textContent = t;
        span.style.borderColor = hex;
        span.style.color = hex;
        this.tech.appendChild(span);
      }

      this.githubLink.href = project.github;
      this.liveLink.href = project.liveUrl || '#';
      this.liveLink.style.display = project.liveUrl && project.liveUrl !== '#' ? 'inline' : 'none';
    }

    // Toggle entered state — show links prominently, hide hint
    if (entered && !this.isEntered) {
      this.isEntered = true;
      this.card.classList.add('entered');
      this.hint.textContent = 'Project opened. Click canvas to resume flying';
    } else if (!entered && this.isEntered) {
      this.isEntered = false;
      this.card.classList.remove('entered');
      this.hint.textContent = 'Fly closer to open project';
    }

    this.card.classList.remove('hidden');
  }

  hide() {
    if (!this.currentProject) return;
    this.currentProject = null;
    this.isEntered = false;
    this.card.classList.remove('hidden', 'entered');
    this.card.classList.add('hidden');
    this.hint.textContent = 'Fly closer to open project';
  }
}
