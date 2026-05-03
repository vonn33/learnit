import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogPortal, DialogOverlay } from '@radix-ui/react-dialog';
import { UploadDropzone } from './UploadDropzone';
import { MetadataForm, parseFile, toNewDoc, type ParsedFile } from './MetadataForm';
import { useDocStore } from '@/store/docStore';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';

export function ImportWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [parsed, setParsed] = useState<ParsedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createDoc = useDocStore((s) => s.createDoc);
  const navigate = useNavigate();

  async function handleFiles(files: File[]) {
    const parsedNew: ParsedFile[] = await Promise.all(
      files.map(async (f) => {
        const text = await f.text();
        return parseFile(f, text);
      }),
    );
    setParsed((prev) => [...prev, ...parsedNew]);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let firstSlug = '';
      for (const p of parsed) {
        const created = await createDoc(toNewDoc(p));
        if (!firstSlug) firstSlug = created.slug;
      }
      setParsed([]);
      onClose();
      if (firstSlug) navigate(`/docs/${firstSlug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50" />
        <DialogContent className="fixed inset-0 z-50 grid place-items-center p-4 outline-none">
          <div className="bg-[var(--color-background)] rounded-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">Import documents</DialogTitle>
              <button onClick={onClose} className="p-1 hover:bg-[var(--color-accent)] rounded"><X className="size-4" /></button>
            </div>

            <UploadDropzone onFiles={handleFiles} />

            {parsed.map((p, i) => (
              <MetadataForm
                key={`${p.filename}-${i}`}
                parsed={p}
                onChange={(next) => {
                  setParsed((prev) => prev.map((x, j) => (j === i ? next : x)));
                }}
              />
            ))}

            {error && <div className="text-sm text-red-500">{error}</div>}

            {parsed.length > 0 && (
              <div className="flex gap-2 justify-end">
                <button onClick={() => setParsed([])} className="px-3 py-1.5 text-sm border rounded">Clear</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded disabled:opacity-50"
                >
                  {submitting ? 'Importing…' : `Import ${parsed.length} doc${parsed.length === 1 ? '' : 's'}`}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
