# Medical System Integration

A React-based healthcare management system integrating Cerbo (Patient Management) and ModMed (Appointment Management) APIs.

**Live Demo:** [ehr-eta-five.vercel.app](https://ehr-eta-five.vercel.app/patients)

## Quick Start

### Prerequisites
- Nextjs 15+
- Valid API credentials for Cerbo and ModMed
- Some knowledge about EHR (Electronic Health Record)

### Environment Setup
Create `.env.local`:

```bash
# Cerbo API
CERBO_BASE_URL=your_cerbo_url
CERBO_USERNAME=your_username
CERBO_SECRET_KEY=your_secret_key

# ModMed API
MODMED_BASE_URL=your_modmed_url
MODMED_FIRM_URL_PREFIX=your_firm_prefix
MODMED_API_KEY=your_api_key
MODMED_USERNAME=your_username
MODMED_PASSWORD=your_password
```

### Installation
```bash
npm install
npm run dev
```

## System Architecture

### Integration Overview
```
Client (React) ↔ API Routes ↔ External APIs
                                ├── Cerbo (Patient Data)
                                └── ModMed (Appointments)
```

### API Endpoints
| Function | Method | Endpoint | Integration |
|----------|--------|----------|-------------|
| List Patients | GET | `/api/cerbo/patients` | Cerbo REST |
| Get Patient | GET | `/api/cerbo/patients/:id` | Cerbo REST |
| Create Patient | POST | `/api/cerbo/patients` | Cerbo REST |
| Update Patient | PATCH | `/api/cerbo/patients/:id` | Cerbo REST |
| Delete Patient | DELETE | `/api/cerbo/patients/:id` | Cerbo REST |
| List Appointments | GET | `/api/modmed/appointments` | ModMed FHIR |
| Create Appointment | POST | `/api/modmed/appointments` | ModMed FHIR |
| Update Appointment | PUT | `/api/modmed/appointments` | ModMed FHIR |
| Cancel Appointment | DELETE | `/api/modmed/appointments` | ModMed FHIR |

## Core Features

### Patient Management
- **Search**: Multi-field search (name, ID, nickname, email, phone)
- **CRUD Operations**: Full patient lifecycle management
- **Validation**: Real-time form validation with error feedback
- **Contact Management**: Complete address and contact information

### Appointment Management
- **Scheduling**: Provider/patient/location assignment
- **Conflict Detection**: Automatic scheduling conflict prevention
- **Status Tracking**: Real-time appointment status updates
- **Duration Rules**: 5-minute increments, 15min-8hr range

## User Operations

### Patient Workflow
1. **Search** → Enter query in search bar or use ID lookup
2. **View** → Click patient card to see details
3. **Edit** → Select patient → Edit mode → Save changes
4. **Create** → "Add Patient" → Fill form → Submit
5. **Delete** → Select patient → Delete → Confirm

### Appointment Workflow
1. **View** → Appointments load automatically with filters
2. **Create** → "New Appointment" → Fill required fields → Book
3. **Reschedule** → Select appointment → "Reschedule" → New time → Confirm
4. **Filter** → Use date, provider, patient, status filters
5. **Refresh** → Manual refresh for real-time updates

## Technical Implementation

### State Management
```javascript
// Component state pattern
const [data, setData] = useState([])           // Main data
const [loading, setLoading] = useState(false)  // Loading state
const [errors, setErrors] = useState({})       // Form errors
const [filters, setFilters] = useState({})     // Search filters

// Performance optimization
const filteredData = useMemo(() => filter(data), [data, filters])
const handleSubmit = useCallback(async () => {...}, [dependencies])
```

### Error Handling Strategy
```javascript
// Centralized error handler
const handleApiError = (error, operation) => {
  // Parse API-specific errors (FHIR OperationOutcome, HTTP status)
  // Map to user-friendly messages
  // Display appropriate feedback (toast, inline, modal)
}

// Error categories
- Validation: Form field errors with inline display
- API: Server errors with toast notifications  
- Network: Connection issues with retry options
- Business: Conflicts and constraints with explanations
```

### Data Validation Pipeline
```javascript
1. Client Validation → Form rules, required fields
2. Business Rules → Scheduling conflicts, data constraints  
3. API Validation → Server-side verification
4. Response Processing → Success/error handling
```

### Search Implementation
```javascript
// Multi-field search with real-time filtering
const searchLogic = {
  fields: ['name', 'id', 'email', 'phone', 'nickname'],
  debounce: 300ms,
  caseSensitive: false,
  partialMatch: true
}
```

## Key Business Rules

### Appointment Constraints
- **Duration**: Must be 5-minute increments (15min minimum, 8hr maximum)
- **Conflicts**: Provider cannot have overlapping appointments
- **Scheduling**: Cannot schedule in the past
- **Required Fields**: Provider ID, Patient ID, Location ID, Type, Start/End time

### Patient Constraints
- **Required Fields**: First name, Last name
- **Unique Constraints**: Handled by API validation
- **Deletion Rules**: Cannot delete if active appointments exist

## Performance Features

- **Memoization**: `useMemo` for filtered data, `useCallback` for functions
- **Request Timeout**: 30-second API timeout with abort controllers
- **Loading States**: Skeleton loaders and progress indicators
- **Optimistic Updates**: UI updates before API confirmation
- **Error Boundaries**: Graceful error handling and recovery

## Development Guidelines

### Component Structure
```
components/
├── PatientManager.tsx     # Patient CRUD interface
├── AppointmentManager.tsx # Appointment scheduling interface
├── Toast.tsx             # Notification system
└── StatusBadge.tsx       # Status indicators
```

### Error Handling Best Practices
- Use specific error messages for different failure types
- Implement retry mechanisms for network errors
- Provide clear user feedback for validation errors
- Log errors for debugging while showing user-friendly messages

### Data Flow Pattern
```
User Action → Validation → API Call → State Update → UI Refresh
     ↓                                      ↓
Error Handling ←────────── Error Response ←─┘
```

## Troubleshooting

### Common Issues
- **API Timeout**: Check network connection and API availability
- **Validation Errors**: Verify required fields and data formats
- **Scheduling Conflicts**: Check provider availability for time slot
- **CORS Issues**: Ensure proper API route configuration

### Debug Steps
1. Check browser console for errors
2. Verify API credentials in environment variables
3. Test API endpoints independently
4. Check network tab for failed requests
5. Validate data formats (especially datetime for appointments)
