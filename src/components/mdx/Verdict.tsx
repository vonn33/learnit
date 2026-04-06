import {CheckCircle2, Info, AlertTriangle, XCircle} from 'lucide-react';

type VerdictType = 'strong' | 'nuanced' | 'weak' | 'info';

interface VerdictProps {
  type: VerdictType;
  label: string;
  children: React.ReactNode;
}

const CONFIG: Record<VerdictType, {icon: React.ReactNode; border: string; bg: string; text: string}> = {
  strong: {
    icon: <CheckCircle2 size={15} />,
    border: 'border-l-green-500',
    bg: 'bg-green-500/8',
    text: 'text-green-400',
  },
  nuanced: {
    icon: <AlertTriangle size={15} />,
    border: 'border-l-amber-500',
    bg: 'bg-amber-500/8',
    text: 'text-amber-400',
  },
  weak: {
    icon: <XCircle size={15} />,
    border: 'border-l-red-500',
    bg: 'bg-red-500/8',
    text: 'text-red-400',
  },
  info: {
    icon: <Info size={15} />,
    border: 'border-l-blue-500',
    bg: 'bg-blue-500/8',
    text: 'text-blue-400',
  },
};

export function Verdict({type, label, children}: VerdictProps) {
  const {icon, border, bg, text} = CONFIG[type] ?? CONFIG.info;
  return (
    <div className={`border-l-4 ${border} ${bg} rounded-r-lg px-4 py-3 my-4`}>
      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2 ${text}`}>
        {icon}
        {label}
      </div>
      <div className="text-[var(--color-foreground)] text-sm leading-relaxed">{children}</div>
    </div>
  );
}
