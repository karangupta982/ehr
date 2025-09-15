"use client";
import { useEffect, useMemo, useState } from "react";
import { usePatientsStore, type Patient } from "@/store/patients";

export default function PatientsPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [filterId, setFilterId] = useState("");
  const [filterNickname, setFilterNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patients = usePatientsStore((s) => s.list);
  const setPatients = usePatientsStore((s) => s.setList);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPatient = useMemo(() => patients.find((p) => String(p.id) === String(selectedId)), [patients, selectedId]);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conditionInput, setConditionInput] = useState("");
  

  async function loadPatients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cerbo/patients`);
      if (!res.ok) throw new Error("Failed to fetch patients");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || data.patients || [];
      setPatients(list);
    } catch (e: any) {
      setError(e?.message || "Error loading patients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const idMatch = filterId ? String(p.id).toLowerCase().includes(filterId.toLowerCase()) : true;
      const nickMatch = filterNickname ? (p.nicknames || "").toLowerCase().includes(filterNickname.toLowerCase()) : true;
      const firstMatch = firstName ? (p.first_name || "").toLowerCase().includes(firstName.toLowerCase()) : true;
      const lastMatch = lastName ? (p.last_name || "").toLowerCase().includes(lastName.toLowerCase()) : true;
      return idMatch && nickMatch && firstMatch && lastMatch;
    });
  }, [patients, filterId, filterNickname, firstName, lastName]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-[1px] bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-lg">
        <div className="rounded-2xl bg-black/60 backdrop-blur px-6 py-5 border border-white/10">
          <h1 className="text-2xl font-semibold text-white">Patient Management</h1>
          <p className="text-sm text-gray-300 mt-1">Search, filter, and manage patient records</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-4 items-end">
        <label className="text-sm">
          <div className="mb-1">First name</div>
          <input className="border px-2 py-2 rounded w-full" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="text-sm">
          <div className="mb-1">Last name</div>
          <input className="border px-2 py-2 rounded w-full" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label className="text-sm">
          <div className="mb-1">Filter by ID</div>
          <input className="border px-2 py-2 rounded w-full" value={filterId} onChange={(e) => setFilterId(e.target.value)} />
        </label>
        <label className="text-sm">
          <div className="mb-1">Filter by nickname</div>
          <input className="border px-2 py-2 rounded w-full" value={filterNickname} onChange={(e) => setFilterNickname(e.target.value)} />
        </label>
      </div>

      <div className="hidden">
        <label className="text-sm">
          <div className="mb-1">Filter by ID</div>
          <input className="border px-2 py-2 rounded w-full" value={filterId} onChange={(e) => setFilterId(e.target.value)} />
        </label>
        <label className="text-sm">
          <div className="mb-1">Filter by nickname</div>
          <input className="border px-2 py-2 rounded w-full" value={filterNickname} onChange={(e) => setFilterNickname(e.target.value)} />
        </label>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {filtered.map((p) => (
            <button key={p.id} onClick={() => {
              setSelectedId(String(p.id));
              setEditMode(false);
              setForm({
                first_name: p.first_name ?? "",
                last_name: p.last_name ?? "",
                email1: p.email1 ?? "",
                phone_mobile: p.phone_mobile ?? "",
                address1: p.address1 ?? p.address?.address1 ?? "",
                city: p.city ?? p.address?.city ?? "",
                state: p.state ?? p.address?.state ?? "",
                zip: p.zip ?? p.address?.zip ?? "",
              });
            }} className={`text-left rounded-2xl border border-white/10 p-4 hover:shadow-xl hover:scale-[1.01] transition bg-white/5 backdrop-blur ${String(selectedId) === String(p.id) ? "ring-2 ring-indigo-500" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-semibold">
                    {(p.first_name?.[0] || "").toUpperCase()}{(p.last_name?.[0] || "").toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{p.first_name} {p.last_name}</div>
                    <div className="text-xs text-gray-400">DOB: {p.dob || "-"}</div>
                  </div>
                </div>
                <div className="text-xs text-indigo-300">ID: {p.id}</div>
              </div>
              <div className="text-xs text-gray-400 mt-2">Nickname: {p.nicknames || "-"}</div>
              <div className="text-xs text-gray-400">{p.city || p.address?.city || ""}{(p.state || p.address?.state) ? `, ${p.state || p.address?.state}` : ""}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-1">
          {selectedPatient ? (
            <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur">
              <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 p-4 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</div>
                    <div className="text-xs opacity-90">ID: {selectedPatient.id} • {selectedPatient.dob || "DOB N/A"}</div>
                  </div>
                </div>
              </div>
              <button className="absolute top-3 right-3 text-xs bg-gradient-to-br from-indigo-500 to-fuchsia-600 hover:opacity-90 px-3 py-1 rounded-full text-white" onClick={() => setEditMode((v) => !v)}>{editMode ? "Cancel" : "Edit"}</button>
              <div className="p-5 space-y-6">
                <section className="space-y-2">
                  <div className="font-medium text-white border-b border-white/10 pb-2">Demographics & Contact</div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(form).map(([key, value]) => (
                      <label key={key} className="text-xs">
                        <div className="mb-1 capitalize">{key.replaceAll("_", " ")}</div>
                        <input disabled={!editMode} className={`border border-white/10 px-3 py-2 rounded-xl w-full bg-white/10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500`} value={String(value ?? "")} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                      </label>
                    ))}
                  </div>
                  {editMode && (
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        disabled={saving}
                        className={`border border-indigo-400 px-4 py-2 rounded-xl ${saving ? "bg-indigo-400/70" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                      onClick={async () => {
                        if (!selectedPatient) return;
                        setSaving(true);
                        setSaveError(null);
                        const optimistic = { ...selectedPatient, ...form } as Patient;
                        setPatients(patients.map((pp) => (String(pp.id) === String(optimistic.id) ? optimistic : pp)));
                        const res = await fetch(`/api/cerbo/patients/${selectedPatient.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(form),
                        });
                        if (!res.ok) {
                          setSaveError("Save failed");
                        } else {
                          setEditMode(false);
                        }
                        setSaving(false);
                      }}
                      >
                        {saving ? "Saving..." : "Save changes"}
                      </button>
                      {saveError && <span className="text-xs text-red-400">{saveError}</span>}
                    </div>
                  )}
                </section>

                <section className="space-y-2">
                  <div className="font-medium text-white border-b border-white/10 pb-2">Address</div>
                  <div className="text-sm text-gray-300">
                    {(selectedPatient.address1 || selectedPatient.address?.address1) || ""} {selectedPatient.address2 || selectedPatient.address?.address2 || ""}
                    <div>{selectedPatient.city || selectedPatient.address?.city || ""} {selectedPatient.state || selectedPatient.address?.state || ""} {selectedPatient.zip || selectedPatient.address?.zip || ""}</div>
                    <div>{selectedPatient.country || selectedPatient.address?.country || ""}</div>
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="font-medium text-white border-b border-white/10 pb-2">Insurance</div>
                  <div className="text-xs text-gray-300">Plan: {selectedPatient.insurance_plan ?? selectedPatient.insurance?.insurance_plan ?? "-"}</div>
                  <div className="text-xs text-gray-300">Group: {selectedPatient.insurance_group ?? selectedPatient.insurance?.insurance_group ?? "-"}</div>
                  <div className="text-xs text-gray-300">ID: {selectedPatient.insurance_id ?? selectedPatient.insurance?.insurance_id ?? "-"}</div>
                </section>

                <section className="space-y-2">
                  <div className="font-medium text-white border-b border-white/10 pb-2">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedPatient.tags || []).map((t, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 rounded-full bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-indigo-200 border border-white/10">{t.name}{t.tag_category ? ` • ${t.tag_category}` : ""}</span>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="font-medium text-white border-b border-white/10 pb-2">Medical Conditions</div>
                  <ul className="list-disc pl-4 text-sm">
                    {(selectedPatient.tags || []).filter((t) => (t.tag_category || "").toLowerCase().includes("medical condition")).map((t, idx) => (
                      <li key={idx} className="text-gray-300">{t.name}</li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2">
                    <input className="border border-white/10 px-3 py-2 rounded-xl w-full bg-white/10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Add condition" value={conditionInput} onChange={(e) => setConditionInput(e.target.value)} />
                    {/* <button className="text-xs border border-white/10 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20" onClick={async () => {
                      const name = conditionInput.trim();
                      if (!name || !selectedPatient) return;
                      await fetch(`/api/cerbo/patients/${selectedPatient.id}/conditions`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name }),
                      });
                      const newTags = [...(selectedPatient.tags || []), { name, tag_category: "Medical Condition" }];
                      const updated = { ...selectedPatient, tags: newTags } as Patient;
                      setPatients(patients.map((pp) => (String(pp.id) === String(updated.id) ? updated : pp)));
                      setConditionInput("");
                    }}>Add</button> */}

                  <button
                    className="ml-2 text-xs px-3 py-2 rounded-xl bg-indigo-600 text-white 
                              hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!conditionInput.trim()}
                    onClick={async () => {
                      const name = conditionInput.trim();
                      if (!name || !selectedPatient) return;

                      try {
                        await fetch(`/api/cerbo/patients/${selectedPatient.id}/conditions`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify([
                            { name, tag_category: "Medical Condition" }
                          ]),
                        });

                        // Update local state
                        const newTags = [...(selectedPatient.tags || []), { name, tag_category: "Medical Condition" }];
                        const updated = { ...selectedPatient, tags: newTags } as Patient;
                        setPatients(patients.map((pp) => (String(pp.id) === String(updated.id) ? updated : pp)));
                        setConditionInput("");
                      } catch (err) {
                        console.error("Failed to add condition", err);
                        alert("Something went wrong while adding condition");
                      }
                    }}
                  >
                    Add
                  </button>

                  </div>
                </section>

                
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Select a patient to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}


