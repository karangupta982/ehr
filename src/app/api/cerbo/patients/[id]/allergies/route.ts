import { NextRequest } from "next/server";
import { cerboClient, toApiError } from "@/lib/http";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await cerboClient.get(`/patients/${id}/allergies`);
    return Response.json(res.data);
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { id } = await params;
    try {
      const res = await cerboClient.post(`/patients/${id}/allergies`, body);
      return Response.json(res.data, { status: 201 });
    } catch (_e) {
      // Some sandboxes expose tags instead of dedicated allergies; use tag as fallback (expects array)
      const tags = Array.isArray(body)
        ? body.map((t: any) => ({ name: t.name ?? String(t), tag_category: t.tag_category ?? "Allergy" }))
        : [{ name: body.name, tag_category: "Allergy" }];
      const res = await cerboClient.post(`/patients/${id}/tags`, tags);
      return Response.json(res.data ?? { success: true }, { status: 201 });
    }
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}


