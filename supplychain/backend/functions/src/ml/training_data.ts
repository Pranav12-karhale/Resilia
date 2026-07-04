/**
 * training_data.ts
 * 
 * Generates synthetic training data for the supply chain risk ML model.
 * Data is derived from domain knowledge in the disruption playbook:
 *   - Geopolitical risk zones (wars, sanctions, instability)
 *   - Climate-vulnerable regions (floods, earthquakes, droughts)
 *   - Cyber risk corridors (ransomware-prone infrastructure)
 *   - Transport bottleneck zones (port congestion, canal chokepoints)
 * 
 * Each sample maps (nodeType, latitude, longitude, industry) → (geo, climate, cyber, transport) risk scores.
 */

//Node type encoding
export const NODE_TYPES = [
  'supplier', 'manufacturer', 'processor', 'warehouse', 'distributor',
  'retailer', 'quality_control', 'customs', 'logistics', 'packaging',
  'cold_storage', 'fulfillment_center', 'last_mile_delivery', 'returns_center',
  'raw_material_source',
] as const;

export const INDUSTRY_CATEGORIES = [
  'agriculture', 'electronics', 'automotive', 'pharmaceutical', 'textiles',
  'food_beverage', 'chemicals', 'energy', 'mining', 'consumer_goods',
  'aerospace', 'construction', 'general',
] as const;

export type NodeTypeKey = typeof NODE_TYPES[number];
export type IndustryKey = typeof INDUSTRY_CATEGORIES[number];

export interface TrainingSample {
  // Input features
  nodeType: NodeTypeKey;
  lat: number;
  lng: number;
  industry: IndustryKey;
  // Output labels (0-10 scale)
  geopolitical_risk: number;
  climate_risk: number;
  cyber_risk: number;
  transport_risk: number;
}

//Risk Zone Definitions (derived from playbook)

interface RiskZone {
  name: string;
  latRange: [number, number];
  lngRange: [number, number];
  geopolitical: number;
  climate: number;
  cyber: number;
  transport: number;
}

/**
 * Risk zones mapped from the disruption playbook's domain knowledge.
 * Playbook Sections 1 (Geopolitical), 2 (Climate), 3 (Transport), 5 (Cyber)
 * inform these geographic risk profiles.
 */
const RISK_ZONES: RiskZone[] = [
  //HIGH GEOPOLITICAL RISK
  // Section 1.1: Wars and Military Conflicts — active conflict zones
  { name: 'Ukraine/Eastern Europe', latRange: [44, 52], lngRange: [22, 40], geopolitical: 9.0, climate: 3.5, cyber: 6.5, transport: 8.0 },
  { name: 'Middle East — Yemen/Iraq', latRange: [12, 37], lngRange: [35, 50], geopolitical: 8.5, climate: 5.0, cyber: 4.0, transport: 6.5 },
  { name: 'Horn of Africa', latRange: [-2, 15], lngRange: [32, 52], geopolitical: 7.5, climate: 7.0, cyber: 3.0, transport: 7.0 },
  // Section 1.2/1.3: Trade Wars, Sanctions
  { name: 'Russia', latRange: [50, 70], lngRange: [30, 180], geopolitical: 8.0, climate: 4.0, cyber: 7.0, transport: 5.5 },
  { name: 'Iran', latRange: [25, 40], lngRange: [44, 63], geopolitical: 7.5, climate: 5.5, cyber: 4.5, transport: 5.0 },
  { name: 'North Korea', latRange: [37, 43], lngRange: [124, 131], geopolitical: 9.5, climate: 3.0, cyber: 8.0, transport: 9.0 },
  // Section 1.5: Political Instability
  { name: 'Venezuela', latRange: [1, 12], lngRange: [-73, -60], geopolitical: 7.0, climate: 4.0, cyber: 3.5, transport: 6.0 },
  { name: 'Myanmar', latRange: [10, 28], lngRange: [92, 101], geopolitical: 7.5, climate: 5.5, cyber: 3.0, transport: 6.5 },

  //HIGH CLIMATE RISK
  // Section 2.1: Earthquakes, Floods, Hurricanes
  { name: 'Bangladesh/Bay of Bengal', latRange: [20, 27], lngRange: [88, 93], geopolitical: 3.0, climate: 9.0, cyber: 2.5, transport: 6.0 },
  { name: 'Caribbean', latRange: [10, 25], lngRange: [-85, -60], geopolitical: 2.5, climate: 8.5, cyber: 3.0, transport: 5.5 },
  { name: 'Japan — Earthquake Zone', latRange: [30, 46], lngRange: [128, 146], geopolitical: 1.0, climate: 8.0, cyber: 2.0, transport: 2.0 },
  { name: 'Philippines', latRange: [5, 20], lngRange: [117, 127], geopolitical: 3.0, climate: 8.5, cyber: 3.5, transport: 5.0 },
  // Section 2.2: Droughts
  { name: 'Sub-Saharan Africa', latRange: [-10, 15], lngRange: [-18, 40], geopolitical: 5.5, climate: 8.0, cyber: 2.5, transport: 7.0 },
  { name: 'Australia — Outback', latRange: [-35, -20], lngRange: [115, 155], geopolitical: 0.5, climate: 7.0, cyber: 1.5, transport: 4.0 },

  //HIGH TRANSPORT RISK
  // Section 3.1-3.2: Port Congestion, Canal Blockages
  { name: 'Suez Canal Zone', latRange: [29, 32], lngRange: [32, 34], geopolitical: 5.0, climate: 3.0, cyber: 3.0, transport: 9.0 },
  { name: 'Panama Canal Zone', latRange: [7, 10], lngRange: [-80, -79], geopolitical: 2.0, climate: 4.5, cyber: 2.5, transport: 8.5 },
  { name: 'Strait of Malacca', latRange: [1, 7], lngRange: [99, 105], geopolitical: 3.0, climate: 4.0, cyber: 3.0, transport: 7.5 },
  // Section 3.5: Rail/Road Infrastructure
  { name: 'Central Asia', latRange: [35, 50], lngRange: [50, 80], geopolitical: 5.0, climate: 4.5, cyber: 3.5, transport: 7.5 },

  //HIGH CYBER RISK
  //Section 5.1-5.5: Ransomware, IT failures, chip shortages
  { name: 'Taiwan — Semiconductor Hub', latRange: [22, 25], lngRange: [120, 122], geopolitical: 6.5, climate: 4.5, cyber: 7.5, transport: 3.0 },

  //LOW RISK ZONES (stable, developed economies)
  { name: 'Western Europe', latRange: [43, 60], lngRange: [-10, 15], geopolitical: 1.0, climate: 2.5, cyber: 2.0, transport: 1.5 },
  { name: 'Scandinavia', latRange: [55, 71], lngRange: [5, 30], geopolitical: 0.5, climate: 2.0, cyber: 1.0, transport: 2.0 },
  { name: 'USA — Midwest', latRange: [36, 48], lngRange: [-100, -80], geopolitical: 0.5, climate: 3.5, cyber: 2.0, transport: 1.5 },
  { name: 'USA — West Coast', latRange: [32, 49], lngRange: [-125, -115], geopolitical: 0.5, climate: 5.0, cyber: 2.0, transport: 2.5 },
  { name: 'USA — East Coast', latRange: [25, 45], lngRange: [-82, -70], geopolitical: 0.5, climate: 4.0, cyber: 2.0, transport: 2.0 },
  { name: 'Canada', latRange: [45, 60], lngRange: [-130, -55], geopolitical: 0.5, climate: 3.0, cyber: 1.5, transport: 2.5 },
  { name: 'South Korea', latRange: [33, 38], lngRange: [126, 130], geopolitical: 3.0, climate: 3.0, cyber: 2.5, transport: 2.0 },
  { name: 'Singapore', latRange: [1, 2], lngRange: [103, 104], geopolitical: 0.5, climate: 2.5, cyber: 1.0, transport: 1.5 },
  { name: 'New Zealand', latRange: [-47, -34], lngRange: [166, 179], geopolitical: 0.5, climate: 3.5, cyber: 1.0, transport: 3.5 },

  //MODERATE RISK ZONES
  { name: 'China — Eastern Seaboard', latRange: [22, 40], lngRange: [110, 123], geopolitical: 4.5, climate: 4.0, cyber: 5.0, transport: 3.0 },
  { name: 'India', latRange: [8, 35], lngRange: [68, 90], geopolitical: 3.5, climate: 6.0, cyber: 4.0, transport: 5.0 },
  { name: 'Brazil', latRange: [-33, 5], lngRange: [-74, -35], geopolitical: 2.5, climate: 5.0, cyber: 3.0, transport: 4.5 },
  { name: 'Mexico', latRange: [14, 33], lngRange: [-118, -86], geopolitical: 4.0, climate: 4.5, cyber: 3.5, transport: 4.0 },
  { name: 'Turkey', latRange: [36, 42], lngRange: [26, 45], geopolitical: 5.0, climate: 4.5, cyber: 3.5, transport: 3.5 },
  { name: 'South Africa', latRange: [-35, -22], lngRange: [16, 33], geopolitical: 4.0, climate: 4.0, cyber: 3.5, transport: 4.5 },
  { name: 'Indonesia', latRange: [-8, 6], lngRange: [95, 141], geopolitical: 3.0, climate: 7.0, cyber: 3.5, transport: 5.5 },
  { name: 'Thailand', latRange: [5, 21], lngRange: [97, 106], geopolitical: 3.0, climate: 5.5, cyber: 3.0, transport: 3.5 },
  { name: 'Vietnam', latRange: [8, 23], lngRange: [102, 110], geopolitical: 2.5, climate: 6.5, cyber: 3.5, transport: 4.0 },
  { name: 'Nigeria', latRange: [4, 14], lngRange: [3, 15], geopolitical: 6.0, climate: 5.5, cyber: 4.5, transport: 6.5 },
  { name: 'Egypt', latRange: [22, 31], lngRange: [25, 35], geopolitical: 4.5, climate: 4.0, cyber: 3.5, transport: 4.0 },
];

//Industry Risk Modifiers (from playbook sections 4, 5, 7, 8)
const INDUSTRY_RISK_MODIFIERS: Record<IndustryKey, { geo: number; climate: number; cyber: number; transport: number }> = {
  agriculture: { geo: 0.0, climate: 2.0, cyber: -1.0, transport: 0.5 },
  electronics: { geo: 1.0, climate: 0.0, cyber: 3.0, transport: 1.0 },
  automotive: { geo: 0.5, climate: 0.0, cyber: 1.5, transport: 1.5 },
  pharmaceutical: { geo: 1.0, climate: 1.0, cyber: 2.0, transport: 1.5 },
  textiles: { geo: 0.5, climate: 0.5, cyber: -0.5, transport: 0.5 },
  food_beverage: { geo: 0.0, climate: 2.5, cyber: -0.5, transport: 1.0 },
  chemicals: { geo: 1.0, climate: 1.0, cyber: 1.0, transport: 2.0 },
  energy: { geo: 2.0, climate: 1.5, cyber: 2.5, transport: 1.5 },
  mining: { geo: 1.5, climate: 1.5, cyber: 0.5, transport: 2.0 },
  consumer_goods: { geo: 0.0, climate: 0.0, cyber: 0.5, transport: 0.5 },
  aerospace: { geo: 2.0, climate: 0.5, cyber: 3.0, transport: 1.0 },
  construction: { geo: 0.5, climate: 1.0, cyber: 0.0, transport: 1.5 },
  general: { geo: 0.0, climate: 0.0, cyber: 0.0, transport: 0.0 },
};

//Node Type Risk Modifiers (operational risk by node role)
const NODE_TYPE_RISK_MODIFIERS: Record<NodeTypeKey, { geo: number; climate: number; cyber: number; transport: number }> = {
  supplier: { geo: 1.0, climate: 0.5, cyber: 0.0, transport: 0.0 },
  manufacturer: { geo: 0.5, climate: 0.5, cyber: 1.0, transport: 0.0 },
  processor: { geo: 0.5, climate: 0.5, cyber: 0.5, transport: 0.0 },
  warehouse: { geo: 0.0, climate: 1.0, cyber: 0.5, transport: 0.5 },
  distributor: { geo: 0.0, climate: 0.0, cyber: 0.5, transport: 1.5 },
  retailer: { geo: 0.0, climate: 0.5, cyber: 1.0, transport: 0.5 },
  quality_control: { geo: 0.0, climate: 0.0, cyber: 0.5, transport: 0.0 },
  customs: { geo: 1.5, climate: 0.0, cyber: 0.5, transport: 1.0 },
  logistics: { geo: 0.5, climate: 0.5, cyber: 1.0, transport: 2.0 },
  packaging: { geo: 0.0, climate: 0.5, cyber: 0.0, transport: 0.5 },
  cold_storage: { geo: 0.0, climate: 1.5, cyber: 1.0, transport: 0.5 },
  fulfillment_center: { geo: 0.0, climate: 0.5, cyber: 1.5, transport: 1.0 },
  last_mile_delivery: { geo: 0.0, climate: 1.0, cyber: 0.5, transport: 2.0 },
  returns_center: { geo: 0.0, climate: 0.0, cyber: 0.5, transport: 0.5 },
  raw_material_source: { geo: 1.5, climate: 2.0, cyber: -0.5, transport: 1.0 },
};

//Helper Functions

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function addNoise(value: number, stddev: number): number {
  // Box-Muller transform for Gaussian noise
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return value + normal * stddev;
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function findZone(lat: number, lng: number): RiskZone | null {
  for (const zone of RISK_ZONES) {
    if (lat >= zone.latRange[0] && lat <= zone.latRange[1] &&
      lng >= zone.lngRange[0] && lng <= zone.lngRange[1]) {
      return zone;
    }
  }
  return null;
}

//Main Data Generator

/* Generates synthetic training data for the risk prediction model.
* Each sample combines:
*   1. Base risk from geographic zone (playbook geopolitical/climate mapping)
*   2. Industry risk modifier (playbook economic/regulatory context)
*   3. Node type risk modifier (operational risk)
*   4. Gaussian noise for regularization
*/
export function generateTrainingData(sampleCount: number = 600): TrainingSample[] {
  const samples: TrainingSample[] = [];
  const noiseStddev = 0.6;

  // Generate samples from known risk zones
  for (const zone of RISK_ZONES) {
    const samplesPerZone = Math.max(5, Math.floor(sampleCount / RISK_ZONES.length));

    for (let i = 0; i < samplesPerZone; i++) {
      const lat = randomInRange(zone.latRange[0], zone.latRange[1]);
      const lng = randomInRange(zone.lngRange[0], zone.lngRange[1]);
      const nodeType = NODE_TYPES[Math.floor(Math.random() * NODE_TYPES.length)];
      const industry = INDUSTRY_CATEGORIES[Math.floor(Math.random() * INDUSTRY_CATEGORIES.length)];

      const industryMod = INDUSTRY_RISK_MODIFIERS[industry];
      const nodeTypeMod = NODE_TYPE_RISK_MODIFIERS[nodeType];

      samples.push({
        nodeType,
        lat,
        lng,
        industry,
        geopolitical_risk: clamp(addNoise(zone.geopolitical + industryMod.geo * 0.5 + nodeTypeMod.geo * 0.3, noiseStddev), 0, 10),
        climate_risk: clamp(addNoise(zone.climate + industryMod.climate * 0.5 + nodeTypeMod.climate * 0.3, noiseStddev), 0, 10),
        cyber_risk: clamp(addNoise(zone.cyber + industryMod.cyber * 0.5 + nodeTypeMod.cyber * 0.3, noiseStddev), 0, 10),
        transport_risk: clamp(addNoise(zone.transport + industryMod.transport * 0.5 + nodeTypeMod.transport * 0.3, noiseStddev), 0, 10),
      });
    }
  }

  // Also add some random global locations to fill gaps
  const remainingSamples = Math.max(0, sampleCount - samples.length);
  for (let i = 0; i < remainingSamples; i++) {
    const lat = randomInRange(-60, 70);
    const lng = randomInRange(-180, 180);
    const nodeType = NODE_TYPES[Math.floor(Math.random() * NODE_TYPES.length)];
    const industry = INDUSTRY_CATEGORIES[Math.floor(Math.random() * INDUSTRY_CATEGORIES.length)];

    const zone = findZone(lat, lng);
    const baseGeo = zone ? zone.geopolitical : randomInRange(1, 5);
    const baseClimate = zone ? zone.climate : randomInRange(1, 5);
    const baseCyber = zone ? zone.cyber : randomInRange(1, 4);
    const baseTransport = zone ? zone.transport : randomInRange(1, 5);

    const industryMod = INDUSTRY_RISK_MODIFIERS[industry];
    const nodeTypeMod = NODE_TYPE_RISK_MODIFIERS[nodeType];

    samples.push({
      nodeType,
      lat,
      lng,
      industry,
      geopolitical_risk: clamp(addNoise(baseGeo + industryMod.geo * 0.5 + nodeTypeMod.geo * 0.3, noiseStddev), 0, 10),
      climate_risk: clamp(addNoise(baseClimate + industryMod.climate * 0.5 + nodeTypeMod.climate * 0.3, noiseStddev), 0, 10),
      cyber_risk: clamp(addNoise(baseCyber + industryMod.cyber * 0.5 + nodeTypeMod.cyber * 0.3, noiseStddev), 0, 10),
      transport_risk: clamp(addNoise(baseTransport + industryMod.transport * 0.5 + nodeTypeMod.transport * 0.3, noiseStddev), 0, 10),
    });
  }

  // Shuffle
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }

  return samples;
}

//Encodes a node type as a one-hot vector.
export function encodeNodeType(nodeType: string): number[] {
  const vector = new Array(NODE_TYPES.length).fill(0);
  const idx = NODE_TYPES.indexOf(nodeType as NodeTypeKey);
  if (idx >= 0) vector[idx] = 1;
  return vector;
}

//Encodes an industry category as a one-hot vector.
export function encodeIndustry(industry: string): number[] {
  const vector = new Array(INDUSTRY_CATEGORIES.length).fill(0);
  const idx = INDUSTRY_CATEGORIES.indexOf(industry as IndustryKey);
  if (idx >= 0) vector[idx] = 1;
  return vector;
}

//Normalizes latitude to [-1, 1] range.
export function normalizeLat(lat: number): number {
  return lat / 90;
}


//Normalizes longitude to [-1, 1] range.

export function normalizeLng(lng: number): number {
  return lng / 180;
}


//Converts a training sample into a feature vector for the model.
//Feature vector layout: [nodeType (15), lat (1), lng (1), industry (13)] = 30 features

export function sampleToFeatures(sample: TrainingSample): number[] {
  return [
    ...encodeNodeType(sample.nodeType),
    normalizeLat(sample.lat),
    normalizeLng(sample.lng),
    ...encodeIndustry(sample.industry),
  ];
}

//Converts a training sample into a label vector for the model.
//Label vector: [geopolitical, climate, cyber, transport] normalized to [0, 1]

export function sampleToLabels(sample: TrainingSample): number[] {
  return [
    sample.geopolitical_risk / 10,
    sample.climate_risk / 10,
    sample.cyber_risk / 10,
    sample.transport_risk / 10,
  ];
}

//Total number of input features.
export const FEATURE_COUNT = NODE_TYPES.length + 2 + INDUSTRY_CATEGORIES.length; // 15 + 2 + 13 = 30
