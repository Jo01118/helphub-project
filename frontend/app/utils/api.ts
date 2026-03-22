const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('access');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 401 && token) {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      throw new Error("Time out pls login again");
    }
    
    if (errorData.detail) throw new Error(errorData.detail);
    if (errorData.error) throw new Error(errorData.error);
    
    // Extract DRF field validation errors (e.g. {"username": ["Already exists"]})
    const firstKey = Object.keys(errorData)[0];
    if (firstKey && Array.isArray(errorData[firstKey])) {
      throw new Error(`${firstKey.toUpperCase()}: ${errorData[firstKey][0]}`);
    }

    throw new Error('API Request Failed');
  }

  // Handle empty responses (like 204 No Content for DELETE)
  if (response.status === 204) return null;
  return response.json();
};

// Override specifically for FormData (like image/audio uploads)
export const requestFormData = async (endpoint: string, formData: FormData, method = 'POST') => {
  const token = localStorage.getItem('access');
  
  const headers: any = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 401 && token) {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      throw new Error("Time out pls login again");
    }
    
    if (errorData.detail) {
      throw new Error(errorData.detail);
    }
    if (errorData.error) throw new Error(errorData.error);
    
    // Extract DRF field validation errors
    const firstKey = Object.keys(errorData)[0];
    if (firstKey && Array.isArray(errorData[firstKey])) {
      throw new Error(`${firstKey.toUpperCase()}: ${errorData[firstKey][0]}`);
    }
    throw new Error('Form Data Request Failed');
  }

  return response.json();
};
