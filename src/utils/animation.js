function wait(delay, signal) {
  if (delay <= 0) return Promise.resolve(!signal.aborted);

  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }

    let timer;
    const finish = (completed) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', handleAbort);
      resolve(completed);
    };
    const handleAbort = () => finish(false);
    timer = setTimeout(() => finish(true), delay);
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

export async function playTrace(events, onStep, { delay = 420, signal } = {}) {
  if (!Array.isArray(events) || typeof onStep !== 'function') {
    throw new TypeError('playTrace requires an event array and a step handler.');
  }
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError('Trace delay must be a non-negative finite number.');
  }

  const controller = signal ? null : new AbortController();
  const activeSignal = signal ?? controller.signal;
  for (let index = 0; index < events.length; index += 1) {
    if (activeSignal.aborted) return false;
    await onStep(events[index], index);
    if (activeSignal.aborted) return false;
    if (index < events.length - 1 && !(await wait(delay, activeSignal))) {
      return false;
    }
  }
  return true;
}

export default class TraceAnimator {
  constructor({ delay = 420 } = {}) {
    this.delay = delay;
    this.controller = null;
  }

  get isRunning() {
    return this.controller !== null;
  }

  async play(events, onStep) {
    this.cancel();
    const controller = new AbortController();
    this.controller = controller;

    try {
      return await playTrace(events, onStep, {
        delay: this.delay,
        signal: controller.signal,
      });
    } finally {
      if (this.controller === controller) this.controller = null;
    }
  }

  cancel() {
    this.controller?.abort();
    this.controller = null;
  }
}