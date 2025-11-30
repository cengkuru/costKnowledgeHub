import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorMessage } from '@/components/ErrorMessage';

describe('ErrorMessage Component', () => {
  it('should render error message', () => {
    render(<ErrorMessage message="Test error message" />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render dismiss button when onDismiss is provided', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage message="Test error" onDismiss={onDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss error');
    expect(dismissButton).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    render(<ErrorMessage message="Test error" onDismiss={onDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss error');
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should not render dismiss button when onDismiss is not provided', () => {
    render(<ErrorMessage message="Test error" />);

    const dismissButton = screen.queryByLabelText('Dismiss error');
    expect(dismissButton).not.toBeInTheDocument();
  });

  it('should have proper styling for accessibility', () => {
    const { container } = render(<ErrorMessage message="Test error" />);

    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveClass('bg-red-50', 'border-red-200');
  });
});
