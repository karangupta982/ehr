// // import { NextRequest } from "next/server";
// // import { cerboClient, toApiError } from "@/lib/http";

// // export async function GET(
// // 	_req: NextRequest,
// // 	{ params }: { params: Promise<{ id: string }> }
// // ) {
// // 	try {
// // 		const { id } = await params;
// // 		const res = await cerboClient.get(`/patients/${id}`);
// // 		return Response.json(res.data);
// // 	} catch (err) {
// // 		const apiErr = toApiError(err);
// // 		return Response.json({ error: apiErr }, { status: apiErr.status });
// // 	}
// // }

// // export async function PUT(
// // 	req: NextRequest,
// // 	{ params }: { params: Promise<{ id: string }> }
// // ) {
// // 	try {
// // 		const body = await req.json();
// // 		const { id } = await params;
// // 		try {
// // 			const res = await cerboClient.put(`/patients/${id}`, body);
// // 			return Response.json(res.data);
// // 		} catch (e) {
// // 			const res = await cerboClient.patch(`/patients/${id}`, body);
// // 			return Response.json(res.data);
// // 		}
// // 	} catch (err) {
// // 		const apiErr = toApiError(err);
// // 		return Response.json({ error: apiErr }, { status: apiErr.status });
// // 	}
// // }

// // export async function PATCH(
// // 	req: NextRequest,
// // 	{ params }: { params: Promise<{ id: string }> }
// // ) {
// // 	try {
// // 		const body = await req.json();
// // 		const { id } = await params;
// // 		const res = await cerboClient.patch(`/patients/${id}`, body);
// // 		return Response.json(res.data);
// // 	} catch (err) {
// // 		const apiErr = toApiError(err);
// // 		return Response.json({ error: apiErr }, { status: apiErr.status });
// // 	}
// // }

// // export async function DELETE(
// // 	_req: NextRequest,
// // 	{ params }: { params: Promise<{ id: string }> }
// // ) {
// // 	try {
// // 		const { id } = await params;
// // 		const res = await cerboClient.delete(`/patients/${id}`);
// // 		return Response.json(res.data);
// // 	} catch (err) {
// // 		const apiErr = toApiError(err);
// // 		return Response.json({ error: apiErr }, { status: apiErr.status });
// // 	}
// // }












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

// export async function PATCH(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const body = await req.json();
//     const res = await cerboClient.patch(`/patients/${params.id}`, body);
//     return Response.json(res.data);
//   } catch (err) {
//     const apiErr = toApiError(err);
//     return Response.json({ error: apiErr }, { status: apiErr.status });
//   }
// }

// export async function DELETE(
//   _req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const res = await cerboClient.delete(`/patients/${params.id}`);
//     return Response.json(res.data);
//   } catch (err) {
//     const apiErr = toApiError(err);
//     return Response.json({ error: apiErr }, { status: apiErr.status });
//   }
// }













import { NextRequest } from "next/server";
import { cerboClient, toApiError } from "@/lib/http";

export async function GET(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
  ) {
	try {
	  const { id } = await context.params;
	  const res = await cerboClient.get(`/patients/${id}`);
	  return Response.json(res.data);
	} catch (err) {
	  const apiErr = toApiError(err);
	  return Response.json({ error: apiErr }, { status: apiErr.status });
	}
  }

// export async function PATCH(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const body = await req.json();
//     const res = await cerboClient.patch(`/patients/${params.id}`, body);
//     return Response.json(res.data);
//   } catch (err) {
//     const apiErr = toApiError(err);
//     return Response.json({ error: apiErr }, { status: apiErr.status });
//   }
// }
export async function PATCH(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }  
  ) {
	try {
	  const { id } = await context.params; 
	  const body = await req.json();
	  const res = await cerboClient.patch(`/patients/${id}`, body);
	  return Response.json(res.data);
	} catch (err) {
	  const apiErr = toApiError(err);
	  return Response.json({ error: apiErr }, { status: apiErr.status });
	}
  }
  

  export async function DELETE(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
  ) {
	try {
	  const { id } = await context.params;
	  const res = await cerboClient.delete(`/patients/${id}`);
	  return Response.json(res.data);
	} catch (err) {
	  const apiErr = toApiError(err);
	  return Response.json({ error: apiErr }, { status: apiErr.status });
	}
  }