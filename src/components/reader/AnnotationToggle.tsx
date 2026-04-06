import { Eye, EyeOff } from 'lucide-react';
import { useAnnotationStore } from '@/store/annotationStore';

export function AnnotationToggle() {
  const show = useAnnotationStore((s) => s.showAnnotations);
  const toggle = useAnnotationStore((s) => s.toggleAnnotations);

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
      title={show ? 'Hide annotations' : 'Show annotations'}
    >
      {show ? <Eye size={14} /> : <EyeOff size={14} />}
      <span>{show ? 'Annotated' : 'Raw'}</span>
    </button>
  );
}
