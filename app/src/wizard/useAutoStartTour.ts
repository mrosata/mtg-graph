import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWizardStore } from './wizardStore';
import { useGraphStore } from '../stores/graphStore';
import { tourForPathname, type TourId } from './selectors';

const MIN_VIEWPORT_WIDTH = 768;

function routeNeedsGraph(pathname: string): boolean {
  return pathname === '/' || pathname === '/graph';
}

export function useAutoStartTour(): void {
  const pathname = useLocation().pathname;
  const graphStatus = useGraphStore((s) => s.status);

  useEffect(() => {
    const { activeTour, seenTours, openTour } = useWizardStore.getState();
    if (activeTour) return;
    if (window.innerWidth < MIN_VIEWPORT_WIDTH) return;

    if (!seenTours.has('global')) {
      openTour('global');
      return;
    }

    if (routeNeedsGraph(pathname) && graphStatus !== 'ready') return;

    const pageTour: TourId | null = tourForPathname(pathname);
    if (pageTour && !seenTours.has(pageTour)) {
      openTour(pageTour);
    }
    // Intentionally NOT including activeTour / seenTours in deps. This effect
    // fires only on pathname change (and on graph hydration). When a tour
    // closes on the same route, no re-evaluation happens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, graphStatus]);
}
