"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/**
 * Submit button that disables itself while its form's Server Action runs.
 * Put it inside the <form>. With useActionState you can also use the
 * `pending` value it returns instead.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  disabled,
  ...rest
}: Omit<ButtonProps, "type"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...rest} type="submit" variant={variant} disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
