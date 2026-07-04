import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import morgan from 'morgan';
import winston from 'winston';
import { generateMockSupplyChain } from './utils/mock_data.js';
import type { SupplyChain, DisruptionEvent, MitigationAction, RiskReport } from './schemas/supply_chain_schema.js';

dotenv.config();

// ── Logging Configuration ──────────────────────────────────────────
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// ── Firebase Admin initialization ────────────────────────────────
let db: admin.firestore.Firestore | null = null;
try {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || undefined,
  });
  logger.info('🔐 Firebase Admin initialized');
  if (process.env.FIREBASE_PROJECT_ID) {
    db = admin.firestore();
    logger.info('🔥 Firestore initialized for permanent history');
  }
} catch (err: any) {
  logger.warn('⚠️ Firebase Admin init failed: ' + err.message);
}

const app = express();
app.use(cors());
app.use(express.json());

// Add Morgan request logging
app.use(morgan('dev', {
  stream: { write: (message) => logger.info(message.trim()) }
}));


// ── Auth Middleware ───────────────────────────────────────────────
// Verifies Firebase ID tokens from the Authorization header.
// Skips verification for /api/health (public endpoint).
// In dev mode (no Firebase project), passes through all requests.
const authMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  // Allow health check without auth
  if (req.path === '/api/health') {
    return next();
  }

  const authHeader = req.headers.authorization;

  // If no auth header, check if Firebase is configured
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In dev mode (no Firebase project), allow unauthenticated access
    if (!process.env.FIREBASE_PROJECT_ID) {
      return next();
    }
    res.status(401).json({ error: 'Missing or invalid authorization token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // Attach uid to request for per-user data access
    (req as any).uid = decoded.uid;
    (req as any).userEmail = decoded.email;
    next();
  } catch (err: any) {
    // If Firebase Admin isn't properly initialized, pass through
    if (!process.env.FIREBASE_PROJECT_ID) {
      return next();
    }
    console.warn('🔒 Auth failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

app.use(authMiddleware);

// In-memory store (simulates Firestore fallback)
const supplyChains: Map<string, SupplyChain> = new Map();
const riskReports: Map<string, RiskReport> = new Map();

const USE_AI = !!process.env.GOOGLE_GENAI_API_KEY;

// ── Database Helpers ──────────────────────────────────────────────
async function saveChain(chain: SupplyChain, uid?: string) {
  if (db && uid) {
    try {
      await db.collection('supply_chains').doc(chain.id).set({ ...chain, userId: uid });
      return;
    } catch (err: any) {
      console.warn('⚠️ Failed to save to Firestore:', err.message);
    }
  }
  supplyChains.set(chain.id, chain);
}

async function getChains(uid?: string) {
  if (db && uid) {
    try {
      const snapshot = await db.collection('supply_chains').where('userId', '==', uid).get();
      return snapshot.docs.map(doc => doc.data() as SupplyChain);
    } catch (err: any) {
      console.warn('⚠️ Failed to fetch from Firestore:', err.message);
    }
  }
  return Array.from(supplyChains.values());
}

async function getChain(id: string, uid?: string) {
  if (db) {
    try {
      const doc = await db.collection('supply_chains').doc(id).get();
      if (doc.exists) {
        const data = doc.data() as any;
        if (uid && data.userId !== uid && process.env.FIREBASE_PROJECT_ID) {
          return null; // unauthorized
        }
        return data as SupplyChain;
      }
      return null;
    } catch (err: any) {
      console.warn('⚠️ Failed to fetch from Firestore:', err.message);
    }
  }
  return supplyChains.get(id);
}

async function deleteChain(id: string, uid?: string) {
  if (db && uid) {
    try {
      const doc = await db.collection('supply_chains').doc(id).get();
      if (doc.exists && doc.data()?.userId === uid) {
        await db.collection('supply_chains').doc(id).delete();
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('⚠️ Failed to delete from Firestore:', err.message);
    }
  }
  return supplyChains.delete(id);
}

async function saveRiskReport(report: RiskReport, uid?: string) {
  if (db && uid) {
    try {
      await db.collection('risk_reports').doc(report.chain_id).set({ ...report, userId: uid });
      return;
    } catch (err: any) {
      console.warn('⚠️ Failed to save risk report to Firestore:', err.message);
    }
  }
  riskReports.set(report.chain_id, report);
}

async function getRiskReport(chainId: string, uid?: string) {
  if (db) {
    try {
      const doc = await db.collection('risk_reports').doc(chainId).get();
      if (doc.exists) {
        const data = doc.data() as any;
        if (uid && data.userId !== uid && process.env.FIREBASE_PROJECT_ID) {
          return null; // unauthorized
        }
        return data as RiskReport;
      }
      return null;
    } catch (err: any) {
      console.warn('⚠️ Failed to fetch risk report from Firestore:', err.message);
    }
  }
  return riskReports.get(chainId);
}

// ============================================================
// POST /api/generate - Generate supply chain from business idea
// ============================================================
app.post('/api/generate', async (req, res) => {
  try {
    const { businessIdea, clientLocation, strictLocal, chainScope, destination, displayStrategy } = req.body;
    if (!businessIdea || typeof businessIdea !== 'string') {
      res.status(400).json({ error: 'businessIdea is required' });
      return;
    }

    // ============================================================
    // FLOWCHART DECISION TREE
    // ============================================================
    // 1. Classify scope: inter-country vs intra-country (auto-detect or explicit)
    // 2. If location + destination → generate best route FROM origin TO destination
    // 3. If location, no destination → generate locally-based chain
    // 4. If no location at all → generate general supply chain
    // ============================================================

    let enrichedIdea = businessIdea;
    const scope = chainScope || 'auto';

    // Scope prefix
    const scopeInstruction = scope === 'inter'
      ? 'This is an INTERNATIONAL supply chain. Include cross-border logistics, customs, and global shipping nodes.'
      : scope === 'intra'
        ? 'This is a DOMESTIC/LOCAL supply chain. Keep ALL nodes within the same country. Do NOT include international shipping or customs.'
        : ''; // auto = let AI decide

    // Strategy prefix
    const strategyInstruction = displayStrategy === 'all_options'
      ? 'DISPLAY STRATEGY: ALL OPTIONS. Instead of a single linear path, you MUST generate MULTIPLE alternative nodes (e.g., 2-3 different warehouse options, 2-3 different supplier options) for each stage of the supply chain. Assign alternative nodes at the same stage the SAME "order" number. This will allow the UI to display them as parallel alternatives.'
      : 'DISPLAY STRATEGY: BEST ROUTE. Generate a single, highly optimized, linear route. Each stage should have exactly one node.';

    if (clientLocation && destination) {
      // CASE: Location + Destination → Best route
      enrichedIdea = `${businessIdea}. ${scopeInstruction} ${strategyInstruction} The business ORIGIN is in ${clientLocation.address} (Lat: ${clientLocation.lat}, Lng: ${clientLocation.lng}). The DESTINATION/market is: ${destination}. Design the BEST POSSIBLE ROUTE from origin to destination, using real factories, warehouses, ports, and logistics providers that exist along this corridor. Every node must be a real, factual business.`;
      console.log(`\n🧠 Generating ROUTED chain: "${businessIdea}"`);
      console.log(`   📍 Origin: ${clientLocation.address}`);
      console.log(`   🎯 Destination: ${destination}`);
      console.log(`   🌐 Scope: ${scope}`);
    } else if (clientLocation && !destination) {
      // CASE: Location only, no destination → Local chain
      enrichedIdea = `${businessIdea}. ${scopeInstruction} ${strategyInstruction} IMPORTANT: This is a LOCAL business based in ${clientLocation.address} (Lat: ${clientLocation.lat}, Lng: ${clientLocation.lng}). ALL suppliers, warehouses, manufacturers, and operations MUST be located within 100 miles of this location. Use ONLY factual, actually existing local businesses. Do NOT use international suppliers.`;
      console.log(`\n🧠 Generating LOCAL chain: "${businessIdea}"`);
      console.log(`   📍 Location: ${clientLocation.address}`);
      console.log(`   🌐 Scope: ${scope}`);
    } else if (destination) {
      // CASE: No location but destination given → general chain ending at destination
      enrichedIdea = `${businessIdea}. ${scopeInstruction} ${strategyInstruction} The product must reach: ${destination}. Design a supply chain that delivers to this destination using real, factual businesses.`;
      console.log(`\n🧠 Generating chain TO DESTINATION: "${businessIdea}"`);
      console.log(`   🎯 Destination: ${destination}`);
      console.log(`   🌐 Scope: ${scope}`);
    } else {
      // CASE: No location, no destination → general chain
      enrichedIdea = `${businessIdea}. ${scopeInstruction} ${strategyInstruction} Design a general supply chain using real-world industry hubs and factual businesses.`;
      console.log(`\n🧠 Generating GENERAL chain: "${businessIdea}"`);
      console.log(`   🌐 Scope: ${scope}`);
    }

    console.log(`   Mode: ${USE_AI ? '🤖 AI (Gemini)' : '📋 Mock Data'}\n`);

    let chain: SupplyChain;

    if (USE_AI) {
      try {
        const { generateSupplyChainFlow } = await import('./flows/generate_chain.js');
        chain = await generateSupplyChainFlow({ 
          businessIdea: enrichedIdea,
          clientLocation,
          strictLocal: strictLocal || (!destination && !!clientLocation),
          destination,
          chainScope: scope,
          displayStrategy,
        });
      } catch (err: any) {
        console.warn(`\n⚠️ AI Generation completely failed (${err.message}).`);
        console.warn(`   Falling back to Mock Data to prevent frontend block...\n`);
        chain = generateMockSupplyChain(businessIdea);
        patchMockDataLocation(chain, clientLocation, destination, strictLocal);
      }
    } else {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      chain = generateMockSupplyChain(businessIdea);
      patchMockDataLocation(chain, clientLocation, destination, strictLocal);
    }

    // Store in database
    await saveChain(chain, (req as any).uid);

    console.log(`✅ Generated chain: ${chain.name} (${chain.nodes.length} nodes, ${chain.edges.length} edges)`);
    chain.nodes.forEach(n => console.log(`   📦 ${n.name} (${n.type}) — ${n.ui_config.page_components.length} components`));

    res.json({ success: true, supply_chain: chain });
  } catch (error: any) {
    console.error('❌ Generation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/generate-stream - Generate supply chain via SSE
// ============================================================
app.post('/api/generate-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { businessIdea, clientLocation, strictLocal, chainScope, destination, displayStrategy } = req.body;
    if (!businessIdea || typeof businessIdea !== 'string') {
      res.write(`data: ${JSON.stringify({ error: 'businessIdea is required' })}\n\n`);
      return res.end();
    }

    let enrichedIdea = businessIdea;
    const scope = chainScope || 'auto';
    const scopeInstruction = scope === 'inter'
      ? 'This is an INTERNATIONAL supply chain. Include cross-border logistics, customs, and global shipping nodes.'
      : scope === 'intra'
        ? 'This is a DOMESTIC/LOCAL supply chain. Keep ALL nodes within the same country. Do NOT include international shipping or customs.'
        : '';

    const strategyInstruction = displayStrategy === 'all_options'
      ? 'DISPLAY STRATEGY: ALL OPTIONS. Instead of a single linear path, you MUST generate MULTIPLE alternative nodes (e.g., 2-3 different warehouse options, 2-3 different supplier options) for each stage of the supply chain. Assign alternative nodes at the same stage the SAME "order" number. This will allow the UI to display them as parallel alternatives.'
      : 'DISPLAY STRATEGY: BEST ROUTE. Generate a single, highly optimized, linear route. Each stage should have exactly one node.';

    if (clientLocation && destination) {
      enrichedIdea = `${businessIdea}. ${scopeInstruction} ${strategyInstruction} The business ORIGIN is in ${clientLocation.address} (Lat: ${clientLocation.lat}, Lng: ${clientLocation.lng}). The DESTINATION/market is: ${destination}. Design the BEST POSSIBLE ROUTE from origin to destination, using real factories, warehouses, ports, and logistics providers that exist along this corridor. Every node must be a real, factual business.`;
    } else if (clientLocation && !destination) {
      enrichedIdea = `${businessIdea}. ${scopeInstruction} ${strategyInstruction} IMPORTANT: This is a LOCAL business based in ${clientLocation.address} (Lat: ${clientLocation.lat}, Lng: ${clientLocation.lng}). ALL suppliers, warehouses, manufacturers, and operations MUST be located within 100 miles of this location. Use ONLY factual, actually existing local businesses. Do NOT use international suppliers.`;
    } else if (destination) {
      enrichedIdea = `${businessIdea}. ${scopeInstruction} ${strategyInstruction} The product must reach: ${destination}. Design a supply chain that delivers to this destination using real, factual businesses.`;
    } else {
      enrichedIdea = `${businessIdea}. ${scopeInstruction} ${strategyInstruction} Design a general supply chain using real-world industry hubs and factual businesses.`;
    }

    if (!USE_AI) {
      res.write(`data: ${JSON.stringify({ status: 'Simulating AI generation...' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const chain = generateMockSupplyChain(businessIdea);
      patchMockDataLocation(chain, clientLocation, destination, strictLocal);
      await saveChain(chain, (req as any).uid);
      res.write(`data: ${JSON.stringify({ success: true, supply_chain: chain })}\n\n`);
      return res.end();
    }

    const { supplyChainGraph } = await import('./flows/generate_chain.js');
    
    // Create the stream
    const stream = await supplyChainGraph.stream({
      businessIdea: enrichedIdea,
      clientLocation,
      strictLocal: strictLocal || (!destination && !!clientLocation),
      destination,
      chainScope: scope,
      displayStrategy,
    });

    for await (const chunk of stream) {
      // Chunk contains the node that just executed and its returned state diff
      const nodeName = Object.keys(chunk)[0];
      
      let statusMessage = "Processing...";
      if (nodeName === "analyzeBusiness") statusMessage = "Analyzing business requirements...";
      else if (nodeName === "anticipateRisks") statusMessage = "Anticipating macro risks...";
      else if (nodeName === "architectChain") statusMessage = "Architecting supply chain network...";
      else if (nodeName === "mlRiskScoring") statusMessage = "Running ML risk analysis...";
      else if (nodeName === "generateUIConfigs") statusMessage = "Generating user interfaces...";
      else if (nodeName === "assembleChain") {
        statusMessage = "Assembling final chain...";
        const finalChain = chunk[nodeName].supplyChain;
        await saveChain(finalChain, (req as any).uid);
        res.write(`data: ${JSON.stringify({ status: statusMessage })}\n\n`);
        res.write(`data: ${JSON.stringify({ success: true, supply_chain: finalChain })}\n\n`);
        return res.end();
      }

      res.write(`data: ${JSON.stringify({ status: statusMessage })}\n\n`);
    }

  } catch (error: any) {
    console.error('❌ Stream Generation failed:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Helper to patch mock data locations so fallback doesn't show confusing international nodes
function patchMockDataLocation(chain: SupplyChain, clientLocation: any, destination: string, strictLocal: boolean) {
  if (!chain.nodes || chain.nodes.length === 0) return;

  if (clientLocation && destination) {
    console.log(`   📍 Patching mock data for ROUTE: ${clientLocation.address} → ${destination}`);
    // Patch first node to origin
    chain.nodes[0] = {
      ...chain.nodes[0],
      name: chain.nodes[0].name.replace(/\([^)]*\)/g, '').trim() + ` (${clientLocation.address})`,
      metadata: { ...chain.nodes[0].metadata, location: clientLocation.address, coordinates: { lat: clientLocation.lat, lng: clientLocation.lng } },
    };
    // Patch last node to destination
    const lastIdx = chain.nodes.length - 1;
    chain.nodes[lastIdx] = {
      ...chain.nodes[lastIdx],
      name: chain.nodes[lastIdx].name.replace(/\([^)]*\)/g, '').trim() + ` (${destination})`,
      metadata: { ...chain.nodes[lastIdx].metadata, location: destination, coordinates: { lat: 0, lng: 0 } },
    };
    // Clear out intermediate international names and metadata locations
    for (let i = 1; i < lastIdx; i++) {
      chain.nodes[i].name = chain.nodes[i].name.replace(/\([^)]*\)/g, '').trim() + ` (In Transit)`;
      chain.nodes[i].metadata = {
        ...chain.nodes[i].metadata,
        location: 'In Transit',
        coordinates: { lat: 0, lng: 0 },
      };
    }
  } else if (clientLocation) {
    console.log(`   📍 Patching mock data with client location: ${clientLocation.address}`);
    chain.nodes = chain.nodes.map(node => ({
      ...node,
      name: node.name.replace(/\([^)]*\)/g, '').trim() + ` (${clientLocation.address})`,
      metadata: {
        ...node.metadata,
        location: clientLocation.address,
        coordinates: { lat: clientLocation.lat, lng: clientLocation.lng },
      },
    }));
  }
}

// ============================================================
// GET /api/chains - List all supply chains
// ============================================================
app.get('/api/chains', async (req: express.Request, res: express.Response) => {
  const chainsData = await getChains((req as any).uid);
  const chains = chainsData.map(c => ({
    id: c.id,
    name: c.name,
    business_idea: (c as any).businessIdea || c.business_idea,
    status: c.status,
    created_at: (c as any).createdAt || c.created_at,
    node_count: c.nodes.length,
  }));
  res.json({ chains });
});

// ============================================================
// GET /api/chains/:id - Get full supply chain with nodes
// ============================================================
app.get('/api/chains/:id', async (req: express.Request, res: express.Response) => {
  const chain = await getChain(req.params.id as string, (req as any).uid);
  if (!chain) {
    res.status(404).json({ error: 'Supply chain not found' });
    return;
  }
  res.json({ supply_chain: chain });
});

// ============================================================
// GET /api/chains/:chainId/nodes/:nodeId - Get single node
// ============================================================
app.get('/api/chains/:chainId/nodes/:nodeId', async (req: express.Request, res: express.Response) => {
  const chain = await getChain(req.params.chainId as string, (req as any).uid);
  if (!chain) {
    res.status(404).json({ error: 'Supply chain not found' });
    return;
  }
  const node = chain.nodes.find(n => n.id === req.params.nodeId);
  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }
  res.json({ node });
});

// ============================================================
// POST /api/chains/:id/add-node - Add node to existing chain
// (Simulates self-healing / AI adding new nodes)
// ============================================================
app.post('/api/chains/:id/add-node', async (req: express.Request, res: express.Response) => {
  try {
    const chain = await getChain(req.params.id as string, (req as any).uid);
    if (!chain) {
      res.status(404).json({ error: 'Supply chain not found' });
      return;
    }

    const { reason } = req.body;
    console.log(`\n🔧 Adding node to chain ${chain.name}: "${reason}"`);

    // Simulate AI generating a new Quality Control node
    const newNode = {
      id: `node_${chain.nodes.length + 1}`,
      name: `Crisis Response: ${reason}`,
      type: 'quality_control' as const,
      description: `Dynamically generated node in response to: ${reason}`,
      status: 'active' as const,
      order: chain.nodes.length,
      metadata: { location: 'Dynamic', generated_reason: reason },
      ui_config: {
        icon: 'emergency',
        color: '#F44336',
        page_components: [
          {
            type: 'kpi_card_row' as const,
            args: {
              cards: [
                { label: 'Issue Status', unit: '', dataKey: 'status', value: 'Active' },
                { label: 'Impact Level', unit: '', dataKey: 'impact', value: 'High' },
                { label: 'Resolution ETA', unit: 'hrs', dataKey: 'eta', value: 24 },
              ],
            },
          },
          {
            type: 'timeline' as const,
            args: {
              dataSource: 'crisis_events',
              showDate: true,
              data: [
                { date: new Date().toISOString(), event: `Crisis detected: ${reason}`, status: 'error' },
                { date: new Date().toISOString(), event: 'AI generated crisis response node', status: 'info' },
                { date: new Date().toISOString(), event: 'Awaiting resolution actions', status: 'pending' },
              ],
            },
          },
          {
            type: 'approval_form' as const,
            args: {
              title: 'Crisis Resolution Actions',
              fields: [
                { name: 'action', type: 'select', label: 'Resolution Action', required: true, options: ['Reroute Shipment', 'Find Alternative Supplier', 'Delay Order', 'Expedite Backup'] },
                { name: 'notes', type: 'textarea', label: 'Notes', required: false },
              ],
              actions: [
                { label: 'Execute Resolution', action: 'resolve', variant: 'primary' },
                { label: 'Escalate', action: 'escalate', variant: 'warning' },
              ],
            },
          },
        ],
      },
    };

    chain.nodes.push(newNode);

    // Add edge from last non-crisis node
    const newEdge = {
      id: `edge_crisis_${Date.now()}`,
      source_node_id: chain.nodes[chain.nodes.length - 2].id,
      target_node_id: newNode.id,
      relationship: 'inspects_for' as const,
      metadata: { transport_mode: 'emergency', estimated_days: 0 },
    };
    chain.edges.push(newEdge);

    await saveChain(chain, (req as any).uid);

    console.log(`✅ Added crisis node: ${newNode.name}`);

    res.json({ success: true, node: newNode, edge: newEdge });
  } catch (error: any) {
    console.error('❌ Add node failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /api/chains/:id - Delete a supply chain
// ============================================================
app.delete('/api/chains/:id', async (req: express.Request, res: express.Response) => {
  const success = await deleteChain(req.params.id as string, (req as any).uid);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Supply chain not found' });
  }
});

// ============================================================
// POST /api/chains/:id/disruptions/trigger - Trigger a disruption
// ============================================================
app.post('/api/chains/:id/disruptions/trigger', async (req: express.Request, res: express.Response) => {
  const chain = await getChain(req.params.id as string, (req as any).uid);
  if (!chain) {
    res.status(404).json({ error: 'Supply chain not found' });
    return;
  }
  
  const disruption: DisruptionEvent = req.body;
  
  // Set affected nodes to critical state
  disruption.affected_node_ids.forEach(nodeId => {
    const node = chain.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = 'critical';
    }
  });
  
  chain.status = 'disrupted';
  
  await saveChain(chain, (req as any).uid);
  
  res.json({ success: true, supply_chain: chain });
});

// ============================================================
// POST /api/chains/:id/disruptions/resolve - Get AI mitigation plan
// ============================================================
app.post('/api/chains/:id/disruptions/resolve', async (req: express.Request, res: express.Response) => {
  try {
    const chain = await getChain(req.params.id as string, (req as any).uid);
    if (!chain) {
      res.status(404).json({ error: 'Supply chain not found' });
      return;
    }

    const disruption: DisruptionEvent = req.body;
    
    let mitigation: MitigationAction;
    if (USE_AI) {
      const { resolveDisruptionFlow } = await import('./flows/resolve_disruption.js');
      mitigation = await resolveDisruptionFlow({ supplyChain: chain, disruption });
    } else {
      // Mock mitigation
      mitigation = {
        id: `mitigation_${Date.now()}`,
        action_type: 'activate_backup',
        description: 'Mock mitigation action generated.',
        cost_impact: 5000,
        time_impact_days: -2,
      };
    }
    
    res.json({ success: true, mitigation });
  } catch (error: any) {
    console.error('❌ Resolve disruption failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/chains/:id/disruptions/execute - Execute Mitigation
// ============================================================
app.post('/api/chains/:id/disruptions/execute', async (req: express.Request, res: express.Response) => {
  const chain = await getChain(req.params.id as string, (req as any).uid);
  if (!chain) {
    res.status(404).json({ error: 'Supply chain not found' });
    return;
  }

  const mitigation: MitigationAction = req.body;

  // Apply proposed node changes
  if (mitigation.proposed_node_changes) {
    mitigation.proposed_node_changes.forEach(newNode => {
      // If node exists, update it, else push
      const idx = chain.nodes.findIndex(n => n.id === newNode.id);
      if (idx >= 0) {
        chain.nodes[idx] = newNode;
      } else {
        chain.nodes.push(newNode);
      }
    });
  }

  // Apply proposed edge changes
  if (mitigation.proposed_edge_changes) {
    mitigation.proposed_edge_changes.forEach(newEdge => {
      const idx = chain.edges.findIndex(e => e.id === newEdge.id);
      if (idx >= 0) {
        chain.edges[idx] = newEdge;
      } else {
        chain.edges.push(newEdge);
      }
    });
  }

  // Restore chain to active state
  chain.status = 'active';
  chain.nodes.forEach(n => {
    if (n.status === 'critical') n.status = 'active'; // Reset critical nodes for simplicity
  });

  await saveChain(chain, (req as any).uid);

  res.json({ success: true, supply_chain: chain });
});

// ============================================================
// POST /api/chains/:id/risk-scan - Run AI risk scan on all nodes
// ============================================================
app.post('/api/chains/:id/risk-scan', async (req: express.Request, res: express.Response) => {
  try {
    const chain = await getChain(req.params.id as string, (req as any).uid);
    if (!chain) {
      res.status(404).json({ error: 'Supply chain not found' });
      return;
    }

    console.log(`\n🔍 Running risk scan for chain: ${chain.name}`);

    let report: RiskReport;

    if (USE_AI) {
      const { scanSupplyChainRisksFlow } = await import('./flows/scan_risks.js');
      const scanResult = await scanSupplyChainRisksFlow({ supplyChain: chain });

      // Update node metadata with fresh risk scores
      for (const result of scanResult.results) {
        const node = chain.nodes.find(n => n.id === result.node_id);
        if (node) {
          const geoRisk = result.risks.find(r => r.category === 'geopolitical');
          const climateRisk = result.risks.find(r => r.category === 'climate');
          const cyberRisk = result.risks.find(r => r.category === 'cyber');
          if (geoRisk) node.metadata.geopolitical_risk = geoRisk.score;
          if (climateRisk) node.metadata.climate_risk = climateRisk.score;
          if (cyberRisk) node.metadata.cyber_risk = cyberRisk.score;
        }
      }

      const avgRisk = scanResult.results.length > 0
        ? Math.round((scanResult.results.reduce((sum, r) => sum + r.overall_risk, 0) / scanResult.results.length) * 10) / 10
        : 0;

      report = {
        chain_id: chain.id,
        scanned_at: new Date().toISOString(),
        overall_chain_risk: avgRisk,
        results: scanResult.results,
      };
    } else {
      // Mock risk scan
      report = {
        chain_id: chain.id,
        scanned_at: new Date().toISOString(),
        overall_chain_risk: 4.2,
        results: chain.nodes.map(n => ({
          node_id: n.id,
          node_name: n.name,
          location: n.metadata?.location || 'Unknown',
          overall_risk: Math.round(Math.random() * 7 * 10) / 10,
          risks: [
            {
              category: 'climate' as const,
              score: Math.round(Math.random() * 8 * 10) / 10,
              headline: 'Weather Exposure',
              explanation: 'This location experiences seasonal weather disruptions that could slow down operations.',
              recommended_action: 'Build a 30-day safety stock buffer for this node.',
            },
            {
              category: 'geopolitical' as const,
              score: Math.round(Math.random() * 6 * 10) / 10,
              headline: 'Trade Stability',
              explanation: 'The region has moderate trade policy changes that could affect import/export timelines.',
              recommended_action: 'Monitor trade policy updates and identify an alternative supplier.',
            },
          ],
        })),
      };
    }

    // Cache the report
    await saveRiskReport(report, (req as any).uid);

    // Save updated chain with new risk scores
    await saveChain(chain, (req as any).uid);

    console.log(`✅ Risk scan complete. Overall chain risk: ${report.overall_chain_risk}/10`);
    res.json({ success: true, report });
  } catch (error: any) {
    console.error('❌ Risk scan failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/chains/:id/risk-report - Get cached risk report
// ============================================================
app.get('/api/chains/:id/risk-report', async (req: express.Request, res: express.Response) => {
  const report = await getRiskReport(req.params.id as string, (req as any).uid);
  if (!report) {
    res.status(404).json({ error: 'No risk report found. Run a risk scan first.' });
    return;
  }
  res.json({ success: true, report });
});

// ============================================================
// Health check
// ============================================================
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    mode: USE_AI ? 'ai' : 'mock',
    chains_count: supplyChains.size,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Start server
// ============================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  🚀 Adaptive Supply Chain Backend               ║
║  ────────────────────────────────────────────    ║
║  Server:  http://localhost:${PORT}                 ║
║  Mode:    ${USE_AI ? '🤖 AI (Gemini)           ' : '📋 Mock Data             '}           ║
║  API:     http://localhost:${PORT}/api              ║
╚══════════════════════════════════════════════════╝
  `);
});
