'use client';

import { useRef, useState } from 'react';
import type { LanguageCode } from '@/lib/types';
import { t } from '@/lib/i18n';

export type GuideStep = { title: string; body: string };

/**
 * A step picker for the guide. The steps are tabs in the ARIA sense: one is
 * selected, the panel below describes it, arrow keys move the selection, and only
 * the selected tab stays in the tab order. The whole sequence is also readable as
 * plain text, so nothing depends on hovering or on the animation.
 */
export function GuideSteps({ steps, lang }: { steps: GuideStep[]; lang: LanguageCode }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const step = steps[active];

  function move(nextIndex: number) {
    const clamped = Math.min(Math.max(nextIndex, 0), steps.length - 1);
    setActive(clamped);
    tabs.current[clamped]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        move(active + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        move(active - 1);
        break;
      case 'Home':
        event.preventDefault();
        move(0);
        break;
      case 'End':
        event.preventDefault();
        move(steps.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={t(lang, 'how.stepsAria')}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
      >
        {steps.map((s, i) => {
          const selected = i === active;
          return (
            <button
              key={s.title}
              ref={(node) => {
                tabs.current[i] = node;
              }}
              role="tab"
              id={`how-tab-${i}`}
              aria-selected={selected}
              aria-controls="how-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => move(i)}
              onKeyDown={onKeyDown}
              className={
                'flex flex-col items-start gap-2 rounded-xl border p-3 text-left min-h-11 motion-safe:transition-colors ' +
                (selected
                  ? 'border-clay-500 bg-clay-50 text-ink-900'
                  : 'border-ink-100 bg-white text-ink-700 hover:border-clay-300')
              }
            >
              <span className="flex items-center gap-2">
                <span
                  className={
                    'w-7 h-7 shrink-0 rounded-full grid place-items-center text-xs font-black ' +
                    (selected ? 'bg-clay-700 text-white' : 'bg-ink-50 text-ink-700')
                  }
                >
                  {i + 1}
                </span>
                <StepIcon index={i} className={selected ? 'text-clay-700' : 'text-ink-500'} />
              </span>
              <span className="text-sm font-semibold leading-snug">{s.title}</span>
            </button>
          );
        })}
      </div>

      <div
        id="how-panel"
        role="tabpanel"
        aria-labelledby={`how-tab-${active}`}
        tabIndex={0}
        className="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5 card-shadow"
      >
        <div key={active} className="guide-panel-in">
          <h3 className="text-lg font-bold text-ink-900">
            <span className="text-clay-700">{active + 1}.</span> {step.title}
          </h3>
          <p className="mt-2 text-sm sm:text-base text-ink-700">{step.body}</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => move(active - 1)}
            disabled={active === 0}
            className="px-3 py-2 rounded-lg border border-ink-100 text-sm font-semibold min-h-11 disabled:opacity-40 hover:bg-clay-50"
          >
            ← {t(lang, 'how.previous')}
          </button>
          <span className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ink-900">
              {t(lang, 'how.position', { current: active + 1, total: steps.length })}
            </span>
            <span aria-hidden className="flex gap-1">
              {steps.map((s, i) => (
                <span
                  key={s.title}
                  className={'w-2 h-2 rounded-full ' + (i === active ? 'bg-clay-700' : 'bg-ink-100')}
                />
              ))}
            </span>
          </span>
          <button
            type="button"
            onClick={() => move(active + 1)}
            disabled={active === steps.length - 1}
            className="px-3 py-2 rounded-lg border border-ink-100 text-sm font-semibold min-h-11 accent-bg disabled:opacity-40"
          >
            {t(lang, 'how.next')} →
          </button>
        </div>
      </div>
    </div>
  );
}

const ICON_PATHS = [
  // browse, price, inquiry, reply, arrange, group
  'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 4 4',
  'M4 4h7l9 9-7 7-9-9V4Zm4 3h.01',
  'M4 5h16v11H9l-5 4V5Z',
  'M4 6h16v10h-7l-4 4v-4H4V6Zm4 3h8M8 12h5',
  'M4 18 12 6l8 12M9 18h6',
  'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20a6 6 0 0 1 12 0m0 0a6 6 0 0 1 8 0'
];

function StepIcon({ index, className }: { index: number; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={'w-5 h-5 shrink-0 ' + className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICON_PATHS[index % ICON_PATHS.length]} />
    </svg>
  );
}
