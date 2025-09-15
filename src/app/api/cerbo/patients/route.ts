import { NextRequest } from "next/server";
import { z } from "zod";
import { cerboClient, toApiError } from "@/lib/http";

const searchSchema = z.object({
  q: z.string().optional(),
  id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = searchSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    id: searchParams.get("id") ?? undefined,
    first_name: searchParams.get("first_name") ?? undefined,
    last_name: searchParams.get("last_name") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const res = await cerboClient.get("/patients", { params: parsed.data });
    return Response.json(res.data);
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    // Expect body to contain patient update payload including id
    const res = await cerboClient.put(`/patients/${body.id}`, body);
    return Response.json(res.data);
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}


