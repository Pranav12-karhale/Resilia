import { ChromaClient } from "chromadb";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";

const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004", // the recommended Gemini embedding model
});

let vectorStore: Chroma | null = null;

export async function getVectorStore() {
  if (vectorStore) return vectorStore;

  const collectionName = "disruption_playbook";

  // Check if collection exists, create vector store wrapper
  vectorStore = new Chroma(embeddings, {
    collectionName,
    url: chromaUrl,
  });

  return vectorStore;
}

export async function initVectorStore(docs: any[]) {
  const collectionName = "disruption_playbook";
  const client = new ChromaClient({ path: chromaUrl });
  
  try {
    await client.deleteCollection({ name: collectionName });
  } catch (e) {
    console.log("Collection does not exist or could not be deleted", e);
  }

  vectorStore = await Chroma.fromDocuments(docs, embeddings, {
    collectionName,
    url: chromaUrl,
  });

  return vectorStore;
}
