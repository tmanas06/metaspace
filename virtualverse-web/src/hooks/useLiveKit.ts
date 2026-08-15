"use client";

import { useEffect, useState, useCallback } from "react";
import { liveKitManager, LiveKitState } from "@/lib/livekit";

/**
 * useLiveKit — React hook wrapping the LiveKit singleton.
 * Starts/stops listening to proximity events from GameBridge.
 */
export function useLiveKit() {
  const [state, setState] = useState<LiveKitState>(liveKitManager.getState());

  useEffect(() => {
    liveKitManager.startListening();
    const unsub = liveKitManager.onStatusChange(setState);

    return () => {
      unsub();
      liveKitManager.stopListening();
    };
  }, []);

  const disconnect = useCallback(() => {
    liveKitManager.disconnectProximityRoom();
  }, []);

  const clearError = useCallback(() => {
    liveKitManager.clearError();
  }, []);

  return { ...state, disconnect, clearError };
}
