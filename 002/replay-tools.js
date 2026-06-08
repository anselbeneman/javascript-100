(function () {
  'use strict';

  const TRACE_VERSION = 1;
  const DEFAULT_LIMIT = 240;
  const MAX_LIMIT = 720;
  const MAX_DURATION_MS = 120000;

  function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createTraceState(limit = DEFAULT_LIMIT) {
    return {
      version: TRACE_VERSION,
      maxEvents: clamp(Math.round(toFiniteNumber(limit, DEFAULT_LIMIT)), 1, MAX_LIMIT),
      active: false,
      startedAtMs: 0,
      durationMs: 0,
      events: [],
    };
  }

  function normalizeColor(value) {
    const source = Array.isArray(value) ? value : [0.5, 1, 0.8];
    return [0, 1, 2].map((index) => clamp(toFiniteNumber(source[index], index === 1 ? 1 : 0.5), 0, 1));
  }

  function normalizeEvent(value, fallbackTimeMs) {
    const event = value && typeof value === 'object' ? value : {};
    return {
      timeMs: clamp(Math.round(toFiniteNumber(event.timeMs, fallbackTimeMs)), 0, MAX_DURATION_MS),
      x: clamp(toFiniteNumber(event.x, 0.5), 0, 1),
      y: clamp(toFiniteNumber(event.y, 0.5), 0, 1),
      dx: clamp(toFiniteNumber(event.dx, 0), -1, 1),
      dy: clamp(toFiniteNumber(event.dy, 0), -1, 1),
      pressure: clamp(toFiniteNumber(event.pressure, 0.75), 0, 2),
      color: normalizeColor(event.color),
    };
  }

  function normalizeTrace(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const limit = clamp(Math.round(toFiniteNumber(value.maxEvents, DEFAULT_LIMIT)), 1, MAX_LIMIT);
    const rawEvents = Array.isArray(value.events) ? value.events.slice(0, limit) : [];
    let previousTimeMs = 0;
    const events = rawEvents.map((rawEvent, index) => {
      const event = normalizeEvent(rawEvent, index * 16);
      event.timeMs = Math.max(previousTimeMs, event.timeMs);
      previousTimeMs = event.timeMs;
      return event;
    });
    const durationMs = clamp(
      Math.round(toFiniteNumber(value.durationMs, previousTimeMs)),
      previousTimeMs,
      MAX_DURATION_MS,
    );

    return {
      version: TRACE_VERSION,
      maxEvents: limit,
      durationMs,
      events,
    };
  }

  function fingerprintNumber(value, scale) {
    return Math.round(toFiniteNumber(value, 0) * scale);
  }

  function createTraceFingerprint(value) {
    const trace = normalizeTrace(value);

    if (!trace || trace.events.length === 0) {
      return '';
    }

    const parts = [
      trace.version,
      trace.durationMs,
      trace.events.length,
    ];

    trace.events.forEach((event) => {
      parts.push(
        event.timeMs,
        fingerprintNumber(event.x, 10000),
        fingerprintNumber(event.y, 10000),
        fingerprintNumber(event.dx, 100000),
        fingerprintNumber(event.dy, 100000),
        fingerprintNumber(event.pressure, 1000),
        fingerprintNumber(event.color[0], 1000),
        fingerprintNumber(event.color[1], 1000),
        fingerprintNumber(event.color[2], 1000),
      );
    });

    let hash = 2166136261;
    const source = parts.join('|');

    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return `trc-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function beginRecording(state, nowMs) {
    if (!state || !Array.isArray(state.events)) {
      return createTraceState();
    }

    state.version = TRACE_VERSION;
    state.active = true;
    state.startedAtMs = toFiniteNumber(nowMs, 0);
    state.durationMs = 0;
    state.events.length = 0;
    return summarizeTrace(state);
  }

  function finishRecording(state, nowMs) {
    if (!state || !Array.isArray(state.events)) {
      return null;
    }

    const elapsedMs = Math.max(0, Math.round(toFiniteNumber(nowMs, state.startedAtMs) - state.startedAtMs));
    const lastEventTimeMs = state.events.length > 0 ? state.events[state.events.length - 1].timeMs : 0;
    state.active = false;
    state.durationMs = clamp(Math.max(elapsedMs, lastEventTimeMs), lastEventTimeMs, MAX_DURATION_MS);
    return normalizeTrace(state);
  }

  function clearRecording(state) {
    if (!state || !Array.isArray(state.events)) {
      return;
    }

    state.active = false;
    state.startedAtMs = 0;
    state.durationMs = 0;
    state.events.length = 0;
  }

  function recordSplat(state, splat, nowMs) {
    if (!state || !state.active || !Array.isArray(state.events)) {
      return summarizeTrace(state);
    }

    if (state.events.length >= state.maxEvents) {
      finishRecording(state, nowMs);
      return summarizeTrace(state);
    }

    const elapsedMs = Math.max(0, Math.round(toFiniteNumber(nowMs, state.startedAtMs) - state.startedAtMs));
    const event = normalizeEvent({
      ...splat,
      timeMs: elapsedMs,
    }, elapsedMs);

    state.events.push(event);
    state.durationMs = event.timeMs;

    if (state.events.length >= state.maxEvents) {
      finishRecording(state, nowMs);
    }

    return summarizeTrace(state);
  }

  function createReplayState(trace, nowMs) {
    const normalizedTrace = normalizeTrace(trace);

    if (!normalizedTrace || normalizedTrace.events.length === 0) {
      return null;
    }

    return {
      active: true,
      startedAtMs: toFiniteNumber(nowMs, 0),
      index: 0,
      trace: normalizedTrace,
    };
  }

  function eventToSplat(event) {
    return {
      x: event.x,
      y: event.y,
      dx: event.dx,
      dy: event.dy,
      pressure: event.pressure,
      color: event.color.slice(),
    };
  }

  function collectReplaySplats(state, nowMs) {
    if (!state || !state.active || !state.trace) {
      return {
        splats: [],
        completed: false,
        progress: 0,
      };
    }

    const elapsedMs = Math.max(0, toFiniteNumber(nowMs, state.startedAtMs) - state.startedAtMs);
    const splats = [];

    while (state.index < state.trace.events.length && state.trace.events[state.index].timeMs <= elapsedMs) {
      splats.push(eventToSplat(state.trace.events[state.index]));
      state.index += 1;
    }

    const completed = state.index >= state.trace.events.length && elapsedMs >= state.trace.durationMs;
    state.active = !completed;

    return {
      splats,
      completed,
      progress: clamp(elapsedMs / Math.max(1, state.trace.durationMs), 0, 1),
    };
  }

  function summarizeTrace(value) {
    const trace = normalizeTrace(value);

    if (!trace) {
      return {
        active: false,
        events: 0,
        maxEvents: DEFAULT_LIMIT,
        durationMs: 0,
        complete: false,
      };
    }

    return {
      active: Boolean(value && value.active),
      events: trace.events.length,
      maxEvents: trace.maxEvents,
      durationMs: trace.durationMs,
      complete: trace.events.length > 0,
    };
  }

  function analyzeTrace(value) {
    const trace = normalizeTrace(value);

    if (!trace || trace.events.length === 0) {
      return {
        events: 0,
        durationMs: 0,
        avgIntervalMs: 0,
        peakPressure: 0,
        avgPressure: 0,
        totalTravel: 0,
        fingerprint: '',
        bounds: null,
      };
    }

    let intervalTotal = 0;
    let pressureTotal = 0;
    let peakPressure = 0;
    let totalTravel = 0;
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;

    trace.events.forEach((event, index) => {
      if (index > 0) {
        intervalTotal += event.timeMs - trace.events[index - 1].timeMs;
      }

      pressureTotal += event.pressure;
      peakPressure = Math.max(peakPressure, event.pressure);
      totalTravel += Math.hypot(event.dx, event.dy);
      minX = Math.min(minX, event.x);
      maxX = Math.max(maxX, event.x);
      minY = Math.min(minY, event.y);
      maxY = Math.max(maxY, event.y);
    });

    return {
      events: trace.events.length,
      durationMs: trace.durationMs,
      avgIntervalMs: trace.events.length > 1 ? intervalTotal / (trace.events.length - 1) : 0,
      peakPressure,
      avgPressure: pressureTotal / trace.events.length,
      totalTravel,
      fingerprint: createTraceFingerprint(trace),
      bounds: {
        minX,
        maxX,
        minY,
        maxY,
      },
    };
  }

  window.FluidReplayTools = Object.freeze({
    analyzeTrace,
    beginRecording,
    clearRecording,
    collectReplaySplats,
    createReplayState,
    createTraceFingerprint,
    createTraceState,
    finishRecording,
    normalizeTrace,
    recordSplat,
    summarizeTrace,
  });
}());
