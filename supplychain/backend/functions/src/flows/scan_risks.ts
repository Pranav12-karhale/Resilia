import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  SupplyChainSchema,
  RiskScanResultSchema,
  type SupplyChain,
  type RiskScanResult,
} from '../schemas/supply_chain_schema.js';
import { z } from "zod";
import { getVectorStore } from "../utils/vector_store.js";

const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.5-flash",
  temperature: 0.1,
});

export async function scanSupplyChainRisksFlow(input: {
  supplyChain: SupplyChain;
}): Promise<{ results: RiskScanResult[] }> {
  
  const nodesSummary = input.supplyChain.nodes.map(n => {
    const loc = n.metadata?.location || 'Unknown';
    const coords = n.metadata?.coordinates
      ? `(${n.metadata.coordinates.lat}, ${n.metadata.coordinates.lng})`
      : '';
    return `- ${n.id}: "${n.name}" | Type: ${n.type} | Location: ${loc} ${coords}`;
  }).join('\n');

  // We can use RAG to fetch general macro risks for the nodes' regions, 
  // but it's simpler and more accurate to query the LLM with the list of nodes
  // and have it do semantic retrieval internally, or pass a unified playbook.
  // We will do a generic semantic search to grab top risks.
  const vectorStore = await getVectorStore();
  const query = `Macro economic, climate, geopolitical, transport risks for global supply chain.`;
  const docs = await vectorStore.similaritySearch(query, 5);
  const playbookContext = docs.map(d => d.pageContent).join("\n\n");

  const outputSchema = z.object({
    results: z.array(RiskScanResultSchema),
  });

  const structuredLlm = llm.withStructuredOutput(outputSchema);

  const prompt = `You are a world-class supply chain risk intelligence analyst. Your job is to assess the real-world risks facing each node in a supply chain based on its GEOGRAPHIC LOCATION and TYPE.

PLAYBOOK CATEGORIES TO CONSIDER (RAG Context):
${playbookContext}

SUPPLY CHAIN NODES:
${nodesSummary}

IMPORTANT INSTRUCTIONS:
- Score each risk 0-10 (0 = negligible, 10 = extreme immediate threat).
- Only include risks that score 3 or higher.
- The "headline" should be 2-5 words identifying the risk.
- The "explanation" MUST be written for a startup founder with ZERO supply chain experience. Use simple language, no jargon.
- The "recommended_action" MUST be a specific, actionable step drawn DIRECTLY from the Playbook context if possible.
- The "overall_risk" for each node should be the WEIGHTED AVERAGE of its individual risk scores.
- Return results for EVERY node in the chain.`;

  console.log(`   🔍 Scanning supply chain risks...`);
  const response = await structuredLlm.invoke(prompt);
  
  return response;
}
