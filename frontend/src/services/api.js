/**
 * API Service for ASU Facilities Hours
 * Handles all HTTP requests to the backend API
 */

// Configuration
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 10000, // 10 seconds
};

// Debug logging
console.log('🔧 API Configuration:', {
  envVar: process.env.REACT_APP_API_URL,
  finalURL: API_CONFIG.baseURL,
  timestamp: new Date().toISOString()
});

/**
 * Generic API request function with error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

/**
 * API functions for facility hours
 */
export const facilityAPI = {
  // Health check
  async checkHealth() {
    return apiRequest('/api/health');
  },

  // Get all facilities
  async getAllFacilities() {
    return apiRequest('/api/facilities');
  },

  // Get library hours
  async getLibraryHours() {
    const response = await apiRequest('/api/facilities/library');
    return response.data || {};
  },

  // Get recreation center hours
  async getRecreationHours() {
    const response = await apiRequest('/api/facilities/recreation');
    return response.data || {};
  },

  // Get dining hours
  async getDiningHours() {
    const response = await apiRequest('/api/facilities/dining');
    return response.data || {};
  },

  // Get any facility type hours
  async getFacilityHours(type) {
    const response = await apiRequest(`/api/facilities/${type}`);
    return response.data || {};
  },

  // Get recent scrape logs (for admin/debugging)
  async getScrapeLogs(limit = 10) {
    return apiRequest(`/api/facilities/logs/recent?limit=${limit}`);
  },
};

/**
 * Mock data fallback (for offline development)
 * This matches the structure expected by your existing components
 */
export const mockData = {
  library: {
    name: 'Porter Henderson Library',
    type: 'library',
    description: 'Academic resources, research support, and study spaces',
    website_url: 'https://www.angelo.edu/library/hours.php',
    sections: {
      'Main Library': {
        'Monday': '7:30 AM - 2:00 AM',
        'Tuesday': '7:30 AM - 2:00 AM',
        'Wednesday': '7:30 AM - 2:00 AM',
        'Thursday': '7:30 AM - 2:00 AM',
        'Friday': '7:30 AM - 6:00 PM',
        'Saturday': '10:00 AM - 6:00 PM',
        'Sunday': '12:00 PM - 2:00 AM',
      },
      'IT Desk': {
        'Monday': '8:00 AM - 8:00 PM',
        'Tuesday': '8:00 AM - 8:00 PM',
        'Wednesday': '8:00 AM - 8:00 PM',
        'Thursday': '8:00 AM - 8:00 PM',
        'Friday': '8:00 AM - 5:00 PM',
        'Saturday': 'Closed',
        'Sunday': '2:00 PM - 8:00 PM',
      },
      'West Texas Collection': {
        'Monday': '10:00 AM - 5:00 PM',
        'Tuesday': '10:00 AM - 5:00 PM',
        'Wednesday': '10:00 AM - 5:00 PM',
        'Thursday': '10:00 AM - 5:00 PM',
        'Friday': '10:00 AM - 4:00 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed',
      },
    },
  },
  
  recreation: {
    name: 'Recreation Center',
    type: 'recreation',
    description: 'Fitness facilities, swimming, climbing, and recreational activities',
    website_url: 'https://www.angelo.edu/life-on-campus/play/university-recreation/urec-hours-of-operation.php',
    sections: {
      'CHP (Fitness Center)': {
        'Monday': '6:00 AM - 10:00 PM',
        'Tuesday': '6:00 AM - 10:00 PM',
        'Wednesday': '6:00 AM - 10:00 PM',
        'Thursday': '6:00 AM - 10:00 PM',
        'Friday': '6:00 AM - 8:00 PM',
        'Saturday': '8:00 AM - 5:00 PM',
        'Sunday': '1:00 PM - 5:00 PM',
      },
      'Swimming Pool': {
        'Monday': '6:30 AM - 8:00 PM',
        'Tuesday': '6:30 AM - 8:00 PM',
        'Wednesday': '6:30 AM - 8:00 PM',
        'Thursday': '6:30 AM - 8:00 PM',
        'Friday': '6:30 AM - 6:00 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed',
      },
    },
  },
  
  dining: {
    name: 'Dining Services',
    type: 'dining',
    description: 'Campus dining options, coffee shops, and food courts',
    website_url: 'https://dineoncampus.com/Angelo/hours-of-operation',
    sections: {
      'TEA Co': {
        'Monday': '7:30 AM - 5:00 PM',
        'Tuesday': '7:30 AM - 5:00 PM',
        'Wednesday': '7:30 AM - 5:00 PM',
        'Thursday': '7:30 AM - 5:00 PM',
        'Friday': '7:30 AM - 2:30 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed',
      },
      'Marketplace': {
        'Monday': '7:00 AM - 10:00 AM\n11:00 AM - 2:00 PM\n4:30 PM - 8:00 PM',
        'Tuesday': '7:00 AM - 10:00 AM\n11:00 AM - 2:00 PM\n4:30 PM - 8:00 PM',
        'Wednesday': '7:00 AM - 10:00 AM\n11:00 AM - 2:00 PM\n4:30 PM - 8:00 PM',
        'Thursday': '7:00 AM - 10:00 AM\n11:00 AM - 2:00 PM\n4:30 PM - 8:00 PM',
        'Friday': '7:00 AM - 10:00 AM\n11:00 AM - 2:00 PM',
        'Saturday': '9:00 AM - 3:00 PM',
        'Sunday': '12:00 PM - 6:00 PM',
      },
      'The CAF': {
        'Monday': '7:00 AM - 9:00 AM\n11:30 AM - 1:30 PM\n5:00 PM - 7:00 PM',
        'Tuesday': '7:00 AM - 9:00 AM\n11:30 AM - 1:30 PM\n5:00 PM - 7:00 PM',
        'Wednesday': '7:00 AM - 9:00 AM\n11:30 AM - 1:30 PM\n5:00 PM - 7:00 PM',
        'Thursday': '7:00 AM - 9:00 AM\n11:30 AM - 1:30 PM\n5:00 PM - 7:00 PM',
        'Friday': '7:00 AM - 9:00 AM\n11:30 AM - 1:30 PM\n5:00 PM - 7:00 PM',
        'Saturday': '10:00 AM - 2:00 PM\n5:00 PM - 8:00 PM',
        'Sunday': '10:00 AM - 2:00 PM\n5:00 PM - 8:00 PM',
      },
    },
  },
  ram_tram: {
    name: 'Ram Tram',
    type: 'ram_tram',
    description: 'Campus transportation system',
    website_url: 'https://www.angelo.edu/life-on-campus/live/parking-and-transportation/ram-tram.php',
    sections: {
      'Ram Tram': {
        'Monday': 'Closed',
        'Tuesday': { time: '4:30 - 8:30 p.m.', route: 'Gold Route' },
        'Wednesday': 'Closed',
        'Thursday': 'Closed',
        'Friday': { time: '5:30 - 11:30 p.m.', route: 'Blue Route' },
        'Saturday': { time: '11:30 a.m. - 11:30 p.m.', route: 'Blue Route' },
        'Sunday': 'Closed',
      }
    }
  },
};

/**
 * Main data fetching function with fallback to mock data
 */
export const fetchFacilityData = async (facilityType) => {
  try {
    // Try to fetch from API first
    const data = await facilityAPI.getFacilityHours(facilityType);
    
    // If API returns empty or no sections, fall back to mock data
    if (!data || !data.sections || Object.keys(data.sections).length === 0) {
      console.warn(`No data from API for ${facilityType}, using mock data`);
      return mockData[facilityType];
    }
    
    return data;
  } catch (error) {
    console.warn(`API fetch failed for ${facilityType}, using mock data:`, error);
    return mockData[facilityType];
  }
};

/**
 * Health check function to test API connectivity
 */
export const checkAPIHealth = async () => {
  try {
    const health = await facilityAPI.checkHealth();
    console.log('✅ API is healthy:', health);
    return true;
  } catch (error) {
    console.warn('❌ API health check failed:', error);
    return false;
  }
};

export default facilityAPI; 