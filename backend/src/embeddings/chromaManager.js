'use strict';

const { CloudClient } = require('chromadb');

const COLLECTION_NAMES = {
  library: 'asu_library',
  recreation: 'asu_recreation',
  dining: 'asu_dining',
  ram_tram: 'asu_ram_tram',
  tutoring: 'asu_tutoring',
  calendar: 'asu_calendar',
  events: 'asu_events',
};

let client = null;

function getClient() {
  if (!client) {
    client = new CloudClient({
      apiKey:   process.env.CHROMA_API_KEY,
      tenant:   process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE || 'default_database',
    });
  }
  return client;
}

async function getOrCreateCollection(name) {
  const c = getClient();
  return await c.getOrCreateCollection({
    name,
    metadata: { 'hnsw:space': 'cosine' },
  });
}

// Returns { id -> document_text } map for all stored documents in a collection
async function getExistingPhrases(collectionName) {
  try {
    const collection = await getOrCreateCollection(collectionName);
    const result = await collection.get({});
    const map = {};
    if (result.ids) {
      result.ids.forEach((id, i) => {
        map[id] = result.documents[i];
      });
    }
    return map;
  } catch (err) {
    console.warn(`[chromaManager] Could not get phrases for ${collectionName}:`, err.message);
    return {};
  }
}

// documents: [{ id, text, embedding, metadata? }]
async function upsertDocuments(collectionName, documents) {
  if (!documents || documents.length === 0) return;
  const collection = await getOrCreateCollection(collectionName);
  await collection.upsert({
    ids: documents.map(d => d.id),
    embeddings: documents.map(d => d.embedding),
    documents: documents.map(d => d.text),
    metadatas: documents.map(d => d.metadata || {}),
  });
}

async function deleteDocuments(collectionName, ids) {
  if (!ids || ids.length === 0) return;
  const collection = await getOrCreateCollection(collectionName);
  await collection.delete({ ids });
}

async function query(collectionName, queryEmbedding, nResults = 5) {
  const collection = await getOrCreateCollection(collectionName);
  return await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
  });
}

module.exports = {
  COLLECTION_NAMES,
  getOrCreateCollection,
  getExistingPhrases,
  upsertDocuments,
  deleteDocuments,
  query,
};
