'use strict';

const OpenAI = require('openai');

const MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;

let openai = null;

function getClient() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// Embeds an array of strings and returns float vectors in the same order
async function embedTexts(texts) {
  if (!texts || texts.length === 0) return [];
  const client = getClient();
  const results = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await client.embeddings.create({ model: MODEL, input: batch });
    // Sort by index to guarantee order matches input
    const sorted = response.data.sort((a, b) => a.index - b.index);
    results.push(...sorted.map(d => d.embedding));
  }

  return results;
}

module.exports = { embedTexts };
