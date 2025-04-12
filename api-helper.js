class APIHelper {
    static async makeRequest(url, options) {
        try {
            // Add CORS headers if needed
            const modifiedOptions = {
                ...options,
                headers: {
                    ...options.headers,
                    'Accept': 'application/json'
                },
                mode: 'cors'
            };

            const response = await fetch(url, modifiedOptions);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
}

// Export for browser use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIHelper;
} else {
    window.APIHelper = APIHelper;
}
