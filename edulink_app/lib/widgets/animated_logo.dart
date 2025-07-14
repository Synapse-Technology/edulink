import 'package:flutter/material.dart';
import '../theme/theme.dart';

class AnimatedLogo extends StatefulWidget {
  final double size;
  final String title;
  final String subtitle;

  const AnimatedLogo({
    super.key,
    this.size = 80,
    this.title = 'EduLink',
    this.subtitle = 'Connect. Learn. Grow.',
  });

  @override
  State<AnimatedLogo> createState() => _AnimatedLogoState();
}

class _AnimatedLogoState extends State<AnimatedLogo>
    with TickerProviderStateMixin {
  late AnimationController _logoController;
  late AnimationController _textController;
  late AnimationController _pulseController;
  
  late Animation<double> _logoScale;
  late Animation<double> _logoRotation;
  late Animation<double> _textFade;
  late Animation<Offset> _textSlide;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    
    _textController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    );
    
    _logoScale = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _logoController,
      curve: Curves.elasticOut,
    ));
    
    _logoRotation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _logoController,
      curve: Curves.easeInOut,
    ));
    
    _textFade = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _textController,
      curve: Curves.easeInOut,
    ));
    
    _textSlide = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _textController,
      curve: Curves.easeOutCubic,
    ));
    
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    _startAnimations();
  }

  void _startAnimations() async {
    await _logoController.forward();
    await Future.delayed(const Duration(milliseconds: 200));
    _textController.forward();
    _pulseController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _logoController.dispose();
    _textController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Professional Logo Container
        AnimatedBuilder(
          animation: Listenable.merge([_logoController, _pulseController]),
          builder: (context, child) {
            return Transform.scale(
              scale: _logoScale.value * _pulseAnimation.value,
              child: Transform.rotate(
                angle: _logoRotation.value * 0.05,
                child: Container(
                  width: widget.size,
                  height: widget.size,
                  decoration: BoxDecoration(
                    gradient: EduLinkTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(widget.size * 0.25),
                    boxShadow: [
                      BoxShadow(
                        color: EduLinkTheme.primary.withOpacity(0.3),
                        blurRadius: 15,
                        offset: const Offset(0, 6),
                      ),
                      BoxShadow(
                        color: EduLinkTheme.primary.withOpacity(0.1),
                        blurRadius: 30,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Subtle background pattern
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(widget.size * 0.25),
                          gradient: RadialGradient(
                            colors: [
                              Colors.white.withOpacity(0.2),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                      
                      // Main Icon
                      Icon(
                        Icons.school,
                        size: widget.size * 0.45,
                        color: Colors.white,
                      ),
                      
                      // Professional glow effect
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(widget.size * 0.25),
                          boxShadow: [
                            BoxShadow(
                              color: EduLinkTheme.primary.withOpacity(0.4),
                              blurRadius: 10,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
        
        const SizedBox(height: EduLinkTheme.spacingL),
        
        // Professional Text
        AnimatedBuilder(
          animation: _textController,
          builder: (context, child) {
            return FadeTransition(
              opacity: _textFade,
              child: SlideTransition(
                position: _textSlide,
                child: Column(
                  children: [
                    // Title with professional styling
                    Text(
                      widget.title,
                      style: EduLinkTheme.textTheme.displayMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: EduLinkTheme.onBackground,
                        letterSpacing: -0.5,
                      ),
                    ),
                    
                    const SizedBox(height: EduLinkTheme.spacingS),
                    
                    // Subtitle
                    Text(
                      widget.subtitle,
                      style: EduLinkTheme.textTheme.bodyLarge?.copyWith(
                        color: EduLinkTheme.onSurfaceVariant,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.2,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}