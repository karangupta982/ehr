"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Patient = {
  id: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
};

export default function PatientsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useQuery<{ patients: Patient[] } | any>({
    queryKey: ["patients", q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/cerbo/patients?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Patient Management</h1>
      <div className="flex gap-2">
        <input
          className="border px-2 py-1 rounded w-full max-w-[320px]"
          placeholder="Search by name or ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="border px-3 py-1 rounded" onClick={() => refetch()}>
          Search
        </button>
      </div>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-red-600">Error loading patients</div>}
      <ul className="divide-y border rounded">
        {(Array.isArray(data) ? data : data?.patients ?? []).map((p: Patient) => (
          <li key={p.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.first_name} {p.last_name}</div>
              <div className="text-xs text-gray-500">ID: {p.id} {p.dob ? `• DOB: ${p.dob}` : ""}</div>
            </div>
            <a className="text-blue-600 hover:underline" href={`/patients/${p.id}`}>View</a>
          </li>
        ))}
      </ul>
    </div>
  );
}


