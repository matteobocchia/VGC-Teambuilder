'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Home from '../../page';
import { SharedRevisionView } from '../revisions/[id]/page';

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const shareToken = searchParams.get('shareToken');
  if (shareToken) return <SharedRevisionView id={params.id} shareToken={shareToken} />;
  return <Home />;
}
