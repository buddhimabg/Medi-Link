// services/api.ts

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // ==================== SLOT ENDPOINTS ====================
  
  async getSlotsByDate(date: string): Promise<any[]> {
    console.log('📡 API: Fetching slots for date:', date);
    return this.request(`/slots/date/${date}`);
  }

  async getAllSlots(): Promise<any[]> {
    return this.request('/slots/all');
  }

  async getSlotsByDay(day: string): Promise<any[]> {
    return this.request(`/slots/day/${day}`);
  }

  async updateSlot(id: number, data: { status?: string; totalPatients?: number }): Promise<any> {
    return this.request(`/slots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Cancel a session by id (backend route: DELETE /sessions/:id)
  async cancelSession(id: number): Promise<any> {
    return this.request(`/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== PATIENT ENDPOINTS ====================
  
  async getAllPatients(): Promise<any[]> {
    return this.request('/patients');
  }

  async getPatientById(id: number): Promise<any> {
    return this.request(`/patients/${id}`);
  }

  async getPatientProfile(id: number): Promise<any> {
    return this.request(`/patients/${id}/profile`);
  }

  async createPatient(patientData: any): Promise<any> {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  }

  // ==================== PATIENT-SLOT ENDPOINTS ====================
  async getPatientsBySlot(slotId: number): Promise<any[]> {
    console.log('📡 API: Fetching patients for slot:', slotId);
    return this.request(`/patients/slot/${slotId}`);
  }

  async assignPatientToSlot(patientId: number, slotId: number): Promise<any> {
    return this.request(`/patients/${patientId}/assign-slot/${slotId}`, {
      method: 'POST',
    });
  }

  async removePatientFromSlot(patientId: number): Promise<any> {
    return this.request(`/patients/${patientId}/remove-slot`, {
      method: 'DELETE',
    });
  }

  // ==================== TREATMENT PLAN ENDPOINTS ====================

  async getPatientTreatmentPlan(patientId: number): Promise<any> {
    return this.request(`/treatment-plans/${patientId}`);
  }

  async savePatientTreatmentPlan(patientId: number, treatmentPlanData: any): Promise<any> {
    return this.request(`/treatment-plans/${patientId}`, {
      method: 'POST',
      body: JSON.stringify(treatmentPlanData),
    });
  }

  async autoSaveTreatmentPlan(patientId: number, treatmentPlanData: any): Promise<any> {
    return this.request(`/treatment-plans/${patientId}/autosave`, {
      method: 'POST',
      body: JSON.stringify(treatmentPlanData),
    });
  }

  // ==================== DOCTOR ENDPOINTS ====================
  
  async getDoctorProfile(): Promise<any> {
    return this.request('/doctor/profile');
  }

  async updateDoctorProfile(id: number, data: { phone: string; bio: string; photo: string }): Promise<any> {
    return this.request(`/doctor/profile/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ==================== HEALTH ENDPOINT ====================
  
  async getHealth(): Promise<any> {
    return this.request('/health');
  }

  // ==================== HELPER METHODS ====================
  
  formatDateToYMD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getTodayDate(): string {
    return this.formatDateToYMD(new Date());
  }

  getMonday(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  getWeekDates(startDate: Date = new Date()): string[] {
    const monday = this.getMonday(startDate);
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(this.formatDateToYMD(date));
    }
    return weekDates;
  }
}

export const api = new ApiService();