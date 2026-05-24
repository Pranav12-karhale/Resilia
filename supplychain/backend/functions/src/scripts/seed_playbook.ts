import { initVectorStore } from '../utils/vector_store.js';
import { DISRUPTION_PLAYBOOK } from '../flows/disruption_playbook.js';
import { Document } from '@langchain/core/documents';

async function seed() {
  console.log("Seeding playbook into Vector DB...");

  // Split playbook by sections and subsections
  const docs: Document[] = [];
  
  const sections = DISRUPTION_PLAYBOOK.split(/(?=SECTION \d+ —)/);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    // Extract section title
    const sectionMatch = section.match(/(SECTION \d+ — [^\n]+)/);
    const sectionTitle = sectionMatch ? sectionMatch[1] : 'Unknown Section';
    
    // Split into subsections (e.g. 1.1 Wars and Military Conflicts)
    const subsections = section.split(/(?=\n\d+\.\d+ )/);
    
    for (let i = 0; i < subsections.length; i++) {
      const sub = subsections[i].trim();
      if (!sub) continue;
      
      // If it's just the section header with no content, skip it
      if (sub === sectionTitle.trim()) continue;

      docs.push(new Document({
        pageContent: sub,
        metadata: {
          section: sectionTitle,
          source: "disruption_playbook",
        }
      }));
    }
  }

  console.log(`Prepared ${docs.length} documents. Indexing to Chroma...`);
  await initVectorStore(docs);
  console.log("Done seeding Vector DB.");
}

seed().catch(console.error);
