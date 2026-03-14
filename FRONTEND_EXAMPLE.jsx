// Example: How to send file upload from React frontend

const [documentFile, setDocumentFile] = useState(null);

// Handle file selection
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    setDocumentFile(file);
  }
};

// Submit form with file
const handleSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();
  
  // Add all text fields
  formData.append('admissionType', admissionType);
  formData.append('gender', gender);
  formData.append('department', department);
  formData.append('studentName', studentName);
  formData.append('fatherName', fatherName);
  formData.append('dob', dob);
  formData.append('cnic', cnic);
  formData.append('phone', phone);
  formData.append('whatsapp', whatsapp);
  formData.append('fullAddress', fullAddress);
  formData.append('currentAddress', currentAddress);
  formData.append('requiredGrade', requiredGrade);
  formData.append('previousEducation', previousEducation);
  formData.append('educationType', educationType);
  formData.append('registrationNo', registrationNo);
  formData.append('lastYearGrade', lastYearGrade);
  formData.append('nextYearGrade', nextYearGrade);
  formData.append('examPart1Marks', examPart1Marks);
  formData.append('examPart2Marks', examPart2Marks);
  formData.append('totalMarks', totalMarks);
  formData.append('remarks', remarks);
  
  // Add file if selected
  if (documentFile) {
    formData.append('document', documentFile);
  }

  try {
    const response = await fetch('http://localhost:3000/api/records', {
      method: 'POST',
      body: formData
      // Don't set Content-Type - browser sets it with boundary
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Success:', data);
      console.log('Document URL:', data.documentUrl);
    } else {
      console.error('Error:', data);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// JSX
<input
  type="file"
  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
  onChange={handleFileChange}
/>
