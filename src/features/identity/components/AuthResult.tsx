import type { ReactNode } from "react";

import { ResultNotice, type StateTone } from "@/components/ui";

import { FocusTarget } from "./FocusTarget";

export function AuthResult({
  detail,
  heading,
  nextAction,
  tone,
}: {
  detail: ReactNode;
  heading: string;
  nextAction: ReactNode;
  tone: StateTone;
}) {
  return (
    <>
      <FocusTarget targetId="auth-result" />
      <ResultNotice detail={detail} heading={heading} id="auth-result" nextAction={nextAction} tone={tone} />
    </>
  );
}