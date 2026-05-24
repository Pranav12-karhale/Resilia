import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/supply_chain_provider.dart';

/// A dedicated loading/generation screen that shows an animated AI-working
/// experience while the supply chain is being generated in the background.
/// Automatically navigates to /chain on success, or back to / on failure.
class GeneratingScreen extends StatefulWidget {
  const GeneratingScreen({super.key});

  @override
  State<GeneratingScreen> createState() => _GeneratingScreenState();
}

class _GeneratingScreenState extends State<GeneratingScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _rotateController;
  late AnimationController _stageController;
  late AnimationController _bgController;

  int _currentStage = 0;
  bool _hasNavigated = false;

  final _stages = [
    {'icon': Icons.psychology, 'text': 'Analyzing your business idea...', 'sub': 'Understanding industry, product type, and logistics requirements'},
    {'icon': Icons.hub, 'text': 'Architecting the supply chain...', 'sub': 'Designing nodes, routes, and relationships between facilities'},
    {'icon': Icons.dashboard_customize, 'text': 'Generating dynamic dashboards...', 'sub': 'Creating KPIs, charts, and real-time monitoring for each node'},
    {'icon': Icons.auto_awesome, 'text': 'Finalizing your supply chain...', 'sub': 'Validating connections and assembling the complete chain'},
  ];

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _rotateController = AnimationController(
      duration: const Duration(seconds: 4),
      vsync: this,
    )..repeat();

    _bgController = AnimationController(
      duration: const Duration(seconds: 6),
      vsync: this,
    )..repeat(reverse: true);

    _stageController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    )..forward();

    // Cycle through stages every ~2.5 seconds for visual effect
    _cycleStages();

    // Start generation
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startGeneration();
    });
  }

  void _cycleStages() async {
    while (mounted && _currentStage < _stages.length - 1) {
      await Future.delayed(const Duration(milliseconds: 2500));
      if (!mounted) return;
      setState(() => _currentStage++);
      _stageController.reset();
      _stageController.forward();
    }
  }

  void _startGeneration() async {
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final idea = args?['businessIdea'] as String? ?? '';
    final clientLocation = args?['clientLocation'] as Map<String, dynamic>?;
    final strictLocal = args?['strictLocal'] as bool? ?? false;
    final chainScope = args?['chainScope'] as String? ?? 'auto';
    final destination = args?['destination'] as String?;
    final displayStrategy = args?['displayStrategy'] as String? ?? 'best_route';

    if (idea.isEmpty) {
      if (mounted) Navigator.of(context).pushReplacementNamed('/');
      return;
    }

    final provider = context.read<SupplyChainProvider>();
    await provider.generateChain(
      idea,
      clientLocation: clientLocation,
      strictLocal: strictLocal,
      chainScope: chainScope,
      destination: destination,
      displayStrategy: displayStrategy,
    );

    if (!mounted || _hasNavigated) return;
    _hasNavigated = true;

    if (provider.currentChain != null) {
      Navigator.of(context).pushReplacementNamed('/chain');
    } else {
      // Show error briefly then go back
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.error ?? 'Generation failed'),
            backgroundColor: AppTheme.error,
            duration: const Duration(seconds: 3),
          ),
        );
        await Future.delayed(const Duration(seconds: 1));
        if (mounted) Navigator.of(context).pushReplacementNamed('/');
      }
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _rotateController.dispose();
    _stageController.dispose();
    _bgController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final stage = _stages[_currentStage];

    return Scaffold(
      body: Stack(
        children: [
          // Animated background
          AnimatedBuilder(
            animation: _bgController,
            builder: (context, child) {
              return Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.bgDark,
                      Color.lerp(
                        const Color(0xFF0A0E1A),
                        const Color(0xFF0F1B3D),
                        _bgController.value,
                      )!,
                      AppTheme.bgDark,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              );
            },
          ),

          // Radial glow behind the spinner
          Center(
            child: AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                return Container(
                  width: 250 + (_pulseController.value * 50),
                  height: 250 + (_pulseController.value * 50),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppTheme.accentBlue.withAlpha(20),
                        AppTheme.accentTeal.withAlpha(8),
                        Colors.transparent,
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Main content
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Animated spinner
                SizedBox(
                  width: 100,
                  height: 100,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Outer rotating ring
                      AnimatedBuilder(
                        animation: _rotateController,
                        builder: (context, child) {
                          return Transform.rotate(
                            angle: _rotateController.value * 6.28,
                            child: Container(
                              width: 90,
                              height: 90,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.transparent,
                                  width: 3,
                                ),
                                gradient: SweepGradient(
                                  colors: [
                                    AppTheme.accentBlue.withAlpha(0),
                                    AppTheme.accentBlue,
                                    AppTheme.accentTeal,
                                    AppTheme.accentBlue.withAlpha(0),
                                  ],
                                  stops: const [0.0, 0.3, 0.7, 1.0],
                                ),
                              ),
                              child: Container(
                                margin: const EdgeInsets.all(3),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppTheme.bgDark,
                                ),
                              ),
                            ),
                          );
                        },
                      ),

                      // Pulsing center icon
                      AnimatedBuilder(
                        animation: _pulseController,
                        builder: (context, child) {
                          return Transform.scale(
                            scale: 0.9 + (_pulseController.value * 0.15),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: AppTheme.primaryGradient,
                                boxShadow: [
                                  BoxShadow(
                                    color: AppTheme.accentBlue
                                        .withAlpha(40 + (_pulseController.value * 30).toInt()),
                                    blurRadius: 20,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                              child: Icon(
                                Icons.hub,
                                color: Colors.white,
                                size: 26,
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 48),

                // Stage indicator
                FadeTransition(
                  opacity: CurvedAnimation(
                    parent: _stageController,
                    curve: Curves.easeOut,
                  ),
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0, 0.3),
                      end: Offset.zero,
                    ).animate(CurvedAnimation(
                      parent: _stageController,
                      curve: Curves.easeOutCubic,
                    )),
                    child: Column(
                      children: [
                        // Stage icon + text
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              stage['icon'] as IconData,
                              color: AppTheme.accentTeal,
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Text(
                              context.watch<SupplyChainProvider>().generationStatus ?? stage['text'] as String,
                              style: GoogleFonts.inter(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          stage['sub'] as String,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: AppTheme.textMuted,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 40),

                // Stage dots
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(_stages.length, (index) {
                    final isActive = index <= _currentStage;
                    final isCurrent = index == _currentStage;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: isCurrent ? 24 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                        color: isActive
                            ? AppTheme.accentBlue
                            : AppTheme.accentBlue.withAlpha(40),
                      ),
                    );
                  }),
                ),

                const SizedBox(height: 60),

                // Cancel button
                TextButton.icon(
                  onPressed: () {
                    _hasNavigated = true;
                    Navigator.of(context).pushReplacementNamed('/');
                  },
                  icon: Icon(Icons.arrow_back, size: 16),
                  label: Text(
                    'Cancel',
                    style: GoogleFonts.inter(fontSize: 14),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
