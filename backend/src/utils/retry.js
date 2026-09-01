// Retry utility function with exponential backoff
const retryWithBackoff = async (operation, operationName, maxRetries = 2, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        console.error(`❌ ${operationName} failed after ${maxRetries} attempts:`, error.message);
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s...
      console.warn(`⚠️ ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay/1000}s...`);
      console.warn(`   Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = { retryWithBackoff };
