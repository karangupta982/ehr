// import { NextRequest } from "next/server";
// import { cerboClient, toApiError } from "@/lib/http";

// export async function GET(
//   _req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const res = await cerboClient.get(`/patients/${params.id}`);
//     return Response.json(res.data);
//   } catch (err) {
//     const apiErr = toApiError(err);
//     return Response.json({ error: apiErr }, { status: apiErr.status });
//   }
// }

// export async function PUT(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const body = await req.json();
//     // Try PUT first; if Cerbo rejects, fall back to POST for compatibility
//     try {
//       const res = await cerboClient.put(`/patients/${params.id}`, body);
//       return Response.json(res.data);
//     } catch (e) {
//       const res = await cerboClient.post(`/patients/${params.id}`, body);
//       return Response.json(res.data);
//     }
//   } catch (err) {
//     const apiErr = toApiError(err);
//     return Response.json({ error: apiErr }, { status: apiErr.status });
//   }
// }




















import { NextRequest } from "next/server";
import { cerboClient, toApiError } from "@/lib/http";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await cerboClient.get(`/patients/${id}`);
    return Response.json(res.data);
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { id } = await params;
    try {
      const res = await cerboClient.put(`/patients/${id}`, body);
      return Response.json(res.data);
    } catch (e) {
      const res = await cerboClient.patch(`/patients/${id}`, body);
      return Response.json(res.data);
    }
  } catch (err) {
    const apiErr = toApiError(err);
    return Response.json({ error: apiErr }, { status: apiErr.status });
  }
}
