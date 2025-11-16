# Supabase Type Generation

To generate the TypeScript types for the database, run the following command from the root of the project:

```bash
npx supabase gen types typescript --project-id rrarhekwhgpgkakqrlyn --schema public > lib/types/database.types.ts
```

Replace `YOUR_PROJECT_ID` with the actual project ID from your Supabase dashboard URL.
