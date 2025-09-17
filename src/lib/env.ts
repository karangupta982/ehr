import { z } from "zod";

const envSchema = z.object({
  CERBO_USERNAME: z.string().min(1),
  CERBO_SECRET_KEY: z.string().min(1),
  CERBO_BASE_URL: z.string().url(),

  MODMED_API_KEY: z.string().min(1),
  MODMED_USERNAME: z.string().min(1),
  MODMED_PASSWORD: z.string().min(1),
  MODMED_BASE_URL: z.string().url(),
  MODMED_FIRM_URL_PREFIX: z.string().min(1),
});

const parsed = envSchema.safeParse({
  CERBO_USERNAME: process.env.CERBO_USERNAME,
  CERBO_SECRET_KEY: process.env.CERBO_SECRET_KEY,
  CERBO_BASE_URL: process.env.CERBO_BASE_URL,

  MODMED_API_KEY: process.env.MODMED_API_KEY,
  MODMED_USERNAME: process.env.MODMED_USERNAME,
  MODMED_PASSWORD: process.env.MODMED_PASSWORD,
  MODMED_BASE_URL: process.env.MODMED_BASE_URL,
  MODMED_FIRM_URL_PREFIX: process.env.MODMED_FIRM_URL_PREFIX,
});

if (!parsed.success) {
  // console.log("env variable could not be parsed")
  // console.error("Invalid env config:", parsed.error.flatten().fieldErrors);
  throw new Error("Missing environment variables");
}

export const env = parsed.data;


