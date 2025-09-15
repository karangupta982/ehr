"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Appointment = {
  id: string;
  date?: string;
  providerId?: string;
  patientId?: string;
};

export default function AppointmentsPage() {
  const [date, setDate] = useState("");
  const { data, isLoading, error, refetch } = useQuery<{ appointments: Appointment[] } | any>({
    queryKey: ["appointments", date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      const res = await fetch(`/api/modmed/appointments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Appointments</h1>
      <div className="flex gap-2 items-center">
        <input
          type="date"
          className="border px-2 py-1 rounded"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className="border px-3 py-1 rounded" onClick={() => refetch()}>
          Load
        </button>
      </div>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-red-600">Error loading appointments</div>}
      <ul className="divide-y border rounded">
        {(Array.isArray(data) ? data : data?.appointments ?? []).map((a: Appointment) => (
          <li key={a.id} className="p-3">
            <div className="font-medium">{a.date}</div>
            <div className="text-xs text-gray-500">Provider: {a.providerId} • Patient: {a.patientId}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}


