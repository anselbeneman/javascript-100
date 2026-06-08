(function () {
  'use strict';

  const FIELD_NAMES = Object.freeze([
    'vx',
    'vy',
    'vx0',
    'vy0',
    'r',
    'g',
    'b',
    'r0',
    'g0',
    'b0',
    'pressure',
    'pressure0',
    'divergence',
    'curl',
  ]);

  function createState() {
    const state = { size: 0 };

    FIELD_NAMES.forEach((name) => {
      state[name] = null;
    });

    state.obstacleSolid = null;
    state.obstacleFade = null;
    state.obstacleRim = null;

    return state;
  }

  function createEmptyObstacleMask(count) {
    const fade = new Float32Array(count);

    fade.fill(1);

    return {
      solid: new Uint8Array(count),
      fade,
      rim: new Uint8Array(count),
    };
  }

  function allocateState(state, size, obstacleMask) {
    const count = size * size;
    const mask = obstacleMask || createEmptyObstacleMask(count);

    state.size = size;

    FIELD_NAMES.forEach((name) => {
      state[name] = new Float32Array(count);
    });

    state.obstacleSolid = mask.solid;
    state.obstacleFade = mask.fade;
    state.obstacleRim = mask.rim;

    return state;
  }

  function ensureStateSize(state, size, createObstacleMask) {
    if (state.size === size) {
      return state;
    }

    return allocateState(
      state,
      size,
      createObstacleMask ? createObstacleMask(size) : null,
    );
  }

  function stateIndex(state, x, y) {
    return y * state.size + x;
  }

  function clearStateFields(state) {
    FIELD_NAMES.forEach((name) => {
      state[name].fill(0);
    });
  }

  function snapshotState(state) {
    if (state.size <= 0) {
      return null;
    }

    const snapshot = {
      size: state.size,
    };

    FIELD_NAMES.forEach((name) => {
      snapshot[name] = state[name].slice();
    });

    return snapshot;
  }

  function restoreState(state, snapshot, createObstacleMask) {
    if (!snapshot) {
      return state;
    }

    ensureStateSize(state, snapshot.size, createObstacleMask);

    FIELD_NAMES.forEach((name) => {
      state[name].set(snapshot[name]);
    });

    return state;
  }

  const api = Object.freeze({
    allocateState,
    clearStateFields,
    createEmptyObstacleMask,
    createState,
    ensureStateSize,
    fieldNames: FIELD_NAMES,
    restoreState,
    snapshotState,
    stateIndex,
  });
  const target = typeof self !== 'undefined' ? self : window;

  target.FluidStateTools = api;
  if (typeof window !== 'undefined') {
    window.FluidStateTools = api;
  }
}());
