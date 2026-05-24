import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/supply_chain.dart';
import '../models/risk_models.dart';
import 'auth_service.dart';

class ApiService {
  // Use localhost for web, 10.0.2.2 for Android emulator
  static String get baseUrl {
    if (kReleaseMode) {
      // Production backend URL (Render)
      return 'https://adaptive-supply-chain-backend.onrender.com/api';
    }
    if (kIsWeb) {
      return 'http://localhost:3001/api';
    }
    return 'http://10.0.2.2:3001/api';
  }

  /// Build headers with optional Bearer token for authenticated requests
  static Future<Map<String, String>> _headers() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };

    // Attach Firebase ID token if user is authenticated
    final token = await AuthService.getIdToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  /// Generate a new supply chain from a business idea
  static Future<SupplyChain> generateSupplyChain(
    String businessIdea, {
    Map<String, dynamic>? clientLocation,
    bool strictLocal = false,
    String chainScope = 'auto',
    String? destination,
    String displayStrategy = 'best_route',
  }) async {
    final body = {
      'businessIdea': businessIdea,
      if (clientLocation != null) 'clientLocation': clientLocation,
      if (strictLocal) 'strictLocal': strictLocal,
      'chainScope': chainScope,
      if (destination != null && destination.isNotEmpty) 'destination': destination,
      'displayStrategy': displayStrategy,
    };

    final response = await http.post(
      Uri.parse('$baseUrl/generate'),
      headers: await _headers(),
      body: jsonEncode(body),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return SupplyChain.fromJson(data['supply_chain']);
    } else if (response.statusCode == 401) {
      throw Exception('Session expired. Please sign in again.');
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to generate supply chain');
    }
  }

  /// Generate a new supply chain using Server-Sent Events (SSE) for real-time progress
  static Stream<Map<String, dynamic>> generateSupplyChainStream(
    String businessIdea, {
    Map<String, dynamic>? clientLocation,
    bool strictLocal = false,
    String chainScope = 'auto',
    String? destination,
    String displayStrategy = 'best_route',
  }) async* {
    final body = {
      'businessIdea': businessIdea,
      if (clientLocation != null) 'clientLocation': clientLocation,
      if (strictLocal) 'strictLocal': strictLocal,
      'chainScope': chainScope,
      if (destination != null && destination.isNotEmpty) 'destination': destination,
      'displayStrategy': displayStrategy,
    };

    final request = http.Request('POST', Uri.parse('$baseUrl/generate-stream'));
    request.headers.addAll(await _headers());
    request.headers['Accept'] = 'text/event-stream';
    request.body = jsonEncode(body);

    final response = await http.Client().send(request);

    if (response.statusCode != 200) {
      throw Exception('Failed to connect to stream: ${response.statusCode}');
    }

    await for (var chunk in response.stream.transform(utf8.decoder).transform(const LineSplitter())) {
      if (chunk.isEmpty) continue;
      if (chunk.startsWith('data: ')) {
        final dataStr = chunk.substring(6);
        try {
          final Map<String, dynamic> data = jsonDecode(dataStr);
          yield data;
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }

  /// Get list of all supply chains
  static Future<List<Map<String, dynamic>>> listChains() async {
    final response = await http.get(
      Uri.parse('$baseUrl/chains'),
      headers: await _headers(),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return List<Map<String, dynamic>>.from(data['chains']);
    }
    throw Exception('Failed to fetch chains');
  }

  /// Get a specific supply chain by ID
  static Future<SupplyChain> getChain(String chainId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/chains/$chainId'),
      headers: await _headers(),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return SupplyChain.fromJson(data['supply_chain']);
    }
    throw Exception('Chain not found');
  }

  /// Add a crisis node to an existing chain
  static Future<Map<String, dynamic>> addCrisisNode(String chainId, String reason) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chains/$chainId/add-node'),
      headers: await _headers(),
      body: jsonEncode({'reason': reason}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to add node');
  }

  /// Trigger a disruption event
  static Future<SupplyChain> triggerDisruption(String chainId, DisruptionEvent event) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chains/$chainId/disruptions/trigger'),
      headers: await _headers(),
      body: jsonEncode(event.toJson()),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return SupplyChain.fromJson(data['supply_chain']);
    }
    throw Exception('Failed to trigger disruption');
  }

  /// Get AI mitigation plan for disruption
  static Future<MitigationAction> resolveDisruption(String chainId, DisruptionEvent event) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chains/$chainId/disruptions/resolve'),
      headers: await _headers(),
      body: jsonEncode(event.toJson()),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return MitigationAction.fromJson(data['mitigation']);
    }
    throw Exception('Failed to resolve disruption');
  }

  /// Execute mitigation plan
  static Future<SupplyChain> executeMitigation(String chainId, MitigationAction action) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chains/$chainId/disruptions/execute'),
      headers: await _headers(),
      body: jsonEncode({
        ...action.toJson(),
        'id': action.id,
        'action_type': action.actionType,
        'description': action.description,
        'cost_impact': action.costImpact,
        'time_impact_days': action.timeImpactDays,
      }), // Just pass required fields back, or the full JSON if available
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return SupplyChain.fromJson(data['supply_chain']);
    }
    throw Exception('Failed to execute mitigation');
  }

  /// Run AI risk scan on the supply chain
  static Future<RiskReport> scanRisks(String chainId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chains/$chainId/risk-scan'),
      headers: await _headers(),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return RiskReport.fromJson(data['report']);
    }
    throw Exception('Failed to scan risks');
  }

  /// Get cached risk report
  static Future<RiskReport> getRiskReport(String chainId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/chains/$chainId/risk-report'),
      headers: await _headers(),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return RiskReport.fromJson(data['report']);
    }
    throw Exception('No risk report available');
  }

  /// Health check
  static Future<Map<String, dynamic>> healthCheck() async {
    final response = await http.get(Uri.parse('$baseUrl/health'));
    return jsonDecode(response.body);
  }
}
