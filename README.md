# Student Admission Backend API

Backend REST API for the student admission management system. Built with Node.js, Express, and PostgreSQL.

## Features

- RESTful API for student admission records
- PostgreSQL database with connection pooling
- Request validation using Zod
- CORS support for frontend integration
- Comprehensive error handling
- Property-based and unit testing

## Prerequisites

- Node.js v18 or higher
- PostgreSQL v14 or higher
- npm or yarn

## Installation

1. Clone the repository and navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Set up PostgreSQL database (see [Database Setup](#database-setup))

4. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and set your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admission_system
DB_USER=admission_admin
DB_PASSWORD=your_secure_password

PORT=3000
NODE_ENV=development

FRONTEND_URL=http://localhost:5173
```

## Database Setup

### Step 1: Install PostgreSQL

**Windows:**
Download from https://www.postgresql.org/download/windows/

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### Step 2: Create Database and User

```bash
# Access PostgreSQL
psql -U postgres

# In PostgreSQL shell:
CREATE DATABASE admission_system;
CREATE USER admission_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE admission_system TO admission_admin;
\q
```

### Step 3: Run Schema

```bash
psql -U admission_admin -d admission_system -f database/schema.sql
```

See `database/setup.md` for detailed instructions.

## Running the Server

### Development Mode

```bash
npm run dev
```

Server runs on http://localhost:3000 with auto-restart on file changes.

### Production Mode

```bash
npm start
```

## API Endpoints

### Health Check

```
GET /health
```

Returns server status and timestamp.

### Create Record

```
POST /api/records
Content-Type: application/json

{
  "admissionType": "Regular",
  "gender": "Male",
  "department": "Computer Science",
  "studentName": "John Doe",
  "fatherName": "Richard Doe",
  "dob": "2000-01-15",
  "cnic": "12345-1234567-1",
  "phone": "03001234567",
  "whatsapp": "03001234567",
  "fullAddress": "123 Main St",
  "currentAddress": "123 Main St",
  "requiredGrade": "A",
  "previousEducation": "High School",
  "registrationNo": "REG001",
  "lastYearGrade": "A",
  "nextYearGrade": "A+",
  "examPart1Marks": "85",
  "examPart2Marks": "90",
  "totalMarks": "175",
  "remarks": "Good student"
}
```

**Response (201):**
```json
{
  "id": 1,
  "submittedAt": "2024-01-15T10:30:00.000Z",
  ...all form fields
}
```

### Get All Records

```
GET /api/records
```

Returns array of all records, sorted by submission date (newest first).

### Get Record by ID

```
GET /api/records/:id
```

Returns a single record or 404 if not found.

### Delete Record by ID

```
DELETE /api/records/:id
```

Deletes a specific record. Returns 404 if not found.

### Delete All Records

```
DELETE /api/records
```

Deletes all records and returns count.

## Validation Rules

- All 20 form fields are required
- CNIC format: `XXXXX-XXXXXXX-X` (5 digits, hyphen, 7 digits, hyphen, 1 digit)
- Phone/WhatsApp: digits and hyphens only
- Date of birth: `YYYY-MM-DD` format
- Exam marks: numeric strings
- CNIC must be unique (409 error on duplicate)

## Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "details": {
    "field": "fieldName",
    "value": "problematic value"
  }
}
```

**Status Codes:**
- 200: Success
- 201: Created
- 400: Validation error
- 404: Not found
- 409: Conflict (duplicate CNIC)
- 500: Server error

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Test Database Setup

Create a separate test database:

```bash
psql -U postgres
CREATE DATABASE admission_system_test;
GRANT ALL PRIVILEGES ON DATABASE admission_system_test TO admission_admin;
\q
```

Set test database in `.env`:

```env
TEST_DB_NAME=admission_system_test
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Database connection pool
│   ├── controllers/
│   │   └── recordsController.js # Business logic
│   ├── routes/
│   │   └── records.js            # API routes
│   ├── validators/
│   │   └── recordValidator.js    # Zod schemas
│   ├── middleware/
│   │   ├── errorHandler.js       # Error handling
│   │   └── cors.js               # CORS configuration
│   └── server.js                 # Application entry point
├── test/
│   ├── setup.js                  # Test configuration
│   └── generators.js             # Test data generators
├── database/
│   ├── schema.sql                # Database schema
│   └── setup.md                  # Setup instructions
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Example environment variables
└── package.json
```

## Troubleshooting

### Database Connection Failed

- Ensure PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Verify database exists: `psql -U postgres -l`

### Port Already in Use

Change the port in `.env`:

```env
PORT=3001
```

### CORS Errors

Ensure `FRONTEND_URL` in `.env` matches your frontend URL.

### Test Failures

- Ensure test database exists and is accessible
- Clear test data: `psql -U admission_admin -d admission_system_test -c "DELETE FROM student_records;"`

## Development

### Adding New Endpoints

1. Add controller function in `src/controllers/`
2. Add route in `src/routes/`
3. Add validation if needed in `src/validators/`
4. Write tests in `test/`

### Environment Variables

- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Frontend origin for CORS

## License

ISC
