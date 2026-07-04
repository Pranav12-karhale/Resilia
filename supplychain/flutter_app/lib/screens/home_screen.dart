import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/supply_chain_provider.dart';
import '../widgets/settings_dialog.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  final _ideaController = TextEditingController();
  final _destinationController = TextEditingController();
  final _originController = TextEditingController();
  Map<String, dynamic>? _clientLocation;
  bool _isFetchingLocation = false;
  String _chainScope = 'auto';
  String _displayStrategy = 'best_route';
  late AnimationController _bgAnimController;
  late AnimationController _fadeController;
  late Animation<double> _fadeAnim;

  final _exampleIdeas = [
    {
      'icon': Icons.local_cafe,
      'title': 'Direct-to-Consumer Matcha',
      'desc':
          'Premium Japanese matcha tea sold online with farm-to-cup traceability',
    },
    {
      'icon': Icons.checkroom,
      'title': 'Sustainable Sneakers',
      'desc':
          'Custom eco-friendly sneakers manufactured ethically and shipped globally',
    },
    {
      'icon': Icons.devices,
      'title': 'Smart Home Electronics',
      'desc':
          'IoT-connected smart home devices assembled in Taiwan, sold in the US',
    },
    {
      'icon': Icons.eco,
      'title': 'Farm-to-Table Produce',
      'desc':
          'Local organic produce delivered same-day from farm to consumer doorstep',
    },
  ];

  @override
  void initState() {
    super.initState();
    _bgAnimController = AnimationController(
      duration: const Duration(seconds: 10),
      vsync: this,
    )..repeat(reverse: true);
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 700),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(parent: _fadeController, curve: Curves.easeOut);
    _fadeController.forward();
  }

  @override
  void dispose() {
    _bgAnimController.dispose();
    _fadeController.dispose();
    _ideaController.dispose();
    _destinationController.dispose();
    _originController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SupplyChainProvider>();

    return Scaffold(
      body: Stack(
        children: [
          _AnimatedBackdrop(controller: _bgAnimController),
          FadeTransition(
            opacity: _fadeAnim,
            child: SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final isWide = constraints.maxWidth >= 980;
                  return SingleChildScrollView(
                    padding: EdgeInsets.symmetric(
                      horizontal: isWide ? 44 : 20,
                      vertical: isWide ? 32 : 20,
                    ),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1180),
                        child: Column(
                          children: [
                            _buildUserBar(context),
                            const SizedBox(height: 28),
                            isWide
                                ? Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    children: [
                                      Expanded(
                                        flex: 11,
                                        child: _buildHeroPanel(),
                                      ),
                                      const SizedBox(width: 36),
                                      Expanded(
                                        flex: 10,
                                        child: _buildIdeaForm(provider),
                                      ),
                                    ],
                                  )
                                : Column(
                                    children: [
                                      _buildHeroPanel(compact: true),
                                      const SizedBox(height: 24),
                                      _buildIdeaForm(provider),
                                    ],
                                  ),
                            const SizedBox(height: 24),
                            _buildTrustStrip(),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroPanel({bool compact = false}) {
    return Column(
      crossAxisAlignment:
          compact ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        _buildLogoMark(),
        SizedBox(height: compact ? 20 : 28),
        Text(
          'Resilia',
          style: GoogleFonts.outfit(
            fontSize: compact ? 44 : 64,
            fontWeight: FontWeight.w800,
            color: AppTheme.textPrimary,
            height: 0.95,
          ),
          textAlign: compact ? TextAlign.center : TextAlign.start,
        ),
        const SizedBox(height: 18),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Text(
            'Design resilient, location-aware supply chains from a plain-language business idea.',
            style: GoogleFonts.inter(
              fontSize: compact ? 16 : 20,
              color: AppTheme.textSecondary,
              height: 1.45,
            ),
            textAlign: compact ? TextAlign.center : TextAlign.start,
          ),
        ),
        const SizedBox(height: 28),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          alignment: compact ? WrapAlignment.center : WrapAlignment.start,
          children: const [
            _MetricPill(label: 'AI chain design', icon: Icons.auto_awesome),
            _MetricPill(label: 'Risk scanning', icon: Icons.radar),
            _MetricPill(label: 'Dynamic dashboards', icon: Icons.dashboard),
          ],
        ),
        if (!compact) ...[
          const SizedBox(height: 42),
          _InsightPanel(),
        ],
      ],
    );
  }

  Widget _buildLogoMark() {
    return Container(
      width: 72,
      height: 72,
      decoration: BoxDecoration(
        color: AppTheme.bgCard.withAlpha(210),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.borderLight),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accentTeal.withAlpha(38),
            blurRadius: 26,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          const Icon(Icons.hub, color: Colors.white, size: 30),
        ],
      ),
    );
  }

  Widget _buildIdeaForm(SupplyChainProvider provider) {
    return Container(
      decoration: AppTheme.cardDecoration(accentColor: AppTheme.accentTeal),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.accentBlue.withAlpha(24),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.edit_note,
                  color: AppTheme.accentBlue,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Build a supply chain',
                      style: GoogleFonts.outfit(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Add a business idea, locations, and routing preference.',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppTheme.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          _FieldLabel(icon: Icons.lightbulb_outline, label: 'Business idea'),
          const SizedBox(height: 8),
          TextField(
            controller: _ideaController,
            maxLines: 4,
            style: GoogleFonts.inter(
              color: AppTheme.textPrimary,
              fontSize: 15,
              height: 1.4,
            ),
            decoration: const InputDecoration(
              hintText:
                  'Premium Japanese matcha tea sold direct-to-consumer with farm-to-cup traceability.',
              hintMaxLines: 3,
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 18),
          _FieldLabel(icon: Icons.my_location, label: 'Origin'),
          const SizedBox(height: 8),
          TextField(
            controller: _originController,
            maxLines: 1,
            style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 15),
            decoration: InputDecoration(
              hintText: 'Where does the supply chain start?',
              prefixIcon: Icon(Icons.near_me_outlined,
                  size: 18, color: AppTheme.textMuted),
              suffixIcon: _isFetchingLocation
                  ? const Padding(
                      padding: EdgeInsets.all(14),
                      child: SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : IconButton(
                      icon: Icon(Icons.gps_fixed,
                          color: AppTheme.accentTeal, size: 20),
                      tooltip: 'Use my current location',
                      onPressed: _fetchLocation,
                    ),
            ),
            onChanged: (_) => setState(() => _clientLocation = null),
          ),
          const SizedBox(height: 18),
          _FieldLabel(icon: Icons.place_outlined, label: 'Destination'),
          const SizedBox(height: 8),
          TextField(
            controller: _destinationController,
            maxLines: 1,
            style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 15),
            decoration: InputDecoration(
              hintText: 'Where will your product be sold?',
              prefixIcon: Icon(Icons.flag_outlined,
                  size: 18, color: AppTheme.textMuted),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 20),
          _FieldLabel(icon: Icons.public, label: 'Supply chain scope'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _ScopeChip(
                label: 'Auto',
                icon: Icons.auto_awesome,
                selected: _chainScope == 'auto',
                onTap: () => setState(() => _chainScope = 'auto'),
              ),
              _ScopeChip(
                label: 'Domestic',
                icon: Icons.home_work_outlined,
                selected: _chainScope == 'intra',
                onTap: () => setState(() => _chainScope = 'intra'),
              ),
              _ScopeChip(
                label: 'International',
                icon: Icons.language,
                selected: _chainScope == 'inter',
                onTap: () => setState(() => _chainScope = 'inter'),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _FieldLabel(icon: Icons.route, label: 'Route display'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _ScopeChip(
                label: 'Best route',
                icon: Icons.alt_route,
                selected: _displayStrategy == 'best_route',
                onTap: () => setState(() => _displayStrategy = 'best_route'),
              ),
              _ScopeChip(
                label: 'All options',
                icon: Icons.account_tree_outlined,
                selected: _displayStrategy == 'all_options',
                onTap: () => setState(() => _displayStrategy = 'all_options'),
              ),
            ],
          ),
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton.icon(
              onPressed: provider.isGenerating || _ideaController.text.trim().isEmpty
                  ? null
                  : () => _generate(provider),
              icon: provider.isGenerating
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor:
                            AlwaysStoppedAnimation(Colors.white.withAlpha(190)),
                      ),
                    )
                  : const Icon(Icons.auto_awesome, size: 20),
              label: Text(
                provider.isGenerating
                    ? provider.generationStatus ??
                        'Designing your supply chain...'
                    : 'Generate supply chain',
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          if (provider.error != null) ...[
            const SizedBox(height: 12),
            _ErrorBanner(message: provider.error!),
          ],
          const SizedBox(height: 22),
          Text(
            'Try an example',
            style: GoogleFonts.inter(
              color: AppTheme.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _exampleIdeas.map((example) {
              return _ExampleChip(
                icon: example['icon'] as IconData,
                title: example['title'] as String,
                desc: example['desc'] as String,
                onTap: () {
                  _ideaController.text = example['desc'] as String;
                  setState(() {});
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildUserBar(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.bgCard.withAlpha(210),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 17,
            backgroundColor: AppTheme.accentBlue.withAlpha(35),
            backgroundImage:
                auth.photoUrl != null ? NetworkImage(auth.photoUrl!) : null,
            child: auth.photoUrl == null
                ? Text(
                    auth.displayName[0].toUpperCase(),
                    style: TextStyle(
                      color: AppTheme.accentBlue,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome, ${auth.displayName}',
                  style: GoogleFonts.inter(
                    color: AppTheme.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (auth.email != null)
                  Text(
                    auth.email!,
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => const SettingsDialog(),
              );
            },
            icon: const Icon(Icons.settings_outlined, size: 18),
            tooltip: 'Settings',
            style: IconButton.styleFrom(foregroundColor: AppTheme.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildTrustStrip() {
    return Wrap(
      spacing: 18,
      runSpacing: 10,
      alignment: WrapAlignment.center,
      children: const [
        _FeatureBadge(icon: Icons.psychology_alt_outlined, label: 'Agentic AI'),
        _FeatureBadge(icon: Icons.sync_alt, label: 'Adaptive routing'),
        _FeatureBadge(icon: Icons.shield_outlined, label: 'Resilience-first'),
      ],
    );
  }

  Future<void> _fetchLocation() async {
    setState(() => _isFetchingLocation = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Location permission denied');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception(
          'Location permissions are permanently denied, we cannot request permissions.',
        );
      }

      Position? position = await Geolocator.getLastKnownPosition();

      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 6),
          ),
        );
      } catch (e) {
        if (e is TimeoutException) {
          if (position == null) {
            position = await Geolocator.getCurrentPosition(
              locationSettings: const LocationSettings(
                accuracy: LocationAccuracy.low,
                timeLimit: Duration(seconds: 4),
              ),
            );
          }
        } else {
          rethrow;
        }
      }

      final pos = position!;
      String address =
          '${pos.latitude.toStringAsFixed(2)}, ${pos.longitude.toStringAsFixed(2)}';
      try {
        List<Placemark> placemarks =
            await placemarkFromCoordinates(pos.latitude, pos.longitude);
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          address =
              '${place.locality ?? place.subAdministrativeArea}, ${place.administrativeArea}';
        }
      } catch (_) {}

      setState(() {
        _clientLocation = {
          'lat': pos.latitude,
          'lng': pos.longitude,
          'address': address,
        };
        _originController.text = address;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not fetch location: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isFetchingLocation = false);
    }
  }

  void _generate(SupplyChainProvider provider) {
    final idea = _ideaController.text.trim();
    if (idea.isEmpty) return;
    final destination = _destinationController.text.trim();
    final originText = _originController.text.trim();
    final clientLoc =
        _clientLocation ?? (originText.isNotEmpty ? {'address': originText} : null);
    final isStrictLocal = clientLoc != null && destination.isEmpty;

    Navigator.of(context).pushReplacementNamed(
      '/generating',
      arguments: {
        'businessIdea': idea,
        if (clientLoc != null) 'clientLocation': clientLoc,
        'strictLocal': isStrictLocal,
        'chainScope': _chainScope,
        if (destination.isNotEmpty) 'destination': destination,
        'displayStrategy': _displayStrategy,
      },
    );
  }
}

class _AnimatedBackdrop extends StatelessWidget {
  final AnimationController controller;
  const _AnimatedBackdrop({required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return CustomPaint(
          foregroundPainter: _BackdropPainter(controller.value),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.bgDark,
                  Color.lerp(
                    const Color(0xFF071113),
                    const Color(0xFF10232A),
                    controller.value,
                  )!,
                  AppTheme.bgDark,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _BackdropPainter extends CustomPainter {
  final double t;
  const _BackdropPainter(this.t);

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = AppTheme.accentTeal.withAlpha(9)
      ..strokeWidth = 0.7;
    for (var x = 0.0; x < size.width; x += 72) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (var y = 0.0; y < size.height; y += 72) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final pathPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = AppTheme.accentBlue.withAlpha(26);
    final path = Path()
      ..moveTo(size.width * 0.08, size.height * (0.68 - t * 0.04))
      ..cubicTo(
        size.width * 0.32,
        size.height * 0.45,
        size.width * 0.56,
        size.height * 0.86,
        size.width * 0.92,
        size.height * (0.28 + t * 0.05),
      );
    canvas.drawPath(path, pathPaint);

    final dotPaint = Paint()..color = AppTheme.accentTeal.withAlpha(90);
    for (final point in [
      Offset(size.width * 0.16, size.height * 0.58),
      Offset(size.width * 0.42, size.height * 0.54),
      Offset(size.width * 0.69, size.height * 0.62),
      Offset(size.width * 0.86, size.height * 0.34),
    ]) {
      canvas.drawCircle(point, 4, dotPaint);
      canvas.drawCircle(
        point,
        14,
        Paint()..color = AppTheme.accentTeal.withAlpha(16),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _BackdropPainter oldDelegate) =>
      oldDelegate.t != t;
}

class _InsightPanel extends StatelessWidget {
  const _InsightPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 520),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.bgCard.withAlpha(190),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Column(
        children: const [
          _InsightRow(
            icon: Icons.inventory_2_outlined,
            title: 'Source',
            value: 'Map suppliers and production nodes',
          ),
          SizedBox(height: 14),
          _InsightRow(
            icon: Icons.route_outlined,
            title: 'Move',
            value: 'Choose viable routes and handoffs',
          ),
          SizedBox(height: 14),
          _InsightRow(
            icon: Icons.analytics_outlined,
            title: 'Monitor',
            value: 'Create operational dashboards for each node',
          ),
        ],
      ),
    );
  }
}

class _InsightRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  const _InsightRow({
    required this.icon,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.accentTeal, size: 20),
        const SizedBox(width: 12),
        Text(
          title,
          style: GoogleFonts.inter(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.inter(
              color: AppTheme.textMuted,
              fontSize: 13,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FieldLabel({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.textMuted, size: 16),
        const SizedBox(width: 7),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}

class _ScopeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _ScopeChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? AppTheme.accentTeal.withAlpha(28) : AppTheme.bgSurface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? AppTheme.accentTeal : AppTheme.borderColor,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: selected ? AppTheme.accentTeal : AppTheme.textMuted,
              size: 16,
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: GoogleFonts.inter(
                color: selected ? AppTheme.textPrimary : AppTheme.textSecondary,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ExampleChip extends StatefulWidget {
  final IconData icon;
  final String title;
  final String desc;
  final VoidCallback onTap;

  const _ExampleChip({
    required this.icon,
    required this.title,
    required this.desc,
    required this.onTap,
  });

  @override
  State<_ExampleChip> createState() => _ExampleChipState();
}

class _ExampleChipState extends State<_ExampleChip> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            color: _isHovered
                ? AppTheme.accentBlue.withAlpha(22)
                : AppTheme.bgSurface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _isHovered
                  ? AppTheme.accentBlue.withAlpha(80)
                  : AppTheme.borderColor,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                widget.icon,
                color: _isHovered ? AppTheme.accentBlue : AppTheme.textMuted,
                size: 17,
              ),
              const SizedBox(width: 8),
              Text(
                widget.title,
                style: GoogleFonts.inter(
                  color: _isHovered
                      ? AppTheme.textPrimary
                      : AppTheme.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricPill extends StatelessWidget {
  final String label;
  final IconData icon;
  const _MetricPill({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
      decoration: BoxDecoration(
        color: AppTheme.bgCard.withAlpha(180),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppTheme.accentTeal, size: 15),
          const SizedBox(width: 7),
          Text(
            label,
            style: GoogleFonts.inter(
              color: AppTheme.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeatureBadge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: AppTheme.textMuted, size: 15),
        const SizedBox(width: 6),
        Text(
          label,
          style: GoogleFonts.inter(
            color: AppTheme.textMuted,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.error.withAlpha(24),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.error.withAlpha(70)),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: AppTheme.error, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: AppTheme.error, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
