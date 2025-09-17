
"use client"

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Search, UserPlus, Edit2, Trash2, User, MapPin, Phone, Mail, X, Check, AlertCircle, Loader } from "lucide-react";

// Types
interface Patient {
  id: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  sex?: string;
  email1?: string;
  phone_mobile?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  nicknames?: string;
  address?: {
    address1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

interface NewPatient {
  first_name: string;
  last_name: string;
  dob: string;
  sex: string;
}

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
    type === 'success' ? 'bg-green-100 text-green-800 border-green-200' :
    type === 'error' ? 'bg-red-100 text-red-800 border-red-200' :
    'bg-blue-100 text-blue-800 border-blue-200'
  } border`}>
    {type === 'success' && <Check className="w-5 h-5" />}
    {type === 'error' && <AlertCircle className="w-5 h-5" />}
    <span className="text-sm font-medium">{message}</span>
    <button onClick={onClose} className="ml-2">
      <X className="w-4 h-4" />
    </button>
  </div>
);

export default function ImprovedPatientsPage() {
  // State management
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form states
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const [newPatient, setNewPatient] = useState<NewPatient>({ first_name: "", last_name: "", dob: "", sex: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState<'all' | 'name' | 'id' | 'nickname'>('all');
  const [lookupId, setLookupId] = useState("");

  // Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Load all patients
  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cerbo/patients');
      if (!res.ok) throw new Error(`Failed to fetch patients: ${res.status}`);
      
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || data.patients || [];
      setPatients(list);
      showToast(`Loaded ${list.length} patients`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Error loading patients: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Fetch patient by ID
  const fetchPatientById = useCallback(async (id: string) => {
    if (!id.trim()) {
      showToast('Please enter a patient ID', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/cerbo/patients/${id.trim()}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Patient not found');
        }
        throw new Error(`Failed to fetch patient: ${res.status}`);
      }
      
      const data = await res.json();
      setPatients([data]);
      setSelectedPatient(data);
      showToast('Patient found successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Error: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Add new patient
  const handleAddPatient = useCallback(async () => {
    if (!newPatient.first_name.trim() || !newPatient.last_name.trim()) {
      showToast('First name and last name are required', 'error');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/cerbo/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add patient');
      }

      const data = await res.json();
      setPatients(prev => [...prev, data]);
      setNewPatient({ first_name: "", last_name: "", dob: "", sex: "" });
      setShowAddForm(false);
      showToast('Patient added successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Error adding patient: ${message}`, 'error');
    } finally {
      setAdding(false);
    }
  }, [newPatient, showToast]);

  // Save patient changes
  const handleSavePatient = useCallback(async () => {
    if (!selectedPatient) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/cerbo/patients/${selectedPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save changes');
      }

      const updatedPatient = { ...selectedPatient, ...editForm };
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? updatedPatient : p));
      setSelectedPatient(updatedPatient);
      setEditMode(false);
      showToast('Patient updated successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Error saving changes: ${message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [selectedPatient, editForm, showToast]);

  // Delete patient
  const handleDeletePatient = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/cerbo/patients/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData?.error?.details?.error?.message?.includes('SOAP note')) {
          throw new Error('This patient has open or unsigned SOAP notes and cannot be deleted');
        }
        throw new Error(errorData.message || 'Failed to delete patient');
      }

      setPatients(prev => prev.filter(p => p.id !== id));
      if (selectedPatient?.id === id) {
        setSelectedPatient(null);
      }
      showToast('Patient deleted successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Error: ${message}`, 'error');
    }
  }, [selectedPatient, showToast]);

  // Filter patients based on search query and filter type
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;

    const query = searchQuery.toLowerCase().trim();
    return patients.filter(patient => {
      switch (filterBy) {
        case 'name':
          return `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase().includes(query);
        case 'id':
          return patient.id.toLowerCase().includes(query);
        case 'nickname':
          return (patient.nicknames || '').toLowerCase().includes(query);
        default:
          return (
            `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase().includes(query) ||
            patient.id.toLowerCase().includes(query) ||
            (patient.nicknames || '').toLowerCase().includes(query) ||
            (patient.email1 || '').toLowerCase().includes(query) ||
            (patient.phone_mobile || '').toLowerCase().includes(query)
          );
      }
    });
  }, [patients, searchQuery, filterBy]);

  // Initialize edit form when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      setEditForm({
        first_name: selectedPatient.first_name || '',
        last_name: selectedPatient.last_name || '',
        email1: selectedPatient.email1 || '',
        phone_mobile: selectedPatient.phone_mobile || '',
        address1: selectedPatient.address1 || selectedPatient.address?.address1 || '',
        city: selectedPatient.city || selectedPatient.address?.city || '',
        state: selectedPatient.state || selectedPatient.address?.state || '',
        zip: selectedPatient.zip || selectedPatient.address?.zip || '',
      });
    }
  }, [selectedPatient]);

  // Load patients on component mount
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <User className="w-8 h-8 text-blue-600" />
                Patient Management System
              </h1>
              <p className="text-gray-600 mt-1">Manage patient records, search, and update information</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Patient
            </button>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="space-y-4">
            {/* Patient ID Lookup */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Find Patient by ID
                </label>
                <input
                  type="text"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder="Enter patient ID..."
                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => fetchPatientById(lookupId)}
                  disabled={!lookupId.trim() || loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>
            </div>

            {/* General Search */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Patients
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, ID, email, phone..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by
                </label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Fields</option>
                  <option value="name">Name</option>
                  <option value="id">ID</option>
                  <option value="nickname">Nickname</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterBy('all');
                    setLookupId('');
                    loadPatients();
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Patients ({filteredPatients.length})
                </h2>
              </div>
              
              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading patients...</span>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {patients.length === 0 ? 'No patients found' : 'No patients match your search criteria'}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setEditMode(false);
                        }}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedPatient?.id === patient.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 text-black'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {(patient.first_name?.[0] || '').toUpperCase()}
                              {(patient.last_name?.[0] || '').toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {patient.first_name} {patient.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                DOB: {patient.dob || 'N/A'} • ID: {patient.id}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {patient.nicknames && (
                          <div className="mt-2 text-sm text-gray-600">
                            Nickname: {patient.nicknames}
                          </div>
                        )}
                        
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                          {patient.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {patient.city}, {patient.state}
                            </span>
                          )}
                          {patient.phone_mobile && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {patient.phone_mobile}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="lg:col-span-1">
            {selectedPatient ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h3>
                      <p className="text-sm opacity-90">
                        ID: {selectedPatient.id} • DOB: {selectedPatient.dob || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      {editMode ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                    <div className="space-y-3">
                      {Object.entries(editForm).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                            {key.replace('_', ' ')}
                          </label>
                          <input
                            type="text"
                            disabled={!editMode}
                            value={String(value || '')}
                            onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                            className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors ${
                              editMode 
                                ? 'border-gray-300 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    {editMode && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleSavePatient}
                          disabled={saving}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                        >
                          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => setEditMode(false)}
                          className="px-3 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => handleDeletePatient(selectedPatient.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Patient
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a patient to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Add New Patient
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={newPatient.first_name}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={newPatient.last_name}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={newPatient.dob}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, dob: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex
                </label>
                <select
                  value={newPatient.sex}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, sex: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Sex</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-black  rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPatient}
                disabled={adding || !newPatient.first_name.trim() || !newPatient.last_name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {adding ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {adding ? 'Adding...' : 'Add Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}