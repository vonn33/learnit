import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Trash2} from 'lucide-react';
import {useDocStore} from '@/store/docStore';
import {useAnnotationStore} from '@/store/annotationStore';

export default function ContentManagementPage() {
  const docs = useDocStore((s) => s.docs);
  const annotations = useAnnotationStore((s) => s.annotations);
  const fetchAll = useDocStore((s) => s.fetchAll);
  const deleteDoc = useDocStore((s) => s.deleteDoc);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function annotationCount(docId: string) {
    return annotations.filter((a) => a.docId === docId).length;
  }

  async function handleDelete(mode: 'cascade' | 'retain') {
    if (!deleteTarget) return;
    await deleteDoc(deleteTarget, mode);
    setDeleteTarget(null);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Content</h1>
      <table className="w-full text-sm">
        <thead className="text-left text-[var(--color-muted-foreground)] border-b">
          <tr>
            <th className="py-2">Title</th>
            <th>Project / Section</th>
            <th>Words</th>
            <th>Annotations</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-b">
              <td className="py-2">
                <Link
                  to={`/docs/${d.project}/${d.section}/${d.slug}`}
                  className="hover:underline"
                >
                  {d.title}
                </Link>
              </td>
              <td>
                {d.project} / {d.section}
              </td>
              <td>{d.word_count}</td>
              <td>{annotationCount(d.id)}</td>
              <td>
                <button
                  onClick={() => setDeleteTarget(d.id)}
                  className="p-1 text-[var(--color-muted-foreground)] hover:text-red-500"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {docs.length === 0 && (
        <div className="text-sm text-[var(--color-muted-foreground)] py-8 text-center">
          No documents yet. Use Import to add one.
        </div>
      )}

      {deleteTarget && (
        <DeleteModal
          docTitle={docs.find((d) => d.id === deleteTarget)?.title ?? ''}
          annotationCount={annotationCount(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function DeleteModal({
  docTitle,
  annotationCount,
  onCancel,
  onDelete,
}: {
  docTitle: string;
  annotationCount: number;
  onCancel: () => void;
  onDelete: (mode: 'cascade' | 'retain') => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="bg-[var(--color-background)] rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Delete &ldquo;{docTitle}&rdquo;?</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          This document has {annotationCount} annotation{annotationCount === 1 ? '' : 's'}. Choose how to handle them:
        </p>
        <div className="space-y-2">
          <button
            onClick={() => onDelete('cascade')}
            className="w-full px-3 py-2 text-sm border rounded hover:bg-red-500 hover:text-white text-left"
          >
            <div className="font-medium">Delete document and annotations</div>
            <div className="text-xs opacity-70">Removes everything permanently</div>
          </button>
          <button
            onClick={() => onDelete('retain')}
            className="w-full px-3 py-2 text-sm border rounded hover:bg-[var(--color-accent)] text-left"
          >
            <div className="font-medium">Delete document, keep annotations</div>
            <div className="text-xs opacity-70">Annotations stay in HighlightsPage as detached</div>
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm border rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
