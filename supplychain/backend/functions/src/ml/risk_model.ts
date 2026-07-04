// Architecture:Input (30 features) → Dense(64, relu) → Dropout(0.2) → Dense(32, relu) → Dense(4, sigmoid)

/* Input Features (30):
*   - Node type one-hot encoding (15 categories)
*   - Latitude normalized [-1, 1] (1)
*   - Longitude normalized [-1, 1] (1)
*   - Industry one-hot encoding (13 categories)
* /
 
/* Output (4 risk scores, 0-1 scaled, multiply by 10 for 0-10 range):
*   - Geopolitical risk
*   - Climate risk
*   - Cyber risk
*   - Transport risk
*/

import * as tf from '@tensorflow/tfjs';
import {
  generateTrainingData,
  sampleToFeatures,
  sampleToLabels,
  encodeNodeType,
  encodeIndustry,
  normalizeLat,
  normalizeLng,
  FEATURE_COUNT,
  NODE_TYPES,
  INDUSTRY_CATEGORIES,
  type TrainingSample,
} from './training_data.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_DIR = path.join(__dirname, 'saved_model');

export interface RiskPrediction {
  geopolitical_risk: number;
  climate_risk: number;
  cyber_risk: number;
  transport_risk: number;
}

let cachedModel: tf.LayersModel | null = null;

//model arch
export function createModel(): tf.LayersModel {
  const model = tf.sequential();

  //Input to Layer 1 (64 units, ReLU)
  model.add(tf.layers.dense({
    inputShape: [FEATURE_COUNT],
    units: 64,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));

  // Dropout for reducing overfitting
  model.add(tf.layers.dropout({ rate: 0.2 }));

  //Layer 2 (32 units, ReLU)
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));

  //Output Layer (4 risk scores, sigmoid for 0-1 range)
  model.add(tf.layers.dense({
    units: 4,
    activation: 'sigmoid',
  }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mse'],
  });

  return model;
}

//Training
//returns the trained model and training history.
export async function trainModel(options: {
  sampleCount?: number;
  epochs?: number;
  batchSize?: number;
  validationSplit?: number;
  verbose?: boolean;
} = {}): Promise<{ model: tf.LayersModel; history: tf.History }> {
  const {
    sampleCount = 600,
    epochs = 50,
    batchSize = 32,
    validationSplit = 0.2,
    verbose = true,
  } = options;

  if (verbose) console.log(`\n📊 Generating ${sampleCount} training samples...`);
  const samples = generateTrainingData(sampleCount);

  const features = samples.map(sampleToFeatures);
  const labels = samples.map(sampleToLabels);

  const xs = tf.tensor2d(features);
  const ys = tf.tensor2d(labels);

  if (verbose) {
    console.log(`   Input shape:  [${xs.shape}]`);
    console.log(`   Output shape: [${ys.shape}]`);
    console.log(`   Training with ${epochs} epochs, batch size ${batchSize}...\n`);
  }

  const model = createModel();

  const history = await model.fit(xs, ys, {
    epochs,
    batchSize,
    validationSplit,
    shuffle: true,
    callbacks: verbose ? {
      onEpochEnd: (epoch, logs) => {
        if ((epoch + 1) % 10 === 0 || epoch === 0) {
          console.log(`   Epoch ${epoch + 1}/${epochs} — loss: ${logs?.loss?.toFixed(4)} | val_loss: ${logs?.val_loss?.toFixed(4)}`);
        }
      },
    } : undefined,
  });

  //clean
  xs.dispose();
  ys.dispose();

  //cache
  cachedModel = model;

  return { model, history };
}

//Custom IOHandler to save a TF.js model locally
//required because @tensorflow/tfjs (pure JS) doesn't register file:// handlers
function createFileSaveHandler(dirPath: string): tf.io.IOHandler {
  return {
    async save(modelArtifacts: tf.io.ModelArtifacts): Promise<tf.io.SaveResult> {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      //model topo
      const modelJSON: any = {
        modelTopology: modelArtifacts.modelTopology,
        format: modelArtifacts.format,
        generatedBy: modelArtifacts.generatedBy,
        convertedBy: modelArtifacts.convertedBy,
        weightsManifest: [{
          paths: ['weights.bin'],
          weights: modelArtifacts.weightSpecs,
        }],
      };

      if (modelArtifacts.trainingConfig) {
        modelJSON.trainingConfig = modelArtifacts.trainingConfig;
      }

      //writing model.json
      fs.writeFileSync(
        path.join(dirPath, 'model.json'),
        JSON.stringify(modelJSON, null, 2)
      );

      //write weights
      if (modelArtifacts.weightData) {
        const weightData = modelArtifacts.weightData instanceof ArrayBuffer
          ? Buffer.from(modelArtifacts.weightData)
          : Buffer.from((modelArtifacts.weightData as ArrayBuffer[])[0]);
        fs.writeFileSync(path.join(dirPath, 'weights.bin'), weightData);
      }

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON',
        },
      };
    },
  };
}


//Custom IOHandler to load a TF.js model from the local filesystem.
function createFileLoadHandler(modelJsonPath: string): tf.io.IOHandler {
  return {
    async load(): Promise<tf.io.ModelArtifacts> {
      const modelJSON = JSON.parse(fs.readFileSync(modelJsonPath, 'utf-8'));
      const dirPath = path.dirname(modelJsonPath);

      const artifacts: tf.io.ModelArtifacts = {
        modelTopology: modelJSON.modelTopology,
        format: modelJSON.format,
        generatedBy: modelJSON.generatedBy,
        convertedBy: modelJSON.convertedBy,
        weightSpecs: modelJSON.weightsManifest?.[0]?.weights,
      };

      if (modelJSON.trainingConfig) {
        artifacts.trainingConfig = modelJSON.trainingConfig;
      }

      //read binary weights
      if (modelJSON.weightsManifest?.[0]?.paths) {
        const weightsPath = path.join(dirPath, modelJSON.weightsManifest[0].paths[0]);
        if (fs.existsSync(weightsPath)) {
          const buffer = fs.readFileSync(weightsPath);
          artifacts.weightData = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
          );
        }
      }

      return artifacts;
    },
  };
}

//save to disk-traned model
export async function saveModel(model: tf.LayersModel): Promise<void> {
  await model.save(createFileSaveHandler(MODEL_DIR));
  console.log(`✅ Model saved to ${MODEL_DIR}`);
}


//loads the model from disk
//falls back to creating and training a new model if no saved model exists
export async function loadModel(): Promise<tf.LayersModel> {
  if (cachedModel) return cachedModel;

  const modelPath = path.join(MODEL_DIR, 'model.json');

  if (fs.existsSync(modelPath)) {
    try {
      cachedModel = await tf.loadLayersModel(createFileLoadHandler(modelPath));
      console.log('🧠 ML Risk Model loaded from saved weights');
      return cachedModel;
    } catch (err: any) {
      console.warn(`⚠️ Failed to load saved model: ${err.message}. Training new model...`);
    }
  }

  // if no saved model found then train a new one in-memory
  console.log('🧠 No saved model found. Training new risk model in-memory...');
  const { model } = await trainModel({ verbose: false, epochs: 30, sampleCount: 400 });
  cachedModel = model;

  //save next time
  try {
    await saveModel(model);
  } catch (err: any) {
    console.warn(`⚠️ Could not save model: ${err.message}`);
  }

  return cachedModel;
}

//predict risk scores for a single node of supply chain
export async function predictRisks(input: {
  nodeType: string;
  lat: number;
  lng: number;
  industry: string;
}): Promise<RiskPrediction> {
  const model = await loadModel();

  //vector - featues
  const features = [
    ...encodeNodeType(input.nodeType),
    normalizeLat(input.lat),
    normalizeLng(input.lng),
    ...encodeIndustry(input.industry),
  ];

  const inputTensor = tf.tensor2d([features]);
  const prediction = model.predict(inputTensor) as tf.Tensor;
  const values = await prediction.data();

  //clean
  inputTensor.dispose();
  prediction.dispose();

  return {
    geopolitical_risk: Math.round(values[0] * 10 * 10) / 10,
    climate_risk: Math.round(values[1] * 10 * 10) / 10,
    cyber_risk: Math.round(values[2] * 10 * 10) / 10,
    transport_risk: Math.round(values[3] * 10 * 10) / 10,
  };
}

//Batch-predicts risk scores for multiple nodes.
//More efficient than calling predictRisks() in a loop.
export async function batchPredictRisks(inputs: Array<{
  nodeType: string;
  lat: number;
  lng: number;
  industry: string;
}>): Promise<RiskPrediction[]> {
  if (inputs.length === 0) return [];

  const model = await loadModel();

  const allFeatures = inputs.map(input => [
    ...encodeNodeType(input.nodeType),
    normalizeLat(input.lat),
    normalizeLng(input.lng),
    ...encodeIndustry(input.industry),
  ]);

  const inputTensor = tf.tensor2d(allFeatures);
  const prediction = model.predict(inputTensor) as tf.Tensor;
  const values = await prediction.data();

  //clean
  inputTensor.dispose();
  prediction.dispose();

  const results: RiskPrediction[] = [];
  for (let i = 0; i < inputs.length; i++) {
    results.push({
      geopolitical_risk: Math.round(values[i * 4 + 0] * 10 * 10) / 10,
      climate_risk: Math.round(values[i * 4 + 1] * 10 * 10) / 10,
      cyber_risk: Math.round(values[i * 4 + 2] * 10 * 10) / 10,
      transport_risk: Math.round(values[i * 4 + 3] * 10 * 10) / 10,
    });
  }

  return results;
}

//maps common industry strings to our model's industry categories
//This is a fuzzy mapper for LLM-generated industry names
export function mapIndustryToCategory(industry: string): string {
  const lower = industry.toLowerCase();

  if (lower.includes('agri') || lower.includes('farm') || lower.includes('crop')) return 'agriculture';
  if (lower.includes('electron') || lower.includes('semi') || lower.includes('chip') || lower.includes('tech')) return 'electronics';
  if (lower.includes('auto') || lower.includes('vehicle') || lower.includes('car')) return 'automotive';
  if (lower.includes('pharma') || lower.includes('drug') || lower.includes('medic') || lower.includes('health')) return 'pharmaceutical';
  if (lower.includes('textil') || lower.includes('cloth') || lower.includes('fashion') || lower.includes('apparel') || lower.includes('garment')) return 'textiles';
  if (lower.includes('food') || lower.includes('beverage') || lower.includes('drink') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('coffee') || lower.includes('tea') || lower.includes('bake')) return 'food_beverage';
  if (lower.includes('chem') || lower.includes('petro') || lower.includes('plastic')) return 'chemicals';
  if (lower.includes('energy') || lower.includes('oil') || lower.includes('gas') || lower.includes('solar') || lower.includes('wind') || lower.includes('nuclear')) return 'energy';
  if (lower.includes('min') || lower.includes('ore') || lower.includes('metal')) return 'mining';
  if (lower.includes('aero') || lower.includes('aviat') || lower.includes('space') || lower.includes('defense')) return 'aerospace';
  if (lower.includes('construct') || lower.includes('build') || lower.includes('cement') || lower.includes('lumber')) return 'construction';
  if (lower.includes('consumer') || lower.includes('retail') || lower.includes('ecommerce') || lower.includes('e-commerce')) return 'consumer_goods';

  return 'general';
}
