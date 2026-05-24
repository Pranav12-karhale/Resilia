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
  String _chainScope = 'auto'; // 'auto', 'intra', 'inter'
  String _displayStrategy = 'best_route'; // 'best_route', 'all_options'
  late AnimationController _bgAnimController;
  late AnimationController _fadeController;
  late Animation<double> _fadeAnim;

  final _exampleIdeas = [
    {'icon': Icons.local_cafe, 'title': 'Direct-to-Consumer Matcha', 'desc': 'Premium Japanese matcha tea sold online with farm-to-cup traceability'},
    {'icon': Icons.checkroom, 'title': 'Sustainable Sneaker Brand', 'desc': 'Custom eco-friendly sneakers manufactured ethically and shipped globally'},
    {'icon': Icons.devices, 'title': 'Smart Home Electronics', 'desc': 'IoT-connected smart home devices assembled in Taiwan, sold in the US'},
    {'icon': Icons.eco, 'title': 'Organic Farm-to-Table', 'desc': 'Local organic produce delivered same-day from farm to consumer doorstep'},
  ];

  @override
  void initState() {
    super.initState();
    _bgAnimController = AnimationController(
      duration: const Duration(seconds: 8),
      vsync: this,
    )..repeat(reverse: true);
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
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
          // Animated gradient background
          AnimatedBuilder(
            animation: _bgAnimController,
            builder: (context, child) {
              return Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.bgDark,
                      Color.lerp(const Color(0xFF0A0E1A), const Color(0xFF0F1B3D), _bgAnimController.value)!,
                      AppTheme.bgDark,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              );
            },
          ),

          // Subtle grid overlay
          CustomPaint(
            painter: _GridPainter(),
            size: Size.infinite,
          ),

          // Content
          FadeTransition(
            opacity: _fadeAnim,
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 720),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // User greeting bar
                      _buildUserBar(context),
                      const SizedBox(height: 24),
                      // Logo/Brand
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: AppTheme.primaryGradient,
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.accentBlue.withAlpha(51),
                              blurRadius: 30,
                              spreadRadius: 5,
                            ),
                          ],
                        ),
                        child: Icon(Icons.hub, color: Colors.white, size: 36),
                      ),
                      const SizedBox(height: 24),

                      // Title
                      ShaderMask(
                        shaderCallback: (bounds) => AppTheme.primaryGradient.createShader(bounds),
                        child: Text(
                          'Resilia',
                          style: GoogleFonts.outfit(
                            fontSize: 36,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Describe your business idea and AI will design your entire\nsupply chain with dynamic, interactive dashboards.',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          color: AppTheme.textSecondary,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 40),

                      // Input area
                      Container(
                        decoration: BoxDecoration(
                          gradient: AppTheme.glassGradient,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.borderLight),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.accentBlue.withAlpha(13),
                              blurRadius: 40,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '💡 Your Business Idea',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _ideaController,
                              maxLines: 4,
                              style: GoogleFonts.inter(
                                color: AppTheme.textPrimary,
                                fontSize: 15,
                              ),
                              decoration: InputDecoration(
                                hintText: 'e.g., "Premium Japanese matcha tea sold direct-to-consumer with farm-to-cup traceability and international shipping"',
                                hintMaxLines: 3,
                                filled: true,
                                fillColor: AppTheme.bgDark,
                              ),
                              onChanged: (_) => setState(() {}),
                            ),
                            const SizedBox(height: 16),

                            // Origin field
                            Text(
                              '📍 Origin (Optional)',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _originController,
                              maxLines: 1,
                              style: GoogleFonts.inter(
                                color: AppTheme.textPrimary,
                                fontSize: 15,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Where does the supply chain start? e.g., Tokyo, Japan',
                                filled: true,
                                fillColor: AppTheme.bgDark,
                                prefixIcon: Icon(Icons.my_location, size: 18),
                                suffixIcon: _isFetchingLocation
                                    ? const Padding(
                                        padding: EdgeInsets.all(14.0),
                                        child: SizedBox(
                                          width: 16, height: 16,
                                          child: CircularProgressIndicator(strokeWidth: 2)
                                        ),
                                      )
                                    : IconButton(
                                        icon: Icon(Icons.gps_fixed, color: AppTheme.accentTeal),
                                        tooltip: 'Use my current location',
                                        onPressed: _fetchLocation,
                                      ),
                              ),
                              onChanged: (_) => setState(() {
                                _clientLocation = null; // Clear exact lat/lng if user edits manually
                              }),
                            ),
                            const SizedBox(height: 16),

                            // Chain Scope: Inter/Intra/Auto
                            Text(
                              '🌐 Supply Chain Scope',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                _ScopeChip(
                                  label: 'Auto-detect',
                                  icon: Icons.auto_awesome,
                                  selected: _chainScope == 'auto',
                                  onTap: () => setState(() => _chainScope = 'auto'),
                                ),
                                const SizedBox(width: 8),
                                _ScopeChip(
                                  label: 'Domestic',
                                  icon: Icons.home,
                                  selected: _chainScope == 'intra',
                                  onTap: () => setState(() => _chainScope = 'intra'),
                                ),
                                const SizedBox(width: 8),
                                _ScopeChip(
                                  label: 'International',
                                  icon: Icons.public,
                                  selected: _chainScope == 'inter',
                                  onTap: () => setState(() => _chainScope = 'inter'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            // Display Strategy: Best Route / All Options
                            Text(
                              '🎯 Display Strategy',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                _ScopeChip(
                                  label: 'Best Route',
                                  icon: Icons.route,
                                  selected: _displayStrategy == 'best_route',
                                  onTap: () => setState(() => _displayStrategy = 'best_route'),
                                ),
                                const SizedBox(width: 8),
                                _ScopeChip(
                                  label: 'All Options',
                                  icon: Icons.account_tree,
                                  selected: _displayStrategy == 'all_options',
                                  onTap: () => setState(() => _displayStrategy = 'all_options'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            // Destination field
                            Text(
                              '📦 Destination (Optional)',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _destinationController,
                              maxLines: 1,
                              style: GoogleFonts.inter(
                                color: AppTheme.textPrimary,
                                fontSize: 15,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Where will your product be sold/delivered? e.g., Mumbai, London, Pan-India',
                                filled: true,
                                fillColor: AppTheme.bgDark,
                                prefixIcon: Icon(Icons.place_outlined, size: 18),
                              ),
                              onChanged: (_) => setState(() {}),
                            ),
                            const SizedBox(height: 16),

                            // Generate button
                            SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: ElevatedButton(
                                onPressed: provider.isGenerating || _ideaController.text.trim().isEmpty
                                    ? null
                                    : () => _generate(provider),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.accentBlue,
                                  disabledBackgroundColor: AppTheme.accentBlue.withAlpha(77),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                                child: provider.isGenerating
                                    ? Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              valueColor: AlwaysStoppedAnimation(Colors.white.withAlpha(179)),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Text(
                                            provider.generationStatus ?? 'AI is designing your supply chain...',
                                            style: GoogleFonts.inter(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w600,
                                              color: Colors.white.withAlpha(179),
                                            ),
                                          ),
                                        ],
                                      )
                                    : Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.auto_awesome, size: 20),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Generate Supply Chain',
                                            style: GoogleFonts.inter(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),

                            // Error display
                            if (provider.error != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppTheme.error.withAlpha(26),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppTheme.error.withAlpha(77)),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.error_outline, color: AppTheme.error, size: 18),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        provider.error!,
                                        style: TextStyle(color: AppTheme.error, fontSize: 13),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Example ideas
                      Text(
                        'Try an example',
                        style: GoogleFonts.inter(
                          color: AppTheme.textMuted,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        alignment: WrapAlignment.center,
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

                      const SizedBox(height: 40),

                      // Features
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _FeatureBadge(icon: Icons.psychology, label: 'Agentic AI'),
                          const SizedBox(width: 24),
                          _FeatureBadge(icon: Icons.dynamic_feed, label: 'Dynamic UI'),
                          const SizedBox(width: 24),
                          _FeatureBadge(icon: Icons.sync, label: 'Real-Time'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserBar(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        gradient: AppTheme.glassGradient,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        children: [
          // Avatar
          CircleAvatar(
            radius: 16,
            backgroundColor: AppTheme.accentBlue.withAlpha(40),
            backgroundImage: auth.photoUrl != null
                ? NetworkImage(auth.photoUrl!)
                : null,
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
                    style: TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                    ),
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
            icon: Icon(Icons.settings, size: 18),
            tooltip: 'Settings',
            style: IconButton.styleFrom(
              foregroundColor: AppTheme.textMuted,
            ),
          ),
        ],
      ),
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
        throw Exception('Location permissions are permanently denied, we cannot request permissions.');
      }

      Position? position = await Geolocator.getLastKnownPosition();
      
      try {
        // Try to get a fresh, highly accurate position
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 6),
          ),
        );
      } catch (e) {
        if (e is TimeoutException) {
          // If high accuracy timed out and we have no last known position, force a fast low-accuracy fix
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
      String address = '${pos.latitude.toStringAsFixed(2)}, ${pos.longitude.toStringAsFixed(2)}';
      try {
        List<Placemark> placemarks = await placemarkFromCoordinates(pos.latitude, pos.longitude);
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          address = '${place.locality ?? place.subAdministrativeArea}, ${place.administrativeArea}';
        }
      } catch (_) {
        // Geocoding failed, fallback to coordinates
      }

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
    final clientLoc = _clientLocation ?? (originText.isNotEmpty 
        ? { 'address': originText }
        : null);

    // Determine strictLocal based on flowchart:
    // - If location + no destination → local chain
    // - If location + destination → best route
    // - If no location → general chain
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

class _ScopeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _ScopeChip({required this.label, required this.icon, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppTheme.accentBlue.withAlpha(30) : AppTheme.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppTheme.accentBlue : AppTheme.borderColor,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: selected ? AppTheme.accentBlue : AppTheme.textMuted, size: 16),
            const SizedBox(width: 6),
            Text(label, style: GoogleFonts.inter(
              color: selected ? AppTheme.accentBlue : AppTheme.textSecondary,
              fontSize: 12,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            )),
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
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: _isHovered ? AppTheme.accentBlue.withAlpha(26) : AppTheme.bgCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _isHovered ? AppTheme.accentBlue.withAlpha(77) : AppTheme.borderColor,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(widget.icon,
                  color: _isHovered ? AppTheme.accentBlue : AppTheme.textMuted,
                  size: 18),
              const SizedBox(width: 8),
              Text(widget.title, style: TextStyle(
                color: _isHovered ? AppTheme.textPrimary : AppTheme.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              )),
            ],
          ),
        ),
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
        Icon(icon, color: AppTheme.textMuted, size: 16),
        const SizedBox(width: 6),
        Text(label, style: GoogleFonts.inter(
          color: AppTheme.textMuted,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        )),
      ],
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.accentBlue.withAlpha(8)
      ..strokeWidth = 0.5;

    for (var i = 0.0; i < size.width; i += 60) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), paint);
    }
    for (var i = 0.0; i < size.height; i += 60) {
      canvas.drawLine(Offset(0, i), Offset(size.width, i), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
