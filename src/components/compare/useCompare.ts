import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

/** Shared scholarship-comparison state: up to `max` selections plus modal visibility. */
export function useCompare(max = 3) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  // Mirror for stable callback reads without stale closures
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const toggle = useCallback((id: string) => {
    const current = idsRef.current;
    if (current.has(id)) {
      const next = new Set(current);
      next.delete(id);
      setIds(next);
      toast('Removed from comparison');
    } else if (current.size >= max) {
      toast(`Compare up to ${max} scholarships at a time`);
    } else {
      const next = new Set(current);
      next.add(id);
      setIds(next);
      toast('Added to comparison');
    }
  }, [max]);

  const clear = useCallback(() => {
    setIds(new Set());
  }, []);

  return { ids, open, setOpen, toggle, clear };
}
