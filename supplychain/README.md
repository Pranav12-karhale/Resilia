# Adaptive Supply Chain Platform (Resilia)

An AI-powered dynamic supply chain management application designed to map out, analyze, and self-heal complex global and domestic logistics networks. It leverages **LangGraph** and **LangChain** to generate plausible supply chains based on business ideas and geographical constraints, utilizes a local **Chroma** Vector Database for RAG (Retrieval-Augmented Generation) with disruption playbooks, and provides **Real-Time** dashboard synchronization across all connected clients.

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
- **Agentic Orchestration:** **LangGraph** and **LangChain** for multi-stage AI reasoning workflows.
- **RAG & Vector Store:** **Chroma DB** (via Docker) running locally for semantic search over mitigation playbooks (`DISRUPTION_PLAYBOOK`).
- **Containerization:** Docker & `docker-compose` to orchestrate the Node backend, Vector Store, and background tasks.
- **Observability:** LangSmith (for AI tracing), Winston & Morgan (for request logging).

### **Cloud & Infrastructure**
- **Database:** Cloud Firestore (NoSQL) for real-time synchronization of supply chains and risk data.
- **Frontend Hosting:** AWS Amplify (Automated CI/CD for the Flutter Web build) backed by Amazon CloudFront.
- **Backend Hosting:** Container-ready (designed for AWS ECS / Google Cloud Run) given the Docker requirement.

---

## 🏗 Architecture

The platform follows a decoupled, real-time architecture:

1. **Client Tier (Flutter App):**
   Handles all user interactions, UI state, and mapping logic. The application connects to Firestore directly via `cloud_firestore` to receive **instant, real-time updates** when a disruption occurs or is resolved. It also consumes Server-Sent Events (SSE) to display the live thoughts of the AI during generation.

2. **API Tier (Express + LangGraph):**
   Acts as the secure middleware and orchestrator.
   - `POST /api/generate-stream` - Streams LangGraph node execution states back to the client using SSE.
   - `POST /api/chains/:id/risk-scan` - Evaluates geopolitical, climate, and cyber risks for nodes using Gemini.
   - `POST /api/chains/:id/disruptions/resolve` - Proposes intelligent alternative routing (mitigation plans) by performing RAG against Chroma DB.

3. **Data & Retrieval Tier (Chroma & Firestore):**
   - **Chroma DB:** Containerized vector database storing semantic embeddings of mitigation strategies.
   - **Firestore:** Stores the actual generated graphs (nodes/edges). Flutter listens to changes on these documents to achieve a real-time, multi-device synchronized experience.

---

## 🚀 Local Development Setup

Because the backend relies on a local Vector Database (Chroma), the backend must be run using Docker.

### **Prerequisites**
1. Docker Desktop installed and running.
2. Node.js (v18+) and npm installed.
3. Flutter SDK installed.

### **1. Environment Configuration**
Create a `.env` file in the `backend/functions` directory:
```env
GOOGLE_GENAI_API_KEY="your_gemini_api_key_here"
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY="your_langsmith_api_key"
LANGCHAIN_PROJECT="Resilia"
```

### **2. Running the Backend (Docker)**
The backend is fully containerized via `docker-compose`. This spins up both the Node.js Express server and the Chroma DB instance.

```bash
cd backend
docker-compose up --build
```

### **3. Seeding the Vector Database**
Once the backend is running, you need to populate Chroma with the disruption playbook embeddings for RAG to work. In a new terminal:
```bash
cd backend/functions
npx tsx src/scripts/seed_playbook.ts
```

### **4. Running the Frontend (Flutter)**
Start the Flutter app locally pointing to your Docker backend.

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
Because the backend now requires containerization (for Chroma DB), you must deploy the `docker-compose` setup to a container hosting service. 
*Note: This replaces the previous Firebase Cloud Functions deployment, which does not natively support persistent local Vector Databases.*

1. Push the `backend/` Docker image to Amazon ECR or Google Artifact Registry.
2. Deploy the container to Google Cloud Run or AWS Fargate.
3. Provision a managed Chroma DB or Pinecone instance if you prefer not to self-host the vector store.
4. Update the Flutter `ApiService.dart` to point to your new production backend URL.
