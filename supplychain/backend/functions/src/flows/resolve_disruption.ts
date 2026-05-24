import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  SupplyChainSchema,
  DisruptionEventSchema,
  MitigationActionSchema,
  type SupplyChain,
  type DisruptionEvent,
  type MitigationAction,
} from '../schemas/supply_chain_schema.js';
import { getVectorStore } from "../utils/vector_store.js";

const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.5-flash",
  temperature: 0.1,
});

export async function resolveDisruptionFlow(input: {
  supplyChain: SupplyChain;
  disruption: DisruptionEvent;
}): Promise<MitigationAction> {
  
  console.log(`   🔍 Retrieving playbook mitigations for disruption type: ${input.disruption.type}...`);
  const vectorStore = await getVectorStore();
  const query = `Mitigation strategy for disruption type: ${input.disruption.type}. ${input.disruption.description}`;
  const docs = await vectorStore.similaritySearch(query, 3);
  const retrievedPlaybook = docs.map(d => d.pageContent).join("\n\n");

  const structuredLlm = llm.withStructuredOutput(MitigationActionSchema);

  const prompt = `You are an elite Supply Chain Disruption Resolution Agent. Your job is to analyze an active disruption and propose an actionable mitigation plan based strictly on the provided Playbook.

Retrieved Playbook Rules (RAG Context):
${retrievedPlaybook}

Current Disruption:
Type: ${input.disruption.type}
Severity: ${input.disruption.severity}
Description: "${input.disruption.description}"
Affected Nodes: ${input.disruption.affected_node_ids.join(', ')}

Your task:
1. Determine the best mitigation strategy from the playbook context that exactly matches the disruption type.
2. Select the "action_type" (reroute, activate_backup, release_buffer, etc.).
3. If new backup nodes or routes are needed, define them in "proposed_node_changes" and "proposed_edge_changes". Assign them IDs that start with 'node_backup_' and 'edge_backup_'.
4. Provide a clear description of the action.
5. Estimate the cost impact and time delay (or time saved by acting early).

You have access to the full supply chain structure to generate the correct IDs and logic.
`;

  console.log(`   🤖 Generating mitigation plan...`);
  const response = await structuredLlm.invoke(prompt);
  
  return response as MitigationAction;
}
