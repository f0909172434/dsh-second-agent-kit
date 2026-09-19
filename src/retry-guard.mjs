const OBSERVE = new Set(['computer_observe', 'computer_list_apps']);
const RETRYABLE = /COMPUTER_(?:STALE_OBSERVATION|TARGET_UNAVAILABLE|ELEMENT_UNAVAILABLE|ACTION_BLOCKED|PROVIDER_FAILURE)/;

/** Session-local, per-turn limits. An observation never erases failed input. */
export function createRetryGuard() {
  const states = new WeakMap();
  function state(agent) {
    if (!agent || typeof agent !== 'object') return;
    if (!states.has(agent)) states.set(agent, {turn: undefined, failures: 0, inputs: 0});
    return states.get(agent);
  }
  return {
    startTurn(agent, turn) {
      const s = state(agent);
      if (s && s.turn !== turn) Object.assign(s, {turn, failures: 0, inputs: 0});
    },
    before(exec) {
      if (!exec.name.startsWith('computer_') || OBSERVE.has(exec.name)) return;
      const s = state(exec.agent);
      if (!s) return;
      if (s.failures >= 2 || s.inputs >= 20)
        return {kind: 'deny', reason: 'SECOND_AGENT_GUI_LIMIT: 本輪 Mac 輸入已達兩次失敗或 20 次操作。停止重試，保存進度並回報；新的使用者輪次才會重置。讀取畫面仍可使用。'};
    },
    result(exec, result) {
      if (!exec.name.startsWith('computer_') || OBSERVE.has(exec.name)) return;
      const s = state(exec.agent);
      if (!s) return;
      // Pre-dispatch denials are not actual UI attempts.
      const text = JSON.stringify(result.error ?? result.content ?? '');
      if (/SECOND_AGENT_GUI_LIMIT/.test(text)) return;
      if (result.isError) {
        if (RETRYABLE.test(text)) { s.failures++; s.inputs++; }
      } else { s.failures = 0; s.inputs++; }
    },
  };
}

export function applyRetryGuard(ctx) {
  const guard = createRetryGuard();
  ctx.on('agent/pre-step', async (payload, next) => {
    guard.startTurn(payload.agent, payload.turn);
    return next();
  });
  ctx.on('tools/pre-execute', async (exec, next) => {
    const decision = await next();
    return decision.kind === 'deny' ? decision : guard.before(exec) ?? decision;
  });
  ctx.on('tools/result', (exec, result) => { guard.result(exec, result); });
}
