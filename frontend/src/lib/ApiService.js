import axios from "axios";
import { API_URL, AUTH_SECRET } from "./Constant";

const ApiService = axios.create({
  baseURL: API_URL,
});

ApiService.interceptors.request.use(
  (config) => {
    const token = (config.headers.Accept = "application/json");
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    config.headers["Authorization"] = `Bearer ${AUTH_SECRET}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

ApiService.interceptors.response.use(
  (response) => {
    return response?.data ? response.data : response;
  },
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  },
);

export default ApiService;
