import axios, { InternalAxiosRequestConfig } from "axios";
import { getCsrfToken } from "./csrf";
import { API_URL } from "./config";

// Native login and Axios must share a cookie host. Next rewrites /api to the backend.
const API_BASE_URL = API_URL;

const instance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  timeout: 30000,
});

instance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.withCredentials = true;
    if (!["get", "head", "options"].includes(config.method || "get")) {
      config.headers.set("X-CSRF-Token", await getCsrfToken(API_BASE_URL));
    }

    console.log("Request:", config.method?.toUpperCase(), config.url);
    console.log("Credentials enabled:", config.withCredentials);

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 403 && error.response?.data?.code === "EBADCSRFTOKEN") {
      if (error.config && !error.config._csrfRetried) {
        error.config._csrfRetried = true;
        return instance.request(error.config);
      }
      return Promise.reject(error);
    }
    const url = error.config?.url;

    console.error("Request failed:", {
      status,
      url,
      message: error.message,
    });

    if (status === 401 || status === 403) {
      console.error("Authentication error:", status);

      localStorage.clear();
      sessionStorage.clear();

      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });

      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/register")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
