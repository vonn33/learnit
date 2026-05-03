import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

export function UploadDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  function filterMd(files: File[]): File[] {
    return files.filter((f) => f.name.toLowerCase().endsWith('.md') || f.name.toLowerCase().endsWith('.mdx'));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setHover(false);
    const files = filterMd(Array.from(e.dataTransfer.files));
    if (files.length) onFiles(files);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = filterMd(Array.from(e.target.files ?? []));
    if (files.length) onFiles(files);
    e.target.value = '';
  }

  return (
    <div
      data-testid="upload-dropzone"
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${hover ? 'border-[var(--color-ring)] bg-[var(--color-accent)]/20' : 'border-[var(--color-border)]'}`}
    >
      <Upload className="mx-auto mb-2 size-6 text-[var(--color-muted-foreground)]" />
      <div className="text-sm">Drop .md files here or click to pick</div>
      <input
        ref={inputRef}
        data-testid="upload-input"
        type="file"
        accept=".md,.mdx"
        multiple
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
