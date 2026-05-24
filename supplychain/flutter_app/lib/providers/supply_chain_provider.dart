import 'package:flutter/material.dart';
import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/supply_chain.dart';
import '../models/risk_models.dart';
import '../services/api_service.dart';

class SupplyChainProvider extends ChangeNotifier {
  SupplyChain? _currentChain;
  List<Map<String, dynamic>> _chainList = [];
  bool _isGenerating = false;
  String? _error;
  String? _selectedNodeId;
  RiskReport? _riskReport;
  bool _isScanning = false;
  String? _generationStatus;
  StreamSubscription<DocumentSnapshot>? _chainSubscription;

  SupplyChain? get currentChain => _currentChain;
  List<Map<String, dynamic>> get chainList => _chainList;
  bool get isGenerating => _isGenerating;
  String? get error => _error;
  String? get selectedNodeId => _selectedNodeId;
  RiskReport? get riskReport => _riskReport;
  bool get isScanning => _isScanning;
  bool get hasRiskData => _riskReport != null;
  double get overallChainRisk => _riskReport?.overallChainRisk ?? 0;
  List<RiskScanResult> get highRiskNodes => _riskReport?.highRiskNodes ?? [];
  String? get generationStatus => _generationStatus;

  SupplyChainNode? get selectedNode {
    if (_currentChain == null || _selectedNodeId == null) return null;
    try {
      return _currentChain!.nodes.firstWhere((n) => n.id == _selectedNodeId);
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    _chainSubscription?.cancel();
    super.dispose();
  }

  /// Generate a new supply chain from a business idea using SSE stream
  Future<void> generateChain(
    String businessIdea, {
    Map<String, dynamic>? clientLocation,
    bool strictLocal = false,
    String chainScope = 'auto',
    String? destination,
    String displayStrategy = 'best_route',
  }) async {
    _isGenerating = true;
    _error = null;
    _generationStatus = "Connecting to AI...";
    notifyListeners();

    try {
      final stream = ApiService.generateSupplyChainStream(
        businessIdea,
        clientLocation: clientLocation,
        strictLocal: strictLocal,
        chainScope: chainScope,
        destination: destination,
        displayStrategy: displayStrategy,
      );

      await for (final chunk in stream) {
        if (chunk.containsKey('error')) {
          throw Exception(chunk['error']);
        }
        if (chunk.containsKey('status')) {
          _generationStatus = chunk['status'];
          notifyListeners();
        }
        if (chunk.containsKey('success') && chunk['success'] == true) {
          final chainData = chunk['supply_chain'];
          if (chainData != null) {
            _currentChain = SupplyChain.fromJson(chainData);
            _selectedNodeId = _currentChain!.nodes.isNotEmpty ? _currentChain!.nodes.first.id : null;
            _listenToChain(_currentChain!.id); // Start real-time Firestore listener
          }
        }
      }
      
      _error = null;
      await refreshChainList();
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isGenerating = false;
      _generationStatus = null;
      notifyListeners();
    }
  }

  /// Load an existing chain and start listening to real-time updates
  Future<void> loadChain(String chainId) async {
    try {
      // Fetch initial data via API to ensure it exists and we have permissions
      final chain = await ApiService.getChain(chainId);
      _currentChain = chain;
      _selectedNodeId = chain.nodes.isNotEmpty ? chain.nodes.first.id : null;
      _error = null;
      notifyListeners();

      // Start listening for real-time Firestore updates
      _listenToChain(chainId);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  void _listenToChain(String chainId) {
    _chainSubscription?.cancel();
    _chainSubscription = FirebaseFirestore.instance
        .collection('supply_chains')
        .doc(chainId)
        .snapshots()
        .listen((snapshot) {
      if (snapshot.exists) {
        final data = snapshot.data() as Map<String, dynamic>;
        
        // Preserve selected node if possible
        final oldSelectedNodeId = _selectedNodeId;
        
        _currentChain = SupplyChain.fromJson(data);
        
        if (oldSelectedNodeId != null && _currentChain!.nodes.any((n) => n.id == oldSelectedNodeId)) {
          _selectedNodeId = oldSelectedNodeId;
        } else if (_currentChain!.nodes.isNotEmpty) {
          _selectedNodeId = _currentChain!.nodes.first.id;
        }
        
        notifyListeners();
      }
    }, onError: (error) {
      // Fallback: If Firestore fails (e.g., rules or local testing without Firebase), 
      // we just stick to the HTTP updates which we still get via the API calls.
      print("Firestore listener error: $error");
    });
  }

  /// Select a node to display
  void selectNode(String nodeId) {
    _selectedNodeId = nodeId;
    notifyListeners();
  }

  /// Refresh chain list
  Future<void> refreshChainList() async {
    try {
      _chainList = await ApiService.listChains();
      notifyListeners();
    } catch (_) {
      // Silently fail — non-critical
    }
  }

  /// Add a crisis node
  Future<void> addCrisisNode(String reason) async {
    if (_currentChain == null) return;

    try {
      final result = await ApiService.addCrisisNode(_currentChain!.id, reason);

      // Reload the chain to get the updated node list
      await loadChain(_currentChain!.id);

      // Select the new node
      if (result['node'] != null) {
        _selectedNodeId = result['node']['id'];
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Trigger a disruption
  Future<void> triggerDisruption(DisruptionEvent event) async {
    if (_currentChain == null) return;
    try {
      final chain = await ApiService.triggerDisruption(_currentChain!.id, event);
      _currentChain = chain;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  /// Resolve a disruption (get mitigation plan)
  Future<MitigationAction> resolveDisruption(DisruptionEvent event) async {
    if (_currentChain == null) throw Exception("No active chain");
    try {
      return await ApiService.resolveDisruption(_currentChain!.id, event);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  /// Execute a mitigation action
  Future<void> executeMitigation(MitigationAction action) async {
    if (_currentChain == null) return;
    try {
      final chain = await ApiService.executeMitigation(_currentChain!.id, action);
      _currentChain = chain;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  /// Scan supply chain for risks (auto-detection)
  Future<void> scanForRisks() async {
    if (_currentChain == null) return;
    _isScanning = true;
    _error = null;
    notifyListeners();

    try {
      _riskReport = await ApiService.scanRisks(_currentChain!.id);
      // Reload chain to get updated risk metadata on nodes
      await loadChain(_currentChain!.id);
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isScanning = false;
      notifyListeners();
    }
  }

  /// Get risk for a specific node
  RiskScanResult? riskForNode(String nodeId) {
    return _riskReport?.forNode(nodeId);
  }

  /// Clear the current chain
  void clearChain() {
    _currentChain = null;
    _selectedNodeId = null;
    _riskReport = null;
    _error = null;
    notifyListeners();
  }
}
