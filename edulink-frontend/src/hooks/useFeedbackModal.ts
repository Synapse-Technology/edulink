import { useState, useCallback } from 'react';
import type { FeedbackVariant } from '../components/common/FeedbackModal';

interface FeedbackModalState {
  show: boolean;
  title: string;
  message: React.ReactNode;
  variant: FeedbackVariant;
  details?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const useFeedbackModal = () => {
  const [state, setState] = useState<FeedbackModalState>({
    show: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const showFeedback = useCallback((config: Omit<FeedbackModalState, 'show'>) => {
    setState({
      ...config,
      show: true,
    });
  }, []);

  const hideFeedback = useCallback(() => {
    setState((prev) => ({ ...prev, show: false }));
  }, []);

  const showError = useCallback((title: string, message: string, details?: string) => {
    setState({
      show: true,
      title,
      message,
      variant: 'error',
      details,
    });
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    setState({
      show: true,
      title,
      message,
      variant: 'success',
    });
  }, []);

  const showConfirm = useCallback((config: {
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    variant?: FeedbackVariant;
    confirmLabel?: string;
    cancelLabel?: string;
  }) => {
    setState({
      show: true,
      title: config.title,
      message: config.message,
      variant: config.variant || 'warning',
      primaryActionLabel: config.confirmLabel || 'Confirm',
      onPrimaryAction: () => {
        config.onConfirm();
        hideFeedback();
      },
      secondaryActionLabel: config.cancelLabel || 'Cancel',
      onSecondaryAction: hideFeedback,
    });
  }, [hideFeedback]);

  return {
    feedbackProps: {
      ...state,
      onHide: hideFeedback,
    },
    showFeedback,
    hideFeedback,
    showError,
    showSuccess,
    showConfirm,
  };
};
