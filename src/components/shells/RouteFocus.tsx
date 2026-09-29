"use client";

import { useEffect } from "react";

export function RouteFocus() {
  useEffect(() => {
    const requestedTarget = document.querySelector<HTMLElement>("[data-route-focus-target]")?.dataset
      .routeFocusTarget;
    document.getElementById(requestedTarget ?? "page-title")?.focus();
  }, []);

  return null;
}