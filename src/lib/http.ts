// import axios from "axios";
// import { env } from "@/lib/env";
// import { getAccessToken, refreshAccessToken } from "@/lib/modmedAuth";

// export const cerboClient = axios.create({
// 	baseURL: env.CERBO_BASE_URL,
// 	timeout: 20000,
// });

// cerboClient.interceptors.request.use((config) => {
// 	// Cerbo typically uses Basic auth with username:secret
// 	const token = Buffer.from(`${env.CERBO_USERNAME}:${env.CERBO_SECRET_KEY}`).toString("base64");
// 	config.headers = config.headers ?? {};
// 	(config.headers as any)["Authorization"] = `Basic ${token}`;
// 	(config.headers as any)["Content-Type"] = "application/json";
// 	return config;
// });

// // export const modmedClient = axios.create({
// // 	baseURL: `${env.MODMED_BASE_URL}/firm/${env.MODMED_FIRM_URL_PREFIX}`,
// // 	timeout: 20000,
// // });
// export const modmedClient = axios.create({
// 	baseURL: `${env.MODMED_BASE_URL}/firm/${env.MODMED_FIRM_URL_PREFIX}/ema/fhir/v2`,
// });

// modmedClient.interceptors.request.use(async (config) => {
// 	config.headers = config.headers ?? {};
// 	// Mutate headers instead of overwriting the AxiosHeaders object
// 	const bearer = await getAccessToken();
// 	(config.headers as any)["Authorization"] = `Bearer ${bearer}`;
// 	(config.headers as any)["x-api-key"] = env.MODMED_API_KEY;
// 	(config.headers as any)["Content-Type"] = "application/json";
// 	return config;
// });

// modmedClient.interceptors.response.use(
// 	(res) => res,
// 	async (error) => {
// 		if (axios.isAxiosError(error) && error.response?.status === 401) {
// 			try {
// 				await refreshAccessToken();
// 				const cfg = error.config!;
// 				cfg.headers = cfg.headers ?? {};
// 				const token = await getAccessToken();
// 				(cfg.headers as any)["Authorization"] = `Bearer ${token}`;
// 				return modmedClient(cfg);
// 			} catch (_) {}
// 		}
// 		return Promise.reject(error);
// 	}
// );

// export type ApiError = {
// 	status: number;
// 	message: string;
// 	details?: unknown;
// };

// export function toApiError(error: unknown): ApiError {
// 	if (axios.isAxiosError(error)) {
// 		return {
// 			status: error.response?.status ?? 500,
// 			message: (error.response?.data as any)?.message ?? error.message,
// 			details: error.response?.data,
// 		};
// 	}
// 	return { status:500, message:"Unknown error" };
// }












import axios from "axios";
import { env } from "@/lib/env";
import { getAccessToken, refreshAccessToken } from "@/lib/modmedAuth";

// Cerbo (if you still need it)
export const cerboClient = axios.create({
  baseURL: env.CERBO_BASE_URL,
  timeout: 20000,
});
cerboClient.interceptors.request.use((config) => {
  const token = Buffer.from(`${env.CERBO_USERNAME}:${env.CERBO_SECRET_KEY}`).toString("base64");
  config.headers = config.headers ?? {};
  (config.headers as any)["Authorization"] = `Basic ${token}`;
  (config.headers as any)["Content-Type"] = "application/json";
  return config;
});

// ModMed FHIR client
export const modmedClient = axios.create({
  baseURL: `${env.MODMED_BASE_URL}/firm/${env.MODMED_FIRM_URL_PREFIX}/ema/fhir/v2`,
  timeout: 20000,
});

modmedClient.interceptors.request.use(async (config) => {
  config.headers = config.headers ?? {};
  const bearer = await getAccessToken();
//   console.log("➡️ Using Access Token:", bearer);
  (config.headers as any)["Authorization"] = `Bearer ${bearer}`;
  (config.headers as any)["x-api-key"] = env.MODMED_API_KEY;
  (config.headers as any)["Content-Type"] = "application/json";
  (config.headers as any)["Accept"] = "application/fhir+json";
  return config;
});

modmedClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      try {
        await refreshAccessToken();
        const cfg = error.config!;
        cfg.headers = cfg.headers ?? {};
        const token = await getAccessToken();
        (cfg.headers as any)["Authorization"] = `Bearer ${token}`;
        return modmedClient(cfg);
      } catch (_) {}
    }
    return Promise.reject(error);
  }
);

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      status: error.response?.status ?? 500,
      message: (error.response?.data as any)?.message ?? error.message,
      details: error.response?.data,
    };
  }
  return { status: 500, message: "Unknown error" };
}
