# Adaptive Supply Chain Platform (Resilia)

An AI-powered dynamic supply chain management application designed to map out, analyze, and self-heal complex global and domestic logistics networks. It leverages **LangGraph** and **LangChain** for multi-agent orchestration, a **TensorFlow.js ML Risk Model** trained on supply chain domain knowledge for predictive risk scoring, and provides **Real-Time** dashboard synchronization across all connected clients.

---

## 🛠 Tech Stack

### **Frontend (Mobile & Web App)**
- **Framework:** Flutter (v3.5.0+)
- **State Management:** Provider
- **Real-Time Data:** Firebase Firestore Streams (Snapshots) and Server-Sent Events (SSE).
- **Mapping & GIS:** `flutter_map` with `latlong2`, `geolocator`, and `geocoding` for coordinate mapping and live location tracing.
- **UI & Animations:** `fl_chart` for data visualization, `shimmer` & `flutter_staggered_animations` for premium loading states.

### **Backend (Microservices & Agentic AI)**
- **Runtime:** Node.js (TypeScript) & Express.js.
- **Agentic Orchestration:** **LangGraph** and **LangChain** for multi-stage AI reasoning workflows with 6 specialized agents.
- **ML Risk Model:** **TensorFlow.js** neural network trained on synthetic supply chain risk data for predictive risk scoring (geopolitical, climate, cyber, transport).
- **Disruption Playbook:** Comprehensive knowledge base injected directly into LLM prompts for deterministic, full-context reasoning.
- **Observability:** LangSmith (for AI tracing), Winston & Morgan (for request logging).

### **Cloud & Infrastructure**
- **Database:** Cloud Firestore (NoSQL) for real-time synchronization of supply chains and risk data.
- **Frontend Hosting:** AWS Amplify (Automated CI/CD for the Flutter Web build) backed by Amazon CloudFront.
- **Backend Hosting:** Container-ready (designed for AWS ECS / Google Cloud Run). No external database dependencies required.

---

## 🏗 Architecture

The platform follows a decoupled, real-time architecture with an agentic ML pipeline:

1. **Client Tier (Flutter App):**
   Handles all user interactions, UI state, and mapping logic. The application connects to Firestore directly via `cloud_firestore` to receive **instant, real-time updates** when a disruption occurs or is resolved. It also consumes Server-Sent Events (SSE) to display the live thoughts of the AI during generation.

2. **API Tier (Express + LangGraph):**
   Acts as the secure middleware and orchestrator.
   - `POST /api/generate-stream` - Streams LangGraph node execution states back to the client using SSE.
   - `POST /api/chains/:id/risk-scan` - Evaluates geopolitical, climate, and cyber risks using a hybrid ML model + LLM agent system.
   - `POST /api/chains/:id/disruptions/resolve` - Proposes intelligent alternative routing (mitigation plans) using the disruption playbook and ML risk predictions.

3. **Agentic ML Pipeline (6 Agents):**
   - **Agent 1 — Business Analyzer:** Analyzes business idea into logistical components using Gemini LLM.
   - **Agent 1.5 — Risk Anticipator:** Anticipates macro risks using the full disruption playbook (10 sections, 40+ risk types).
   - **Agent 2 — Chain Architect:** Designs the supply chain graph with real-world nodes and coordinates.
   - **Agent 2.5 — ML Risk Scorer:** Runs TensorFlow.js neural network inference to predict risk scores for each node.
   - **Agent 3 — UI Config Generator:** Generates dynamic UI component configurations for each node page.
   - **Agent 4 — Assembler:** Combines all agent outputs into the final supply chain with enriched metadata.

4. **Data Tier (Firestore):**
   Stores the actual generated graphs (nodes/edges). Flutter listens to changes on these documents to achieve a real-time, multi-device synchronized experience.

---

## 🧠 ML Risk Model

The platform includes a trained **TensorFlow.js** neural network for predictive risk scoring:

- **Architecture:** 3-layer neural network (30 → 64 → 32 → 4) with ReLU activation, dropout regularization, and sigmoid output.
- **Input Features (30):** Node type (15 one-hot), latitude/longitude (2 normalized), industry category (13 one-hot).
- **Output (4 risk scores):** Geopolitical, Climate, Cyber, Transport — each scored 0-10.
- **Training Data:** 600+ synthetic samples generated from the disruption playbook's domain knowledge, covering 35+ global risk zones.
- **Hybrid Scoring:** ML predictions are blended with LLM assessments (40% ML, 60% LLM) for the final risk report.

---

## 🚀 Local Development Setup

### **Prerequisites**
1. Node.js (v18+) and npm installed.
2. Flutter SDK installed.

### **1. Environment Configuration**
Create a `.env` file in the `backend/functions` directory:
```env
GOOGLE_GENAI_API_KEY="your_gemini_api_key_here"
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY="your_langsmith_api_key"
LANGCHAIN_PROJECT="Resilia"
```

### **2. Install Dependencies**
```bash
cd backend/functions
npm install
```

### **3. Train the ML Risk Model**
Train the TensorFlow.js risk model (generates saved weights):
```bash
npm run train-model
```

### **4. Running the Backend**
```bash
npm run dev
```

### **5. Running the Frontend (Flutter)**
Start the Flutter app locally pointing to your local backend.

```bash
cd flutter_app
flutter clean
flutter pub get
flutter run -d chrome
```

---

## 🌍 Production Deployment

### **Frontend (AWS Amplify)**
The Flutter web application is configured to deploy automatically via **AWS Amplify**. 
An `amplify.yml` build specification is included in the repository root.

**Steps:**
1. Go to the AWS Amplify Console.
2. Connect your Git repository.
3. Amplify will automatically detect the `amplify.yml` and set up continuous deployment.
4. Your app will be served globally via Amazon CloudFront.

### **Backend (Cloud Run / AWS ECS)**
The backend is containerized with Docker and requires no external database services.

1. Push the `backend/` Docker image to Amazon ECR or Google Artifact Registry.
2. Deploy the container to Google Cloud Run or AWS Fargate.
3. The ML model is trained and embedded during the Docker build process.
4. Update the Flutter `ApiService.dart` to point to your new production backend URL.
