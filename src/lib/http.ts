import axios from "axios";
import { env } from "@/lib/env";

export const cerboClient = axios.create({
  baseURL: env.CERBO_BASE_URL,
  timeout: 20000,
});

cerboClient.interceptors.request.use((config) => {
  // Cerbo typically uses Basic auth with username:secret
  const token = Buffer.from(`${env.CERBO_USERNAME}:${env.CERBO_SECRET_KEY}`).toString("base64");
  config.headers = config.headers ?? {};
  config.headers["Authorization"] = `Basic ${token}`;
  config.headers["Content-Type"] = "application/json";
  return config;
});

export const modmedClient = axios.create({
  baseURL: `${env.MODMED_BASE_URL}/${env.MODMED_FIRM_URL_PREFIX}`,
  timeout: 20000,
});

modmedClient.interceptors.request.use((config) => {
  // ModMed commonly requires API key header; additional OAuth flows may be needed per endpoint
  config.headers = config.headers ?? {};
  config.headers["X-API-Key"] = env.MODMED_API_KEY;
  config.headers["Content-Type"] = "application/json";
  return config;
});

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      status: error.response?.status ?? 500,
      message: error.response?.data?.message ?? error.message,
      details: error.response?.data,
    };
  }
  return { status:500, message:"Unknown error" };
}


