import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CanvasNavButtons from './CanvasNavButtons';

describe('CanvasNavButtons', () => {
  it('renders both buttons with aria-labels', () => {
    render(
      <CanvasNavButtons canBack canForward onBack={() => {}} onForward={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go forward' })).toBeInTheDocument();
  });

  it('disables back button when canBack=false', () => {
    render(
      <CanvasNavButtons canBack={false} canForward onBack={() => {}} onForward={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go forward' })).not.toBeDisabled();
  });

  it('disables forward button when canForward=false', () => {
    render(
      <CanvasNavButtons canBack canForward={false} onBack={() => {}} onForward={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Go forward' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go back' })).not.toBeDisabled();
  });

  it('calls onBack and onForward when enabled buttons are clicked', () => {
    const onBack = vi.fn();
    const onForward = vi.fn();
    render(
      <CanvasNavButtons canBack canForward onBack={onBack} onForward={onForward} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go forward' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onForward).toHaveBeenCalledTimes(1);
  });

  it('does not call onBack when back button is disabled', () => {
    const onBack = vi.fn();
    render(
      <CanvasNavButtons canBack={false} canForward onBack={onBack} onForward={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onBack).not.toHaveBeenCalled();
  });
});
