/**
 * One IntersectionObserver shared by every reveal primitive (instead of one observer + one JS animation per element).
 * Each target is unobserved after its first intersection. Without IntersectionObserver the callback runs at once, so
 * content is never left hidden.
 */
type Cb = () => void;

const ROOT_MARGIN = '0px 0px -8% 0px';
let io: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, Cb>();

function getObserver(): IntersectionObserver | null {
  if (io) return io;
  if (typeof IntersectionObserver === 'undefined') return null;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io?.unobserve(e.target);
        const cb = callbacks.get(e.target);
        callbacks.delete(e.target);
        cb?.();
      }
    },
    { rootMargin: ROOT_MARGIN },
  );
  return io;
}

/** Calls `cb` once when `el` first enters the viewport. Returns a cancel function. */
export function observeOnce(el: Element, cb: Cb): () => void {
  const obs = getObserver();
  if (!obs) {
    cb();
    return () => {};
  }
  callbacks.set(el, cb);
  obs.observe(el);
  return () => {
    callbacks.delete(el);
    obs.unobserve(el);
  };
}

/** Test helper: drop the shared observer so a new (mocked) IntersectionObserver is picked up. */
export function __resetInViewForTests(): void {
  io = null;
}
