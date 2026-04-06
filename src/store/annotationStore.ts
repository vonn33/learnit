import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';

export interface Annotation {
  id: string;
  docId: string;
  position: { start: number; end: number };
  type: 'highlight' | 'note' | 'quick-capture';
  text: string;
  note?: string;
  mapNodeId?: string;
  tagIds?: string[];
  anchorContext?: string;
  createdAt: string;
}

type NewAnnotation = Omit<Annotation, 'id' | 'createdAt'>;
type AnnotationUpdate = Partial<Pick<Annotation, 'note' | 'mapNodeId' | 'tagIds' | 'type'>>;

interface AnnotationStore {
  annotations: Annotation[];
  showAnnotations: boolean;

  addAnnotation: (a: NewAnnotation) => string;
  updateAnnotation: (id: string, patch: AnnotationUpdate) => void;
  removeAnnotation: (id: string) => void;
  getAnnotationsForDoc: (docId: string) => Annotation[];
  toggleAnnotations: () => void;
  reset: () => void;
}

export const useAnnotationStore = create<AnnotationStore>()(
  persist(
    (set, get) => ({
      annotations: [],
      showAnnotations: true,

      addAnnotation: (a) => {
        const id = uuid();
        const annotation: Annotation = {
          ...a,
          id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ annotations: [...s.annotations, annotation] }));
        return id;
      },

      updateAnnotation: (id, patch) => {
        set((s) => ({
          annotations: s.annotations.map((a) =>
            a.id === id ? { ...a, ...patch } : a,
          ),
        }));
      },

      removeAnnotation: (id) => {
        set((s) => ({
          annotations: s.annotations.filter((a) => a.id !== id),
        }));
      },

      getAnnotationsForDoc: (docId) => {
        return get().annotations.filter((a) => a.docId === docId);
      },

      toggleAnnotations: () => {
        set((s) => ({ showAnnotations: !s.showAnnotations }));
      },

      reset: () => {
        set({ annotations: [], showAnnotations: true });
      },
    }),
    { name: 'handbook:annotations' },
  ),
);
