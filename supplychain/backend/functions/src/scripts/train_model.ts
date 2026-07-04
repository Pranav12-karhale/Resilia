/**
 * train_model.ts
 * 
 * Script to train and save the ML risk scoring model.
 * Replaces the old `seed_playbook.ts` script.
 * 
 * Usage:
 *   npx tsx src/scripts/train_model.ts
 * 
 * This generates synthetic training data from the disruption playbook's 
 * domain knowledge and trains a TensorFlow.js neural network to predict 
 * risk scores for supply chain nodes.
 */

import { trainModel, saveModel, predictRisks } from '../ml/risk_model.js';

async function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║  🧠 Resilia ML Risk Model Training              ║
╚══════════════════════════════════════════════════╝
`);

  // Train the model
  const { model, history } = await trainModel({
    sampleCount: 600,
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    verbose: true,
  });

  // Save to disk
  await saveModel(model);

  // Run sample predictions to verify
  console.log('\n📍 Sample Predictions:');
  console.log('─'.repeat(70));

  const testCases = [
    { nodeType: 'supplier', lat: 48.8, lng: 2.3, industry: 'electronics', label: 'Supplier in Paris (Electronics)' },
    { nodeType: 'manufacturer', lat: 31.2, lng: 121.5, industry: 'automotive', label: 'Manufacturer in Shanghai (Automotive)' },
    { nodeType: 'warehouse', lat: 48.0, lng: 35.0, industry: 'food_beverage', label: 'Warehouse in Ukraine (Food)' },
    { nodeType: 'logistics', lat: 30.0, lng: 33.0, industry: 'energy', label: 'Logistics near Suez Canal (Energy)' },
    { nodeType: 'raw_material_source', lat: 23.0, lng: 88.0, industry: 'agriculture', label: 'Raw Material in Bangladesh (Agriculture)' },
    { nodeType: 'fulfillment_center', lat: 40.0, lng: -74.0, industry: 'consumer_goods', label: 'Fulfillment in NYC (Consumer Goods)' },
    { nodeType: 'manufacturer', lat: 23.5, lng: 121.0, industry: 'electronics', label: 'Manufacturer in Taiwan (Electronics)' },
  ];

  for (const tc of testCases) {
    const pred = await predictRisks(tc);
    console.log(`\n  ${tc.label}:`);
    console.log(`    Geopolitical: ${pred.geopolitical_risk.toFixed(1)}/10  |  Climate: ${pred.climate_risk.toFixed(1)}/10  |  Cyber: ${pred.cyber_risk.toFixed(1)}/10  |  Transport: ${pred.transport_risk.toFixed(1)}/10`);
  }

  console.log('\n' + '─'.repeat(70));
  console.log('✅ Training complete. Model ready for inference.\n');
}

main().catch(console.error);
