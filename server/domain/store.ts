import type { TeamRevision } from './types';

type RevisionStore = Map<string, TeamRevision>;
const globalStore = globalThis as typeof globalThis & { __vgcRevisionStore?: RevisionStore };
export const revisionStore: RevisionStore = globalStore.__vgcRevisionStore ?? new Map<string, TeamRevision>();
globalStore.__vgcRevisionStore = revisionStore;
