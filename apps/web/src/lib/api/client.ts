import createClient from "openapi-fetch";
import type { paths } from "./schema";

 export const apiClient = createClient<paths>({
      baseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",
    });

// Add request interceptor to attach bearer token if needed
apiClient.use({
  onRequest({ request }) {
    const token = localStorage.getItem("token");
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  }
});
