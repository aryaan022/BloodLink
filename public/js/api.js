// API Utility for BloodLink Dashboard

class API {
    constructor() {
        this.baseURL = '/api';
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include',
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API Error');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Hospital API methods
    async getHospitalProfile() {
        return this.request('/hospital/profile');
    }

    async updateHospitalProfile(data) {
        return this.request('/hospital/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async createBloodRequest(data) {
        return this.request('/hospital/requests', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getHospitalRequests() {
        return this.request('/hospital/requests');
    }

    async getBloodRequest(id) {
        return this.request(`/hospital/requests/${id}`);
    }

    async updateBloodRequest(id, data) {
        return this.request(`/hospital/requests/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async closeBloodRequest(id) {
        return this.request(`/hospital/requests/${id}/close`, {
            method: 'PUT'
        });
    }

    async updateRequestStatus(id, status) {
        return this.request(`/hospital/requests/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async completeDonation(requestId, donorUserId, unitsCollected = 1, notes = '') {
        return this.request(`/hospital/requests/${requestId}/complete-donation`, {
            method: 'PUT',
            body: JSON.stringify({ donorUserId, unitsCollected, notes })
        });
    }

    async updateDonorStatus(requestId, donorUserId, status) {
        return this.request(`/hospital/requests/${requestId}/donor-status`, {
            method: 'PUT',
            body: JSON.stringify({ donorUserId, status })
        });
    }

    async updateBloodStock(data) {
        return this.request('/hospital/blood-stock', {
            method: 'PUT',
            body: JSON.stringify({ bloodStock: data })
        });
    }

    async searchDonors(params) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/hospital/search-donors?${query}`);
    }

    // Donor API methods
    async getDonorProfile() {
        return this.request('/donor/profile');
    }

    async updateDonorProfile(data) {
        return this.request('/donor/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async getAvailableRequests() {
        return this.request('/donor/available-requests');
    }

    async getMyRequests() {
        return this.request('/donor/my-requests');
    }

    async expressDonorInterest(requestId) {
        return this.request(`/donor/requests/${requestId}/interest`, {
            method: 'POST'
        });
    }

    async checkEligibility() {
        return this.request('/donor/eligibility');
    }

    async getDonationHistory() {
        return this.request('/donor/donation-history');
    }

    async recordDonation(data) {
        return this.request('/donor/donation-record', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Auth API methods
    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    }
}

// Create global API instance
const api = new API();