const fc = require('fast-check');

// Generator for valid CNIC format: XXXXX-XXXXXXX-X
const arbitraryValidCNIC = () => {
  return fc.tuple(
    fc.integer({ min: 10000, max: 99999 }),
    fc.integer({ min: 1000000, max: 9999999 }),
    fc.integer({ min: 1, max: 9 })
  ).map(([part1, part2, part3]) => `${part1}-${part2}-${part3}`);
};

// Generator for invalid CNIC formats
const arbitraryInvalidCNIC = () => {
  return fc.oneof(
    fc.string().filter(s => !/^\d{5}-\d{7}-\d$/.test(s)), // Random string that doesn't match
    fc.constant('12345-12345-1'), // Wrong format
    fc.constant('1234-1234567-1'), // Wrong digit count
    fc.constant('12345-1234567-12'), // Too many digits in last part
    fc.constant('abcde-1234567-1') // Non-numeric characters
  );
};

// Generator for valid phone numbers (digits and hyphens only)
const arbitraryPhoneNumber = () => {
  return fc.array(
    fc.integer({ min: 0, max: 9 }),
    { minLength: 10, maxLength: 11 }
  ).map(digits => digits.join(''));
};

// Generator for invalid phone numbers
const arbitraryInvalidPhoneNumber = () => {
  return fc.string()
    .filter(s => s.length > 0 && /[^0-9-]/.test(s)); // Contains invalid characters
};

// Generator for valid date strings (YYYY-MM-DD)
const arbitraryValidDate = () => {
  return fc.date({ min: new Date('1950-01-01'), max: new Date('2010-12-31') })
    .map(d => d.toISOString().split('T')[0]);
};

// Generator for invalid date strings
const arbitraryInvalidDate = () => {
  return fc.oneof(
    fc.constant('2024-13-01'), // Invalid month
    fc.constant('2024-01-32'), // Invalid day
    fc.constant('01/01/2024'), // Wrong format
    fc.constant('not-a-date')
  );
};

// Generator for valid numeric strings
const arbitraryNumericString = () => {
  return fc.integer({ min: 0, max: 100 }).map(String);
};

// Generator for invalid numeric strings
const arbitraryInvalidNumericString = () => {
  return fc.oneof(
    fc.constant('abc'),
    fc.constant('12.34.56'),
    fc.constant('not-a-number')
  );
};

// Generator for complete valid student record
const arbitraryStudentRecord = () => {
  return fc.record({
    admissionType: fc.constantFrom('Regular', 'Private', 'Improvement'),
    gender: fc.constantFrom('Male', 'Female', 'Other'),
    department: fc.string({ minLength: 1, maxLength: 100 }),
    studentName: fc.string({ minLength: 1, maxLength: 200 }),
    fatherName: fc.string({ minLength: 1, maxLength: 200 }),
    dob: arbitraryValidDate(),
    cnic: arbitraryValidCNIC(),
    phone: arbitraryPhoneNumber(),
    whatsapp: arbitraryPhoneNumber(),
    fullAddress: fc.string({ minLength: 1, maxLength: 500 }),
    currentAddress: fc.string({ minLength: 1, maxLength: 500 }),
    requiredGrade: fc.string({ minLength: 1, maxLength: 50 }),
    previousEducation: fc.string({ minLength: 1, maxLength: 200 }),
    registrationNo: fc.string({ minLength: 1, maxLength: 100 }),
    lastYearGrade: fc.string({ minLength: 1, maxLength: 50 }),
    nextYearGrade: fc.string({ minLength: 1, maxLength: 50 }),
    examPart1Marks: arbitraryNumericString(),
    examPart2Marks: arbitraryNumericString(),
    totalMarks: arbitraryNumericString(),
    remarks: fc.string({ minLength: 0, maxLength: 1000 })
  });
};

module.exports = {
  arbitraryValidCNIC,
  arbitraryInvalidCNIC,
  arbitraryPhoneNumber,
  arbitraryInvalidPhoneNumber,
  arbitraryValidDate,
  arbitraryInvalidDate,
  arbitraryNumericString,
  arbitraryInvalidNumericString,
  arbitraryStudentRecord
};
