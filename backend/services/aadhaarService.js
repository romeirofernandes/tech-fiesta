const axios = require('axios');

const AGRISTACK_BASE = 'https://hpfr.agristack.gov.in/farmer-registry-api-hp/agristack/v1/api';

class AadhaarService {
  /**
   * Verify an Aadhaar number against the AgriStack farmer registry
   * @param {string} aadhaarNumber - 12-digit Aadhaar number
   * @returns {object} { centralId, registrationStatus, registrationStatusColor }
   */
  async verifyAadhaar(aadhaarNumber) {
    try {
      const response = await axios.post(
        `${AGRISTACK_BASE}/farmerRegistryWorkFlowConfiguration/checkApprovalStatus`,
        {
          isCheckStatusAgainstEnrolmentNumber: false,
          isCheckStatusAgainstCentralId: false,
          aadhaarNumber: aadhaarNumber.trim()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Authorization': 'Bearer null',
            'Origin': 'https://hpfr.agristack.gov.in',
            'Referer': 'https://hpfr.agristack.gov.in/farmer-registry-hp/',
          },
          timeout: 15000
        }
      );

      if (response.data?.status === 'success' && response.data?.data) {
        return response.data.data;
      }

      throw new Error('Unexpected response from Aadhaar verification service');
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }
}

module.exports = AadhaarService;
