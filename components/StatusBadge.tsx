
import React from 'react';
import { ProcessingStatus } from '../types';

interface Props {
  status: ProcessingStatus;
}

const StatusBadge: React.FC<Props> = ({ status }) => {
  const configs = {
    [ProcessingStatus.IDLE]: { label: 'Idle', color: 'bg-slate-100 text-slate-500' },
    [ProcessingStatus.UPLOADING]: { label: 'Uploading', color: 'bg-blue-100 text-blue-600 animate-pulse' },
    [ProcessingStatus.PROCESSING]: { label: 'Processing', color: 'bg-amber-100 text-amber-600' },
    [ProcessingStatus.COMPLETED]: { label: 'Ready', color: 'bg-emerald-100 text-emerald-600' },
    [ProcessingStatus.ERROR]: { label: 'Error', color: 'bg-rose-100 text-rose-600' }
  };

  const config = configs[status];

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${config.color}`}>
      {config.label}
    </div>
  );
};

export default StatusBadge;
