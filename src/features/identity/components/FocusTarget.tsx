"use client";

import { useEffect } from "react";

export function FocusTarget({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.focus();
  }, [targetId]);

  return <span data-route-focus-target={targetId} hidden />;
}