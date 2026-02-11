import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EvidenceRecordLink({ recordId, className = '' }) {
  return (
    <Link to={createPageUrl(`EvidenceRecordDetail?id=${recordId}`)} className={className}>
      <span className="font-mono font-semibold text-[#86b027] hover:text-[#86b027]/80 cursor-pointer transition-colors">
        {recordId}
      </span>
    </Link>
  );
}