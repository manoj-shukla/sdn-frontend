import axios from "axios";

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083",
    timeout: 30000, // 30 second timeout to prevent requests from hanging indefinitely
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            // console.log("[API Client] Attaching token:", token.substring(0, 10) + "...");
        } else {
            console.warn("[API Client] No token found in localStorage for request:", config.url);
        }

        try {
            const authStorageStr = localStorage.getItem("auth-storage");
            if (authStorageStr) {
                const parsed = JSON.parse(authStorageStr);
                const authState = parsed.state || parsed;
                if (authState && authState.user) {
                    if (authState.user.supplierId) {
                        config.headers['X-Supplier-Id'] = authState.user.supplierId;
                    }
                    if (authState.user.buyerId) {
                        config.headers['X-Buyer-Id'] = authState.user.buyerId;
                    }
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
    return config;
});

// Response interceptor to handle errors globally
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        // Handle 401 Unauthorized or 404 on auth endpoints (means invalid session)
        if (error.response?.status === 401 || (error.response?.status === 404 && error.config.url.includes('/auth/me'))) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("token");
                localStorage.removeItem("auth-storage"); // Clear correct auth store key
                document.cookie = "token=; path=/; max-age=0";
                document.cookie = "role=; path=/; max-age=0";
                window.location.href = "/auth/login";
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
