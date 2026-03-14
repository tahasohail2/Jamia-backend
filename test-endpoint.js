// Test the endpoint without files
const http = require('http');

const data = JSON.stringify({
  admissionType: 'نیا داخلہ',
  gender: 'طالب',
  department: 'حفظ',
  studentName: 'Test Student',
  fatherName: 'Test Father',
  dob: '2000-01-01',
  cnic: '12222-2342222-2',
  phone: '03001234567',
  whatsapp: '03001234567',
  fullAddress: 'Test Address',
  currentAddress: 'Test Current Address',
  educationType: 'دینی',
  requiredGrade: 'عالیہ اول',
  previousEducation: 'Matric',
  registrationNo: '',
  lastYearGrade: '',
  nextYearGrade: '',
  examPart1Marks: '',
  examPart2Marks: '',
  totalMarks: '',
  remarks: ''
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/records',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing endpoint...\n');

const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${responseData}\n`);
    
    if (res.statusCode === 400 && responseData.includes('Validation failed')) {
      console.log('❌ ERROR: Validator is still active!');
      console.log('⚠️  You need to RESTART the backend server:');
      console.log('   1. Press Ctrl+C in the terminal where server is running');
      console.log('   2. Run: npm start');
    } else if (res.statusCode === 201) {
      console.log('✅ SUCCESS: Endpoint is working!');
    }
  });
});

req.on('error', (error) => {
  console.error(`Error: ${error.message}`);
});

req.write(data);
req.end();
