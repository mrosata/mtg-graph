import { useCallback } from 'react';
import type { ReactNode } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS, type CallBackProps } from 'react-joyride';
import { useWizardStore } from './wizardStore';
import { TOURS } from './tours';
import { useAutoStartTour } from './useAutoStartTour';

const JOYRIDE_STYLES = {
  options: {
    backgroundColor: '#15131a',
    arrowColor: '#3a3543',
    textColor: '#ece4cf',
    primaryColor: '#d4a44a',
    overlayColor: 'rgba(8, 6, 10, 0.72)',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: 12,
    padding: 20,
    border: '1px solid #3a3543',
    boxShadow:
      '0 24px 48px -16px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(212, 164, 74, 0.08), inset 0 1px 0 rgba(240, 201, 122, 0.06)',
    fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif",
  },
  tooltipContainer: { textAlign: 'left' as const },
  tooltipTitle: {
    fontFamily: "'Cormorant Garamond', 'Iowan Old Style', Palatino, serif",
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '0.01em',
    color: '#f0c97a',
    margin: '0 0 8px',
  },
  tooltipContent: {
    fontSize: 14,
    lineHeight: 1.55,
    color: '#ece4cf',
    padding: '4px 0 12px',
  },
  tooltipFooter: { marginTop: 8 },
  buttonNext: {
    backgroundColor: '#d4a44a',
    color: '#0c0a0d',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    border: 'none',
    boxShadow: '0 1px 0 rgba(240, 201, 122, 0.4) inset, 0 4px 10px -4px rgba(212, 164, 74, 0.5)',
    transition: 'background-color 120ms ease',
  },
  buttonBack: {
    color: '#b8af9a',
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 14px',
    borderRadius: 8,
    marginRight: 4,
    transition: 'color 120ms ease, background-color 120ms ease',
  },
  buttonSkip: {
    color: '#8a8295',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.02em',
  },
  buttonClose: { color: '#8a8295', width: 10, height: 10 },
  spotlight: { borderRadius: 8 },
  beacon: { transform: 'scale(1)' },
};

const JOYRIDE_LOCALE = {
  back: 'Back',
  close: 'Close',
  last: 'Finish',
  next: 'Next',
  skip: 'Skip tour',
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
        const delta = action === ACTIONS.PREV ? -1 : 1;
        setStepIndex(index + delta);
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
        locale={JOYRIDE_LOCALE}
        callback={handleCallback}
      />
      {children}
    </>
  );
}
