// Public contract of the narrators feature (workstream E1). Keep these signatures stable:
//
//   useNarrators(familyId: string | null | undefined): { narrators: Narrator[]; loading; error: string | null; reload() }
//     Narrators of a family (any member can read). Example: useNarrators(useCurrentFamily().current?.id)
//
//   useMyNarrator(): { narrator: Narrator | null; family_name: string | null; loading; error: string | null; reload() }
//     For anonymous narrator-link users: the narrator whose user_id = auth uid, plus the family name.
//
//   NARRATOR_ID_KEY = 'lh.narratorId'  (narrator id claimed on this device, written by /k/:token)
//   narratorLinkUrl(token), assistedTellPath(narratorId)
export { useNarrators, useMyNarrator } from './hooks';
export type { Narrator, NarratorLink, NarratorsState, MyNarratorState } from './hooks';
export { NARRATOR_ID_KEY, narratorLinkUrl, assistedTellPath } from './urls';
