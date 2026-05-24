import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  SupplyChainSchema,
  BusinessAnalysisSchema,
  SupplyChainNodeSchema,
  EdgeSchema,
  NodeUIConfigSchema,
  NodeType,
  AnticipatedRiskSchema,
  type SupplyChain,
  type BusinessAnalysis,
  type AnticipatedRisk,
} from '../schemas/supply_chain_schema.js';
import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";
import { getVectorStore } from "../utils/vector_store.js";

// Initialize the LLM
// We use structured output for each node.
const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.5-flash",
  temperature: 0.2,
});

// ============================================================
// LangGraph State Definition
// ============================================================
const GraphState = Annotation.Root({
  businessIdea: Annotation<string>,
  clientLocation: Annotation<{ lat: number; lng: number; address: string } | undefined>,
  strictLocal: Annotation<boolean | undefined>,
  destination: Annotation<string | undefined>,
  chainScope: Annotation<string | undefined>,
  displayStrategy: Annotation<string | undefined>,
  
  analysis: Annotation<BusinessAnalysis>,
  anticipatedRisks: Annotation<AnticipatedRisk[]>,
  architecture: Annotation<{
    nodes: any[];
    edges: any[];
  }>,
  uiConfigs: Annotation<Record<string, any>>,
  supplyChain: Annotation<SupplyChain>,
});

// ============================================================
// Agent 1: Business Analyzer
// ============================================================
async function analyzeBusiness(state: typeof GraphState.State) {
  const structuredLlm = llm.withStructuredOutput(BusinessAnalysisSchema);
  
  const locationContext = state.clientLocation
    ? `\nClient Location: ${state.clientLocation.address} (Lat: ${state.clientLocation.lat}, Lng: ${state.clientLocation.lng})\nStrict Local Sourcing: ${state.strictLocal ? 'YES - This must be a hyper-local business.' : 'No'}`
    : '';

  const prompt = `You are a supply chain expert and business analyst. Analyze the following business idea and break it down into its logistical components.

Business Idea: "${state.businessIdea}"${locationContext}

Identify:
1. The primary industry this business operates in
2. The type of product or service
3. The target market and geography
4. Key business requirements for the supply chain
5. Any regulatory or compliance needs (food safety, customs, certifications, etc.)
6. The types of supply chain nodes that would be needed
7. The overall complexity of the supply chain
8. Any special considerations (cold chain, hazardous materials, perishables, etc.)

Be specific and practical. Think about real-world logistics.`;

  console.log(`   🧠 Analyzing business: ${state.businessIdea}...`);
  const analysis = await structuredLlm.invoke(prompt);
  
  return { analysis };
}

// ============================================================
// Agent 1.5: Risk Anticipator (Using RAG)
// ============================================================
async function anticipateRisks(state: typeof GraphState.State) {
  console.log(`   🔮 Anticipating risks via RAG...`);
  const locationContext = state.clientLocation
    ? `\nClient Location: ${state.clientLocation.address} (Lat: ${state.clientLocation.lat}, Lng: ${state.clientLocation.lng})`
    : '';

  // 1. Retrieve relevant playbook items using RAG
  const vectorStore = await getVectorStore();
  const query = `Risks for ${state.analysis.industry} industry, producing ${state.analysis.product_type}. ${state.businessIdea}`;
  const docs = await vectorStore.similaritySearch(query, 3);
  
  const retrievedContext = docs.map(d => d.pageContent).join("\n\n");

  // 2. Generate anticipated risks based on retrieved context
  const outputSchema = z.object({ anticipated_risks: z.array(AnticipatedRiskSchema) });
  const structuredLlm = llm.withStructuredOutput(outputSchema);

  const prompt = `You are a predictive supply chain risk analyst. Based on the following business analysis and retrieved playbook guidelines, anticipate major supply chain risks BEFORE the supply chain is even built.

Business Idea: "${state.businessIdea}"${locationContext}

Analysis:
- Industry: ${state.analysis.industry}
- Product Type: ${state.analysis.product_type}
- Target Market: ${state.analysis.target_market}

Relevant Playbook Guidelines (RAG Context):
${retrievedContext}

Identify the top 1-3 macro risks based specifically on the playbook guidelines above.
Provide specific "regions_to_avoid" and a "recommended_routing_strategy".
If the business is strictly local or hyper-simple, you may return an empty list or minimal risks.`;

  const result = await structuredLlm.invoke(prompt);
  return { anticipatedRisks: result.anticipated_risks };
}

// ============================================================
// Agent 2: Chain Architect
// ============================================================
async function architectChain(state: typeof GraphState.State) {
  console.log(`   🏗️ Architecting chain nodes and edges...`);
  const outputSchema = z.object({
    nodes: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: NodeType,
      description: z.string(),
      order: z.number(),
      metadata: z.record(z.any()),
    })),
    edges: z.array(z.object({
      id: z.string(),
      source_node_id: z.string(),
      target_node_id: z.string(),
      relationship: z.string(),
      metadata: z.record(z.any()),
    })),
  });

  const structuredLlm = llm.withStructuredOutput(outputSchema);

  const locationContext = state.clientLocation
    ? `\nClient Location: ${state.clientLocation.address} (Lat: ${state.clientLocation.lat}, Lng: ${state.clientLocation.lng})\nStrict Local Sourcing: ${state.strictLocal ? 'YES - MUST use businesses very close to these coordinates' : 'Preferred'}`
    : '';

  const risksContext = (state.anticipatedRisks && state.anticipatedRisks.length > 0)
    ? `\n\nANTICIPATED RISKS TO AVOID:\n${state.anticipatedRisks.map(r => `- ${r.risk_category}: ${r.description}\n  Must Avoid: ${r.regions_to_avoid.join(', ')}\n  Strategy: ${r.recommended_routing_strategy}`).join('\n')}\n\nCRITICAL ROUTING INSTRUCTION: You MUST actively avoid the 'Must Avoid' regions mentioned above and follow the 'Strategy' when placing nodes.`
    : '';

  const prompt = `You are a supply chain architect. Based on the following business analysis, design a complete supply chain node graph.

Business Idea: "${state.businessIdea}"${locationContext}${risksContext}

Analysis:
- Industry: ${state.analysis.industry}
- Product Type: ${state.analysis.product_type}
- Key Requirements: ${state.analysis.key_requirements.join(', ')}
- Suggested Node Types: ${state.analysis.estimated_node_types.join(', ')}

Design the supply chain with:
1. Specific, named nodes with realistic geographic locations. 
   - CRITICAL REQUIREMENT: You MUST use FACTUAL, ACTUALLY EXISTING businesses whenever possible.
2. Proper ordering from raw materials to end consumer.
3. Logical edges connecting nodes with appropriate relationships.
4. Realistic metadata for each node, INCLUDING precise real-world geographic coordinates (lat/lng).
5. Use sequential node IDs like "node_1", "node_2", etc.
6. Use sequential edge IDs like "edge_1", "edge_2", etc.`;

  const architecture = await structuredLlm.invoke(prompt);
  return { architecture };
}

// ============================================================
// Agent 3: UI Config Generator
// ============================================================
async function generateUIConfigs(state: typeof GraphState.State) {
  console.log(`   🎨 Generating UI configurations for ${state.architecture.nodes.length} nodes...`);
  const outputSchema = z.object({
    configs: z.record(z.string(), NodeUIConfigSchema),
  });

  const structuredLlm = llm.withStructuredOutput(outputSchema);

  const nodesContext = state.architecture.nodes.map(n => `- Node ID: [${n.id}]\n  Name: "${n.name}" (Type: ${n.type})\n  Description: ${n.description}`).join('\n\n');

  const prompt = `You are a UI/UX expert for supply chain management. Generate the UI configuration for a supply chain node page.
You are receiving a list of ${state.architecture.nodes.length} nodes. You MUST generate a completely unique, highly specific UI configuration for EVERY SINGLE node in this list. Do not skip any node.

Industry: ${state.analysis.industry}

Here are the ${state.architecture.nodes.length} nodes you need to configure:
${nodesContext}

Available component types:
- "kpi_card_row", "inventory_table", "status_tracker", "analytics_chart", "approval_form", "order_list", "data_grid", "timeline", "notification_feed", "map_view", "document_upload", "qr_scanner"

For EVERY node ID, provide its configuration in the output dictionary.
1. Choose an appropriate Material icon name.
2. Choose an appropriate hex color.
3. Select 3-6 components relevant for managing this specific node type.`;

  const response = await structuredLlm.invoke(prompt);
  return { uiConfigs: response.configs };
}

// ============================================================
// Agent 4: Assembler
// ============================================================
async function assembleChain(state: typeof GraphState.State) {
  console.log(`   ✅ Assembling complete supply chain...`);
  const { architecture, uiConfigs, analysis, businessIdea } = state;

  const nodesWithUI = architecture.nodes.map(node => {
    let config: any = uiConfigs[node.id] || uiConfigs[`[${node.id}]`];
    if (!config || typeof config !== 'object') {
      config = {
        icon: 'factory',
        color: '#4CAF50',
        page_components: [{ type: 'kpi_card_row', args: { cards: [] } }]
      };
    }
    return {
      ...node,
      status: 'active' as const,
      ui_config: config,
    };
  });

  const supplyChain: SupplyChain = {
    id: `sc_${uuidv4().split('-')[0]}`,
    name: `${analysis.product_type} Supply Chain`,
    business_idea: businessIdea,
    status: 'active',
    created_at: new Date().toISOString(),
    nodes: nodesWithUI,
    edges: architecture.edges.map((edge: any) => ({
      ...edge,
      relationship: edge.relationship,
    })),
  };

  return { supplyChain };
}

// ============================================================
// Build the Graph
// ============================================================
const builder = new StateGraph(GraphState)
  .addNode("analyzeBusiness", analyzeBusiness)
  .addNode("anticipateRisks", anticipateRisks)
  .addNode("architectChain", architectChain)
  .addNode("generateUIConfigs", generateUIConfigs)
  .addNode("assembleChain", assembleChain)
  .addEdge(START, "analyzeBusiness")
  .addEdge("analyzeBusiness", "anticipateRisks")
  .addEdge("anticipateRisks", "architectChain")
  .addEdge("architectChain", "generateUIConfigs")
  .addEdge("generateUIConfigs", "assembleChain")
  .addEdge("assembleChain", END);

export const supplyChainGraph = builder.compile();

export async function generateSupplyChainFlow(input: {
  businessIdea: string;
  clientLocation?: { lat: number; lng: number; address: string };
  strictLocal?: boolean;
  destination?: string;
  chainScope?: string;
  displayStrategy?: string;
}): Promise<SupplyChain> {
  const result = await supplyChainGraph.invoke({
    businessIdea: input.businessIdea,
    clientLocation: input.clientLocation,
    strictLocal: input.strictLocal,
    destination: input.destination,
    chainScope: input.chainScope,
    displayStrategy: input.displayStrategy,
  });

  return result.supplyChain;
}
