import { redirect } from 'next/navigation';
import { requireArea } from '@/lib/area';

export const dynamic = 'force-dynamic';

/**
 * Alias for the listing edit screen. The form itself lives at
 * /dashboard/listings/[id]; this path exists so the documented route and the
 * real one are the same page rather than two write paths for one record.
 */
export default async function EditListingPage({ params }: { params: { id: string } }) {
  await requireArea('/dashboard', ['producer', 'coordinator']);
  redirect(`/dashboard/listings/${params.id}`);
}
