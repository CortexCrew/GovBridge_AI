export const CERTIFICATE_FIELDS = {
  'Income Certificate': [
    { key: 'annual_income', label: 'Annual Income (₹)', type: 'number', required: true, placeholder: 'e.g. 250000' },
    { key: 'purpose', label: 'Purpose of Application', type: 'text', required: true, placeholder: 'e.g. Higher Education Scholarship' },
    { key: 'occupation', label: 'Occupation', type: 'text', required: true },
    { key: 'family_members_count', label: 'Family Members Count', type: 'number', required: false },
    { key: 'permanent_address', label: 'Permanent Address', type: 'textarea', required: true, placeholder: 'Enter complete residential address' },
  ],
  'Community Certificate': [
    { key: 'caste_community', label: 'Caste/Community Name', type: 'text', required: true },
    { key: 'sub_caste', label: 'Sub-caste (if applicable)', type: 'text', required: false },
    { key: 'religion', label: 'Religion', type: 'text', required: true },
    { key: 'father_community', label: "Father's Community (for verification)", type: 'text', required: true },
    { key: 'purpose', label: 'Purpose of Application', type: 'text', required: true },
    { key: 'permanent_address', label: 'Permanent Address', type: 'textarea', required: true, placeholder: 'Enter complete residential address' },
  ],
  'Nativity Certificate': [
    { key: 'place_of_birth', label: 'Place of Birth', type: 'text', required: true },
    { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
    { key: 'residence_duration_years', label: 'Duration of Residence at Current Address (years)', type: 'number', required: true },
    { key: 'guardian_name', label: "Father's/Guardian's Name", type: 'text', required: true },
    { key: 'purpose', label: 'Purpose of Application', type: 'text', required: true },
    { key: 'permanent_address', label: 'Permanent Address', type: 'textarea', required: true, placeholder: 'Enter complete residential address' },
  ],
  'Birth Certificate': [
    { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
    { key: 'place_of_birth', label: 'Place of Birth (Hospital/Institution Name)', type: 'text', required: true },
    { key: 'father_name', label: "Father's Name", type: 'text', required: true },
    { key: 'mother_name', label: "Mother's Name", type: 'text', required: true },
    { key: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female', 'Other'] },
    { key: 'registration_number', label: 'Registration Number (if re-issuing)', type: 'text', required: false },
  ],
  'Residence Certificate': [
    { key: 'current_address', label: 'Current Address', type: 'textarea', required: true, placeholder: 'Enter complete current address' },
    { key: 'stay_duration', label: 'Duration of Stay at Current Address (years/months)', type: 'text', required: true },
    { key: 'previous_address', label: 'Previous Address (if moved)', type: 'textarea', required: false },
    { key: 'purpose', label: 'Purpose of Application', type: 'text', required: true },
    { key: 'proof_type', label: 'Proof Type', type: 'select', required: true, options: ['Voter ID', 'Ration Card', 'Utility Bill'] },
  ],
};

// Each entry is an array of { key, label, required, accept } per document slot
export const REQUIRED_DOCUMENTS = {
  'Income Certificate': [
    { key: 'aadhaar', label: 'Aadhaar Card', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'ration_card', label: 'Ration Card', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'salary_slip', label: 'Salary Slip / Income Proof', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'bank_passbook', label: 'Bank Passbook (if applicable)', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  'Community Certificate': [
    { key: 'aadhaar', label: 'Aadhaar Card', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'parent_community_cert', label: "Parent's / Father's Community Certificate", required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'school_tc', label: 'School Transfer Certificate', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'ration_card', label: 'Ration Card', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  'Nativity Certificate': [
    { key: 'aadhaar', label: 'Aadhaar Card', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'birth_certificate', label: 'Birth Certificate', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'ration_card', label: 'Ration Card', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'residence_proof', label: 'Residence Proof', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  'Birth Certificate': [
    { key: 'hospital_record', label: 'Hospital Birth Record / Discharge Summary', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'father_aadhaar', label: "Father's Aadhaar Card", required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'mother_aadhaar', label: "Mother's Aadhaar Card", required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'marriage_cert', label: "Parents' Marriage Certificate (if applicable)", required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'address_proof', label: 'Address Proof', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  'Residence Certificate': [
    { key: 'aadhaar', label: 'Aadhaar Card', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'ration_card', label: 'Ration Card', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'utility_bill', label: 'Utility Bill (Electricity / Water)', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'rental_agreement', label: 'Rental Agreement (if not owned)', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
};

export const getDocumentGuidance = (certificateType) =>
  (REQUIRED_DOCUMENTS[certificateType] || []).map((d) => d.label).join(', ');

export const getFieldsForCertificate = (certificateType) => CERTIFICATE_FIELDS[certificateType] || [];

export const getRequiredDocuments = (certificateType) => REQUIRED_DOCUMENTS[certificateType] || [];
