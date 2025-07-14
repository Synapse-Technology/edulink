import 'package:flutter/material.dart';
import '../theme/theme.dart';

enum MessageType { success, error, warning, info }

class FeedbackMessage extends StatelessWidget {
  final String message;
  final MessageType type;
  final VoidCallback? onDismiss;
  final bool showIcon;

  const FeedbackMessage({
    super.key,
    required this.message,
    required this.type,
    this.onDismiss,
    this.showIcon = true,
  });

  Color get _backgroundColor {
    switch (type) {
      case MessageType.success:
        return EduLinkTheme.success.withOpacity(0.1);
      case MessageType.error:
        return EduLinkTheme.error.withOpacity(0.1);
      case MessageType.warning:
        return EduLinkTheme.warning.withOpacity(0.1);
      case MessageType.info:
        return EduLinkTheme.info.withOpacity(0.1);
    }
  }

  Color get _borderColor {
    switch (type) {
      case MessageType.success:
        return EduLinkTheme.success;
      case MessageType.error:
        return EduLinkTheme.error;
      case MessageType.warning:
        return EduLinkTheme.warning;
      case MessageType.info:
        return EduLinkTheme.info;
    }
  }

  Color get _textColor {
    switch (type) {
      case MessageType.success:
        return EduLinkTheme.success;
      case MessageType.error:
        return EduLinkTheme.error;
      case MessageType.warning:
        return EduLinkTheme.warning;
      case MessageType.info:
        return EduLinkTheme.info;
    }
  }

  IconData get _icon {
    switch (type) {
      case MessageType.success:
        return Icons.check_circle_outline;
      case MessageType.error:
        return Icons.error_outline;
      case MessageType.warning:
        return Icons.warning_amber_outlined;
      case MessageType.info:
        return Icons.info_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(EduLinkTheme.spacingM),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
        border: Border.all(color: _borderColor),
      ),
      child: Row(
        children: [
          if (showIcon) ...[
            Icon(
              _icon,
              color: _textColor,
              size: 20,
            ),
            const SizedBox(width: EduLinkTheme.spacingS),
          ],
          Expanded(
            child: Text(
              message,
              style: EduLinkTheme.textTheme.bodyMedium?.copyWith(
                color: _textColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          if (onDismiss != null) ...[
            const SizedBox(width: EduLinkTheme.spacingS),
            GestureDetector(
              onTap: onDismiss,
              child: Icon(
                Icons.close,
                color: _textColor,
                size: 18,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class SuccessMessage extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;

  const SuccessMessage({
    super.key,
    required this.message,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return FeedbackMessage(
      message: message,
      type: MessageType.success,
      onDismiss: onDismiss,
    );
  }
}

class ErrorMessage extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;

  const ErrorMessage({
    super.key,
    required this.message,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return FeedbackMessage(
      message: message,
      type: MessageType.error,
      onDismiss: onDismiss,
    );
  }
}

class WarningMessage extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;

  const WarningMessage({
    super.key,
    required this.message,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return FeedbackMessage(
      message: message,
      type: MessageType.warning,
      onDismiss: onDismiss,
    );
  }
}

class InfoMessage extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;

  const InfoMessage({
    super.key,
    required this.message,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return FeedbackMessage(
      message: message,
      type: MessageType.info,
      onDismiss: onDismiss,
    );
  }
} 