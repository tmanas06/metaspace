"use client";

import { useEffect, useState, useCallback } from "react";
import { colyseusManager, ColyseusState } from "@/lib/colyseus";

/**
 * useColyseus — React hook wrapping the Colyseus singleton.
 * Provides connection status and a connect/disconnect interface.
 * Does NOT drive Phaser per-frame — that happens through GameBridge.
 */
export function useColyseus() {
  const [state, setState] = useState<ColyseusState>(colyseusManager.getState());

  useEffect(() => {
    const unsub = colyseusManager.onStatusChange(setState);
    return unsub;
  }, []);

  const connect = useCallback((username: string, mapPreset?: string) => {
    colyseusManager.connect(username, mapPreset);
  }, []);

  const disconnect = useCallback(() => {
    colyseusManager.disconnect();
  }, []);

  const clearError = useCallback(() => {
    colyseusManager.clearError();
  }, []);

  return { ...state, connect, disconnect, clearError };
}
