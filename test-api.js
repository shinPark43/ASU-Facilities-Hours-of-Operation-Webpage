const http = require('http');

function testAPI(endpoint, description) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3001${endpoint}`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`\n✅ ${description}:`);
          console.log(JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          console.error(`❌ ${description} - Parse error:`, error.message);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ ${description} - Request error:`, error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.error(`❌ ${description} - Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function runTests() {
  console.log('🔍 Testing ASU Facilities API...\n');
  
  try {
    // Test all endpoints
    await testAPI('/api/facilities/library', 'Library Hours');
    await testAPI('/api/facilities/recreation', 'Recreation Hours');
    await testAPI('/api/facilities/dining', 'Dining Hours');
    await testAPI('/api/facilities', 'All Facilities');
    
    console.log('\n✅ All API tests completed successfully!');
  } catch (error) {
    console.error('\n❌ API tests failed:', error.message);
    process.exit(1);
  }
}

runTests(); 