# Quick Start - Approval Status Feature

## 1. Run Migration (One-time setup)

```bash
npm run migrate:approval-status
```

## 2. Restart Server

```bash
npm run dev
```

## 3. Test the Endpoint

### Using cURL:
```bash
# Approve record ID 1
curl -X PATCH http://localhost:3000/api/admin/records/1/approval \
  -H "Content-Type: application/json" \
  -H "Cookie: adminToken=YOUR_TOKEN" \
  -d '{"approvalStatus": "approved"}'
```

### Expected Response:
```json
{
  "success": true,
  "message": "Approval status updated successfully",
  "data": {
    "id": 1,
    "approvalStatus": "approved"
  }
}
```

## 4. Frontend Integration

Your frontend dropdown should now work! It will:
- Send PATCH request to `/api/admin/records/:id/approval`
- Receive success/error response
- Refresh the table automatically

## Valid Status Values

- `"approved"` - Green in UI
- `"disapproved"` - Red in UI
- `null` - Pending (no status set)

## Troubleshooting

**Migration fails?**
- Check database connection in `.env`
- Ensure PostgreSQL is running

**401 Unauthorized?**
- Verify admin token is valid
- Check cookie is being sent

**404 Not Found?**
- Verify record ID exists
- Check database has records

**Frontend not working?**
- Open browser console for errors
- Check Network tab for API calls
- Verify API endpoint URL is correct

## Done! 🎉

Your approval status feature is now live. The frontend dropdown will update records in real-time.
