const axios = require('axios');

const APPYFLOW_BASE = 'https://appyflow.in/api';

class GstService {
  constructor(keySecret) {
    this.keySecret = keySecret;
  }

  /**
   * Verify a GST number and get taxpayer info
   * @param {string} gstNo - GST Number
   * @returns {object} Taxpayer info
   */
  async verifyGST(gstNo) {
    try {
      const response = await axios.get(`${APPYFLOW_BASE}/verifyGST`, {
        params: {
          key_secret: this.keySecret,
          gstNo: gstNo.toUpperCase().trim()
        }
      });

      if (response.data.error) {
        throw new Error(response.data.message || 'GST verification failed');
      }

      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  /**
   * Get GST filing details for a specific financial year
   * @param {string} gstNo - GST Number
   * @param {string} year - Financial year (e.g., '2024-25')
   * @returns {object} Filing details
   */
  async getFilingDetails(gstNo, year) {
    try {
      const response = await axios.get(`${APPYFLOW_BASE}/GST/filing-details`, {
        params: {
          key_secret: this.keySecret,
          gstNo: gstNo.toUpperCase().trim(),
          year
        }
      });

      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to fetch filing details');
      }

      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  /**
   * Get GST filing frequency (Monthly/Quarterly)
   * @param {string} gstNo - GST Number
   * @param {string} year - Financial year (e.g., '2024-25')
   * @returns {object} Filing frequency
   */
  async getFilingFrequency(gstNo, year) {
    try {
      const response = await axios.get(`${APPYFLOW_BASE}/GST/filing-frequency`, {
        params: {
          key_secret: this.keySecret,
          gstNo: gstNo.toUpperCase().trim(),
          year
        }
      });

      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to fetch filing frequency');
      }

      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  /**
   * Get HSN code details
   * @param {string} hsnCode - HSN Code
   * @returns {object} HSN details
   */
  async getHSNDetails(hsnCode) {
    try {
      const response = await axios.get(`${APPYFLOW_BASE}/hsn_code_details`, {
        params: {
          key_secret: this.keySecret,
          hsn_code: hsnCode.trim()
        }
      });

      if (response.data.error) {
        throw new Error(response.data.message || 'Failed to fetch HSN details');
      }

      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }
}

module.exports = GstService;
