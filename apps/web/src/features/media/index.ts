// Public contract of the media feature (workstream P2).
//   <StoryPhotos storyId familyId canEdit />        photo section of a story (grid, lightbox, upload for editors)
//   useStoryPhotos(storyId) / useFamilyPhotos(familyId)  rows + signed URLs
//   useStoryCover(storyId)                          first photo of a story, batched for story cards
//   uploadStoryPhoto(file, {familyId, storyId, caption, position}, {sb})
export { StoryPhotos } from './StoryPhotos';
export type { StoryPhotosProps } from './StoryPhotos';
export { Lightbox } from './Lightbox';
export type { LightboxItem } from './Lightbox';
export { useStoryPhotos, useFamilyPhotos, useStoryCover, invalidateCover } from './hooks';
export type { PhotoWithUrl, AlbumPhoto } from './hooks';
export {
  uploadStoryPhoto,
  deleteStoryPhoto,
  updateCaption,
  savePositions,
  signPhotoUrls,
  validatePhotoFile,
  buildPhotoPath,
  fitWithin,
  MEDIA_BUCKET,
  MAX_PHOTO_BYTES,
} from './photos';
export type { StoryPhotoRow } from './photos';
export { vaultByNarratorPath } from './tree';
