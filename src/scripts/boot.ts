const CHAR_MS = 16;
const TITLE_CHAR_MS = 22;
const STATUS_PAUSE_MS = 200;
const AFTER_OK_MS = 180;
const LINE_GAP_MS = 110;
const WELCOME_HOLD_MS = 760;
const LEAVE_MS = 520;

type Tone = 'title' | 'dim' | 'welcome';

type BootLine = {
  text: string;
  tone?: Tone;
  status?: boolean;
  gap?: boolean;
};

function readWorkCount() {
  const el = document.getElementById('portfolio-data');
  if (!el?.textContent) return 0;

  try {
    const data = JSON.parse(el.textContent) as { works?: unknown[] };
    return data.works?.length ?? 0;
  } catch {
    return 0;
  }
}

function buildLines(count: number): BootLine[] {
  const works =
    count > 0 ? `作品を ${count} 件読み込んでいます` : '作品フォルダを確認しています';

  return [
    { text: 'rakune OS  [Version 95]', tone: 'title' },
    { text: 'Copyright (C) rakune', tone: 'dim' },
    { text: '', gap: true },
    { text: '> 訪問を受け付けています', status: true },
    { text: `> ${works}`, status: true },
    { text: '> デスクトップを起動しています', status: true },
    { text: '', gap: true },
    { text: 'rakune へようこそ。', tone: 'welcome' },
  ];
}

function createLine(source: HTMLParagraphElement, line: BootLine) {
  const node = source.cloneNode(true) as HTMLParagraphElement;
  node.classList.remove('is-active');
  if (line.gap) node.classList.add('boot__line--gap');
  if (line.status) node.classList.add('boot__line--status');
  if (line.tone) node.classList.add(`boot__line--${line.tone}`);
  return node;
}

export function playBoot() {
  const root = document.querySelector<HTMLElement>('[data-boot]');
  const os = document.querySelector<HTMLElement>('[data-os]');

  if (!root) {
    os?.removeAttribute('inert');
    return Promise.resolve();
  }

  const log = root.querySelector<HTMLElement>('[data-boot-log]');
  const seed = log?.querySelector<HTMLParagraphElement>('.boot__line');
  if (!log || !seed) {
    root.dataset.bootDone = 'true';
    root.remove();
    os?.removeAttribute('inert');
    return Promise.resolve();
  }

  root.dataset.bootActive = 'true';
  document.title = 'rakune OS';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let settled = false;

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });

  const dismiss = () => {
    if (settled) return;
    settled = true;
    root.dataset.bootDone = 'true';
    os?.removeAttribute('inert');

    if (reduced) {
      root.remove();
      return;
    }

    root.classList.add('is-leaving');
    window.setTimeout(() => root.remove(), LEAVE_MS);
  };

  const typeInto = async (el: HTMLElement, text: string, charMs: number) => {
    for (const char of text) {
      el.textContent += char;
      await wait(charMs);
    }
  };

  const run = async () => {
    const lines = buildLines(readWorkCount());

    if (reduced) {
      log.replaceChildren();
      for (const line of lines) {
        const node = createLine(seed, line);
        const text = node.querySelector<HTMLElement>('.boot__text');
        if (text) text.textContent = line.text;
        if (line.status) {
          node.querySelector('.boot__dots')?.removeAttribute('hidden');
          const ok = node.querySelector('.boot__ok');
          if (ok) {
            ok.textContent = 'OK';
            ok.removeAttribute('hidden');
          }
        }
        log.append(node);
      }
      await wait(640);
      return;
    }

    log.replaceChildren();
    const cursorLine = createLine(seed, { text: '' });
    cursorLine.classList.add('is-active');
    log.append(cursorLine);
    await wait(280);
    cursorLine.remove();

    for (const line of lines) {
      const node = createLine(seed, line);
      const text = node.querySelector<HTMLElement>('.boot__text');
      log.append(node);

      if (line.gap) {
        await wait(LINE_GAP_MS);
        continue;
      }

      node.classList.add('is-active');
      if (text) {
        await typeInto(text, line.text, line.tone === 'title' ? TITLE_CHAR_MS : CHAR_MS);
      }
      node.classList.remove('is-active');

      if (line.status) {
        node.querySelector('.boot__dots')?.removeAttribute('hidden');
        await wait(STATUS_PAUSE_MS);
        const ok = node.querySelector('.boot__ok');
        if (ok) {
          ok.textContent = 'OK';
          ok.removeAttribute('hidden');
        }
        await wait(AFTER_OK_MS);
        continue;
      }

      if (line.tone === 'welcome') {
        node.classList.add('is-active');
        await wait(WELCOME_HOLD_MS);
      }
    }
  };

  return run()
    .catch((error: unknown) => {
      console.error(error);
    })
    .finally(() => {
      dismiss();
    });
}
