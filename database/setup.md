# Database Setup Instructions

## Prerequisites

Install PostgreSQL 14 or higher:

### Windows
Download and install from: https://www.postgresql.org/download/windows/

### macOS (using Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

## Step 1: Create Database and User

Access PostgreSQL as the postgres superuser:

```bash
# Windows/Linux
psql -U postgres

# macOS (if installed via Homebrew)
psql postgres
```

In the PostgreSQL shell, run:

```sql
CREATE DATABASE admission_system;
CREATE USER admission_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE admission_system TO admission_admin;
\q
```

## Step 2: Create Schema

Connect to the database as admission_admin:

```bash
psql -U admission_admin -d admission_system
```

Run the schema file:

```sql
\i database/schema.sql
```

Or copy and paste the contents of `schema.sql` into the psql prompt.

## Step 3: Verify Setup

Check that the table was created:

```sql
\dt
\d student_records
```

You should see the `student_records` table with all columns and indexes.

Exit psql:

```sql
\q
```

## Step 4: Configure Environment Variables

Copy `.env.example` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env` and set your database password:

```env
DB_PASSWORD=your_secure_password
```

## Test Database Setup

For testing, create a separate test database:

```bash
psql -U postgres
```

```sql
CREATE DATABASE admission_system_test;
GRANT ALL PRIVILEGES ON DATABASE admission_system_test TO admission_admin;
\q
```

Then run the schema on the test database:

```bash
psql -U admission_admin -d admission_system_test -f database/schema.sql
```

## Troubleshooting

### Connection refused
- Ensure PostgreSQL service is running
- Check that PostgreSQL is listening on port 5432

### Authentication failed
- Verify username and password in `.env`
- Check PostgreSQL authentication settings in `pg_hba.conf`

### Permission denied
- Ensure the user has proper privileges on the database
- Run the GRANT commands from Step 1
