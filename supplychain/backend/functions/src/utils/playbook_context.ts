/**
 * playbook_context.ts
 * 
 * Provides deterministic access to the disruption playbook for direct 
 * injection into LLM prompts. Replaces the RAG vector store retrieval
 * with simple, reliable string operations.
 * 
 * The full playbook (~200 lines) is well within Gemini's context window
 * and provides more deterministic results since the LLM always sees 
 * the complete reference material.
 */

import { DISRUPTION_PLAYBOOK } from '../flows/disruption_playbook.js';

/**
 * Maps disruption event types to their corresponding playbook section numbers.
 */
const DISRUPTION_TYPE_TO_SECTION: Record<string, number[]> = {
  'geopolitical': [1],
  'climate': [2],
  'transport': [3],
  'economic': [4],
  'cyber': [5],
  'labor': [6],
  'regulatory': [7],
  'demand': [8],
  'structural': [9, 10],
};

/**
 * Returns the full disruption playbook text.
 * Use this when the LLM needs comprehensive context (e.g., risk anticipation).
 */
export function getFullPlaybook(): string {
  return DISRUPTION_PLAYBOOK;
}

/**
 * Returns specific playbook sections matching a disruption type.
 * Uses deterministic key-based lookup (not semantic search).
 * Falls back to full playbook if type is unknown.
 * 
 * @param disruptionType - One of: geopolitical, climate, transport, economic, cyber, labor, regulatory, demand, structural
 */
export function getPlaybookSection(disruptionType: string): string {
  const sectionNumbers = DISRUPTION_TYPE_TO_SECTION[disruptionType.toLowerCase()];
  
  if (!sectionNumbers) {
    // Unknown type — return full playbook so the LLM has all context
    return DISRUPTION_PLAYBOOK;
  }

  const sections: string[] = [];
  
  for (const sectionNum of sectionNumbers) {
    // Extract the section from the playbook text
    const sectionRegex = new RegExp(
      `(SECTION ${sectionNum} —[\\s\\S]*?)(?=SECTION \\d+ —|$)`,
      'i'
    );
    const match = DISRUPTION_PLAYBOOK.match(sectionRegex);
    if (match) {
      sections.push(match[1].trim());
    }
  }

  if (sections.length === 0) {
    return DISRUPTION_PLAYBOOK;
  }

  return sections.join('\n\n');
}

/**
 * Returns a condensed summary of the playbook for token-constrained prompts.
 * Includes section headers and key disruption types only.
 */
export function getPlaybookSummary(): string {
  return `DISRUPTION PLAYBOOK — KEY CATEGORIES:

1. GEOPOLITICAL: Wars, trade wars, sanctions, border disputes, political instability.
   → Mitigations: Geopolitical risk scoring, backup suppliers in neutral zones, sanctions screening, route diversification.

2. CLIMATE: Earthquakes, floods, hurricanes, droughts, wildfires, pandemics, extreme weather, sea level rise.
   → Mitigations: Business interruption insurance, 45-90 day safety stock buffers, geographically distributed warehouses, multi-source agricultural inputs.

3. TRANSPORT: Port congestion, canal blockages (Suez, Panama), driver shortages, airline cargo limits, rail/road failures, fuel spikes.
   → Mitigations: Multi-port distribution, alternative routing for chokepoints, 3+ carriers per region, sea-air hybrid backups, fuel hedging.

4. ECONOMIC: Currency volatility, credit freezes, supplier bankruptcy, inflation, demand concentration.
   → Mitigations: Currency hedging clauses, supply chain financing, supplier financial health scorecards, inflation indexing, no >50% single-country sourcing.

5. CYBER: Ransomware, IT/ERP failures, data breaches, AI errors, semiconductor shortages.
   → Mitigations: MFA and backup requirements for Tier 1 suppliers, graceful degradation, encrypted portals, human review gates, 60-120 day chip buffers.

6. LABOUR: Strikes, skilled shortages, mass absenteeism, brain drain, safety closures.
   → Mitigations: Cross-training for 30% absenteeism, automation of repetitive tasks, workforce retention tracking, safety mandate compliance.

7. REGULATORY: Export bans, customs delays, licensing changes, ESG compliance, food safety recalls.
   → Mitigations: Commodity watch lists, AEO status, proactive certification tracking, Tier 3 supply mapping, full traceability within 2 hours.

8. DEMAND: Bullwhip effect, panic buying, JIT failures, forecast errors, sudden trend shifts.
   → Mitigations: Collaborative demand planning with POS data sharing, purchase limits, hybrid JIT, statistical multi-input forecasting, demand sensing via social/search trends.

9-10. CASCADE & STRUCTURAL: Single-point failures, geographic concentration, hyper-specialization, opacity, supplier fragility.
   → Mitigations: Qualify secondary suppliers, safety stock for chokepoint closures (14 days), multi-port freight, <40% per country, annual sub-tier mapping.`;
}

/**
 * Returns playbook context optimized for risk anticipation.
 * Includes the most relevant sections based on industry and geography.
 */
export function getPlaybookForRiskAnticipation(industry: string, hasInternationalScope: boolean): string {
  // For risk anticipation, always include the full playbook since it's within context limits
  // and the LLM benefits from seeing all possible risk categories
  let context = getFullPlaybook();
  
  if (hasInternationalScope) {
    context += '\n\nNOTE: This supply chain has international scope. Pay special attention to Sections 1 (Geopolitical), 3 (Transport), and 7 (Regulatory) for cross-border risks.';
  }
  
  return context;
}
