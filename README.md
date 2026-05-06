# Resilia -an Adaptive Supply Chain Platform.

An AI-powered dynamic supply chain management application designed to map out, analyze, and self-heal complex global and domestic logistics networks. Built for the Google Solution Challenge 2026, it leverages real-time AI to generate plausible supply chains based on business ideas and geographical constraints, identifies risks, and automates mitigation strategies.

---

## 🛠 Tech Stack

### **Frontend (Mobile & Web App)**
- **Framework:** Flutter (v3.5.0+)
- **State Management:** Provider
- **Mapping & GIS:** `flutter_map` with `latlong2`, `geolocator`, and `geocoding` for coordinate mapping and live location tracing.
- **UI & Animations:** `fl_chart` for data visualization, `shimmer` & `flutter_staggered_animations` for premium loading states and transitions, `animated_text_kit` for dynamic AI typing effects.
- **Backend Communication:** Standard `http` package, directly integrating with Firebase Auth & the custom Express/Genkit API.

### **Backend (Microservices & AI)**
- **Runtime:** Node.js (TypeScript) deployed via Render.
- **Framework:** Express.js 
- **AI / Generative Model Orchestration:** Google Genkit (`@genkit-ai/google-genai`) to interface with Gemini models (3.1 Pro / 1.5 Flash).
- **Validation:** Zod for robust AI output parsing and schema enforcement.

### **Infrastructure (Firebase)**
- **Authentication:** Firebase Authentication (Google Sign-In & Email/Password).
- **Database:** Cloud Firestore (NoSQL) for storing generated supply chains, risk reports, and user data.
- **Hosting / Deployment:** Firebase Hosting (for web) and Render (for backend Express API).

---

## 🏗 Architecture

The platform follows a decoupled, serverless client-server architecture:

1. **Client Tier (Flutter App):**
   Handles all user interactions, UI state, and mapping logic. The application dynamically adjusts to system themes (Light/Dark mode) and user location (for localized supply chain generation). It authenticates users directly with Firebase Auth.

2. **API Tier (Express on Firebase Functions):**
   Acts as the secure middleware between the client and the core AI engines. It authenticates requests using Firebase ID tokens and provides a RESTful API:
   - `POST /api/generate` - Constructs the supply chain based on prompt and origin/destination constraints.
   - `POST /api/chains/:id/risk-scan` - Evaluates geopolitical, climate, and cyber risks for nodes using Gemini.
   - `POST /api/chains/:id/disruptions/resolve` - Proposes intelligent alternative routing (mitigation plans) when nodes fail.

3. **AI Generation Tier (Google Genkit):**
   The backend implements an intelligent fallback mechanism (e.g., trying Gemini 3.1 Pro, falling back to Flash, with API key rotation) to ensure high availability and bypass rate limits. It relies on strictly defined Zod schemas to guarantee the AI responds with perfectly formatted JSON representing the supply chain graph (nodes and edges).

4. **Data Tier (Firestore):**
   Saves user-specific generated supply chains, historical data, and AI-generated risk reports.

---

## 🚀 Deployment Guide (GitHub to Firebase)

This project is architected to be deployed entirely on the **Firebase Free Tier (Spark Plan) and Render**.

### **Prerequisites**
1. Firebase Project.
2. Firebase CLI installed (`npm install -g firebase-tools`).
3. Flutter SDK installed.
4. Node.js (v18+) installed.

### **1. Environment Configuration**
Clone the repository and set up your environment variables.

**Backend (`backend/functions/.env`):**
```env
GOOGLE_GENAI_API_KEY="your_gemini_api_key_here"
FIREBASE_PROJECT_ID="your_firebase_project_id"
```

### **2. Deploying the Backend (Firebase Functions)**
The backend is an Express application wrapped inside a Firebase Cloud Function.

```bash
cd backend/functions
npm install
npm run build
firebase login
firebase deploy --only functions
```
*Note: Make sure to update the backend URL in your Flutter app to point to your deployed Firebase Function URL.*

### **3. Deploying the Frontend (Flutter Web)**

To deploy the Flutter application as a Progressive Web App (PWA) via Firebase Hosting:

1. Build the web app:
```bash
cd flutter_app
flutter clean
flutter pub get
flutter build web --release
```

2. Initialize Firebase Hosting (if not already done):
```bash
firebase init hosting
# Set the public directory to: build/web
# Configure as a single-page app: Yes
# Set up automatic builds and deploys with GitHub: (Optional, choose Yes for CI/CD)
```

3. Deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

### **4. Setting up GitHub Actions CI/CD (Optional)**
To automatically deploy your Flutter Web app and Firebase Functions when pushing to GitHub:
1. Run `firebase init hosting:github` in the project root.
2. Follow the prompts to authorize the Firebase CLI with your GitHub account.
3. This will generate a `.github/workflows` directory containing the deployment YAML files.

---

## 🧠 Core Workflows

- **Context-Aware Generation:** The AI determines whether a supply chain should be domestic or international based on user location. If a user provides an origin and destination, it calculates a specific linear route; otherwise, it maps out a local hub-and-spoke network.
- **Intelligent Fallbacks:** If the AI API fails or hits rate limits, the backend gracefully falls back to structured Mock Data, patching the geographical coordinates to ensure the frontend map doesn't break.
- **Risk Assessment:** The AI runs a separate, specialized prompt over all generated nodes to evaluate their specific geographical, political, and climate risks, returning an actionable mitigation report.
