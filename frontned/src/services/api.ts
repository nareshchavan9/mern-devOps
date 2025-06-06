import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
// const API_URL = 'https://e-ballot-voting-system-1.onrender.com';


// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors
    if (error.response?.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  login: async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    
    // Save token to localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (userData: any) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },

  // Admin: Get all registered voters
  getAllVoters: async (ageRange?: string) => {
    const response = await api.get('/auth/voters', {
      params: { ageRange }
    });
    return response.data;
  },

  // Deactivate own profile
  deactivateProfile: async () => {
    try {
      const response = await api.post('/auth/deactivate');
      if (!response.data) {
        throw new Error('No response from server');
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw error;
    }
  },

  // Admin: Deactivate voter
  deactivateVoter: async (voterId: string) => {
    const response = await api.post(`/auth/voters/${voterId}/deactivate`);
    return response.data;
  }
};

export interface Candidate {
  _id?: string;
  name: string;
  party: string;
  bio: string;
}

// Election services
export const electionService = {
  getElectionDetails: async (electionId: string) => {
    const response = await api.get(`/elections/${electionId}`);
    return response.data;
  },
  
  submitVote: async (electionId: string, candidateId: string) => {
    const response = await api.post(`/elections/${electionId}/vote`, {
      candidateId
    });
    return response.data;
  },
  
  getElections: async () => {
    const response = await api.get('/elections');
    return response.data;
  },
  
  getElectionResults: async (electionId: string) => {
    const response = await api.get(`/elections/${electionId}/results`);
    return response.data;
  },

  checkVoteStatus: async (electionId: string) => {
    try {
      const response = await api.get(`/elections/${electionId}/vote-status`);
      return response.data;
    } catch (error) {
      console.error('Error checking vote status:', error);
      throw error;
    }
  },

  // Admin endpoints
  createElection: async (electionData: any) => {
    try {
      const response = await api.post('/elections', electionData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating election:', error.response?.data || error);
      throw error;
    }
  },

  updateElection: async (electionId: string, data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    candidates?: Candidate[];
  }) => {
    const response = await api.put(`/elections/${electionId}`, data);
    return response.data;
  },

  deleteElection: async (electionId: string) => {
    const response = await api.delete(`/elections/${electionId}`);
    return response.data;
  },

  getElectionStats: async (electionId: string) => {
    const response = await api.get(`/elections/${electionId}/stats`);
    return response.data;
  }
};

export default api;
