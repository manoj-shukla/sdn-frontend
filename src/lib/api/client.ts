import axios from "axios";
// Import the store module directly (not the hook) so we can call getState() outside React.
// This always reflects the current in-memory state, never the stale persisted localStorage value,
// which prevents wrong-supplier data being served when the X-Supplier-Id header is stale.
import { useAuthStore } from "@/lib/store/auth-store";

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083",
    timeout: 30000, // 30 second timeout to prevent requests from hanging indefinitely
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((config) => {
    // For FormData requests the browser must set Content-Type itself so it can
    // include the correct multipart boundary. The axios instance default
    // ("application/json") would override that and break file uploads, so we
    // delete it here whenever the body is a FormData object.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            // Suppress warning on auth pages — they are intentionally unauthenticated
            const isOnAuthPage = window.location.pathname.startsWith('/auth');
            if (!isOnAuthPage) {
                console.warn("[API Client] No token found in localStorage for request:", config.url);
            }
        }

        // Read multi-tenant context from the LIVE Zustand state (not from persisted localStorage).
        // Using localStorage here can serve stale IDs from the previous user's session when
        // Zustand's persist middleware hasn't flushed the new state yet — causing the backend
        // to return a different supplier's data for the freshly logged-in user.
        try {
            const { user } = useAuthStore.getState();
            if (user) {
                if (user.supplierId) {
                    config.headers['X-Supplier-Id'] = user.supplierId;
                }
                if (user.buyerId) {
                    config.headers['X-Buyer-Id'] = user.buyerId;
                }
            }
        } catch (e) {
            // Ignore — store might not be initialised yet on first render
        }
    }
    return config;
});

// Response interceptor to handle errors globally
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        // Handle 401 Unauthorized or 404 on auth endpoints (means invalid session)
        // Skip redirect if we're already on an auth page (e.g. login returning 401 for bad creds)
        const isOnAuthPage = typeof window !== "undefined" && window.location.pathname.startsWith('/auth');
        if (!isOnAuthPage && (error.response?.status === 401 || (error.response?.status === 404 && error.config.url.includes('/auth/me')))) {
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
