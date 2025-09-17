"use client"
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Calendar, Clock, User, MapPin, Filter, Plus, Edit2, X, Check, AlertCircle, Loader, Search, RefreshCw } from "lucide-react";
import { APIError } from '@/types/fhir';
import toast from "react-hot-toast";

// Types
interface Participant {
  actor?: {
    reference?: string;
    display?: string;
  };
  status?: string;
}

interface AppointmentResource {
  id: string;
  status?: string;
  appointmentType?: {
    text?: string;
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  reasonCode?: { text?: string }[];
  start?: string;
  end?: string;
  minutesDuration?: number;
  participant?: Participant[];
}

interface CreateAppointmentForm {
  provider: string;
  patient: string;
  location: string;
  type: string;
  start: string;
  end: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// Toast notification component
const Toast = ({ toast, onClose }: { toast: ToastMessage; onClose: (id: string) => void }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md transform transition-all duration-300 ${
    toast.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' :
    toast.type === 'error' ? 'bg-red-100 text-red-800 border-red-200' :
    toast.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
    'bg-blue-100 text-blue-800 border-blue-200'
  } border`}>
    {toast.type === 'success' && <Check className="w-5 h-5" />}
    {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
    {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
    <div className="flex-1">
      <span className="text-sm font-medium block">{toast.message}</span>
    </div>
    <button onClick={() => onClose(toast.id)} className="ml-2 hover:bg-black/10 p-1 rounded">
      <X className="w-4 h-4" />
    </button>
  </div>
);

// Appointment status badge component
const StatusBadge = ({ status }: { status?: string }) => {
  const getStatusStyle = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'booked':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'arrived':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no-show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
      {status || 'Unknown'}
    </span>
  );
};

// Loading skeleton component
const AppointmentSkeleton = () => (
  <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-4 w-32 bg-gray-300 rounded"></div>
          <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-gray-300 rounded"></div>
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 ml-4">
        <div className="h-8 w-20 bg-gray-300 rounded"></div>
      </div>
    </div>
  </div>
);

// Supported appointment types for creation
const appointmentTypes = [
  { code: "1509", display: "New Patient" },
  { code: "1510", display: "Follow-up" },
];

// Validation utilities
const ValidationUtils = {
  validateRequired: (value: string, fieldName: string): string | null => {
    return value.trim() ? null : `${fieldName} is required`;
  },

  validateDateTime: (dateTime: string): string | null => {
    if (!dateTime) return "Date and time is required";
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return "Invalid date format";
    if (date < new Date()) return "Cannot schedule appointments in the past";
    return null;
  },

  validateDuration: (start: string, end: string): string | null => {
    if (!start || !end) return "Both start and end times are required";
    
    try {
      const startTime = new Date(start);
      const endTime = new Date(end);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      
      if (durationMinutes <= 0) {
        return "End time must be after start time";
      }
      
      if (durationMinutes % 5 !== 0) {
        return "Appointment duration must be in 5-minute increments";
      }
      
      if (durationMinutes < 15) {
        return "Minimum appointment duration is 15 minutes";
      }
      
      if (durationMinutes > 480) {
        return "Maximum appointment duration is 8 hours";
      }
      
      return null;
    } catch (err) {
      toast.error(`Operation failed ${err} `);
      return "Invalid date format";
    }
  }
};

export default function EnhancedAppointmentManager() {
  
  const [appointments, setAppointments] = useState<AppointmentResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<AppointmentResource | null>(null);
  const [creating, setCreating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Create appointment form
  const [createForm, setCreateForm] = useState<CreateAppointmentForm>({
    provider: '',
    patient: '',
    location: '',
    type: '',
    start: '',
    end: ''
  });

  // Form validation errors
  const [createFormErrors, setCreateFormErrors] = useState<Partial<CreateAppointmentForm>>({});
  const [rescheduleFormErrors, setRescheduleFormErrors] = useState<{start?: string; end?: string}>({});

  // Reschedule form
  const [rescheduleForm, setRescheduleForm] = useState({
    start: '',
    end: ''
  });

  // Filter states
  const [filters, setFilters] = useState({
    date: '',
    provider: '',
    patient: '',
    status: '',
    type: '',
    search: ''
  });

  // Toast management
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Parse API Bundle to appointments array
  // const parseBundleToAppointments = useCallback((bundle: any): AppointmentResource[] => {
  //   if (!bundle || !bundle.entry) return [];
  //   return bundle.entry.map((e: any) => e.resource).filter((resource: any) => resource && resource.id);
  // }, []);

  interface FHIRBundle {
  entry?: Array<{
    resource: AppointmentResource;
  }>;
}

const parseBundleToAppointments = useCallback((bundle: FHIRBundle): AppointmentResource[] => {
    if (!bundle?.entry) return [];
    return bundle.entry
      .map(entry => entry.resource)
      .filter((resource): resource is AppointmentResource => 
        resource !== undefined && resource.id !== undefined
      );
}, []);

  // Extract participant IDs
  const extractIds = useCallback((participants?: Participant[]) => {
    let patientId: string | undefined;
    let providerId: string | undefined;
    let locationId: string | undefined;

    participants?.forEach((p) => {
      const ref = p.actor?.reference ?? "";
      if (ref.includes("/Patient/")) {
        patientId = ref.split("/").pop();
      } else if (ref.includes("/Practitioner/")) {
        providerId = ref.split("/").pop();
      } else if (ref.includes("/Location/")) {
        locationId = ref.split("/").pop();
      }
    });

    return { patientId, providerId, locationId };
  }, []);

  // Load all appointments with improved error handling
  const loadAppointments = useCallback(async () => {
    const isRefresh = refreshing;
    if (!isRefresh) setLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await fetch("/api/modmed/appointments", {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        addToast("Appointment api is having high load. Wait for sometime.",'info')
        // throw new Error(`Failed to fetch appointments (${res.status}): ${res.statusText}`);
      }
      
      const data = await res.json();
      const appointmentsList = parseBundleToAppointments(data);
      setAppointments(appointmentsList);
      
      if (isRefresh) {
        addToast(`Refreshed ${appointmentsList.length} appointments`, 'success');
      } else {
        addToast(`Loaded ${appointmentsList.length} appointments`, 'success');
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          addToast('Request timed out. Please try again.', 'error');
        } else {
          addToast(`Error loading appointments: ${error.message}`, 'error');
        }
      } else {
        addToast('Unknown error occurred while loading appointments', 'error');
      }
      // console.error('Load appointments error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parseBundleToAppointments, addToast, refreshing]);

  // Refresh appointments
  const refreshAppointments = useCallback(() => {
    setRefreshing(true);
    loadAppointments();
  }, [loadAppointments]);

  // Check for provider conflicts
  const hasConflict = useCallback((providerId: string, start: string, end: string, ignoreId?: string) => {
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
  }, [appointments]);

  // Format datetime for FHIR
  const formatDateTimeForFHIR = useCallback((dateTime: string) => {
    if (dateTime && !dateTime.includes('Z') && !dateTime.includes('+')) {
      return dateTime + ':00.000Z';
    }
    return dateTime;
  }, []);

  // Handle ModMed API errors with comprehensive error mapping
  const handleModMedError = useCallback((error: unknown, operation: string = "operation") => {
    try {
      const apiError = error as APIError;
      
      // Handle FHIR OperationOutcome errors
      if (apiError.details?.resourceType === "OperationOutcome" && apiError.details.issue) {
        const issues = Array.isArray(apiError.details.issue) ? apiError.details.issue : [apiError.details.issue];
        
        for (const issue of issues) {
          const diagnostics = issue.diagnostics || '';
          
          // Map specific ModMed error patterns
          if (diagnostics.includes("BOOKING_UNAVAILABLE")) {
            addToast("Time slot is unavailable. Please choose a different time.", 'info');
            return;
          }
          
          // Add other specific error mappings here
          
          // Show specific diagnostics if available
          if (diagnostics) {
            addToast(`${operation} failed: ${diagnostics}`, 'error');
            return;
          }
        }
      }
      
      // Handle HTTP errors
      if (apiError.status) {
        switch (apiError.status) {
          case 400:
            addToast("Invalid request. Please check your input.", 'error');
            break;
          case 401:
            addToast("Authentication failed. Please refresh and try again.", 'error');
            break;
          case 403:
            addToast("Permission denied. You don't have access to this resource.", 'error');
            break;
          case 404:
            addToast("Resource not found. It may have been deleted.", 'error');
            break;
          case 409:
            addToast("Conflict detected. Resource may have been modified.", 'error');
            break;
          case 429:
            addToast("Too many requests. Please wait and try again.", 'warning');
            break;
          case 500:
            addToast("Server error. Please try again later.", 'error');
            break;
          default:
            addToast(`${operation} failed with status ${apiError.status}`, 'error');
        }
        return;
      }
      
      // Handle Error objects
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          addToast('Request timed out. Please try again.', 'error');
        } else {
          addToast(error.message || `${operation} failed unexpectedly`, 'error');
        }
        return;
      }
      
      // Fallback error message
      addToast(`${operation} failed. Please try again.`, 'error');
    } catch (err) {
      addToast(`${operation} failed unexpectedly. Please try again.`, 'info');
      console.log(err)
    }
  }, [addToast]);

  // Validate create form
  const validateCreateForm = useCallback((): boolean => {
    const errors: Partial<CreateAppointmentForm> = {};
    
    // Required field validation
    if (!createForm.provider.trim()) errors.provider = "Provider ID is required";
    if (!createForm.patient.trim()) errors.patient = "Patient ID is required"; 
    if (!createForm.location.trim()) errors.location = "Location ID is required";
    if (!createForm.type.trim()) errors.type = "Appointment type is required";
    
    // DateTime validation
    const startError = ValidationUtils.validateDateTime(createForm.start);
    if (startError) errors.start = startError;
    
    const endError = ValidationUtils.validateDateTime(createForm.end);
    if (endError) errors.end = endError;
    
    // Duration validation
    if (!startError && !endError) {
      const durationError = ValidationUtils.validateDuration(createForm.start, createForm.end);
      if (durationError) {
        errors.start = durationError;
      }
    }
    
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [createForm]);

  // Validate reschedule form
  const validateRescheduleForm = useCallback((): boolean => {
    const errors: {start?: string; end?: string} = {};
    
    const startError = ValidationUtils.validateDateTime(rescheduleForm.start);
    if (startError) errors.start = startError;
    
    const endError = ValidationUtils.validateDateTime(rescheduleForm.end);
    if (endError) errors.end = endError;
    
    if (!startError && !endError) {
      const durationError = ValidationUtils.validateDuration(rescheduleForm.start, rescheduleForm.end);
      if (durationError) {
        errors.start = durationError;
      }
    }
    
    setRescheduleFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [rescheduleForm]);

  // Create new appointment with comprehensive validation
  const handleCreateAppointment = useCallback(async () => {
    if (!validateCreateForm()) {
      addToast('Please fix the form errors before submitting', 'warning');
      return;
    }

    // Check for conflicts
    if (hasConflict(createForm.provider, createForm.start, createForm.end)) {
      addToast('Provider has a scheduling conflict. Please choose a different time.', 'info');
      return;
    }

    setCreating(true);
    try {
      const selectedType = appointmentTypes.find(t => t.code === createForm.type);
      const durationMinutes = Math.round((new Date(createForm.end).getTime() - new Date(createForm.start).getTime()) / (1000 * 60));
      
      const body = {
        resourceType: "Appointment",
        status: "booked",
        start: formatDateTimeForFHIR(createForm.start),
        end: formatDateTimeForFHIR(createForm.end),
        minutesDuration: durationMinutes,
        appointmentType: {
          coding: [
            {
              system: "https://stage.ema-api.com/ema-dev/firm/entpmsandbox393/ema/fhir/v2/ValueSet/appointment-type",
              code: createForm.type,
              display: selectedType?.display ?? createForm.type,
            },
          ],
          text: selectedType?.display ?? createForm.type,
        },
        participant: [
          { actor: { reference: `Patient/${createForm.patient}` }, status: "accepted" },
          { actor: { reference: `Practitioner/${createForm.provider}` }, status: "accepted" },
          { actor: { reference: `Location/${createForm.location}` }, status: "accepted" },
        ],
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/modmed/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData: APIError = await res.json();
        throw errorData;
      }

      const newData = await res.json();
      setAppointments(parseBundleToAppointments(newData));
      setShowCreateModal(false);
      setCreateForm({ provider: '', patient: '', location: '', type: '', start: '', end: '' });
      setCreateFormErrors({});
      
      const appointmentDate = new Date(createForm.start).toLocaleDateString();
      const appointmentTime = new Date(createForm.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addToast(`Appointment scheduled successfully for ${appointmentDate} at ${appointmentTime}`, 'success');
    } catch (error) {
      handleModMedError(error, "Appointment booking");
    } finally {
      setCreating(false);
    }
  }, [createForm, validateCreateForm, hasConflict, formatDateTimeForFHIR, parseBundleToAppointments, handleModMedError, addToast]);

  // Reschedule appointment with improved validation
  const handleRescheduleAppointment = useCallback(async () => {
    if (!showRescheduleModal) return;
    
    if (!validateRescheduleForm()) {
      addToast('Please fix the form errors before submitting', 'warning');
      return;
    }

    const providerId = showRescheduleModal.participant?.find((p) =>
      p.actor?.reference?.includes("/Practitioner/")
    )?.actor?.reference?.split("/").pop();

    if (!providerId) {
      addToast('Provider information not found', 'info');
      return;
    }

    if (hasConflict(providerId, rescheduleForm.start, rescheduleForm.end, showRescheduleModal.id)) {
      addToast('Provider has a scheduling conflict. Please choose a different time.', 'info');
      return;
    }

    setRescheduling(true);
    try {
      const durationMinutes = Math.round((new Date(rescheduleForm.end).getTime() - new Date(rescheduleForm.start).getTime()) / (1000 * 60));
      
      const updated = { 
        id: showRescheduleModal.id,
        resourceType: "Appointment",
        status: showRescheduleModal.status || "booked",
        start: formatDateTimeForFHIR(rescheduleForm.start), 
        end: formatDateTimeForFHIR(rescheduleForm.end),
        minutesDuration: durationMinutes,
        participant: showRescheduleModal.participant || [],
        appointmentType: showRescheduleModal.appointmentType,
        reasonCode: showRescheduleModal.reasonCode
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const res = await fetch("/api/modmed/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData: APIError = await res.json();
        throw errorData;
      }
      
      // Refresh appointments after successful reschedule
      await loadAppointments();
      setShowRescheduleModal(null);
      setRescheduleFormErrors({});
      
      const appointmentDate = new Date(rescheduleForm.start).toLocaleDateString();
      const appointmentTime = new Date(rescheduleForm.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addToast(`Appointment rescheduled successfully to ${appointmentDate} at ${appointmentTime}`, 'success');
    } catch (error) {
      handleModMedError(error, "Appointment rescheduling");
    } finally {
      setRescheduling(false);
    }
  }, [showRescheduleModal, rescheduleForm, validateRescheduleForm, hasConflict, formatDateTimeForFHIR, loadAppointments, handleModMedError, addToast]);

  // Cancel appointment (keeping for future implementation)
  // const handleCancelAppointment = useCallback(async (appointmentId: string) => {
  //   if (!window.confirm('Are you sure you want to cancel this appointment?')) {
  //     return;
  //   }

  //   try {
  //     const controller = new AbortController();
  //     const timeoutId = setTimeout(() => controller.abort(), 30000);

  //     const res = await fetch(`/api/modmed/appointments?id=${appointmentId}`, { 
  //       method: "DELETE",
  //       signal: controller.signal
  //     });

  //     clearTimeout(timeoutId);
      
  //     if (!res.ok) {
  //       // const errorData = await res.json();
  //       // throw { ...errorData, status: res.status };
  //       addToast("Appointment Unavailable.", 'info')
  //     }
      
  //     // Remove appointment from local state
  //     setAppointments(prev => prev.filter(a => a.id !== appointmentId));
  //     addToast('Appointment cancelled successfully', 'success');
  //   } catch (error) {
  //     handleModMedError(error, "Appointment cancellation");
  //   }
  // }, [handleModMedError, addToast]);

  // Filter appointments with search functionality
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      let matchesFilter = true;

      // Date filter
      if (filters.date) {
        const appointmentDate = appointment.start
          ? new Date(appointment.start).toLocaleDateString("en-CA")
          : "";
        matchesFilter = matchesFilter && appointmentDate === filters.date;
      }

      // Status filter
      if (filters.status) {
        matchesFilter = matchesFilter && 
          Boolean(appointment.status?.toLowerCase().includes(filters.status.toLowerCase()));
      }

      // Type filter
      if (filters.type) {
        matchesFilter = matchesFilter && Boolean(
          appointment.appointmentType?.text?.toLowerCase().includes(filters.type.toLowerCase())
        );
      }

      // Provider filter
      if (filters.provider) {
        matchesFilter = matchesFilter && Boolean(
          appointment.participant?.some((p) =>
            p.actor?.reference?.toLowerCase().includes(`/practitioner/${filters.provider.toLowerCase()}`)
          )
        );
      }

      // Patient filter
      if (filters.patient) {
        matchesFilter = matchesFilter && Boolean(
          appointment.participant?.some((p) =>
            p.actor?.reference?.toLowerCase().includes(`/patient/${filters.patient.toLowerCase()}`)
          )
        );
      }

      // Search filter (searches across multiple fields)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const { patientId, providerId } = extractIds(appointment.participant);
        const searchableText = [
          appointment.id,
          appointment.status,
          appointment.appointmentType?.text,
          patientId,
          providerId,
          appointment.start ? new Date(appointment.start).toLocaleDateString() : '',
        ].join(' ').toLowerCase();

        matchesFilter = matchesFilter && searchableText.includes(searchTerm);
      }

      return matchesFilter;
    });
  }, [appointments, filters, extractIds]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({
      date: '',
      provider: '',
      patient: '',
      status: '',
      type: '',
      search: ''
    });
  }, []);

  // Load appointments on component mount
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Auto-calculate end time when start time changes (default 30 minutes)
  const handleStartTimeChange = useCallback((value: string, isReschedule: boolean = false) => {
    if (value) {
      const startTime = new Date(value);
      const endTime = new Date(startTime.getTime() + 30 * 60000); // Add 30 minutes
      const endTimeString = endTime.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
      
      if (isReschedule) {
        setRescheduleForm(prev => ({ ...prev, start: value, end: endTimeString }));
      } else {
        setCreateForm(prev => ({ ...prev, start: value, end: endTimeString }));
      }
    } else {
      if (isReschedule) {
        setRescheduleForm(prev => ({ ...prev, start: value, end: '' }));
      } else {
        setCreateForm(prev => ({ ...prev, start: value, end: '' }));
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Toast notifications */}
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                Appointment Management System
              </h1>
              <p className="text-gray-600 mt-1">Schedule, reschedule, and manage patient appointments efficiently</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={refreshAppointments}
                disabled={loading || refreshing}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Appointment
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filter & Search Appointments</h2>
          </div>
          
          {/* Search bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search appointments by ID, status, type, patient ID, provider ID, or date..."
                className="w-full text-black pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider ID</label>
              <input
                type="text"
                value={filters.provider}
                onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value }))}
                placeholder="Provider ID..."
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <input
                type="text"
                value={filters.patient}
                onChange={(e) => setFilters(prev => ({ ...prev, patient: e.target.value }))}
                placeholder="Patient ID..."
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="booked">Booked</option>
                <option value="arrived">Arrived</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="no-show">No Show</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 text-black py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="New Patient">New Patient</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearAllFilters}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Appointments ({filteredAppointments.length}{filteredAppointments.length !== appointments.length ? ` of ${appointments.length}` : ''})
              </h2>
              {appointments.length > 0 && (
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading appointments...</span>
                </div>
                {/* Loading skeleton */}
                {[...Array(3)].map((_, i) => (
                  <AppointmentSkeleton key={i} />
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {appointments.length === 0 ? 'No appointments found' : 'No appointments match your filters'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {appointments.length === 0 
                    ? 'Get started by creating your first appointment.' 
                    : 'Try adjusting your filters or search terms.'}
                </p>
                {appointments.length === 0 && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Appointment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => {
                  const { patientId, providerId, locationId } = extractIds(appointment.participant);
                  const startTime = appointment.start ? new Date(appointment.start) : null;
                  const endTime = appointment.end ? new Date(appointment.end) : null;
                  const isUpcoming = startTime && startTime > new Date();
                  const isPast = startTime && startTime < new Date();

                  return (
                    <div
                      key={appointment.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                        isUpcoming ? 'border-blue-200 bg-blue-50' : 
                        isPast ? 'border-gray-200 bg-gray-50' : 
                        'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-gray-900">ID: {appointment.id}</span>
                            </div>
                            <StatusBadge status={appointment.status} />
                            {isUpcoming && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                Upcoming
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {startTime?.toLocaleDateString() || 'No date'}
                                </div>
                                <div className="text-gray-600">
                                  {startTime && endTime ? (
                                    `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  ) : (
                                    'No time set'
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-gray-900">Patient</div>
                                <div className="text-gray-600 break-all">{patientId || 'Not assigned'}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-gray-900">Provider</div>
                                <div className="text-gray-600 break-all">{providerId || 'Not assigned'}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-gray-900">Type</div>
                                <div className="text-gray-600">{appointment.appointmentType?.text || 'Not specified'}</div>
                                {locationId && (
                                  <div className="text-xs text-gray-500 mt-1">Location: {locationId}</div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {appointment.minutesDuration && (
                            <div className="mt-2 text-xs text-gray-500">
                              Duration: {appointment.minutesDuration} minutes
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => {
                              setShowRescheduleModal(appointment);
                              setRescheduleForm({
                                start: appointment.start || '',
                                end: appointment.end || ''
                              });
                              setRescheduleFormErrors({});
                            }}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            Reschedule
                          </button>
                          {/* Uncomment when cancel functionality is needed */}
                          {/* <button
                            onClick={() => handleCancelAppointment(appointment.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Cancel
                          </button> */}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Book New Appointment
              </h3>
              <p className="text-sm text-gray-600 mt-1">Fill in all required fields to schedule a new appointment</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider ID *
                </label>
                <input
                  type="text"
                  value={createForm.provider}
                  onChange={(e) => {
                    setCreateForm(prev => ({ ...prev, provider: e.target.value }));
                    if (createFormErrors.provider) {
                      setCreateFormErrors(prev => ({ ...prev, provider: undefined }));
                    }
                  }}
                  placeholder="Enter provider ID (e.g., 12345)"
                  className={`w-full px-3 text-black py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    createFormErrors.provider ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {createFormErrors.provider && (
                  <p className="text-red-600 text-xs mt-1">{createFormErrors.provider}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient ID *
                </label>
                <input
                  type="text"
                  value={createForm.patient}
                  onChange={(e) => {
                    setCreateForm(prev => ({ ...prev, patient: e.target.value }));
                    if (createFormErrors.patient) {
                      setCreateFormErrors(prev => ({ ...prev, patient: undefined }));
                    }
                  }}
                  placeholder="Enter patient ID (e.g., 67890)"
                  className={`w-full px-3 py-2 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    createFormErrors.patient ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {createFormErrors.patient && (
                  <p className="text-red-600 text-xs mt-1">{createFormErrors.patient}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location ID *
                </label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) => {
                    setCreateForm(prev => ({ ...prev, location: e.target.value }));
                    if (createFormErrors.location) {
                      setCreateFormErrors(prev => ({ ...prev, location: undefined }));
                    }
                  }}
                  placeholder="Enter location ID (e.g., 111)"
                  className={`w-full px-3 py-2 text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    createFormErrors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {createFormErrors.location && (
                  <p className="text-red-600 text-xs mt-1">{createFormErrors.location}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Appointment Type *
                </label>
                <select
                  value={createForm.type}
                  onChange={(e) => {
                    setCreateForm(prev => ({ ...prev, type: e.target.value }));
                    if (createFormErrors.type) {
                      setCreateFormErrors(prev => ({ ...prev, type: undefined }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    createFormErrors.type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select appointment type</option>
                  {appointmentTypes.map(type => (
                    <option key={type.code} value={type.code}>
                      {type.display}
                    </option>
                  ))}
                </select>
                {createFormErrors.type && (
                  <p className="text-red-600 text-xs mt-1">{createFormErrors.type}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={createForm.start}
                  onChange={(e) => {
                    handleStartTimeChange(e.target.value, false);
                    if (createFormErrors.start) {
                      setCreateFormErrors(prev => ({ ...prev, start: undefined }));
                    }
                  }}
                  min={new Date().toISOString().slice(0, 16)}
                  className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    createFormErrors.start ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {createFormErrors.start && (
                  <p className="text-red-600 text-xs mt-1">{createFormErrors.start}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={createForm.end}
                  onChange={(e) => {
                    setCreateForm(prev => ({ ...prev, end: e.target.value }));
                    if (createFormErrors.end) {
                      setCreateFormErrors(prev => ({ ...prev, end: undefined }));
                    }
                  }}
                  min={createForm.start || new Date().toISOString().slice(0, 16)}
                  className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    createFormErrors.end ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {createFormErrors.end && (
                  <p className="text-red-600 text-xs mt-1">{createFormErrors.end}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Duration will be calculated automatically (must be in 5-minute increments)
                </p>
              </div>

              {/* Duration preview */}
              {createForm.start && createForm.end && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs font-medium text-gray-700">Duration Preview:</div>
                  <div className="text-sm text-gray-600">
                    {(() => {
                      try {
                        const duration = Math.round((new Date(createForm.end).getTime() - new Date(createForm.start).getTime()) / (1000 * 60));
                        return duration > 0 ? `${duration} minutes` : 'Invalid duration';
                      } catch {
                        return 'Invalid dates';
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({ provider: '', patient: '', location: '', type: '', start: '', end: '' });
                  setCreateFormErrors({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAppointment}
                disabled={creating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {creating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Book Appointment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-yellow-600" />
                Reschedule Appointment
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Appointment ID: {showRescheduleModal.id}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleForm.start}
                  onChange={(e) => {
                    handleStartTimeChange(e.target.value, true);
                    if (rescheduleFormErrors.start) {
                      setRescheduleFormErrors(prev => ({ ...prev, start: undefined }));
                    }
                  }}
                  min={new Date().toISOString().slice(0, 16)}
                  className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    rescheduleFormErrors.start ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {rescheduleFormErrors.start && (
                  <p className="text-red-600 text-xs mt-1">{rescheduleFormErrors.start}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleForm.end}
                  onChange={(e) => {
                    setRescheduleForm(prev => ({ ...prev, end: e.target.value }));
                    if (rescheduleFormErrors.end) {
                      setRescheduleFormErrors(prev => ({ ...prev, end: undefined }));
                    }
                  }}
                  min={rescheduleForm.start || new Date().toISOString().slice(0, 16)}
                  className={`w-full px-3 py-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    rescheduleFormErrors.end ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {rescheduleFormErrors.end && (
                  <p className="text-red-600 text-xs mt-1">{rescheduleFormErrors.end}</p>
                )}
              </div>

              {/* Duration preview */}
              {rescheduleForm.start && rescheduleForm.end && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs font-medium text-gray-700">Duration Preview:</div>
                  <div className="text-sm text-gray-600">
                    {(() => {
                      try {
                        const duration = Math.round((new Date(rescheduleForm.end).getTime() - new Date(rescheduleForm.start).getTime()) / (1000 * 60));
                        return duration > 0 ? `${duration} minutes` : 'Invalid duration';
                      } catch {
                        return 'Invalid dates';
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Current appointment details */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs font-medium text-blue-700 mb-1">Current Appointment:</div>
                <div className="text-sm text-blue-600">
                  {showRescheduleModal.start && (
                    <div>
                      {new Date(showRescheduleModal.start).toLocaleDateString()} at {' '}
                      {new Date(showRescheduleModal.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {showRescheduleModal.end && (
                        <> - {new Date(showRescheduleModal.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => {
                  setShowRescheduleModal(null);
                  setRescheduleFormErrors({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleAppointment}
                disabled={rescheduling}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {rescheduling ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Rescheduling...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Reschedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}