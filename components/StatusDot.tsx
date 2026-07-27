import React from 'react';

interface StatusDotProps {
  done: boolean;
  partial?: boolean;
  label: string;
}

function StatusDot({ done, partial, label }: StatusDotProps) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
          done ? 'bg-success shadow-[0_0_6px_rgba(52,211,153,0.4)]' :
          partial ? 'bg-warn shadow-[0_0_6px_rgba(251,191,36,0.3)]' :
          'bg-base-border'
        }`}
        title={label}
        aria-hidden="true"
      />
    </div>
  );
}

export default React.memo(StatusDot);
