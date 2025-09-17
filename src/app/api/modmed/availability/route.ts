import { NextRequest } from "next/server";
import { modmedClient, toApiError } from "@/lib/http";
import { getAccessToken } from "@/lib/modmedAuth";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get("providerId");
  const locationId = searchParams.get("locationId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!providerId || !locationId || !start || !end) {
    return Response.json(
      { error: "providerId, locationId, start, and end are required" },
      { status: 400 }
    );
  }

  try {
    const token = await getAccessToken();

    const res = await modmedClient.get("/Availability", {
      params: { provider: providerId, location: locationId, start, end },
      headers: {
        accept: "application/fhir+json",
        authorization: `Bearer ${token}`,
        "x-api-key": env.MODMED_API_KEY,
      },
    });

    return Response.json(res.data);
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}
