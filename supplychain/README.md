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

---

## 🏗 Architecture

The platform follows a decoupled, real-time architecture with an agentic ML pipeline:

```mermaid
graph TD
    %% Styling
    classDef client fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,color:#000
    classDef api fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000
    classDef agents fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000
    classDef db fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000
    
    Client["📱 Client Tier (Flutter App)"]:::client
    API["⚙️ API Tier (Express + LangGraph)"]:::api
    Pipeline["🧠 Agentic ML Pipeline"]:::agents
    DB[("💾 Data Tier (Firestore)")]:::db

    Client -- "HTTP POST Requests" --> API
    API -- "Executes Workflow" --> Pipeline
    Pipeline -- "Reads / Writes Data" --> DB
    DB -- "Real-Time Document Sync" --> Client
    API -- "Server-Sent Events (SSE)" --> Client
```

1. **Client Tier (Flutter App):**
   Handles all user interactions, UI state, and mapping logic. The application connects to Firestore directly via `cloud_firestore` to receive **instant, real-time updates** when a disruption occurs or is resolved. It also consumes Server-Sent Events (SSE) to display the live thoughts of the AI during generation.

2. **API Tier (Express + LangGraph):**
   Acts as the secure middleware and orchestrator.
   - `POST /api/generate-stream` - Streams LangGraph node execution states back to the client using SSE.
   - `POST /api/chains/:id/risk-scan` - Evaluates geopolitical, climate, and cyber risks using a hybrid ML model + LLM agent system.
   - `POST /api/chains/:id/disruptions/resolve` - Proposes intelligent alternative routing (mitigation plans) using the disruption playbook and ML risk predictions.

3. **Data Tier (Firestore):**
   Stores the actual generated graphs (nodes/edges). Flutter listens to changes on these documents to achieve a real-time, multi-device synchronized experience.

---

## 🧠 Agentic ML Pipeline Workflow

The supply chain generation and risk scoring process is handled by a pipeline of 6 specialized agents.

```mermaid
graph LR
    classDef agent fill:#ffecb3,stroke:#ffb300,stroke-width:2px,color:#000
    classDef data fill:#bbdefb,stroke:#2196f3,stroke-width:2px,color:#000
    
    Start(("User<br/>Request")):::data --> A1
    A1["Agent 1<br/>Business Analyzer"]:::agent --> A1_5
    A1_5["Agent 1.5<br/>Risk Anticipator"]:::agent --> A2
    A2["Agent 2<br/>Chain Architect"]:::agent --> A2_5
    A2_5["Agent 2.5<br/>ML Risk Scorer"]:::agent --> A3
    A3["Agent 3<br/>UI Config Gen"]:::agent --> A4
    A4["Agent 4<br/>Assembler"]:::agent --> End(("Final Supply<br/>Chain Model")):::data
```

- **Agent 1 — Business Analyzer:** Analyzes business idea into logistical components using Gemini LLM.
- **Agent 1.5 — Risk Anticipator:** Anticipates macro risks using the full disruption playbook (10 sections, 40+ risk types).
- **Agent 2 — Chain Architect:** Designs the supply chain graph with real-world nodes and coordinates.
- **Agent 2.5 — ML Risk Scorer:** Runs TensorFlow.js neural network inference to predict risk scores for each node.
- **Agent 3 — UI Config Generator:** Generates dynamic UI component configurations for each node page.
- **Agent 4 — Assembler:** Combines all agent outputs into the final supply chain with enriched metadata.

---

## 🔬 ML Risk Model Engine

The platform includes a trained **TensorFlow.js** neural network for predictive risk scoring. The risk scores are blended with the LLM assessments (40% ML, 60% LLM) for the final risk report.

```mermaid
graph TD
    classDef input fill:#e0f7fa,stroke:#00bcd4,stroke-width:2px,color:#000
    classDef hidden fill:#ede7f6,stroke:#673ab7,stroke-width:2px,color:#000
    classDef output fill:#fce4ec,stroke:#e91e63,stroke-width:2px,color:#000
    classDef blend fill:#fff9c4,stroke:#fbc02d,stroke-width:2px,color:#000
    
    subgraph Input Features
        I1["Node Type<br/>(15 one-hot)"]:::input
        I2["Lat/Long<br/>(2 normalized)"]:::input
        I3["Industry Category<br/>(13 one-hot)"]:::input
    end
    
    subgraph Hidden Layers
        H1["Hidden Layer 1<br/>(64 units, ReLU)"]:::hidden
        H2["Hidden Layer 2<br/>(32 units, ReLU)"]:::hidden
    end
    
    subgraph Output Predictions
        O1["Geopolitical Risk"]:::output
        O2["Climate Risk"]:::output
        O3["Cyber Risk"]:::output
        O4["Transport Risk"]:::output
    end
    
    I1 --> H1
    I2 --> H1
    I3 --> H1
    
    H1 -->|Dropout Regularization| H2
    
    H2 -->|Sigmoid Activation| O1
    H2 -->|Sigmoid Activation| O2
    H2 -->|Sigmoid Activation| O3
    H2 -->|Sigmoid Activation| O4
    
    LLM["Agent 1.5 LLM Assessment"]:::blend
    Final["Final Risk Report<br/>(40% ML, 60% LLM)"]:::blend
    
    O1 --> Final
    O2 --> Final
    O3 --> Final
    O4 --> Final
    LLM --> Final
```

- **Architecture:** 3-layer neural network (30 → 64 → 32 → 4) with ReLU activation, dropout regularization, and sigmoid output.
- **Training Data:** 600+ synthetic samples generated from the disruption playbook's domain knowledge, covering 35+ global risk zones.
