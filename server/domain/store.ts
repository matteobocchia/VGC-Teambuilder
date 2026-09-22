import type { TeamRevision } from './types';

type RevisionStore = Map<string, TeamRevision>;
const globalStore = globalThis as typeof globalThis & { __vgcRevisionStore?: RevisionStore };
export const revisionStore: RevisionStore = globalStore.__vgcRevisionStore ?? new Map<string, TeamRevision>();
globalStore.__vgcRevisionStore = revisionStore;

type ShareTokenStore = Map<string, string>;
const shareStore = globalThis as typeof globalThis & { __vgcShareTokenStore?: ShareTokenStore };
export const shareTokenStore: ShareTokenStore = shareStore.__vgcShareTokenStore ?? new Map<string, string>();
shareStore.__vgcShareTokenStore = shareTokenStore;
