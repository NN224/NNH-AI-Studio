import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect directly to dashboard (skip landing page with translation issues)
  redirect('/en/dashboard');
}

