import React, { useEffect, useState } from 'react';

function CollapsibleCard({
  storageKey,
  title,
  defaultOpen = true,
  containerClassName = 'bg-gray-100 p-6 rounded-xl shadow-lg border border-gray-300',
  headerClassName = 'mb-4 border-b pb-3 border-gray-400',
  titleClassName = 'text-2xl font-bold text-gray-800',
  children,
}) {
  const [open, setOpen] = useState(() => {
    if (!storageKey) return defaultOpen;
    try {
      const raw = window.localStorage.getItem(`dashboard.card.${storageKey}`);
      if (raw === null) return defaultOpen;
      return raw === '1';
    } catch (_e) {
      return defaultOpen;
    }
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(`dashboard.card.${storageKey}`, open ? '1' : '0');
    } catch (_e) {
      // noop
    }
  }, [open, storageKey]);

  return (
    <div className={containerClassName}>
      <div className={`flex items-center justify-between gap-4 ${headerClassName}`}>
        <h2 className={titleClassName}>{title}</h2>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="shrink-0 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          aria-expanded={open}
        >
          {open ? 'Contraer' : 'Expandir'}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {open ? children : null}
    </div>
  );
}

export default CollapsibleCard;

