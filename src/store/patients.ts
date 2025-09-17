import { create } from "zustand";

export type Patient = {
  object: string;
  id: string;
  nicknames?: string;
  dob?: string;
  alt_id?: string;
  hint_id?: string;
  active_campaign_id?: string;
  stripe_api_id?: string | null;
  fullscript_id?: string | null;
  email1?: string;
  email2?: string;
  skype_name?: string;
  phone_home?: string;
  phone_mobile?: string;
  phone_work?: string;
  phone_other?: string;
  primary_phone?: string | null;
  fax_home?: string;
  fax_work?: string;
  sex?: string;
  gender?: string;
  address1?: string;
  address2?: string;
  zip?: string;
  city?: string;
  state?: string;
  country?: string;
  insurance_plan?: string | null;
  insurance_group?: string;
  insurance_id?: string;
  insurance_type?: string | null;
  insurance_phone?: string | null;
  insurance_notes?: string | null;
  billing_plan?: string;
  billing_dependent?: string;
  group_account?: string;
  dependent_of?: string | null;
  portal_access?: boolean;
  inactive?: boolean;
  inactive_date?: string | null;
  addedby?: string;
  deletedby?: string;
  lastupdated?: string | null;
  updatedby?: string | null;
  dateupdated?: string | null;
  drivers_license_number?: string | null;
  drivers_license_state?: string | null;
  ethnicity?: string | null;
  pronouns?: string | null;
  opt_in_preferences?: Record<string, unknown>;
  tags?: Array<{ name: string; tag_category?: string; notes?: string; date_applied?: string }>;
  primary_provider_id?: number | null;
  timezone?: string;
  patient_status_description?: string;
  url_charges?: string;
  url_documents?: string;
  url_encounters?: string;
  url_finances?: string;
  url_orders?: string;
  url_schedule?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  created?: string;
  address?: { address1?: string; address2?: string; zip?: string; city?: string; state?: string; country?: string };
  insurance?: Record<string, any>;
};

type PatientsState = {
  list: Patient[];
  setList: (list: Patient[]) => void;
  updateById: (id: string, updater: (p: Patient) => Patient) => void;
};

export const usePatientsStore = create<PatientsState>((set) => ({
  list: [],
  setList: (list) => set({ list }),
  updateById: (id, updater) =>
    set((state) => ({
      list: state.list.map((p) => (String(p.id) === String(id) ? updater(p) : p)),
    })),
}));


