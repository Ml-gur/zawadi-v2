import { useState } from 'react';
import { eligibilityInfo } from '../pages/public/browse-shared';

interface EligibilityListProps {
  countries?: string[] | null;
  /** How many names to show before the read-more toggle */
  max?: number;
  className?: string;
  /** Tailwind classes for the names */
  textClass?: string;
  /** Tailwind classes for the "+N more" toggle */
  moreClass?: string;
}

/**
 * Concrete, expandable eligibility list. Regional blocks (ECOWAS, EAC…) are
 * expanded to their member countries; only continent-wide awards render the
 * summary "All African countries". Overflow is handled with a read-more.
 */
export default function EligibilityList({
  countries,
  max = 4,
  className = '',
  textClass = 'text-graphite',
  moreClass = 'text-off-black-ink underline underline-offset-4 decoration-ash hover:decoration-off-black-ink',
}: EligibilityListProps) {
  const [expanded, setExpanded] = useState(false);
  const info = eligibilityInfo(countries);

  if (info.isAllAfrica) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span aria-hidden>🌍</span>
        <span className={textClass}>All African countries</span>
      </span>
    );
  }

  const names = info.countries;
  if (names.length === 0) {
    return <span className={`${textClass} ${className}`}>All African countries</span>;
  }

  const visible = expanded ? names : names.slice(0, max);
  const hidden = names.length - visible.length;

  return (
    <span className={`inline ${className}`}>
      {info.markerLabel && (
        <span className={`block text-xs font-medium ${textClass} mb-0.5`}>{info.markerLabel}:</span>
      )}
      <span className={textClass}>{visible.join(', ')}</span>
      {hidden > 0 && (
        <>
          {' '}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className={`font-medium cursor-pointer ${moreClass}`}
          >
            +{hidden} more
          </button>
        </>
      )}
      {expanded && names.length > max && (
        <>
          {' '}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            className={`font-medium cursor-pointer ${moreClass}`}
          >
            Show less
          </button>
        </>
      )}
    </span>
  );
}
