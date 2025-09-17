import { NextRequest } from "next/server";
import { z } from "zod";
import { modmedClient, toApiError } from "@/lib/http";
import { getAccessToken } from "@/lib/modmedAuth";
import { env } from "@/lib/env";

// validation for query params
const listSchema = z.object({
  date: z.string().optional(),
  providerId: z.string().optional(),
  patientId: z.string().optional(),
});


// GET all or filtered appointments
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = listSchema.safeParse({
    date: searchParams.get("date") ?? undefined,
    providerId: searchParams.get("providerId") ?? undefined,
    patientId: searchParams.get("patientId") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    // const token = await getAccessToken();

    // console.log("Using access token:", token);
    const res = await modmedClient.get("/Appointment", { params: parsed.data });
    
    // console.log("Outgoing ModMed URL:", res.config.url);
    // console.log("Response from ModMed:", res.data);
    return Response.json(res.data);
  }
  catch (err) {
    // console.error("ModMed API call failed:", err);
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  } 
}

// POST create an appointment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = await getAccessToken();
    
    // Create appointment using FHIR v2 endpoint
    const res = await modmedClient.post("/Appointment", body, {
      headers: {
        'accept': 'application/fhir+json',
        'content-type': 'application/fhir+json',
        'authorization': `Bearer ${token}`,
        'x-api-key': env.MODMED_API_KEY
      }
    });
    
    // console.log("created appointment:", res.data);
    return Response.json(res.data, { status: 201 });
  } catch (err) {
    // console.error("Failed to create appointment:", err);
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}

// PUT update an appointment (reschedule)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return Response.json({ error: "Missing appointment id" }, { status: 400 });

    const token = await getAccessToken();
    
    // Update/reschedule appointment using FHIR v2 endpoint
    const res = await modmedClient.put(`/Appointment/${body.id}`, body, {
      headers: {
        'accept': 'application/fhir+json',
        'content-type': 'application/fhir+json',
        'authorization': `Bearer ${token}`,
        'x-api-key': env.MODMED_API_KEY
      }
    });
    
    // console.log("Updated appointment:", res.data);
    return Response.json(res.data);
  } catch (err) {
    // console.error("Failed to update appointment:", err);
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}

// DELETE appointment by id
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  try {
    const res = await modmedClient.delete(`/Appointment/${id}`);
    return Response.json(res.data);
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}
