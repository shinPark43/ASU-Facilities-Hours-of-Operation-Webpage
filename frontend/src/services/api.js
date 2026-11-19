/**
 * API Service for ASU Facilities Hours
 * Handles all HTTP requests to the backend API with:
 *  - Vite & legacy CRA env var support
 *  - Request timeouts (AbortController)
 *  - Last-known live cache in localStorage
 *  - Explicit fallback metadata so the UI can warn users when data may be stale
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  'http://localhost:3001';

const API_CONFIG = {
  baseURL: API_BASE_URL.replace(/\/$/, ''),
  timeout: 10000, // 10 seconds
};

const LIVE_CACHE_PREFIX = 'asu-live-cache:';

function saveLiveCache(key, data) {
  try {
    localStorage.setItem(
      `${LIVE_CACHE_PREFIX}${key}`,
      JSON.stringify({ data, cachedAt: new Date().toISOString() })
    );
  } catch {
    // Ignore quota / privacy mode storage errors
  }
}

function readLiveCache(key) {
  try {
    const raw = localStorage.getItem(`${LIVE_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Generic API request function with timeout and error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || API_CONFIG.timeout);

  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: controller.signal,
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const msg = error.name === 'AbortError' ? 'Request timed out' : error.message;
    console.warn(`API request failed for ${endpoint}:`, msg);
    throw new Error(`Failed to fetch data: ${msg}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * API functions for facility hours
 */
export const facilityAPI = {
  async checkHealth() {
    return apiRequest('/api/health');
  },

  async getAllFacilities() {
    return apiRequest('/api/facilities');
  },

  async getLibraryHours() {
    const response = await apiRequest('/api/facilities/library');
    return response.data || {};
  },

  async getRecreationHours() {
    const response = await apiRequest('/api/facilities/recreation');
    return response.data || {};
  },

  async getDiningHours() {
    const response = await apiRequest('/api/facilities/dining');
    return response.data || {};
  },

  async getDiningMenu(venue = 'the-caf', refresh = false) {
    const qs = new URLSearchParams({ venue });
    if (refresh) qs.set('refresh', 'true');
    const response = await apiRequest(`/api/facilities/dining/menu?${qs.toString()}`, { timeout: 25000 });
    return response.data || { available: false, periods: [] };
  },

  async getEssentialsHours() {
    const response = await apiRequest('/api/facilities/essentials');
    return response.data || {};
  },

  async getFacilityHours(type) {
    const response = await apiRequest(`/api/facilities/${type}`);
    return response.data || {};
  },

  async getScrapeLogs(limit = 10) {
    return apiRequest(`/api/facilities/logs/recent?limit=${limit}`);
  },

  async getRamTramHours() {
    const response = await apiRequest('/api/facilities/ram_tram');
    return response.data || {};
  },
};

/**
 * API functions for tutoring data
 */
export const tutoringAPI = {
  async getAllTutoringData() {
    try {
      const response = await apiRequest('/api/tutoring');
      const data = response.data || {};
      if (data?.subjects && Object.keys(data.subjects).length > 0) {
        saveLiveCache('tutoring', data);
        return { ...data, _isFallback: false, _source: 'live' };
      }
      throw new Error('Empty tutoring response');
    } catch (error) {
      const cached = readLiveCache('tutoring');
      if (cached?.data) {
        return { ...cached.data, _isFallback: true, _source: 'cache', _cachedAt: cached.cachedAt };
      }
      throw error;
    }
  },

  async getSubjects() {
    const response = await apiRequest('/api/tutoring/subjects');
    return response.data || [];
  },

  async getCoursesBySubject(subjectId) {
    const response = await apiRequest(`/api/tutoring/subjects/${subjectId}/courses`);
    return response.data || [];
  },

  async getSessionsByCourse(courseId) {
    const response = await apiRequest(`/api/tutoring/courses/${courseId}/sessions`);
    return response.data || [];
  },

  async searchTutoring(query) {
    const response = await apiRequest(`/api/tutoring/search?q=${encodeURIComponent(query)}`);
    return response.data || {};
  },

  async getScrapeLogs(limit = 10) {
    return apiRequest(`/api/tutoring/logs/recent?limit=${limit}`);
  },
};

/**
 * Mock data fallback (served ONLY when live API and local live cache are unavailable)
 */
export const mockData = {
  library: {
    name: 'Porter Henderson Library',
    type: 'library',
    description: 'Academic resources, research support, and study spaces',
    website_url: 'https://www.angelo.edu/library/hours.php',
    sections: {
      'Main Library': {
        Sunday: '12:00 PM - 2:00 AM',
        Monday: '7:30 AM - 2:00 AM',
        Tuesday: '7:30 AM - 2:00 AM',
        Wednesday: '7:30 AM - 2:00 AM',
        Thursday: '7:30 AM - 2:00 AM',
        Friday: '7:30 AM - 6:00 PM',
        Saturday: '10:00 AM - 6:00 PM',
      },
      'Research Assistance Desk': {
        Sunday: '2:00 PM - 6:00 PM',
        Monday: '9:00 AM - 7:00 PM',
        Tuesday: '9:00 AM - 7:00 PM',
        Wednesday: '9:00 AM - 7:00 PM',
        Thursday: '9:00 AM - 7:00 PM',
        Friday: '9:00 AM - 5:00 PM',
        Saturday: '1:00 PM - 5:00 PM',
      },
      'West Texas Collection': {
        Sunday: 'Closed',
        Monday: '10:00 AM - 5:00 PM',
        Tuesday: '10:00 AM - 5:00 PM',
        Wednesday: '10:00 AM - 5:00 PM',
        Thursday: '10:00 AM - 5:00 PM',
        Friday: '10:00 AM - 4:00 PM',
        Saturday: 'Closed',
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
        Sunday: '12:00 PM - 8:00 PM',
        Monday: '7:00 AM - 11:00 PM',
        Tuesday: '7:00 AM - 11:00 PM',
        Wednesday: '7:00 AM - 11:00 PM',
        Thursday: '7:00 AM - 11:00 PM',
        Friday: '7:00 AM - 8:00 PM',
        Saturday: '12:00 PM - 8:00 PM',
      },
      'Swimming Pool': {
        Sunday: '12:00 PM - 7:00 PM',
        Monday: '12:00 PM - 9:00 PM',
        Tuesday: '12:00 PM - 9:00 PM',
        Wednesday: '12:00 PM - 9:00 PM',
        Thursday: '12:00 PM - 9:00 PM',
        Friday: '12:00 PM - 7:00 PM',
        Saturday: '12:00 PM - 7:00 PM',
      },
    },
  },

  dining: {
    name: 'Dining Services',
    type: 'dining',
    description: 'Campus dining options, coffee shops, and food courts',
    website_url: 'https://new.dineoncampus.com/Angelo/hours-of-operation',
    sections: {
      'The CAF': {
        Sunday: '9:00 AM - 2:00 PM\n5:00 PM - 8:00 PM',
        Monday: '7:00 AM - 8:00 PM',
        Tuesday: '7:00 AM - 8:00 PM',
        Wednesday: '7:00 AM - 8:00 PM',
        Thursday: '7:00 AM - 8:00 PM',
        Friday: '7:00 AM - 8:00 PM',
        Saturday: '9:00 AM - 2:00 PM\n5:00 PM - 8:00 PM',
      },
      Starbucks: {
        Sunday: '1:00 PM - 8:00 PM',
        Monday: '7:30 AM - 9:00 PM',
        Tuesday: '7:30 AM - 9:00 PM',
        Wednesday: '7:30 AM - 9:00 PM',
        Thursday: '7:30 AM - 9:00 PM',
        Friday: '7:30 AM - 9:00 PM',
        Saturday: '1:00 PM - 8:00 PM',
      },
      'Chick-Fil-A': {
        Sunday: 'Closed',
        Monday: '7:30 AM - 8:00 PM',
        Tuesday: '7:30 AM - 8:00 PM',
        Wednesday: '7:30 AM - 8:00 PM',
        Thursday: '7:30 AM - 8:00 PM',
        Friday: '7:30 AM - 8:00 PM',
        Saturday: '11:00 AM - 7:00 PM',
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
        Sunday: 'Closed',
        Monday: 'Closed',
        Tuesday: { time: '4:30 - 8:30 p.m.', route: 'Gold Route' },
        Wednesday: 'Closed',
        Thursday: 'Closed',
        Friday: { time: '5:30 - 11:30 p.m.', route: 'Blue Route' },
        Saturday: { time: '11:30 a.m. - 11:30 p.m.', route: 'Blue Route' },
      },
    },
  },

  essentials: {
    name: 'Campus Essentials',
    type: 'essentials',
    description: 'Ram Central Station Bookstore, Mail Services (Post Office), and University Health Clinic',
    website_url: 'https://www.angelo.edu/life-on-campus/',
    sections: {
      'Ram Central Station (Bookstore)': {
        Sunday: 'Closed',
        Monday: '7:30 AM - 5:30 PM',
        Tuesday: '7:30 AM - 5:30 PM',
        Wednesday: '7:30 AM - 5:30 PM',
        Thursday: '7:30 AM - 5:30 PM',
        Friday: '7:30 AM - 5:30 PM',
        Saturday: '10:00 AM - 2:00 PM',
      },
      'Mail Services (Post Office)': {
        Sunday: 'Closed',
        Monday: '8:00 AM - 5:00 PM',
        Tuesday: '8:00 AM - 5:00 PM',
        Wednesday: '8:00 AM - 5:00 PM',
        Thursday: '8:00 AM - 5:00 PM',
        Friday: '8:00 AM - 5:00 PM',
        Saturday: 'Closed',
      },
      'University Health Clinic': {
        Sunday: 'Closed',
        Monday: '8:00 AM - 5:00 PM',
        Tuesday: '8:00 AM - 5:00 PM',
        Wednesday: '8:00 AM - 5:00 PM',
        Thursday: '8:00 AM - 5:00 PM',
        Friday: '8:00 AM - 5:00 PM',
        Saturday: 'Closed',
      },
    },
    metadata: {
      'Ram Central Station (Bookstore)': {
        location: 'First Floor, Houston Harte University Center',
        note: 'Textbooks, Ram gear, school supplies & tech',
        url: 'https://www.angelo.edu/life-on-campus/live/university-center/',
      },
      'Mail Services (Post Office)': {
        location: 'First Floor (South of Tower), Houston Harte University Center',
        note: 'Window service M–F; student mailbox lobby accessible 24/7',
        url: 'https://www.angelo.edu/life-on-campus/live/mail-services/',
      },
      'University Health Clinic': {
        location: '2237 S. Jackson St. (Shannon Student Clinic)',
        note: '24/7 Shannon Nurse Help Line: (325) 481-2002',
        url: 'https://www.angelo.edu/life-on-campus/live/health-clinic/',
      },
    },
  },
};

/**
 * Main data fetching function with live cache + mock data fallback and explicit staleness metadata.
 */
export const fetchFacilityData = async (facilityType) => {
  try {
    const data = await facilityAPI.getFacilityHours(facilityType);

    if (!data || !data.sections || Object.keys(data.sections).length === 0) {
      throw new Error(`No sections returned for ${facilityType}`);
    }

    saveLiveCache(facilityType, data);
    return {
      ...data,
      _isFallback: false,
      _source: 'live',
      _cachedAt: null,
    };
  } catch (error) {
    console.warn(`API fetch failed for ${facilityType}, using fallback:`, error.message);

    const cached = readLiveCache(facilityType);
    if (cached?.data?.sections && Object.keys(cached.data.sections).length > 0) {
      return {
        ...cached.data,
        _isFallback: true,
        _source: 'cache',
        _cachedAt: cached.cachedAt,
      };
    }

    const fallback = mockData[facilityType];
    if (!fallback) {
      throw error;
    }

    return {
      ...fallback,
      _isFallback: true,
      _source: 'mock',
      _cachedAt: null,
    };
  }
};

export const calendarAPI = {
  getUpcoming: () => apiRequest('/api/calendar/upcoming'),
};

export const eventsAPI = {
  getUpcoming: () => apiRequest('/api/events/upcoming'),
};

export const checkAPIHealth = async () => {
  try {
    await facilityAPI.checkHealth();
    return true;
  } catch {
    return false;
  }
};

export default facilityAPI;
