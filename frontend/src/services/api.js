const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = {
  /**
   * Health-check call to FastAPI backend: GET /api/v1/health
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('[Zyllora API] Backend health check failed:', error.message);
      return {
        status: 'disconnected',
        error: error.message,
      };
    }
  },

  /**
   * Authenticated user profile call to FastAPI backend: GET /api/v1/auth/me
   */
  async getProfile(token) {
    if (!token) {
      throw new Error('Authorization token is required');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return await response.json();
  },
};
