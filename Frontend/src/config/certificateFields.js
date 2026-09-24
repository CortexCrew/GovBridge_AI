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

export const DOCUMENT_GUIDANCE = {
  'Income Certificate': 'Aadhaar card, Ration card, Salary slip / income proof, Bank passbook (if applicable)',
  'Community Certificate': "Aadhaar card, Parent's/Father's community certificate, School transfer certificate, Ration card",
  'Nativity Certificate': 'Aadhaar card, Birth certificate, Ration card, Residence proof',
  'Birth Certificate': "Hospital birth record / discharge summary, Parents' Aadhaar cards, Marriage certificate of parents (if applicable), Address proof",
  'Residence Certificate': 'Aadhaar card, Ration card, Utility bill, Rental agreement (if not owned)',
};

export const getDocumentGuidance = (certificateType) => DOCUMENT_GUIDANCE[certificateType] || '';

export const getFieldsForCertificate = (certificateType) => CERTIFICATE_FIELDS[certificateType] || [];
