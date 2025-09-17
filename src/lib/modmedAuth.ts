// import axios from "axios";
// import { env } from "@/lib/env";

// let accessToken: string | null = null;
// let refreshToken: string | null = null;
// let accessTokenExpiresAt: number | null = null; // epoch ms
// let ongoingPromise: Promise<string> | null = null;

// function getGrantUrl() {
// 	// {BASE}/firm/{prefix}/ema/ws/oauth2/grant
// 	const base = env.MODMED_BASE_URL.replace(/\/$/, "");
// 	return `${base}/firm/${env.MODMED_FIRM_URL_PREFIX}/ema/ws/oauth2/grant`;
// }

// function willExpireSoon(bufferSeconds = 60) {
// 	if (!accessToken || !accessTokenExpiresAt) return true;
// 	return Date.now() >= accessTokenExpiresAt - bufferSeconds * 1000;
// }

// export async function fetchAccessToken(): Promise<string> {
// 	if (ongoingPromise) return ongoingPromise;
// 	ongoingPromise = (async () => {
// 		try {
// 			const res = await axios.post(
// 				getGrantUrl(),
// 				new URLSearchParams({
// 					grant_type: "password",
// 					username: env.MODMED_USERNAME,
// 					password: env.MODMED_PASSWORD,
// 				}).toString(),
// 				{
// 					headers: {
// 						"Content-Type": "application/x-www-form-urlencoded",
// 						"x-api-key": env.MODMED_API_KEY,
// 					},
// 				}
// 			);
// 			accessToken = res.data?.access_token ?? null;
// 			refreshToken = res.data?.refresh_token ?? null;
// 			// Not all responses include expires_in; assume 25 minutes if absent
// 			const expiresInSec: number = Number(res.data?.expires_in ?? 1500);
// 			accessTokenExpiresAt = Date.now() + expiresInSec * 1000;
// 			return accessToken as string;
// 		} finally {
// 			ongoingPromise = null;
// 		}
// 	})();
// 	return ongoingPromise;
// }

// export async function refreshAccessToken(): Promise<string> {
// 	if (!refreshToken) return fetchAccessToken();
// 	if (ongoingPromise) return ongoingPromise;
// 	ongoingPromise = (async () => {
// 		try {
// 			const res = await axios.post(
// 				// getGrantUrl(),
// 				"https://stage.ema-api.com/ema-dev/firm/entpmsandbox393/ema/ws/oauth2/grant",
// 				new URLSearchParams({
// 					grant_type: "refresh_token",
// 					refresh_token: refreshToken,
// 				}).toString(),
// 				{
// 					headers: {
// 						"Content-Type": "application/x-www-form-urlencoded",
// 						"x-api-key": env.MODMED_API_KEY,
// 					},
// 				}
// 			);
// 			console.log("modmed tokens res", res)
// 			accessToken = res.data?.access_token ?? accessToken;
// 			refreshToken = res.data?.refresh_token ?? refreshToken;
// 			const expiresInSec: number = Number(res.data?.expires_in ?? 1500);
// 			accessTokenExpiresAt = Date.now() + expiresInSec * 1000;
// 			return accessToken as string;
// 		} finally {
// 			ongoingPromise = null;
// 		}
// 	})();
// 	return ongoingPromise;
// }

// export async function getAccessToken(): Promise<string> {
// 	if (!accessToken || willExpireSoon()) {
// 		return fetchAccessToken();
// 	}
// 	return accessToken;
// } 


















import axios from "axios";
import { env } from "@/lib/env";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let accessTokenExpiresAt: number | null = null; // epoch ms
let ongoingPromise: Promise<string> | null = null;

function getGrantUrl() {
  // {BASE}/firm/{prefix}/ema/ws/oauth2/grant
  const base = env.MODMED_BASE_URL.replace(/\/$/, "");
  return `${base}/firm/${env.MODMED_FIRM_URL_PREFIX}/ema/ws/oauth2/grant`;
}

function willExpireSoon(bufferSeconds = 60) {
  if (!accessToken || !accessTokenExpiresAt) return true;
  return Date.now() >= accessTokenExpiresAt - bufferSeconds * 1000;
}

export async function fetchAccessToken(): Promise<string> {
  if (ongoingPromise) return ongoingPromise;

  ongoingPromise = (async () => {
    try {
      const res = await axios.post(
        getGrantUrl(),
        new URLSearchParams({
          grant_type: "password",
          username: env.MODMED_USERNAME,
          password: env.MODMED_PASSWORD,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "x-api-key": env.MODMED_API_KEY,
          },
        }
      );

      accessToken = res.data?.access_token ?? null;
      refreshToken = res.data?.refresh_token ?? null;

      const expiresInSec: number = Number(res.data?.expires_in ?? 1500);
      accessTokenExpiresAt = Date.now() + expiresInSec * 1000;

      console.log("🔑 New ModMed Access Token fetched");
      return accessToken as string;
    } finally {
      ongoingPromise = null;
    }
  })();

  return ongoingPromise;
}

export async function refreshAccessToken(): Promise<string> {
  if (!refreshToken) return fetchAccessToken();
  if (ongoingPromise) return ongoingPromise;

  ongoingPromise = (async () => {
    try {
      const res = await axios.post(
        getGrantUrl(),
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "x-api-key": env.MODMED_API_KEY,
          },
        }
      );

      accessToken = res.data?.access_token ?? accessToken;
      refreshToken = res.data?.refresh_token ?? refreshToken;

      const expiresInSec: number = Number(res.data?.expires_in ?? 1500);
      accessTokenExpiresAt = Date.now() + expiresInSec * 1000;

      console.log("🔄 Access Token refreshed");
      return accessToken as string;
    } finally {
      ongoingPromise = null;
    }
  })();

  return ongoingPromise;
}

export async function getAccessToken(): Promise<string> {
  if (!accessToken || willExpireSoon()) {
    return fetchAccessToken();
  }
  return accessToken;
}
