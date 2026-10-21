// DB enum values and product limits (spec 1 §7). Must match supabase/migrations exactly.
export const MEMBER_ROLES = ['owner', 'manager', 'editor', 'viewer'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const STORY_KINDS = ['story', 'experience'] as const;
export type StoryKind = (typeof STORY_KINDS)[number];

export const EDIT_STATUSES = ['draft', 'pending_review', 'approved'] as const;
export type EditStatus = (typeof EDIT_STATUSES)[number];

export const VISIBILITIES = ['private', 'family', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const JOB_STATUSES = ['queued', 'transcribing', 'drafting', 'done', 'error'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PUBLISH_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

/** Topic slugs seeded in the DB (topics.slug). Order = display order in the narrator topic picker. */
export const TOPIC_SLUGS = ['tuoi-tho', 'gia-dinh', 'que-huong', 'nghe-nghiep', 'mon-an', 'lam-vuon'] as const;
export type TopicSlug = (typeof TOPIC_SLUGS)[number];

export const REGIONS = ['bac', 'trung', 'nam'] as const;
export type Region = (typeof REGIONS)[number];

export const MAX_RECORDING_SECONDS = 600;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

/** Storage buckets. recordings path: `${family_id}/${narrator_id}/${uuid}.webm` */
export const BUCKET_RECORDINGS = 'recordings';
export const BUCKET_PUBLIC_AUDIO = 'public-audio';
export const BUCKET_MEDIA = 'media';

export const AI_FUNCTION = 'ai-process';
