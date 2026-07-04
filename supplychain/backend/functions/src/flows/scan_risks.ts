import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  SupplyChainSchema,
  RiskScanResultSchema,
  type SupplyChain,
  type RiskScanResult,
} from '../schemas/supply_chain_schema.js';
import { z } from "zod";
import { getPlaybookSummary } from "../utils/playbook_context.js";
import { batchPredictRisks, mapIndustryToCategory, type RiskPrediction } from "../ml/risk_model.js";

const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.5-flash",
  temperature: 0.1,
});

export async function scanSupplyChainRisksFlow(input: {
  supplyChain: SupplyChain;
}): Promise<{ results: RiskScanResult[] }> {
  
  // ── Step 1: ML Model Inference ──────────────────────────────
  console.log(`   🧠 Running ML risk model on ${input.supplyChain.nodes.length} nodes...`);
  
  const industry = mapIndustryToCategory(input.supplyChain.business_idea || 'general');
  
  const mlInputs = input.supplyChain.nodes.map(n => ({
    nodeType: n.type,
    lat: n.metadata?.coordinates?.lat || 0,
    lng: n.metadata?.coordinates?.lng || 0,
    industry,
  }));

  const mlPredictions = await batchPredictRisks(mlInputs);

  // Build ML context string for the LLM prompt
  const mlPredictionsSummary = input.supplyChain.nodes.map((n, i) => {
    const p = mlPredictions[i];
    return `  - ${n.id} "${n.name}": ML Predicted → Geo=${p.geopolitical_risk}, Climate=${p.climate_risk}, Cyber=${p.cyber_risk}, Transport=${p.transport_risk}`;
  }).join('\n');

  // ── Step 2: LLM Agent Risk Assessment ───────────────────────
  const nodesSummary = input.supplyChain.nodes.map(n => {
    const loc = n.metadata?.location || 'Unknown';
    const coords = n.metadata?.coordinates
      ? `(${n.metadata.coordinates.lat}, ${n.metadata.coordinates.lng})`
      : '';
    return `- ${n.id}: "${n.name}" | Type: ${n.type} | Location: ${loc} ${coords}`;
  }).join('\n');

  // Use playbook summary for context (token-efficient)
  const playbookContext = getPlaybookSummary();

  const outputSchema = z.object({
    results: z.array(RiskScanResultSchema),
  });

  const structuredLlm = llm.withStructuredOutput(outputSchema);

  const prompt = `You are a world-class supply chain risk intelligence analyst. Your job is to assess the real-world risks facing each node in a supply chain based on its GEOGRAPHIC LOCATION and TYPE.

You have TWO sources of intelligence:

1. ML RISK MODEL PREDICTIONS (trained on global risk data):
${mlPredictionsSummary}

2. PLAYBOOK CATEGORIES TO CONSIDER:
${playbookContext}

SUPPLY CHAIN NODES:
${nodesSummary}

IMPORTANT INSTRUCTIONS:
- You must BLEND the ML model predictions with your own geopolitical knowledge. The ML model provides a data-driven baseline; you add nuance, current events context, and domain expertise.
- Use the ML predictions as a starting point, but adjust scores based on your knowledge of current world events and specific risk factors.
- Score each risk 0-10 (0 = negligible, 10 = extreme immediate threat).
- Only include risks that score 3 or higher.
- The "headline" should be 2-5 words identifying the risk.
- The "explanation" MUST be written for a startup founder with ZERO supply chain experience. Use simple language, no jargon.
- The "recommended_action" MUST be a specific, actionable step drawn DIRECTLY from the Playbook context if possible.
- The "overall_risk" for each node should be the WEIGHTED AVERAGE of its individual risk scores.
- Return results for EVERY node in the chain.`;

  console.log(`   🔍 Scanning supply chain risks (hybrid ML + LLM)...`);
  const llmResponse = await structuredLlm.invoke(prompt);

  // ── Step 3: Blend ML and LLM Results ────────────────────────
  // Weighted average: 40% ML model, 60% LLM assessment
  const blendedResults = llmResponse.results.map((llmResult, idx) => {
    const mlPred = mlPredictions[idx];
    if (!mlPred) return llmResult;

    // Blend the overall risk score
    const llmOverall = llmResult.overall_risk;
    const mlOverall = (mlPred.geopolitical_risk + mlPred.climate_risk + mlPred.cyber_risk + mlPred.transport_risk) / 4;
    const blendedOverall = Math.round((0.6 * llmOverall + 0.4 * mlOverall) * 10) / 10;

    // Blend individual risk scores where categories match
    const blendedRisks = llmResult.risks.map(risk => {
      let mlScore = 0;
      if (risk.category === 'geopolitical') mlScore = mlPred.geopolitical_risk;
      else if (risk.category === 'climate') mlScore = mlPred.climate_risk;
      else if (risk.category === 'cyber') mlScore = mlPred.cyber_risk;
      else if (risk.category === 'transport') mlScore = mlPred.transport_risk;
      else return risk; // No ML counterpart for this category

      const blendedScore = Math.round((0.6 * risk.score + 0.4 * mlScore) * 10) / 10;
      return { ...risk, score: blendedScore };
    });

    return {
      ...llmResult,
      overall_risk: blendedOverall,
      risks: blendedRisks,
    };
  });

  return { results: blendedResults };
}
