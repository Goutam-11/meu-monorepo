/** Explicit offline research policy. Missing policy retains fixed protection. */
export type ExitPolicy = {
    version: 1;
    mode: 'atr-trailing';
    activationR: number;
    atrMultiple: number;
};
export type ProtectionState = {
    initialStop: number;
    stop: number;
    targetEnabled: boolean;
    trailingActive: boolean;
};
export type ProtectionChange = {
    effectiveFrom: number;
    stopPrice: number;
    targetEnabled: boolean;
    trailingActive: boolean;
};
export function validateExitPolicy(value: unknown, strategyId?: string): ExitPolicy {
    const p = value as ExitPolicy | null;
    if (!p || p.version !== 1 || p.mode !== 'atr-trailing' ||
        !Number.isFinite(p.activationR) || p.activationR <= 0 || p.activationR > 10 ||
        !Number.isFinite(p.atrMultiple) || p.atrMultiple <= 0 || p.atrMultiple > 10)
        throw new Error('Invalid adaptive exit policy');
    if (strategyId === 'meanReversion') throw new Error('ATR trailing is only supported for trend strategies');
    return p;
}

/** Call after the current candle has finished checking its existing protection.
 * The returned protection first applies to the NEXT candle, never this one.
 * Completed close activates trailing; intrabar highs/lows cannot activate it.
 */
export function advanceExitProtection(input: {
    side: 'long' | 'short'; entryPrice: number; close: number; atr: number;
    state: ProtectionState; policy: ExitPolicy;
}): ProtectionState {
    const { side, entryPrice, close, atr, state, policy } = input;
    validateExitPolicy(policy);
    const sign = side === 'long' ? 1 : -1;
    const initialRisk = (entryPrice - state.initialStop) * sign;
    if (!['long', 'short'].includes(side) ||
        ![entryPrice, close, atr, state.initialStop, state.stop].every(n => Number.isFinite(n) && n > 0) ||
        initialRisk <= 0 || (state.stop - state.initialStop) * sign < 0 ||
        typeof state.targetEnabled !== 'boolean' || typeof state.trailingActive !== 'boolean' ||
        state.targetEnabled === state.trailingActive)
        throw new Error('Invalid adaptive protection state');
    const active = state.trailingActive || (close - entryPrice) * sign >= policy.activationR * initialRisk;
    if (!active) return { ...state };
    const candidate = close - sign * atr * policy.atrMultiple;
    // A nonpositive long candidate gives no tighter protection. Keep the last stop.
    const stop = candidate > 0 ? (sign === 1 ? Math.max(state.stop, candidate) : Math.min(state.stop, candidate)) : state.stop;
    return { initialStop: state.initialStop, stop, targetEnabled: false, trailingActive: true };
}
