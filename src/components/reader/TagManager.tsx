import {useEffect, useRef, useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import {type Tag, getTags, saveTags} from '@/lib/storage';
import {useAnnotationStore} from '@/store/annotationStore';
import {GripVertical, X} from 'lucide-react';

interface TagManagerProps {
  onClose?: () => void;
}

export function TagManager({onClose}: TagManagerProps) {
  const [tags, setTagsState] = useState<Tag[]>(() => getTags());
  const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#facc15');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    const annotations = useAnnotationStore.getState().annotations;
    const counts = new Map<string, number>();
    for (const hl of annotations) {
      for (const id of hl.tagIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    setUsageCounts(counts);
  }, []);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  function persist(next: Tag[]) {
    setTagsState(next);
    saveTags(next);
  }

  function addTag() {
    if (!newName.trim()) return;
    persist([...tags, {id: uuidv4(), name: newName.trim(), color: newColor}]);
    setNewName('');
    setNewColor('#facc15');
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function saveEdit() {
    persist(
      tags.map((t) =>
        t.id === editingId ? {...t, name: editName.trim(), color: editColor} : t,
      ),
    );
    setEditingId(null);
  }

  function handleDeleteClick(id: string) {
    if (deleteConfirmId === id) {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      // Cascade: remove tag from all annotations
      const store = useAnnotationStore.getState();
      store.annotations
        .filter((a) => a.tagIds.includes(id))
        .forEach((a) => store.updateAnnotation(a.id, {tagIds: a.tagIds.filter((tid) => tid !== id)}));
      persist(tags.filter((t) => t.id !== id));
      setDeleteConfirmId(null);
    } else {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      setDeleteConfirmId(id);
      deleteTimerRef.current = setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...tags];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    persist(next);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--color-foreground)]">Manage Tags</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {tags.map((tag, index) => {
          const count = usageCounts.get(tag.id) ?? 0;
          const isConfirming = deleteConfirmId === tag.id;
          const isDragging = dragIndex === index;
          const isDragOver = dragOverIndex === index;

          return editingId === tag.id ? (
            <div key={tag.id} className="flex items-center gap-2 p-2 rounded-lg border">
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border"
              />
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 text-sm bg-[var(--color-muted)] rounded px-2 py-1 outline-none text-[var(--color-foreground)]"
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                autoFocus
              />
              <button
                onClick={saveEdit}
                className="text-xs px-2 py-1 rounded bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="text-xs px-2 py-1 rounded border text-[var(--color-muted-foreground)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div
              key={tag.id}
              className={[
                'flex items-center gap-2 p-2 rounded-lg border transition-colors',
                isDragging ? 'opacity-40' : '',
                isDragOver ? 'border-[var(--color-ring)] bg-[var(--color-accent)]' : 'border-transparent hover:bg-[var(--color-muted)]',
              ].join(' ')}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {e.preventDefault(); setDragOverIndex(index);}}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => {setDragIndex(null); setDragOverIndex(null);}}
            >
              <GripVertical size={14} className="text-[var(--color-muted-foreground)] cursor-grab shrink-0" />
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{background: tag.color}}
              />
              <span className="flex-1 text-sm text-[var(--color-foreground)] truncate">
                {tag.name}
                <span className="text-xs text-[var(--color-muted-foreground)] ml-1.5">
                  {count > 0 ? `(${count})` : '(unused)'}
                </span>
              </span>
              <button
                onClick={() => startEdit(tag)}
                className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors px-1.5"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteClick(tag.id)}
                className={[
                  'text-xs px-2 py-0.5 rounded transition-colors',
                  isConfirming
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-[var(--color-muted-foreground)] hover:text-red-400',
                ].join(' ')}
              >
                {isConfirming
                  ? count > 0
                    ? `${count} uses — confirm?`
                    : 'Confirm?'
                  : 'Delete'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add new tag */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border shrink-0"
          title="Tag colour"
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New tag name"
          className="flex-1 text-sm bg-[var(--color-muted)] rounded px-2.5 py-1.5 outline-none focus:ring-1 ring-[var(--color-ring)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
        />
        <button
          onClick={addTag}
          disabled={!newName.trim()}
          className="text-xs px-3 py-1.5 rounded bg-[var(--color-primary)] text-[var(--color-primary-foreground)] disabled:opacity-40 transition-opacity"
        >
          Add
        </button>
      </div>
    </div>
  );
}
