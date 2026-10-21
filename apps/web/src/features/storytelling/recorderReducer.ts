// Pure state machine for the microphone recorder. Illegal transitions are ignored (state returned unchanged).

export type RecorderStatus =
  | 'idle'
  | 'requesting' // waiting for the browser's microphone permission
  | 'recording'
  | 'paused'
  | 'stopped' // a take is ready to review
  | 'denied' // the person (or the browser) refused the microphone
  | 'unsupported' // no getUserMedia / MediaRecorder in this browser
  | 'error';

export type RecorderErrorCode = 'no_device' | 'failed';

export interface RecorderState {
  status: RecorderStatus;
  /** true when the take was stopped by the time limit, not by the person. */
  autoStopped: boolean;
  error: RecorderErrorCode | null;
}

export type RecorderEvent =
  | { type: 'REQUEST' }
  | { type: 'GRANTED' }
  | { type: 'DENIED' }
  | { type: 'UNSUPPORTED' }
  | { type: 'FAIL'; error: RecorderErrorCode }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP'; auto?: boolean }
  | { type: 'RESET' };

export const initialRecorderState: RecorderState = { status: 'idle', autoStopped: false, error: null };

export function recorderReducer(state: RecorderState, event: RecorderEvent): RecorderState {
  const s = state.status;
  switch (event.type) {
    case 'REQUEST':
      // Asking again after a refusal is allowed only by an explicit tap (never in a loop).
      return s === 'idle' || s === 'denied' || s === 'error' ? { status: 'requesting', autoStopped: false, error: null } : state;
    case 'GRANTED':
      return s === 'requesting' ? { ...state, status: 'recording' } : state;
    case 'DENIED':
      return s === 'requesting' ? { ...state, status: 'denied' } : state;
    case 'UNSUPPORTED':
      return s === 'idle' || s === 'requesting' ? { ...state, status: 'unsupported' } : state;
    case 'FAIL':
      return s === 'requesting' || s === 'recording' || s === 'paused' ? { ...state, status: 'error', error: event.error } : state;
    case 'PAUSE':
      return s === 'recording' ? { ...state, status: 'paused' } : state;
    case 'RESUME':
      return s === 'paused' ? { ...state, status: 'recording' } : state;
    case 'STOP':
      return s === 'recording' || s === 'paused' ? { ...state, status: 'stopped', autoStopped: !!event.auto } : state;
    case 'RESET':
      return s === 'stopped' || s === 'denied' || s === 'error' || s === 'idle' ? initialRecorderState : state;
    default:
      return state;
  }
}

/** The microphone is live (recording or paused): leaving the page would lose the take. */
export function isCapturing(status: RecorderStatus): boolean {
  return status === 'recording' || status === 'paused' || status === 'requesting';
}
