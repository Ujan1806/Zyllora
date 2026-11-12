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

  /**
   * Upload an academic PDF with real-time upload progress tracking:
   * POST /api/v1/documents/upload
   */
  async uploadDocument(file, token, onProgress) {
    if (!token) {
      throw new Error('Authentication required to upload documents.');
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', `${API_BASE_URL}/documents/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.message || `Upload failed with HTTP ${xhr.status}`));
          }
        } catch (e) {
          reject(new Error(`Server error: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred while uploading PDF to backend.'));
      };

      xhr.send(formData);
    });
  },

  /**
   * List all documents owned by current student: GET /api/v1/documents
   */
  async listDocuments(token) {
    if (!token) return [];

    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch documents (HTTP ${response.status})`);
    }

    return await response.json();
  },

  /**
   * Check status of a document: GET /api/v1/documents/{document_id}/status
   */
  async getDocumentStatus(documentId, token) {
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch status`);
    }

    return await response.json();
  },

  /**
   * Get specific page extracted text: GET /api/v1/documents/{document_id}/pages/{page_number}
   */
  async getDocumentPage(documentId, pageNumber, token) {
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/pages/${pageNumber}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to load page`);
    }

    return await response.json();
  },

  /**
   * Delete document: DELETE /api/v1/documents/{document_id}
   */
  async deleteDocument(documentId, token) {
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete document`);
    }

    return await response.json();
  },

  /**
   * Retry failed document processing: POST /api/v1/documents/{document_id}/retry
   */
  async retryDocument(documentId, token) {
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/retry`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to retry document processing`);
    }

    return await response.json();
  },

  /**
   * ==========================================
   * AI TUTOR & RAG API METHODS (WEEK 3)
   * ==========================================
   */

  /**
   * Create a study session: POST /api/v1/tutor/sessions
   */
  async createTutorSession(documentId, title = 'New Study Session', mode = 'detailed', token) {
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/tutor/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ document_id: documentId, title, mode }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create study session');
    }

    return await response.json();
  },

  /**
   * List study sessions: GET /api/v1/tutor/sessions?document_id=...
   */
  async listTutorSessions(documentId, token) {
    if (!token) return [];

    let url = `${API_BASE_URL}/tutor/sessions`;
    if (documentId) {
      url += `?document_id=${encodeURIComponent(documentId)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to list study sessions');
    }

    return await response.json();
  },

  /**
   * Get study session details & message history: GET /api/v1/tutor/sessions/{sessionId}
   */
  async getTutorSession(sessionId, token) {
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/tutor/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to load study session');
    }

    return await response.json();
  },

  /**
   * Delete study session: DELETE /api/v1/tutor/sessions/{sessionId}
   */
  async deleteTutorSession(sessionId, token) {
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/tutor/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete study session');
    }

    return await response.json();
  },

  /**
   * Send question to AI tutor: POST /api/v1/tutor/chat
   */
  async sendTutorChat(documentId, sessionId, message, mode = 'detailed', token) {
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/tutor/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_id: documentId,
        session_id: sessionId,
        message,
        mode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get answer from AI tutor');
    }

    return await response.json();
  },
};
