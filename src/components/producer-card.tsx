import Link from 'next/link';
import type { ProducerGroup, Profile } from '@/lib/types';
import { Badge, SampleTag } from './ui';

export function ProducerCard({ producer }: { producer: Profile }) {
  return (
    <Link
      href={`/producers/${producer.id}`}
      className="block bg-white border border-ink-100 rounded-2xl card-shadow p-4 hover:bg-clay-50"
    >
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-clay-700 text-white grid place-items-center font-bold text-lg" aria-hidden>
          {producer.displayName.slice(0, 1)}
        </span>
        <div className="flex-1">
          <div className="font-semibold text-ink-900">{producer.displayName}</div>
          <div className="text-sm text-ink-700">{producer.community}</div>
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-700 line-clamp-2">{producer.shortBio}</p>
      <div className="mt-2 flex flex-wrap gap-2 items-center">
        <Badge tone="neutral">{producer.producerType.replace('_', ' ')}</Badge>
        {producer.isDemo && <SampleTag />}
      </div>
    </Link>
  );
}

export function GroupCard({ group }: { group: ProducerGroup }) {
  return (
    <div className="bg-white border border-ink-100 rounded-2xl card-shadow p-4">
      <div className="font-semibold text-ink-900">{group.name}</div>
      <p className="text-sm text-ink-700 mt-1">{group.description}</p>
      <div className="mt-2 flex flex-wrap gap-2 items-center">
        <Badge tone="info">{group.memberProfileIds.length} members (sample)</Badge>
        {group.isDemo && <SampleTag />}
      </div>
    </div>
  );
}
