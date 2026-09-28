import axios from "axios";
import { API_URL } from "./Constant";
import { userData } from "./Variables";
import { getDefaultStore } from "jotai";
import { RESET } from "jotai/utils";

const AUTH_PATHS = ["auth/login", "auth/refresh", "auth/logout"];

const store = getDefaultStore();

const ApiService = axios.create({
  baseURL: API_URL,
});

const isAuthCall = (config) =>
  AUTH_PATHS.some((path) => config?.url?.startsWith(path));

let refreshing = null;

function refreshTokens() {
  const { refreshToken } = store.get(userData);
  if (!refreshToken) return Promise.reject(new Error("No refresh token"));

  refreshing ??= axios
    .post(`${API_URL}auth/refresh`, { refreshToken })
    .then(({ data }) => {
      store.set(userData, (prev) => ({ ...prev, ...data.data }));
      return data.data.accessToken;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export function clearSession() {
  if (store.get(userData).isLoggedIn) store.set(userData, RESET);
}

ApiService.interceptors.request.use(
  (config) => {
    const token = store.get(userData).accessToken;
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
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
  async (error) => {
    const config = error?.config;
    const expired = error?.response?.status === 401;

    if (expired && config && !config.retried && !isAuthCall(config)) {
      config.retried = true;
      try {
        const accessToken = await refreshTokens();
        config.headers["Authorization"] = `Bearer ${accessToken}`;
        return ApiService(config);
      } catch {
        clearSession();
        return Promise.reject(error);
      }
    }

    if (expired && !config?.url?.startsWith("auth/login")) clearSession();
    return Promise.reject(error);
  },
);

export default ApiService;
