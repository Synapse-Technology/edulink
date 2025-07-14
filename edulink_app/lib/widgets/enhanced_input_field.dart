import 'package:flutter/material.dart';
import '../theme/theme.dart';

class EnhancedInputField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData prefixIcon;
  final IconData? suffixIcon;
  final VoidCallback? onSuffixPressed;
  final TextInputType? keyboardType;
  final bool obscureText;
  final String? Function(String?)? validator;
  final bool enabled;
  final int? maxLines;
  final int? maxLength;

  const EnhancedInputField({
    super.key,
    required this.controller,
    required this.label,
    required this.hint,
    required this.prefixIcon,
    this.suffixIcon,
    this.onSuffixPressed,
    this.keyboardType,
    this.obscureText = false,
    this.validator,
    this.enabled = true,
    this.maxLines = 1,
    this.maxLength,
  });

  @override
  State<EnhancedInputField> createState() => _EnhancedInputFieldState();
}

class _EnhancedInputFieldState extends State<EnhancedInputField>
    with SingleTickerProviderStateMixin {
  late AnimationController _focusController;
  late Animation<double> _focusAnimation;
  late Animation<double> _scaleAnimation;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _focusAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _focusController,
      curve: Curves.easeInOut,
    ));
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.02,
    ).animate(CurvedAnimation(
      parent: _focusController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _focusController.dispose();
    super.dispose();
  }

  void _onFocusChange(bool focused) {
    setState(() {
      _isFocused = focused;
    });
    if (focused) {
      _focusController.forward();
    } else {
      _focusController.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _focusController,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
              boxShadow: [
                BoxShadow(
                  color: _isFocused 
                      ? EduLinkTheme.primary.withOpacity(0.3)
                      : Colors.black.withOpacity(0.1),
                  blurRadius: _isFocused ? 12 : 8,
                  offset: Offset(0, _isFocused ? 4 : 2),
                ),
              ],
            ),
            child: TextFormField(
              controller: widget.controller,
              keyboardType: widget.keyboardType,
              obscureText: widget.obscureText,
              validator: widget.validator,
              enabled: widget.enabled,
              maxLines: widget.maxLines,
              maxLength: widget.maxLength,
              onTap: () => _onFocusChange(true),
              onFieldSubmitted: (_) => _onFocusChange(false),
              onChanged: (_) {
                if (!_isFocused) {
                  _onFocusChange(true);
                }
              },
              style: EduLinkTheme.textTheme.bodyLarge?.copyWith(
                color: EduLinkTheme.onSurface,
                fontWeight: FontWeight.w500,
              ),
              decoration: InputDecoration(
                filled: true,
                fillColor: _isFocused 
                    ? EduLinkTheme.surfaceVariant.withOpacity(0.8)
                    : EduLinkTheme.surfaceVariant.withOpacity(0.3),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
                  borderSide: BorderSide(
                    color: _isFocused 
                        ? EduLinkTheme.primary 
                        : EduLinkTheme.outline.withOpacity(0.3),
                    width: _isFocused ? 2 : 1,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
                  borderSide: BorderSide(
                    color: EduLinkTheme.primary,
                    width: 2,
                  ),
                ),
                errorBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
                  borderSide: BorderSide(
                    color: EduLinkTheme.error,
                    width: 2,
                  ),
                ),
                focusedErrorBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
                  borderSide: BorderSide(
                    color: EduLinkTheme.error,
                    width: 2,
                  ),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: EduLinkTheme.spacingM,
                  vertical: EduLinkTheme.spacingM,
                ),
                labelText: widget.label,
                hintText: widget.hint,
                labelStyle: EduLinkTheme.textTheme.bodyMedium?.copyWith(
                  color: _isFocused 
                      ? EduLinkTheme.primary 
                      : EduLinkTheme.onSurfaceVariant,
                  fontWeight: _isFocused ? FontWeight.w600 : FontWeight.w500,
                ),
                hintStyle: EduLinkTheme.textTheme.bodyMedium?.copyWith(
                  color: EduLinkTheme.onSurfaceVariant.withOpacity(0.7),
                  fontWeight: FontWeight.w400,
                ),
                errorStyle: EduLinkTheme.textTheme.bodySmall?.copyWith(
                  color: EduLinkTheme.error,
                  fontWeight: FontWeight.w500,
                ),
                prefixIcon: AnimatedBuilder(
                  animation: _focusAnimation,
                  builder: (context, child) {
                    return Icon(
                      widget.prefixIcon,
                      color: Color.lerp(
                        EduLinkTheme.onSurfaceVariant,
                        EduLinkTheme.primary,
                        _focusAnimation.value,
                      ),
                      size: 20,
                    );
                  },
                ),
                suffixIcon: widget.suffixIcon != null
                    ? IconButton(
                        icon: Icon(
                          widget.suffixIcon,
                          color: EduLinkTheme.onSurfaceVariant,
                          size: 20,
                        ),
                        onPressed: widget.onSuffixPressed,
                      )
                    : null,
              ),
            ),
          ),
        );
      },
    );
  }
} 