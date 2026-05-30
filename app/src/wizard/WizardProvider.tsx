import { useCallback } from 'react';
import type { ReactNode } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS, type CallBackProps } from 'react-joyride';
import { useWizardStore } from './wizardStore';
import { TOURS } from './tours';
import { useAutoStartTour } from './useAutoStartTour';

const JOYRIDE_STYLES = {
  options: {
    backgroundColor: '#1a1a1a',
    arrowColor: '#1a1a1a',
    textColor: '#e5e5e5',
    primaryColor: '#fafafa',
    overlayColor: 'rgba(0,0,0,0.55)',
    zIndex: 10000,
  },
  tooltipContainer: { textAlign: 'left' as const },
  buttonNext: { backgroundColor: '#fafafa', color: '#0a0a0a' },
  buttonBack: { color: '#a3a3a3' },
  buttonSkip: { color: '#737373' },
  spotlight: { borderRadius: 6 },
};

export default function WizardProvider({ children }: { children: ReactNode }) {
  useAutoStartTour();

  const activeTour = useWizardStore((s) => s.activeTour);
  const stepIndex = useWizardStore((s) => s.stepIndex);
  const markSeen = useWizardStore((s) => s.markSeen);
  const closeTour = useWizardStore((s) => s.closeTour);
  const skipAll = useWizardStore((s) => s.skipAll);
  const setStepIndex = useWizardStore((s) => s.setStepIndex);

  // noUncheckedIndexedAccess: TOURS[activeTour] is typed Step[] | undefined.
  // The `?? []` is the fallback; in practice activeTour is always a valid TourId.
  const steps = activeTour ? (TOURS[activeTour] ?? []) : [];

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, type, index } = data;
      if (!activeTour) return;

      if (status === STATUS.FINISHED) {
        markSeen(activeTour);
        closeTour();
        return;
      }
      if (status === STATUS.SKIPPED) {
        skipAll();
        closeTour();
        return;
      }
      if (action === ACTIONS.CLOSE) {
        markSeen(activeTour);
        closeTour();
        return;
      }
      if (type === EVENTS.STEP_AFTER) {
        setStepIndex(index + 1);
        return;
      }
      if (type === EVENTS.TARGET_NOT_FOUND) {
        // eslint-disable-next-line no-console
        console.warn(`[wizard] step ${activeTour}:${index} target not found, skipping`);
        setStepIndex(index + 1);
      }
    },
    [activeTour, markSeen, closeTour, skipAll, setStepIndex],
  );

  return (
    <>
      <Joyride
        run={activeTour !== null}
        steps={steps}
        stepIndex={stepIndex}
        continuous
        showSkipButton
        showProgress
        disableScrolling
        styles={JOYRIDE_STYLES}
        callback={handleCallback}
      />
      {children}
    </>
  );
}
