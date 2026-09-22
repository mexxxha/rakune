import type { Work } from '../lib/types';

const MOBILE_MAX = 720;
const TASKBAR_HEIGHT = 28;
const DESKTOP_ICON_GUTTER = 96;
const SITE_TITLE = 'rakune';

function isMobile() {
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
}

function readWorks(): Work[] {
  const el = document.getElementById('portfolio-data');
  if (!el?.textContent) return [];

  try {
    const data = JSON.parse(el.textContent) as { works?: Work[] };
    return data.works ?? [];
  } catch {
    return [];
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function initDesktop() {
  const works = readWorks();
  const desktop = new DesktopController(works);
  desktop.bind();

  desktop.open('works');
  const workId = new URLSearchParams(location.search).get('work');
  if (workId && works.some((work) => work.id === workId)) {
    desktop.openWork(workId, true);
  } else if (works.length > 0) {
    desktop.openWork(works[0].id, false);
  }
}

class DesktopController {
  private z = 20;
  private works: Work[];
  private currentWorkId: string | null = null;
  private focusReturn: HTMLElement | null = null;
  private drag: {
    el: HTMLElement;
    offsetX: number;
    offsetY: number;
  } | null = null;

  constructor(works: Work[]) {
    this.works = works;
  }

  bind() {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;

      const openId = target.closest<HTMLElement>('[data-open]')?.dataset.open;
      if (openId) {
        this.open(openId);
        this.closeStartMenu();
        return;
      }

      const workId = target.closest<HTMLElement>('[data-work-id]')?.dataset.workId;
      if (workId) {
        this.openWork(workId, true);
        return;
      }

      if (target.closest('[data-start-button]')) {
        this.toggleStartMenu();
        return;
      }

      const win = target.closest<HTMLElement>('[data-window]');
      if (win?.dataset.window) {
        this.focus(win.dataset.window);
      }

      if (target.closest('[data-window-close]') && win?.dataset.window) {
        this.close(win.dataset.window);
        return;
      }

      if (target.closest('[data-window-min]') && win?.dataset.window) {
        this.minimize(win.dataset.window);
        return;
      }

      if (target.closest('[data-window-max]') && win?.dataset.window) {
        this.toggleMaximize(win.dataset.window);
        return;
      }

      if (target.closest('[data-viewer-prev]')) {
        this.shiftWork(-1);
        return;
      }

      if (target.closest('[data-viewer-next]')) {
        this.shiftWork(1);
        return;
      }

      if (target.closest('[data-viewer-zoom]')) {
        this.toggleViewerZoom();
        return;
      }

      if (target.closest('[data-viewer-back-list]')) {
        this.backToWorksList();
        return;
      }

      const taskId = target.closest<HTMLElement>('[data-task]')?.dataset.task;
      if (taskId) {
        this.toggleFromTaskbar(taskId);
        return;
      }

      if (!target.closest('[data-start-menu]') && !target.closest('[data-start-button]')) {
        this.closeStartMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const menu = document.querySelector<HTMLElement>('[data-start-menu]');
        if (menu && !menu.hidden) {
          event.preventDefault();
          this.closeStartMenu();
          return;
        }
        const frontId = this.getFrontWindowId();
        if (frontId) {
          event.preventDefault();
          this.close(frontId);
        }
        return;
      }

      const viewer = this.get('viewer');
      if (!viewer || viewer.hidden || viewer.classList.contains('is-minimized')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      event.preventDefault();
      this.shiftWork(event.key === 'ArrowLeft' ? -1 : 1);
    });

    document.addEventListener('pointerdown', (event) => {
      const handle = (event.target as HTMLElement).closest<HTMLElement>('[data-window-drag]');
      if (!handle) return;
      if ((event.target as HTMLElement).closest('button')) return;
      if (isMobile()) return;

      const win = handle.closest<HTMLElement>('[data-window]');
      if (!win || win.classList.contains('is-maximized')) return;

      const rect = win.getBoundingClientRect();
      this.drag = {
        el: win,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      if (win.dataset.window) this.focus(win.dataset.window);
      win.setPointerCapture(event.pointerId);
    });

    document.addEventListener('pointermove', (event) => {
      if (!this.drag) return;
      const { el, offsetX, offsetY } = this.drag;
      const minLeft = this.minDragLeft(el);
      const maxLeft = Math.max(minLeft, window.innerWidth - el.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - TASKBAR_HEIGHT - el.offsetHeight);
      const left = clamp(event.clientX - offsetX, minLeft, maxLeft);
      const top = clamp(event.clientY - offsetY, 0, maxTop);
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    });

    document.addEventListener('pointerup', () => {
      this.drag = null;
    });

    this.tickClock();
    window.setInterval(() => this.tickClock(), 30_000);
    this.syncTaskbar();
    this.syncDesktopIcons();
    this.syncWorkSelection();
  }

  private minDragLeft(el: HTMLElement) {
    if (el.classList.contains('is-maximized')) return 0;
    const nearFull = el.offsetWidth >= window.innerWidth - 32;
    return nearFull ? 0 : DESKTOP_ICON_GUTTER;
  }

  private get(id: string) {
    return document.querySelector<HTMLElement>(`[data-window="${id}"]`);
  }

  private getFrontWindowId() {
    const active = document.querySelector<HTMLElement>(
      '[data-window]:not(.is-inactive):not(.is-minimized)',
    );
    if (active?.hidden) return null;
    return active?.dataset.window ?? null;
  }

  open(id: string) {
    const el = this.get(id);
    if (!el) return;
    if (el.hidden) {
      this.focusReturn =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    el.hidden = false;
    el.classList.remove('is-minimized');
    this.focus(id);
    el.focus({ preventScroll: true });
    this.syncTaskbar();
    this.syncDesktopIcons();
  }

  close(id: string) {
    const el = this.get(id);
    if (!el) return;
    el.hidden = true;
    el.classList.remove('is-minimized', 'is-maximized');
    if (id === 'viewer') {
      this.currentWorkId = null;
      this.resetViewerZoom();
      document.title = SITE_TITLE;
      const url = new URL(location.href);
      url.searchParams.delete('work');
      history.replaceState(null, '', url.pathname);
    }
    const returnTo = this.focusReturn;
    this.focusReturn = null;
    this.syncTaskbar();
    this.syncDesktopIcons();
    this.syncWorkSelection();
    if (returnTo && document.contains(returnTo)) {
      returnTo.focus({ preventScroll: true });
    }
  }

  minimize(id: string) {
    const el = this.get(id);
    if (!el) return;
    el.classList.add('is-minimized');
    this.syncTaskbar();
    this.syncDesktopIcons();
  }

  toggleMaximize(id: string) {
    const el = this.get(id);
    if (!el || isMobile()) return;
    el.classList.toggle('is-maximized');
    this.focus(id);
  }

  focus(id: string) {
    const el = this.get(id);
    if (!el || el.hidden) return;
    this.z += 1;
    el.style.zIndex = String(this.z);
    document.querySelectorAll('[data-window]').forEach((node) => {
      node.classList.toggle('is-inactive', node !== el);
    });
    this.syncTaskbar();
  }

  toggleFromTaskbar(id: string) {
    const el = this.get(id);
    if (!el) return;
    if (el.classList.contains('is-minimized')) {
      this.open(id);
      return;
    }
    if (!el.classList.contains('is-inactive') && !el.hidden) {
      this.minimize(id);
      return;
    }
    this.open(id);
  }

  openWork(id: string, updateUrl = true) {
    const work = this.works.find((item) => item.id === id);
    if (!work) return;
    this.open('works');
    this.currentWorkId = id;
    this.resetViewerZoom();
    this.renderViewer(work);
    this.open('viewer');

    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('work', id);
      history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
    }
  }

  private backToWorksList() {
    this.close('viewer');
    this.open('works');
  }

  private shiftWork(step: number) {
    if (!this.works.length) return;
    const index = this.works.findIndex((work) => work.id === this.currentWorkId);
    const next = this.works[(index + step + this.works.length) % this.works.length];
    this.openWork(next.id, true);
  }

  private toggleViewerZoom() {
    const stage = document.querySelector<HTMLElement>('[data-viewer-stage]');
    const button = document.querySelector<HTMLElement>('[data-viewer-zoom]');
    if (!stage || !button) return;
    const zoomed = stage.classList.toggle('is-zoomed');
    button.textContent = zoomed ? '全体表示' : '拡大';
    button.setAttribute('aria-pressed', String(zoomed));
  }

  private resetViewerZoom() {
    const stage = document.querySelector<HTMLElement>('[data-viewer-stage]');
    const button = document.querySelector<HTMLElement>('[data-viewer-zoom]');
    stage?.classList.remove('is-zoomed');
    if (button) {
      button.textContent = '拡大';
      button.setAttribute('aria-pressed', 'false');
    }
  }

  private renderViewer(work: Work) {
    const win = this.get('viewer');
    const title = win?.querySelector('.window__title');
    const image = document.querySelector<HTMLImageElement>('[data-viewer-image]');
    const caption = document.querySelector<HTMLElement>('[data-viewer-caption]');
    const year = document.querySelector<HTMLElement>('[data-viewer-year]');
    const count = document.querySelector<HTMLElement>('[data-viewer-count]');
    const index = this.works.findIndex((item) => item.id === work.id);

    if (title) title.textContent = work.title;
    if (win) win.dataset.title = work.title;
    document.title = `${work.title} - ${SITE_TITLE}`;
    if (image) {
      image.src = work.image;
      image.alt = work.title;
    }
    if (caption) {
      const text = work.caption ?? '';
      caption.textContent = text;
      caption.hidden = !text;
    }
    if (year) {
      const text = work.year ? String(work.year) : '';
      year.textContent = text;
      year.hidden = !text;
    }
    if (count) {
      count.textContent =
        index >= 0 && this.works.length ? `${index + 1} / ${this.works.length}` : '';
    }
    this.syncTaskbar();
    this.syncWorkSelection();
  }

  private toggleStartMenu() {
    const menu = document.querySelector<HTMLElement>('[data-start-menu]');
    const button = document.querySelector('[data-start-button]');
    if (!menu || !button) return;
    const next = menu.hidden;
    menu.hidden = !next;
    button.classList.toggle('is-active', next);
  }

  private closeStartMenu() {
    const menu = document.querySelector<HTMLElement>('[data-start-menu]');
    const button = document.querySelector('[data-start-button]');
    if (menu) menu.hidden = true;
    button?.classList.remove('is-active');
  }

  private syncTaskbar() {
    const host = document.querySelector('[data-taskbar-tasks]');
    if (!host) return;

    const openWindows = [...document.querySelectorAll<HTMLElement>('[data-window]')].filter(
      (el) => !el.hidden,
    );

    host.replaceChildren(
      ...openWindows.map((el) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'taskbar__task';
        button.dataset.task = el.dataset.window ?? '';
        button.textContent = el.dataset.title ?? el.dataset.window ?? '';
        if (!el.classList.contains('is-minimized') && !el.classList.contains('is-inactive')) {
          button.classList.add('is-active');
        }
        return button;
      }),
    );
  }

  private syncDesktopIcons() {
    document.querySelectorAll<HTMLElement>('.desktop [data-open]').forEach((button) => {
      const id = button.dataset.open;
      if (!id) return;
      const win = this.get(id);
      const isOpen = Boolean(win && !win.hidden && !win.classList.contains('is-minimized'));
      button.classList.toggle('is-active', isOpen);
    });
  }

  private syncWorkSelection() {
    document.querySelectorAll<HTMLElement>('[data-work-id]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.workId === this.currentWorkId);
    });
  }

  private tickClock() {
    const el = document.querySelector('[data-clock]');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
