import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  SupplyChainSchema,
  DisruptionEventSchema,
  MitigationActionSchema,
  type SupplyChain,
  type DisruptionEvent,
  type MitigationAction,
} from '../schemas/supply_chain_schema.js';
import { getPlaybookSection } from "../utils/playbook_context.js";
import { batchPredictRisks, mapIndustryToCategory } from "../ml/risk_model.js";

const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.5-flash",
  temperature: 0.1,
});

export async function resolveDisruptionFlow(input: {
  supplyChain: SupplyChain;
  disruption: DisruptionEvent;
}): Promise<MitigationAction> {
  
  console.log(`   🔍 Retrieving playbook section for disruption type: ${input.disruption.type}...`);
  
  // Direct deterministic playbook lookup (replaces RAG vector similarity search)
  const playbookContext = getPlaybookSection(input.disruption.type);

  // Run ML model on affected nodes to enrich context
  console.log(`   🧠 Running ML risk predictions on affected nodes...`);
  const affectedNodes = input.supplyChain.nodes.filter(
    n => input.disruption.affected_node_ids.includes(n.id)
  );

  // Infer industry from the supply chain's business idea
  const industry = mapIndustryToCategory(input.supplyChain.business_idea || 'general');
  
  let mlContext = '';
  if (affectedNodes.length > 0) {
    const mlInputs = affectedNodes.map(node => ({
      nodeType: node.type,
      lat: node.metadata?.coordinates?.lat || 0,
      lng: node.metadata?.coordinates?.lng || 0,
      industry,
    }));

    const predictions = await batchPredictRisks(mlInputs);
    
    mlContext = '\n\nML RISK MODEL PREDICTIONS FOR AFFECTED NODES:\n' +
      affectedNodes.map((node, i) => {
        const p = predictions[i];
        return `- ${node.name} (${node.id}): Geo=${p.geopolitical_risk}/10, Climate=${p.climate_risk}/10, Cyber=${p.cyber_risk}/10, Transport=${p.transport_risk}/10`;
      }).join('\n');
  }

  const structuredLlm = llm.withStructuredOutput(MitigationActionSchema);

  const prompt = `You are an elite Supply Chain Disruption Resolution Agent. Your job is to analyze an active disruption and propose an actionable mitigation plan based strictly on the provided Playbook.

Relevant Playbook Rules:
${playbookContext}
${mlContext}

Current Disruption:
Type: ${input.disruption.type}
Severity: ${input.disruption.severity}
Description: "${input.disruption.description}"
Affected Nodes: ${input.disruption.affected_node_ids.join(', ')}

Your task:
1. Determine the best mitigation strategy from the playbook context that exactly matches the disruption type.
2. Select the "action_type" (reroute, activate_backup, release_buffer, renegotiate, human_review, escalate).
3. If new backup nodes or routes are needed, define them in "proposed_node_changes" and "proposed_edge_changes". Assign them IDs that start with 'node_backup_' and 'edge_backup_'.
4. Provide a clear description of the action.
5. Estimate the cost impact and time delay (or time saved by acting early).
6. Consider the ML risk predictions above when designing backup routes — prefer locations with lower predicted risk scores.

You have access to the full supply chain structure to generate the correct IDs and logic.
`;

  console.log(`   🤖 Generating mitigation plan...`);
  const response = await structuredLlm.invoke(prompt);
  
  return response as MitigationAction;
}
