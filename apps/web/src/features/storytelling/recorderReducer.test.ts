import { describe, expect, it } from 'vitest';
import { initialRecorderState, isCapturing, recorderReducer, type RecorderEvent, type RecorderState } from './recorderReducer';

const run = (events: RecorderEvent[], from: RecorderState = initialRecorderState) => events.reduce(recorderReducer, from);

describe('recorderReducer', () => {
  it('walks the happy path idle → requesting → recording → paused → recording → stopped', () => {
    const states = [initialRecorderState];
    for (const e of [{ type: 'REQUEST' }, { type: 'GRANTED' }, { type: 'PAUSE' }, { type: 'RESUME' }, { type: 'STOP' }] as RecorderEvent[]) {
      states.push(recorderReducer(states[states.length - 1]!, e));
    }
    expect(states.map((s) => s.status)).toEqual(['idle', 'requesting', 'recording', 'paused', 'recording', 'stopped']);
    expect(states[5]!.autoStopped).toBe(false);
  });

  it('marks an automatic stop', () => {
    expect(run([{ type: 'REQUEST' }, { type: 'GRANTED' }, { type: 'STOP', auto: true }]).autoStopped).toBe(true);
  });

  it('can stop while paused', () => {
    expect(run([{ type: 'REQUEST' }, { type: 'GRANTED' }, { type: 'PAUSE' }, { type: 'STOP' }]).status).toBe('stopped');
  });

  it('ignores illegal transitions and returns the same object', () => {
    const idle = initialRecorderState;
    for (const e of [{ type: 'GRANTED' }, { type: 'PAUSE' }, { type: 'RESUME' }, { type: 'STOP' }, { type: 'DENIED' }] as RecorderEvent[]) {
      expect(recorderReducer(idle, e)).toBe(idle);
    }
    const recording = run([{ type: 'REQUEST' }, { type: 'GRANTED' }]);
    expect(recorderReducer(recording, { type: 'REQUEST' })).toBe(recording);
    expect(recorderReducer(recording, { type: 'RESUME' })).toBe(recording);
    expect(recorderReducer(recording, { type: 'RESET' })).toBe(recording);
    const stopped = run([{ type: 'STOP' }], recording);
    expect(recorderReducer(stopped, { type: 'PAUSE' })).toBe(stopped);
    expect(recorderReducer(stopped, { type: 'REQUEST' })).toBe(stopped);
  });

  it('handles a refused microphone and allows one explicit retry', () => {
    const denied = run([{ type: 'REQUEST' }, { type: 'DENIED' }]);
    expect(denied.status).toBe('denied');
    expect(recorderReducer(denied, { type: 'REQUEST' }).status).toBe('requesting');
    expect(recorderReducer(denied, { type: 'RESET' }).status).toBe('idle');
  });

  it('records errors and unsupported browsers', () => {
    expect(run([{ type: 'REQUEST' }, { type: 'FAIL', error: 'no_device' }])).toMatchObject({ status: 'error', error: 'no_device' });
    expect(run([{ type: 'UNSUPPORTED' }]).status).toBe('unsupported');
    const unsupported = run([{ type: 'UNSUPPORTED' }]);
    expect(recorderReducer(unsupported, { type: 'REQUEST' })).toBe(unsupported);
  });

  it('resets a reviewed take back to idle', () => {
    expect(run([{ type: 'REQUEST' }, { type: 'GRANTED' }, { type: 'STOP' }, { type: 'RESET' }])).toEqual(initialRecorderState);
  });

  it('isCapturing is true only while the microphone is live', () => {
    expect(isCapturing('recording')).toBe(true);
    expect(isCapturing('paused')).toBe(true);
    expect(isCapturing('stopped')).toBe(false);
    expect(isCapturing('idle')).toBe(false);
  });
});

describe('recorderReducer — "Kể tiếp" after listening back', () => {
  const recording = run([{ type: 'REQUEST' }, { type: 'GRANTED' }]);

  it('a manual stop keeps the take open and CONTINUE goes back to recording', () => {
    const stopped = recorderReducer(recording, { type: 'STOP', canContinue: true });
    expect(stopped).toMatchObject({ status: 'stopped', canContinue: true, autoStopped: false });
    expect(recorderReducer(stopped, { type: 'CONTINUE' })).toMatchObject({ status: 'recording', canContinue: false });
  });

  it('the time limit ends the take for good', () => {
    const auto = recorderReducer(recording, { type: 'STOP', auto: true, canContinue: true });
    expect(auto).toMatchObject({ status: 'stopped', autoStopped: true, canContinue: false });
    expect(recorderReducer(auto, { type: 'CONTINUE' })).toBe(auto);
  });

  it('a lost microphone while listening back makes the take final', () => {
    const stopped = recorderReducer(recording, { type: 'STOP', canContinue: true });
    expect(recorderReducer(stopped, { type: 'STOP' })).toMatchObject({ status: 'stopped', canContinue: false });
  });

  it('a new request clears the continue flag', () => {
    expect(recorderReducer(initialRecorderState, { type: 'REQUEST' }).canContinue).toBe(false);
  });
});
