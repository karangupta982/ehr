import { NextRequest } from "next/server";
import { z } from "zod";
import { modmedClient, toApiError } from "@/lib/http";

const listSchema = z.object({
  date: z.string().optional(),
  providerId: z.string().optional(),
  patientId: z.string().optional(),
});

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
    const res = await modmedClient.get("/appointments", { params: parsed.data });
    return Response.json(res.data);
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await modmedClient.post("/appointments", body);
    return Response.json(res.data, { status: 201 });
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await modmedClient.put(`/appointments/${body.id}`, body);
    return Response.json(res.data);
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  try {
    const res = await modmedClient.delete(`/appointments/${id}`);
    return Response.json(res.data);
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}


