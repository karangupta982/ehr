"use client";

import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

// Appointment type (simplified from API)
type Participant = { actor?: { reference?: string; display?: string } };
type AppointmentResource = {
  id: string;
  status?: string;
  appointmentType?: { text?: string };
  reasonCode?: { text?: string }[];
  start?: string;
  end?: string;
  minutesDuration?: number;
  participant?: Participant[];
};

// Supported appointment types for creation
const appointmentTypes = [
  { code: "1509", display: "New Patient" },
  { code: "1510", display: "Follow-up" },
];

// Convert API Bundle to appointments array
function parseBundleToAppointments(bundle: any): AppointmentResource[] {
  if (!bundle) return [];
  return (bundle.entry ?? []).map((e: any) => e.resource);
}


function extractIds(participants?: Participant[]) {
  let patientId: string | undefined;
  let providerId: string | undefined;

  participants?.forEach((p) => {
    const ref = p.actor?.reference ?? "";
    if (ref.includes("/Patient/")) {
      patientId = ref.split("/").pop();
    } else if (ref.includes("/Practitioner/")) {
      providerId = ref.split("/").pop();
    }
  });

  return { patientId, providerId };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterProvider, setFilterProvider] = useState<string>("");
  const [filterPatient, setFilterPatient] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");

  // Form states for creating/rescheduling
  const [showCreate, setShowCreate] = useState(false);
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createProvider, setCreateProvider] = useState("");
  const [createPatient, setCreatePatient] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createType, setCreateType] = useState(""); // stores type code

  const [showReschedule, setShowReschedule] = useState<AppointmentResource | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");

//   const [slots, setSlots] = useState<any[]>([]);



  // Fetch all appointments initially
  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch("/api/modmed/appointments");
        if (!res.ok) throw new Error("Failed to fetch appointments");
        const data = await res.json();
        setAppointments(parseBundleToAppointments(data));
      } catch (err: any) {
        setErrorMessage(err.message ?? "Failed to load");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      let ok = true;

      // if (filterDate) {
      //   const startDate = new Date(a.start ?? "").toISOString().split("T")[0];
      //   ok = ok && startDate === filterDate;
      // }
      // --- update date filtering in filteredAppointments ---
      if (filterDate) {
        const startDate = a.start
          ? new Date(a.start).toLocaleDateString("en-CA") // yyyy-mm-dd
          : "";
        ok = ok && startDate === filterDate;
      }


      if (filterStatus) {
        ok = ok && a.status?.toLowerCase() === filterStatus.toLowerCase();
      }

      if (filterType) {
        ok =
          ok &&
          Boolean(
            a.appointmentType?.text?.toLowerCase().includes(filterType.toLowerCase())
          );
      }
      

      if (filterProvider) {
        ok =
          ok &&
          Boolean(
            a.participant?.some((p) =>
              p.actor?.reference?.includes(`/Practitioner/${filterProvider}`)
            )
          );
      }

      if (filterPatient) {
        ok =
          ok &&
          Boolean(
            a.participant?.some((p) =>
              p.actor?.reference?.includes(`/Patient/${filterPatient}`)
            )
          );
      }

      return ok;
    });
  }, [appointments, filterDate, filterProvider, filterPatient, filterStatus, filterType]);

  // Check provider availability/conflicts
  const hasConflict = (providerId: string, start: string, end: string, ignoreId?: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return appointments.some((a) => {
      if (ignoreId && a.id === ignoreId) return false;
      if (!a.participant?.some((p) => p.actor?.reference?.includes(`/Practitioner/${providerId}`)))
        return false;
      const aS = new Date(a.start ?? "").getTime();
      const aE = new Date(a.end ?? "").getTime();
      return s < aE && aS < e;
    });
  };

  // Helper function to format datetime for FHIR
  const formatDateTimeForFHIR = (dateTime: string) => {
    // Convert "2025-09-18T15:49" to "2025-09-18T15:49:00.000Z"
    if (dateTime && !dateTime.includes(':')) {
      return dateTime;
    }
    if (dateTime && !dateTime.includes('Z') && !dateTime.includes('+')) {
      return dateTime + ':00.000Z';
    }
    return dateTime;
  };

  // Helper function to validate appointment duration (5-minute increments)
  const validateAppointmentDuration = (start: string, end: string): string | null => {
    try {
      const startTime = new Date(start);
      const endTime = new Date(end);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      
      if (durationMinutes <= 0) {
        return "❌ Invalid duration: End time must be after start time.";
      }
      
      if (durationMinutes % 5 !== 0) {
        return "❌ Invalid duration: Appointment duration must be in 5-minute increments. Please adjust your end time.";
      }
      
      return null; // Valid duration
    } catch (e) {
      return "❌ Invalid date format: Please check your date and time selection.";
    }
  };

  // Helper function to parse ModMed FHIR errors and show toast
  const showModMedError = (error: any, operation: string = "operation") => {
    try {
      // Check if it's a ModMed FHIR OperationOutcome error
      if (error?.details?.resourceType === "OperationOutcome" && error.details.issue) {
        const issues = Array.isArray(error.details.issue) ? error.details.issue : [error.details.issue];
        
        for (const issue of issues) {
          const diagnostics = issue.diagnostics;
          
          // Handle specific ModMed error messages with professional healthcare messaging
          if (diagnostics?.includes("BOOKING_UNAVAILABLE")) {
            toast.error("Time Slot Unavailable", {
              // description: "The selected appointment time is not available. Please choose a different time slot.",
              duration: 6000,
              style: {
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
              },
            });
            return;
          }
          
          if (diagnostics?.includes("appointment duration should be in increments of 5")) {
            toast.error("Appointment Duration should be in increments of 5", {
              // description: "Appointment duration must be in 5-minute increments. Please adjust your end time.",
              duration: 6000,
              style: {
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
              },
            });
            return;
          }
          
          if (diagnostics?.includes("Invalid date/time format")) {
            toast.error("Invalid Date Format. Please check your date and time selection and try again.", {
              // description: "Please check your date and time selection and try again.",
              duration: 5000,
              style: {
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
              },
            });
            return;
          }
          
          if (diagnostics?.includes("missing required element")) {
            toast.error("Missing Information. Please fill in all required fields before proceeding.", {
              // description: "Please fill in all required fields before proceeding.",
              duration: 5000,
              style: {
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
              },
            });
            return;
          }
          
          // Show specific diagnostics message if available
          if (diagnostics) {
            toast.error("Appointment Error. Please check your appointment details and try again.", {
              // description: diagnostics,
              duration: 6000,
              style: {
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
              },
            });
            return;
          }
        }
      }
      
      // Fallback to generic error message
      toast.error(`${operation} Failed. Please try again.`, {
        // description: error?.message || "An unexpected error occurred. Please try again.",
        duration: 5000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
        },
      });
    } catch (e) {
      toast.error(`${operation} Failed. Please try again.`, {
        // description: "An unexpected error occurred. Please try again.",
        duration: 5000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
        },
      });
    }
  };

  // Create appointment
  const handleCreate = async () => {
    if (!createProvider || !createPatient || !createLocation || !createType || !createStart || !createEnd) {
      toast.error("Missing Information. Please fill in Provider, Patient, Location, Type, Start and End.", {
        // description: "Please fill in all required fields before booking the appointment.",
        duration: 5000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
        },
      });
      return;
    }

    // Validate appointment duration before making API call
    const durationError = validateAppointmentDuration(createStart, createEnd);
    if (durationError) {
      toast.error("Invalid Appointment Duration. Please adjust your end time.", {
        // description: durationError.replace("❌ ", ""),
        duration: 6000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
        },
      });
      return;
    }

    if (hasConflict(createProvider, createStart, createEnd)) {
      toast.error("Schedule Conflict. The provider already has an overlapping appointment at this time. Please choose a different time slot.", {
        // description: "The provider already has an overlapping appointment at this time. Please choose a different time slot.",
        duration: 6000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
        },
      });
      return;
    }

    try {
      // Create proper FHIR Appointment resource
      // const body = {
      //   resourceType: "Appointment",
      //   status: "booked",
      //   start: formatDateTimeForFHIR(createStart),
      //   end: formatDateTimeForFHIR(createEnd),
      //   // appointmentType: {
      //   //   text: createType,
      //   // },

      //   appointmentType: {
      //     coding: [
      //       {
      //         system: "https://stage.ema-api.com/ema-dev/firm/entpmsandbox393/ema/fhir/v2/ValueSet/appointment-type",
      //         code: createType,       // this must be the numeric/string code (e.g., "1509")
      //         display: createType     // optional, matches human-readable text
      //       }
      //     ],
      //     text: createType
      //   },
      //   participant: [
      //     { 
      //       actor: { reference: `Patient/${createPatient}` },
      //       status: "accepted"
      //     },
      //     { 
      //       actor: { reference: `Practitioner/${createProvider}` },
      //       status: "accepted"
      //     },
      //     {
      //       actor: { reference: `Location/${createLocation}` },
      //       status: "accepted"
      //     },
      //   ],
      // };

      const selectedType = appointmentTypes.find(t => t.code === createType);
      const createDurationMinutes = Math.round((new Date(createEnd).getTime() - new Date(createStart).getTime()) / (1000 * 60));
      const body = {
        resourceType: "Appointment",
        status: "booked",
        start: formatDateTimeForFHIR(createStart),
        end: formatDateTimeForFHIR(createEnd),
        minutesDuration: createDurationMinutes,
        appointmentType: {
          coding: [
            {
              system:
                "https://stage.ema-api.com/ema-dev/firm/entpmsandbox393/ema/fhir/v2/ValueSet/appointment-type",
              code: createType,
              display: selectedType?.display ?? createType,
            },
          ],
          text: selectedType?.display ?? createType,
        },
        participant: [
          {
            actor: { reference: `Patient/${createPatient}` },
            status: "accepted",
          },
          {
            actor: { reference: `Practitioner/${createProvider}` },
            status: "accepted",
          },
          {
            actor: { reference: `Location/${createLocation}` },
            status: "accepted",
          },
        ],
      };
      

      console.log("🔄 Creating appointment:", body);

      const res = await fetch("/api/modmed/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Create failed:", errorData);
        throw errorData;
      }

      const newData = await res.json();
      console.log("✅ Create successful:", newData);
      
      // Show success toast
      toast.success(`Appointment Booked Successfully. Appointment scheduled for ${new Date(createStart).toLocaleDateString()} at ${new Date(createStart).toLocaleTimeString()}`, {
        // description: `Appointment scheduled for ${new Date(createStart).toLocaleDateString()} at ${new Date(createStart).toLocaleTimeString()}`,
        duration: 5000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '16px',
        },
      });
      
      setAppointments(parseBundleToAppointments(newData));
      setShowCreate(false);
    } catch (err: any) {
      console.error("❌ Create failed:", err);
      showModMedError(err, "Appointment Booking");
    }
  };

  // Reschedule appointment
  const handleReschedule = async () => {
    if (!showReschedule || !rescheduleStart || !rescheduleEnd) return;

    // Validate appointment duration before making API call
    const durationError = validateAppointmentDuration(rescheduleStart, rescheduleEnd);
    if (durationError) {
      toast.error("Invalid Appointment Duration. Please adjust your end time.", {
        // description: durationError.replace("❌ ", ""),
        duration: 6000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
        },
      });
      return;
    }

    const providerId = showReschedule.participant?.find((p) =>
      p.actor?.reference?.includes("/Practitioner/")
    )?.actor?.reference?.split("/").pop();

    if (!providerId) return;

    if (hasConflict(providerId, rescheduleStart, rescheduleEnd, showReschedule.id)) {
      toast.error("Schedule Conflict. The provider already has an overlapping appointment at this time. Please choose a different time slot.", {
        // description: "The provider already has an overlapping appointment at this time. Please choose a different time slot.",
        duration: 6000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
        },
      });
      return;
    }

    try {
      // Create proper FHIR Appointment resource for update
      const rescheduleDurationMinutes = Math.round((new Date(rescheduleEnd).getTime() - new Date(rescheduleStart).getTime()) / (1000 * 60));
      const updated = { 
        id: showReschedule.id,
        resourceType: "Appointment",
        status: showReschedule.status || "booked",
        start: formatDateTimeForFHIR(rescheduleStart), 
        end: formatDateTimeForFHIR(rescheduleEnd),
        minutesDuration: rescheduleDurationMinutes,
        participant: showReschedule.participant || [],
        appointmentType: showReschedule.appointmentType,
        reasonCode: showReschedule.reasonCode
      };
      
      console.log("🔄 Rescheduling appointment:", updated);
      
      const res = await fetch("/api/modmed/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Reschedule failed:", errorData);
        throw errorData;
      }
      
      // Show success toast
      toast.success("Appointment Rescheduled Successfully", {
        //  description: `Appointment rescheduled to ${new Date(rescheduleStart).toLocaleDateString()} at ${new Date(rescheduleStart).toLocaleTimeString()}`,
        duration: 5000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '16px',
        },
      });

      // Always refetch appointments after a successful reschedule,
      // since ModMed may return an empty body for PUT responses.
      try {
        const refreshRes = await fetch("/api/modmed/appointments");
        if (!refreshRes.ok) {
          const txt = await refreshRes.text();
          console.error("❌ Failed to refresh appointments:", txt);
        } else {
          const bundle = await refreshRes.json();
          setAppointments(parseBundleToAppointments(bundle));
        }
      } catch (refreshErr) {
        console.error("❌ Error refreshing appointments:", refreshErr);
      }

      setShowReschedule(null);
    } catch (err: any) {
      console.error("❌ Reschedule failed:", err);
      showModMedError(err, "Appointment Rescheduling");
    }
  };

  // Cancel appointment
  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/modmed/appointments?id=${id}`, { method: "DELETE" });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Cancel failed:", errorData);
        throw errorData;
      }
      
      const responseText = await res.text();
      let newData;
      
      if (responseText.trim() === '') {
        // Empty response means successful cancellation
        console.log("✅ Cancel successful (empty response)");
        newData = { entry: [] }; // Empty bundle to prevent errors
      } else {
        newData = JSON.parse(responseText);
        console.log("✅ Cancel successful:", newData);
      }
      
      // Show success toast
      toast.success("Appointment Cancelled Successfully", {
        duration: 5000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '16px',
        },
      });
      
      setAppointments(parseBundleToAppointments(newData));
    } catch (err: any) {
      console.error("❌ Cancel failed:", err);
      showModMedError(err, "Appointment Cancellation");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#fff',
            color: '#333',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e5e7eb',
          },
        }}
      />
      
      <h1 className="text-2xl font-bold mb-4">Appointments</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="p-2 border rounded"/>
        <input value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} placeholder="Provider ID" className="p-2 border rounded"/>
        <input value={filterPatient} onChange={(e) => setFilterPatient(e.target.value)} placeholder="Patient ID" className="p-2 border rounded"/>
        <input value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} placeholder="Status" className="p-2 border rounded"/>
        <input value={filterType} onChange={(e) => setFilterType(e.target.value)} placeholder="Type" className="p-2 border rounded"/>
        <button onClick={() => { setFilterDate(""); setFilterProvider(""); setFilterPatient(""); setFilterStatus(""); setFilterType(""); }} className="bg-gray-700 text-white p-2 rounded">Clear</button>
      </div>

      {/* Appointment list */}
      {isLoading ? (
        <div>Loading...</div>
      ) : filteredAppointments.length === 0 ? (
        <div>No appointments found</div>
      ) : (
        <div className="space-y-2">
          {filteredAppointments.map((a) => {
            const { patientId, providerId } = extractIds(a.participant);
            return (
              <div key={a.id} className="border p-2 rounded flex justify-between items-center">
                <div>
                  <div><strong>ID:</strong> {a.id}</div>
                  <div><strong>Status:</strong> {a.status}</div>
                  <div><strong>Type:</strong> {a.appointmentType?.text}</div>
                  <div>
                    <strong>Time:</strong>{" "}
                    {new Date(a.start ?? "").toLocaleString()} - {new Date(a.end ?? "").toLocaleTimeString()}
                  </div>
                  <div><strong>Patient Id:</strong> {patientId ? `${patientId}` : "N/A"}</div>
                  <div><strong>Provider Id:</strong> {providerId ? `${providerId}` : "N/A"}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowReschedule(a); setRescheduleStart(a.start ?? ""); setRescheduleEnd(a.end ?? ""); }} className="bg-yellow-500 text-white p-1 rounded">Reschedule</button>
                  {/* <button onClick={() => handleCancel(a.id)} className="bg-red-500 text-white p-1 rounded">Cancel</button> */}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <button onClick={() => setShowCreate(true)} className="bg-green-500 text-white p-2 rounded">New Appointment</button>


      </div>

      {/* Create Appointment Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
          <div className="bg-white text-black p-4 rounded w-full max-w-md space-y-2">
            <h2 className="font-bold text-lg">Book Appointment</h2>
            <input placeholder="Provider ID" value={createProvider} onChange={(e) => setCreateProvider(e.target.value)} className="w-full p-2 border rounded"/>
            <input placeholder="Patient ID" value={createPatient} onChange={(e) => setCreatePatient(e.target.value)} className="w-full p-2 border rounded"/>
            <input placeholder="Location ID" value={createLocation} onChange={(e) => setCreateLocation(e.target.value)} className="w-full p-2 border rounded"/>
            <select value={createType} onChange={(e) => setCreateType(e.target.value)} className="w-full p-2 border rounded">
              <option value="" disabled>Select Appointment Type</option>
              {appointmentTypes.map(t => (
                <option key={t.code} value={t.code}>{t.display}</option>
              ))}
            </select>
            <input type="datetime-local" value={createStart} onChange={(e) => setCreateStart(e.target.value)} className="w-full p-2 border rounded"/>
            <input type="datetime-local" value={createEnd} onChange={(e) => setCreateEnd(e.target.value)} className="w-full p-2 border rounded"/>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="bg-gray-500 text-white p-2 rounded">Cancel</button>
              <button onClick={handleCreate} className="bg-green-500 text-white p-2 rounded">Book</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showReschedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
          <div className="bg-white text-black p-4 rounded w-full max-w-md space-y-2">
            <h2 className="font-bold text-lg">Reschedule Appointment</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Start Date & Time</label>
              <input 
                type="datetime-local" 
                value={rescheduleStart} 
                onChange={(e) => setRescheduleStart(e.target.value)} 
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New End Date & Time</label>
              <input 
                type="datetime-local" 
                value={rescheduleEnd} 
                onChange={(e) => setRescheduleEnd(e.target.value)} 
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReschedule(null)} className="bg-gray-500 text-white p-2 rounded">Cancel</button>
              <button onClick={handleReschedule} className="bg-yellow-500 text-white p-2 rounded">Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













// "use client";

// import { useEffect, useMemo, useState } from "react";
// import toast, { Toaster } from "react-hot-toast";

// // Appointment type (simplified from API)
// type Participant = { actor?: { reference?: string; display?: string } };
// type AppointmentResource = {
//   id: string;
//   status?: string;
//   appointmentType?: { text?: string };
//   reasonCode?: { text?: string }[];
//   start?: string;
//   end?: string;
//   minutesDuration?: number;
//   participant?: Participant[];
// };

// // Supported appointment types for creation
// const appointmentTypes = [
//   { code: "1509", display: "New Patient" },
//   { code: "1510", display: "Follow-up" },
// ];

// // Convert API Bundle to appointments array
// function parseBundleToAppointments(bundle: any): AppointmentResource[] {
//   if (!bundle) return [];
//   return (bundle.entry ?? []).map((e: any) => e.resource);
// }

// function extractIds(participants?: Participant[]) {
//   let patientId: string | undefined;
//   let providerId: string | undefined;

//   participants?.forEach((p) => {
//     const ref = p.actor?.reference ?? "";
//     if (ref.includes("/Patient/")) {
//       patientId = ref.split("/").pop();
//     } else if (ref.includes("/Practitioner/")) {
//       providerId = ref.split("/").pop();
//     }
//   });

//   return { patientId, providerId };
// }

// export default function AppointmentsPage() {
//   const [appointments, setAppointments] = useState<AppointmentResource[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   // Filters
//   const [filterDate, setFilterDate] = useState<string>("");
//   const [filterProvider, setFilterProvider] = useState<string>("");
//   const [filterPatient, setFilterPatient] = useState<string>("");
//   const [filterStatus, setFilterStatus] = useState<string>("");
//   const [filterType, setFilterType] = useState<string>("");

//   // Form states for creating/rescheduling
//   const [showCreate, setShowCreate] = useState(false);
//   const [createStart, setCreateStart] = useState("");
//   const [createEnd, setCreateEnd] = useState("");
//   const [createProvider, setCreateProvider] = useState("");
//   const [createPatient, setCreatePatient] = useState("");
//   const [createLocation, setCreateLocation] = useState("");
//   const [createType, setCreateType] = useState(""); // stores type code

//   const [showReschedule, setShowReschedule] = useState<AppointmentResource | null>(null);
//   const [rescheduleStart, setRescheduleStart] = useState("");
//   const [rescheduleEnd, setRescheduleEnd] = useState("");

//   const [slots, setSlots] = useState<any[]>([]);

//   /** ------------------- FETCH AVAILABLE SLOTS ------------------- */
//   const fetchSlots = async () => {
//     if (!createProvider || !createLocation || !createStart) {
//       toast.error("Please select provider, location, and date.");
//       return;
//     }

//     try {
//       const dateOnly = createStart.split("T")[0];
//       const res = await fetch(
//         `/api/modmed/availability?providerId=${createProvider}&locationId=${createLocation}&start=${dateOnly}&end=${dateOnly}`
//       );
//       if (!res.ok) throw new Error("Failed to fetch slots");
//       const data = await res.json();

//       setSlots(data.entry ?? []);
//     } catch (err: any) {
//       toast.error("Failed to load slots: " + err.message);
//     }
//   };

//   /** ------------------- FETCH ALL APPOINTMENTS ------------------- */
//   useEffect(() => {
//     const fetchAppointments = async () => {
//       setIsLoading(true);
//       setErrorMessage(null);

//       try {
//         const res = await fetch("/api/modmed/appointments");
//         if (!res.ok) throw new Error("Failed to fetch appointments");
//         const data = await res.json();
//         setAppointments(parseBundleToAppointments(data));
//       } catch (err: any) {
//         setErrorMessage(err.message ?? "Failed to load");
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchAppointments();
//   }, []);

//   /** ------------------- FILTERED APPOINTMENTS ------------------- */
//   const filteredAppointments = useMemo(() => {
//     return appointments.filter((a) => {
//       let ok = true;

//       if (filterDate) {
//         const startDate = a.start
//           ? new Date(a.start).toLocaleDateString("en-CA")
//           : "";
//         ok = ok && startDate === filterDate;
//       }

//       if (filterStatus) {
//         ok = ok && a.status?.toLowerCase() === filterStatus.toLowerCase();
//       }

//       if (filterType) {
//         ok =
//           ok &&
//           Boolean(
//             a.appointmentType?.text?.toLowerCase().includes(filterType.toLowerCase())
//           );
//       }

//       if (filterProvider) {
//         ok =
//           ok &&
//           Boolean(
//             a.participant?.some((p) =>
//               p.actor?.reference?.includes(`/Practitioner/${filterProvider}`)
//             )
//           );
//       }

//       if (filterPatient) {
//         ok =
//           ok &&
//           Boolean(
//             a.participant?.some((p) =>
//               p.actor?.reference?.includes(`/Patient/${filterPatient}`)
//             )
//           );
//       }

//       return ok;
//     });
//   }, [appointments, filterDate, filterProvider, filterPatient, filterStatus, filterType]);

//   /** ------------------- HELPER FUNCTIONS ------------------- */
//   const hasConflict = (providerId: string, start: string, end: string, ignoreId?: string) => {
//     const s = new Date(start).getTime();
//     const e = new Date(end).getTime();
//     return appointments.some((a) => {
//       if (ignoreId && a.id === ignoreId) return false;
//       if (!a.participant?.some((p) => p.actor?.reference?.includes(`/Practitioner/${providerId}`)))
//         return false;
//       const aS = new Date(a.start ?? "").getTime();
//       const aE = new Date(a.end ?? "").getTime();
//       return s < aE && aS < e;
//     });
//   };

//   const formatDateTimeForFHIR = (dateTime: string) => {
//     if (!dateTime.includes('Z')) return dateTime + ':00.000Z';
//     return dateTime;
//   };

//   const validateAppointmentDuration = (start: string, end: string): string | null => {
//     try {
//       const startTime = new Date(start);
//       const endTime = new Date(end);
//       const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
//       if (durationMinutes <= 0) return "Invalid duration";
//       if (durationMinutes % 5 !== 0) return "Duration must be in 5-minute increments";
//       return null;
//     } catch (e) {
//       return "Invalid date format";
//     }
//   };

//   const showModMedError = (error: any, operation: string = "operation") => {
//     toast.error(error?.message || `${operation} failed`);
//   };

//   /** ------------------- CREATE ------------------- */
//   const handleCreate = async () => {
//     if (!createProvider || !createPatient || !createLocation || !createType || !createStart || !createEnd) {
//       toast.error("Fill all fields to book appointment");
//       return;
//     }

//     const durationError = validateAppointmentDuration(createStart, createEnd);
//     if (durationError) return toast.error(durationError);

//     if (hasConflict(createProvider, createStart, createEnd))
//       return toast.error("Provider has a conflicting appointment");

//     try {
//       const selectedType = appointmentTypes.find(t => t.code === createType);
//       const body = {
//         resourceType: "Appointment",
//         status: "booked",
//         start: formatDateTimeForFHIR(createStart),
//         end: formatDateTimeForFHIR(createEnd),
//         appointmentType: {
//           coding: [
//             {
//               system: "https://stage.ema-api.com/.../appointment-type",
//               code: createType,
//               display: selectedType?.display ?? createType,
//             },
//           ],
//           text: selectedType?.display ?? createType,
//         },
//         participant: [
//           { actor: { reference: `Patient/${createPatient}` }, status: "accepted" },
//           { actor: { reference: `Practitioner/${createProvider}` }, status: "accepted" },
//           { actor: { reference: `Location/${createLocation}` }, status: "accepted" },
//         ],
//       };

//       const res = await fetch("/api/modmed/appointments", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });

//       if (!res.ok) throw await res.json();

//       const data = await res.json();
//       setAppointments(parseBundleToAppointments(data));
//       setShowCreate(false);
//       toast.success("Appointment booked successfully");
//     } catch (err: any) {
//       console.error(err);
//       showModMedError(err, "Booking");
//     }
//   };

//   /** ------------------- CANCEL ------------------- */
//   const handleCancel = async (id: string) => {
//     try {
//       const res = await fetch(`/api/modmed/appointments/${id}`, { method: "DELETE" });
//       if (!res.ok) throw await res.json();
//       // Remove locally after success
//       setAppointments(prev => prev.filter(a => a.id !== id));
//       toast.success("Appointment cancelled");
//     } catch (err: any) {
//       console.error(err);
//       showModMedError(err, "Cancel");
//     }
//   };

//   /** ------------------- RESCHEDULE ------------------- */
//   const handleReschedule = async () => {
//     if (!showReschedule || !rescheduleStart || !rescheduleEnd) return;

//     const durationError = validateAppointmentDuration(rescheduleStart, rescheduleEnd);
//     if (durationError) return toast.error(durationError);

//     const providerId = showReschedule.participant?.find(p =>
//       p.actor?.reference?.includes("/Practitioner/")
//     )?.actor?.reference?.split("/").pop();
//     if (!providerId) return;

//     if (hasConflict(providerId, rescheduleStart, rescheduleEnd, showReschedule.id))
//       return toast.error("Provider has a conflicting appointment");

//     try {
//       const updated = {
//         ...showReschedule,
//         start: formatDateTimeForFHIR(rescheduleStart),
//         end: formatDateTimeForFHIR(rescheduleEnd),
//       };

//       const res = await fetch("/api/modmed/appointments", {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(updated),
//       });

//       if (!res.ok) throw await res.json();
//       toast.success("Appointment rescheduled");
//       setShowReschedule(null);
//       // Refresh appointments
//       const refresh = await fetch("/api/modmed/appointments");
//       const bundle = await refresh.json();
//       setAppointments(parseBundleToAppointments(bundle));
//     } catch (err: any) {
//       console.error(err);
//       showModMedError(err, "Reschedule");
//     }
//   };

//   /** ------------------- RENDER ------------------- */
//   return (
//     <div className="p-6 max-w-6xl mx-auto">
//       <Toaster position="top-right" />

//       <h1 className="text-2xl font-bold mb-4">Appointments</h1>

//       {/* Filters */}
//       <div className="flex flex-col sm:flex-row gap-3 mb-4">
//         <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="p-2 border rounded"/>
//         <input value={filterProvider} onChange={e => setFilterProvider(e.target.value)} placeholder="Provider ID" className="p-2 border rounded"/>
//         <input value={filterPatient} onChange={e => setFilterPatient(e.target.value)} placeholder="Patient ID" className="p-2 border rounded"/>
//         <input value={filterStatus} onChange={e => setFilterStatus(e.target.value)} placeholder="Status" className="p-2 border rounded"/>
//         <input value={filterType} onChange={e => setFilterType(e.target.value)} placeholder="Type" className="p-2 border rounded"/>
//         <button onClick={() => { setFilterDate(""); setFilterProvider(""); setFilterPatient(""); setFilterStatus(""); setFilterType(""); }} className="bg-gray-700 text-white p-2 rounded">Clear</button>
//       </div>

//       {/* Appointment List */}
//       {isLoading ? <div>Loading...</div> :
//         filteredAppointments.length === 0 ? <div>No appointments found</div> :
//         <div className="space-y-2">
//           {filteredAppointments.map(a => {
//             const { patientId, providerId } = extractIds(a.participant);
//             return (
//               <div key={a.id} className="border p-2 rounded flex justify-between items-center">
//                 <div>
//                   <div><strong>ID:</strong> {a.id}</div>
//                   <div><strong>Status:</strong> {a.status}</div>
//                   <div><strong>Type:</strong> {a.appointmentType?.text}</div>
//                   <div><strong>Time:</strong> {new Date(a.start ?? "").toLocaleString()} - {new Date(a.end ?? "").toLocaleTimeString()}</div>
//                   <div><strong>Patient Id:</strong> {patientId ?? "N/A"}</div>
//                   <div><strong>Provider Id:</strong> {providerId ?? "N/A"}</div>
//                 </div>
//                 <div className="flex gap-2">
//                   <button onClick={() => { setShowReschedule(a); setRescheduleStart(a.start ?? ""); setRescheduleEnd(a.end ?? ""); }} className="bg-yellow-500 text-white p-1 rounded">Reschedule</button>
//                   <button onClick={() => handleCancel(a.id)} className="bg-red-500 text-white p-1 rounded">Cancel</button>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       }

//       {/* New Appointment + Show Slots */}
//       {showCreate && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
//           <div className="bg-white text-black p-4 rounded w-full max-w-md space-y-2">
//             <h2 className="font-bold text-lg">Book Appointment</h2>
//             <input placeholder="Provider ID" value={createProvider} onChange={(e) => setCreateProvider(e.target.value)} className="w-full p-2 border rounded"/>
//             <input placeholder="Patient ID" value={createPatient} onChange={(e) => setCreatePatient(e.target.value)} className="w-full p-2 border rounded"/>
//             <input placeholder="Location ID" value={createLocation} onChange={(e) => setCreateLocation(e.target.value)} className="w-full p-2 border rounded"/>
//             <select value={createType} onChange={(e) => setCreateType(e.target.value)} className="w-full p-2 border rounded">
//               <option value="" disabled>Select Appointment Type</option>
//               {appointmentTypes.map(t => <option key={t.code} value={t.code}>{t.display}</option>)}
//             </select>
//             <input type="datetime-local" value={createStart} onChange={(e) => setCreateStart(e.target.value)} className="w-full p-2 border rounded"/>
//             <input type="datetime-local" value={createEnd} onChange={(e) => setCreateEnd(e.target.value)} className="w-full p-2 border rounded"/>

//             <button onClick={fetchSlots} className="bg-blue-500 text-white p-2 rounded w-full">Show Available Slots</button>

//             {slots.length > 0 && (
//               <div className="mt-2 space-y-1">
//                 {slots.map((s, i) => {
//                   const start = new Date(s.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//                   const end = new Date(s.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//                   return (
//                     <button key={i} onClick={() => { setCreateStart(s.start); setCreateEnd(s.end); }} className="block w-full text-left border p-2 rounded hover:bg-gray-100">{start} - {end}</button>
//                   )
//                 })}
//               </div>
//             )}

//             <div className="flex justify-end gap-2">
//               <button onClick={() => setShowCreate(false)} className="bg-gray-500 text-white p-2 rounded">Cancel</button>
//               <button onClick={handleCreate} className="bg-green-500 text-white p-2 rounded">Book</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Reschedule Modal */}
//       {showReschedule && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
//           <div className="bg-white text-black p-4 rounded w-full max-w-md space-y-2">
//             <h2 className="font-bold text-lg">Reschedule Appointment</h2>
//             <input type="datetime-local" value={rescheduleStart} onChange={(e) => setRescheduleStart(e.target.value)} className="w-full p-2 border rounded"/>
//             <input type="datetime-local" value={rescheduleEnd} onChange={(e) => setRescheduleEnd(e.target.value)} className="w-full p-2 border rounded"/>
//             <div className="flex justify-end gap-2">
//               <button onClick={() => setShowReschedule(null)} className="bg-gray-500 text-white p-2 rounded">Cancel</button>
//               <button onClick={handleReschedule} className="bg-yellow-500 text-white p-2 rounded">Update</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Open New Appointment */}
//       {!showCreate && (
//         <div className="mt-4">
//           <button onClick={() => setShowCreate(true)} className="bg-green-500 text-white p-2 rounded">New Appointment</button>
//         </div>
//       )}

//     </div>
//   );
// }
