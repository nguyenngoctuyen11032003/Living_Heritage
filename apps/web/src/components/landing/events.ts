/** Window event asking the sample-story section to scroll into view and start playing. */
export const PLAY_SAMPLE_EVENT = 'lh:play-sample';

export function requestSamplePlay(): void {
  window.dispatchEvent(new CustomEvent(PLAY_SAMPLE_EVENT));
}
