# Q&A API Error 501 - Investigation

## Error Details

```
Error 501: UNIMPLEMENTED
"My Business Q&A API is no longer supported"
```

## API Discovery Shows (20251119):

- API is ACTIVE and updated
- Endpoint: https://mybusinessqanda.googleapis.com/v1
- Pattern: locations/{id}/questions

## Current Code URL:

```
https://mybusinessqanda.googleapis.com/v1/locations/123456/questions
```

## Possible Issues:

1. ❓ URL format correct per spec
2. ❓ OAuth token/permissions issue?
3. ❓ GBP API access quota = 0?
4. ❓ Location ID format issue?

## Next Steps:

1. Check actual error details from logs
2. Verify OAuth scopes
3. Test with simple curl request
4. Check Google Cloud console for API status
