# Adaptive Supply Chain Platform (Resilia)

![AI orchestration](https://img.shields.io/badge/AI-LangGraph%20%2B%20LangChain-2f80ed)
![Realtime](https://img.shields.io/badge/realtime-Firestore%20%2B%20SSE-2f8f62)
![Risk model](https://img.shields.io/badge/risk-TensorFlow.js-d99028)
![Client](https://img.shields.io/badge/client-Flutter-53677f)

Resilia is an AI-powered dynamic supply chain platform for mapping, analyzing, and self-healing complex logistics networks. It combines a Flutter client, Firestore realtime synchronization, LangGraph multi-agent orchestration, and a TensorFlow.js risk model to turn a business brief into an inspectable supply chain graph with predictive disruption intelligence.

![Animated adaptive flow](resilia-flow.svg)

## Explore

- [System overview](#system-overview)
- [Interactive workflows](#interactive-workflows)
- [Agentic ML pipeline](#agentic-ml-pipeline)
- [Risk intelligence engine](#risk-intelligence-engine)
- [Realtime collaboration loop](#realtime-collaboration-loop)
- [Tech stack](#tech-stack)
- [API surface](#api-surface)
- [Data model](#data-model)

## System Overview

```mermaid
flowchart TD
    User["User"] --> Flutter["Flutter App<br/>maps, dashboards, controls"]
    Flutter -->|HTTP POST| API["Express API<br/>secure orchestration layer"]
    Flutter <-->|Firestore snapshots| Firestore[("Cloud Firestore<br/>chains, nodes, edges, risks")]
    API -->|stream node states| SSE["Server-Sent Events"]
    SSE --> Flutter
    API --> LangGraph["LangGraph Workflow"]
    LangGraph --> Agents["6 Specialized Agents"]
    Agents --> RiskModel["TensorFlow.js<br/>Risk Model"]
    Agents --> Playbook["Disruption Playbook<br/>40+ risk types"]
    Agents --> Firestore
    RiskModel --> Agents
    Playbook --> Agents

    classDef client fill:#e7f2ff,stroke:#2f80ed,color:#162033,stroke-width:2px
    classDef api fill:#f0eaff,stroke:#7a4ed9,color:#162033,stroke-width:2px
    classDef ai fill:#fff3df,stroke:#d99028,color:#162033,stroke-width:2px
    classDef data fill:#e8f7ef,stroke:#2f8f62,color:#162033,stroke-width:2px

    class User,Flutter client
    class API,SSE api
    class LangGraph,Agents,RiskModel,Playbook ai
    class Firestore data
```

Resilia uses a decoupled realtime architecture:

| Layer | Responsibility | Key Technologies |
|---|---|---|
| Client | User interaction, maps, graph exploration, live AI progress | Flutter, Provider, `flutter_map`, `fl_chart` |
| API | Secure orchestration, streamed workflow execution, risk and mitigation endpoints | Node.js, TypeScript, Express.js, SSE |
| Intelligence | Multi-agent reasoning, disruption analysis, ML scoring, route planning | LangGraph, LangChain, TensorFlow.js |
| Data | Shared supply chain graph state and risk metadata | Cloud Firestore |
| Observability | AI traces and request logs | LangSmith, Winston, Morgan |

## Interactive Workflows

<details open>
<summary><strong>Workflow 1: Generate a supply chain</strong></summary>

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant C as Flutter Client
    participant A as Express API
    participant G as LangGraph
    participant F as Firestore

    U->>C: Submit business idea
    C->>A: POST /api/generate-stream
    A->>G: Start agent graph
    loop Stream every agent state
        G-->>A: Node started / completed
        A-->>C: SSE progress event
    end
    G->>F: Persist generated nodes and edges
    F-->>C: Snapshot update
    C-->>U: Render live supply chain map
```

</details>

<details>
<summary><strong>Workflow 2: Scan risk across the chain</strong></summary>

```mermaid
flowchart LR
    Chain["Existing chain graph"] --> Features["Feature builder<br/>node type, coordinates, industry"]
    Features --> ML["TensorFlow.js inference"]
    Chain --> LLM["LLM risk assessment<br/>playbook grounded"]
    ML --> Blend["Weighted blend<br/>40% ML + 60% LLM"]
    LLM --> Blend
    Blend --> Report["Risk report<br/>geopolitical, climate, cyber, transport"]
    Report --> UI["Flutter risk dashboard"]

    classDef source fill:#e7f2ff,stroke:#2f80ed,color:#162033
    classDef model fill:#fff3df,stroke:#d99028,color:#162033
    classDef output fill:#e8f7ef,stroke:#2f8f62,color:#162033
    class Chain,Features source
    class ML,LLM,Blend model
    class Report,UI output
```

</details>

<details>
<summary><strong>Workflow 3: Self-heal a disruption</strong></summary>

```mermaid
stateDiagram-v2
    [*] --> Monitoring
    Monitoring --> DisruptionDetected: signal crosses threshold
    DisruptionDetected --> ImpactAnalysis: identify blocked nodes and lanes
    ImpactAnalysis --> MitigationPlanning: query playbook and risk model
    MitigationPlanning --> HumanReview: propose alternate routing
    HumanReview --> ApplyPlan: approve
    HumanReview --> MitigationPlanning: refine
    ApplyPlan --> FirestoreSync: update graph metadata
    FirestoreSync --> Monitoring
```

</details>

<details>
<summary><strong>Workflow 4: Keep every client synchronized</strong></summary>

```mermaid
sequenceDiagram
    participant A as AI/API
    participant F as Firestore
    participant C1 as Client A
    participant C2 as Client B
    participant C3 as Client C

    A->>F: Write chain, risk, or mitigation update
    par Snapshot listeners
        F-->>C1: Updated graph document
        F-->>C2: Updated graph document
        F-->>C3: Updated graph document
    end
    C1->>C1: Repaint map and charts
    C2->>C2: Repaint map and charts
    C3->>C3: Repaint map and charts
```

</details>

## Agentic ML Pipeline

```mermaid
flowchart LR
    Start(("User request")) --> A1["Agent 1<br/>Business Analyzer"]
    A1 --> A15["Agent 1.5<br/>Risk Anticipator"]
    A15 --> A2["Agent 2<br/>Chain Architect"]
    A2 --> A25["Agent 2.5<br/>ML Risk Scorer"]
    A25 --> A3["Agent 3<br/>UI Config Generator"]
    A3 --> A4["Agent 4<br/>Assembler"]
    A4 --> End(("Supply chain model"))

    classDef start fill:#e7f2ff,stroke:#2f80ed,color:#162033,stroke-width:2px
    classDef agent fill:#fff3df,stroke:#d99028,color:#162033,stroke-width:2px
    classDef output fill:#e8f7ef,stroke:#2f8f62,color:#162033,stroke-width:2px

    class Start start
    class A1,A15,A2,A25,A3,A4 agent
    class End output
```

| Agent | Purpose | Output |
|---|---|---|
| Agent 1: Business Analyzer | Converts the business idea into logistical components | Requirements, assumptions, operational scope |
| Agent 1.5: Risk Anticipator | Applies the disruption playbook before graph design | Macro-risk context and constraints |
| Agent 2: Chain Architect | Designs real-world nodes, routes, and coordinates | Supply chain graph draft |
| Agent 2.5: ML Risk Scorer | Runs TensorFlow.js inference on every node | Predictive risk scores |
| Agent 3: UI Config Generator | Builds dynamic node-page configuration | Dashboard-ready component metadata |
| Agent 4: Assembler | Merges all agent outputs into one model | Final enriched supply chain graph |

## Risk Intelligence Engine

```mermaid
flowchart TD
    subgraph Features["Input features"]
        NodeType["Node type<br/>15 one-hot values"]
        Geo["Latitude / longitude<br/>2 normalized values"]
        Industry["Industry category<br/>13 one-hot values"]
    end

    subgraph Network["TensorFlow.js neural network"]
        H1["Hidden layer 1<br/>64 units + ReLU"]
        H2["Hidden layer 2<br/>32 units + ReLU"]
        Dropout["Dropout regularization"]
    end

    subgraph Predictions["Risk predictions"]
        GeoRisk["Geopolitical"]
        ClimateRisk["Climate"]
        CyberRisk["Cyber"]
        TransportRisk["Transport"]
    end

    LLM["LLM assessment<br/>playbook grounded"]
    Final["Final report<br/>40% ML + 60% LLM"]

    NodeType --> H1
    Geo --> H1
    Industry --> H1
    H1 --> Dropout --> H2
    H2 --> GeoRisk
    H2 --> ClimateRisk
    H2 --> CyberRisk
    H2 --> TransportRisk
    GeoRisk --> Final
    ClimateRisk --> Final
    CyberRisk --> Final
    TransportRisk --> Final
    LLM --> Final

    classDef input fill:#e7f2ff,stroke:#2f80ed,color:#162033
    classDef model fill:#f0eaff,stroke:#7a4ed9,color:#162033
    classDef risk fill:#fff3df,stroke:#d99028,color:#162033
    classDef final fill:#e8f7ef,stroke:#2f8f62,color:#162033,stroke-width:2px

    class NodeType,Geo,Industry input
    class H1,H2,Dropout,LLM model
    class GeoRisk,ClimateRisk,CyberRisk,TransportRisk risk
    class Final final
```

The model is a 30 -> 64 -> 32 -> 4 neural network trained on 600+ synthetic samples derived from supply chain disruption knowledge. It scores four risk categories, then blends those scores with LLM assessment so the final report is both pattern-aware and context-aware.

## Realtime Collaboration Loop

```mermaid
flowchart LR
    Detect["Detect signal<br/>risk, delay, disruption"] --> Decide["Decide response<br/>agent workflow"]
    Decide --> Update["Update graph<br/>nodes, edges, metadata"]
    Update --> Sync["Sync clients<br/>Firestore snapshots"]
    Sync --> Observe["Observe outcomes<br/>dashboard + traces"]
    Observe --> Detect

    classDef loop fill:#e8f7ef,stroke:#2f8f62,color:#162033,stroke-width:2px
    class Detect,Decide,Update,Sync,Observe loop
```

## Tech Stack

| Area | Tools |
|---|---|
| Frontend | Flutter 3.5.0+, Provider |
| Realtime data | Firebase Firestore streams, Server-Sent Events |
| Maps and GIS | `flutter_map`, `latlong2`, `geolocator`, `geocoding` |
| Charts and UI motion | `fl_chart`, `shimmer`, `flutter_staggered_animations` |
| Backend | Node.js, TypeScript, Express.js |
| AI orchestration | LangGraph, LangChain |
| ML inference | TensorFlow.js |
| Knowledge base | Disruption playbook with 10 sections and 40+ risk types |
| Observability | LangSmith, Winston, Morgan |
| Database | Cloud Firestore |

## API Surface

| Endpoint | Purpose | Realtime behavior |
|---|---|---|
| `POST /api/generate-stream` | Generates a supply chain from a business prompt | Streams LangGraph progress via SSE |
| `POST /api/chains/:id/risk-scan` | Evaluates geopolitical, climate, cyber, and transport risk | Persists updated risk metadata to Firestore |
| `POST /api/chains/:id/disruptions/resolve` | Proposes mitigation plans and alternate routing | Updates the live chain graph after approval |

## Data Model

```mermaid
erDiagram
    SUPPLY_CHAIN ||--o{ NODE : contains
    SUPPLY_CHAIN ||--o{ EDGE : connects
    NODE ||--o{ RISK_SCORE : receives
    NODE ||--o{ UI_COMPONENT : renders
    SUPPLY_CHAIN ||--o{ DISRUPTION : tracks
    DISRUPTION ||--o{ MITIGATION_PLAN : resolves

    SUPPLY_CHAIN {
        string id
        string name
        string industry
        datetime updatedAt
    }

    NODE {
        string id
        string type
        float latitude
        float longitude
        string status
    }

    EDGE {
        string id
        string sourceNodeId
        string targetNodeId
        string routeMode
    }

    RISK_SCORE {
        float geopolitical
        float climate
        float cyber
        float transport
    }

    DISRUPTION {
        string id
        string severity
        string affectedNodeId
        string status
    }

    MITIGATION_PLAN {
        string id
        string strategy
        string confidence
        string approvalStatus
    }
```

## Suggested Project Structure

```text
resilia/
  app/
    lib/
      features/
      maps/
      dashboards/
  api/
    src/
      routes/
      workflows/
      agents/
      risk/
  shared/
    schemas/
    playbooks/
  docs/
    diagrams/
```

## Why This Architecture Works

- Streaming keeps users inside the generation process instead of waiting on a black-box AI response.
- Firestore snapshots make generated chains collaborative across every connected client.
- The ML model provides fast, repeatable node-level risk estimates.
- The LLM agents add context, mitigation reasoning, and playbook-grounded tradeoff analysis.
- The architecture separates mobile UI, orchestration, intelligence, and persistence so each layer can evolve independently.
