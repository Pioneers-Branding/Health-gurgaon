import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { chipBase, chipOff } from "./chip";
import { cn } from "./cn";

/**
 * Form controls with labels, help and errors wired up for screen readers.
 * All are Server-Component friendly and work in plain <form action={…}> posts;
 * use them inside a Client Component when you need useActionState.
 *
 *   <Field id="review-text" label="Your experience" help="At least 40 characters"
 *          error={state.errors?.text}>
 *     <Textarea name="text" defaultValue={state.values?.text} />
 *   </Field>
 *
 * Field gives its single child control the id, aria-describedby (help + error)
 * and aria-invalid. Error text accepts a string or zod's string[].
 */
export const controlClasses =
  "w-full min-w-0 rounded-12 border-[1.5px] border-line-strong bg-white px-3 py-2.5 text-15 text-ink transition-colors placeholder:font-light placeholder:text-subtle hover:border-subtle focus-visible:border-teal aria-[invalid=true]:border-emergency disabled:bg-cream disabled:text-subtle";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, "min-h-11", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(controlClasses, "min-h-11 cursor-pointer pr-2", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClasses, "min-h-28 resize-y rounded-14 font-light leading-[1.55]", className)} {...rest} />;
}

type ErrorValue = ReactNode | string[] | undefined | null;

function errorText(error: ErrorValue): ReactNode {
  if (Array.isArray(error)) return error[0];
  return error;
}

function hasError(error: ErrorValue): boolean {
  return Array.isArray(error) ? error.length > 0 : Boolean(error);
}

/** Error line under a control. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="text-13 font-medium leading-snug text-emergency">
      {children}
    </p>
  );
}

/** Help line under a label. */
export function FieldHelp({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="text-12.5 font-light leading-normal text-muted">
      {children}
    </p>
  );
}

type ControlA11yProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  required?: boolean;
};

export function Field({
  id,
  label,
  help,
  error,
  optional,
  required,
  hideLabel = false,
  className,
  children,
}: {
  /** Unique within the page; becomes the control's id. */
  id: string;
  label: ReactNode;
  help?: ReactNode;
  error?: ErrorValue;
  /** Text for the optional marker, e.g. dict.common.optional. */
  optional?: string;
  required?: boolean;
  /** Visually hide the label (it is still read out). */
  hideLabel?: boolean;
  className?: string;
  children: ReactElement<ControlA11yProps>;
}) {
  const invalid = hasError(error);
  const helpId = help ? `${id}-help` : undefined;
  const errorId = invalid ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const child = Children.only(children);
  const control = isValidElement<ControlA11yProps>(child)
    ? cloneElement(child, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": invalid || undefined,
        required: required ?? child.props.required,
      })
    : child;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-14 font-medium text-ink", hideLabel && "sr-only")}>
        {label}
        {optional && <span className="font-light text-subtle"> ({optional})</span>}
      </label>
      {help && <FieldHelp id={helpId}>{help}</FieldHelp>}
      {control}
      {invalid && <FieldError id={errorId}>{errorText(error)}</FieldError>}
    </div>
  );
}

type CheckProps = Omit<ComponentProps<"input">, "type"> & {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ErrorValue;
};

function CheckInput({ type, id, label, description, error, className, ...rest }: CheckProps & { type: "checkbox" | "radio" }) {
  const invalid = hasError(error);
  const descId = description ? `${id}-desc` : undefined;
  const errorId = invalid ? `${id}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-2.5 py-2.5 text-14 leading-snug">
        <input
          type={type}
          id={id}
          aria-describedby={[descId, errorId].filter(Boolean).join(" ") || undefined}
          aria-invalid={invalid || undefined}
          className="mt-px size-4.5 flex-none cursor-pointer accent-teal"
          {...rest}
        />
        <span>{label}</span>
      </label>
      {description && (
        <p id={descId} className="-mt-1.5 pl-7 text-12.5 font-light leading-normal text-muted">
          {description}
        </p>
      )}
      {invalid && (
        <div className="pl-7">
          <FieldError id={errorId}>{errorText(error)}</FieldError>
        </div>
      )}
    </div>
  );
}

/** Checkbox with its label on the right (18px box, teal tick). */
export function Checkbox(props: CheckProps) {
  return <CheckInput type="checkbox" {...props} />;
}

/** Single radio button; usually rendered through RadioGroup. */
export function Radio(props: CheckProps) {
  return <CheckInput type="radio" {...props} />;
}

export type Option = { value: string; label: ReactNode; description?: ReactNode };

function Legend({ children, hidden }: { children: ReactNode; hidden?: boolean }) {
  return <legend className={cn("mb-2 text-14 font-medium text-ink", hidden && "sr-only")}>{children}</legend>;
}

/** A labelled group of radio buttons. Works without JavaScript. */
export function RadioGroup({
  name,
  legend,
  options,
  defaultValue,
  help,
  error,
  required,
  hideLegend,
  className,
}: {
  name: string;
  legend: ReactNode;
  options: Option[];
  defaultValue?: string;
  help?: ReactNode;
  error?: ErrorValue;
  required?: boolean;
  hideLegend?: boolean;
  className?: string;
}) {
  const invalid = hasError(error);
  return (
    <fieldset className={cn("flex flex-col", className)} aria-invalid={invalid || undefined}>
      <Legend hidden={hideLegend}>{legend}</Legend>
      {help && <FieldHelp>{help}</FieldHelp>}
      {options.map((o) => (
        <Radio
          key={o.value}
          id={`${name}-${o.value}`}
          name={name}
          value={o.value}
          label={o.label}
          description={o.description}
          defaultChecked={defaultValue === o.value}
          required={required}
        />
      ))}
      {invalid && <FieldError>{errorText(error)}</FieldError>}
    </fieldset>
  );
}

/**
 * Radio (single) or checkbox (multiple) inputs that look like the prototype's
 * pill chips ("Yes / Somewhat / No", "Under 15 min", field pickers). No JS needed.
 */
export function ChoiceChips({
  name,
  legend,
  options,
  multiple = false,
  defaultValue,
  error,
  help,
  hideLegend,
  legendStyle = "label",
  className,
}: {
  name: string;
  legend: ReactNode;
  options: Option[];
  multiple?: boolean;
  defaultValue?: string | string[];
  error?: ErrorValue;
  help?: ReactNode;
  hideLegend?: boolean;
  /** "label": 14px medium · "mono": small uppercase filter heading */
  legendStyle?: "label" | "mono";
  className?: string;
}) {
  const selected = new Set(Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []);
  const invalid = hasError(error);
  return (
    <fieldset className={cn("flex flex-col gap-2", className)} aria-invalid={invalid || undefined}>
      <legend
        className={cn(
          legendStyle === "mono" ? "mono-label mb-2 text-10.5 text-subtle" : "mb-2 text-14 font-medium text-ink",
          hideLegend && "sr-only",
        )}
      >
        {legend}
      </legend>
      {help && <FieldHelp>{help}</FieldHelp>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              chipBase,
              chipOff,
              "cursor-pointer has-checked:border-ink has-checked:bg-ink has-checked:text-cream has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal",
            )}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={o.value}
              defaultChecked={selected.has(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      {invalid && <FieldError>{errorText(error)}</FieldError>}
    </fieldset>
  );
}

/**
 * Big selectable cards (report type: "A fact is wrong / A concern about care /
 * Something is missing"). Selected card: 2px teal border on green tint.
 */
export function ChoiceCards({
  name,
  legend,
  options,
  defaultValue,
  error,
  hideLegend,
  className,
}: {
  name: string;
  legend: ReactNode;
  options: Option[];
  defaultValue?: string;
  error?: ErrorValue;
  hideLegend?: boolean;
  className?: string;
}) {
  const invalid = hasError(error);
  return (
    <fieldset className={cn("flex flex-col gap-2", className)} aria-invalid={invalid || undefined}>
      <Legend hidden={hideLegend}>{legend}</Legend>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.75rem),1fr))] gap-3">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer flex-col gap-1 rounded-18 border-[1.5px] border-line bg-white p-4 text-ink transition-colors hover:border-subtle has-checked:border-2 has-checked:border-teal has-checked:bg-success-tint has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-teal"
          >
            <input type="radio" name={name} value={o.value} defaultChecked={defaultValue === o.value} className="sr-only" />
            <span className="text-15 font-semibold">{o.label}</span>
            {o.description && <span className="text-13 font-light leading-normal text-muted">{o.description}</span>}
          </label>
        ))}
      </div>
      {invalid && <FieldError>{errorText(error)}</FieldError>}
    </fieldset>
  );
}

/** On/off switch (a checkbox with role="switch"), label on the left. */
export function Toggle({
  id,
  label,
  description,
  className,
  ...rest
}: Omit<ComponentProps<"input">, "type" | "role"> & { id: string; label: ReactNode; description?: ReactNode }) {
  const descId = description ? `${id}-desc` : undefined;
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="group flex min-h-11 cursor-pointer items-center justify-between gap-3 text-14">
        <span>{label}</span>
        <input id={id} type="checkbox" role="switch" aria-describedby={descId} className="peer sr-only" {...rest} />
        <span
          aria-hidden="true"
          className="relative h-6 w-10.5 flex-none rounded-pill bg-line-strong transition-colors group-has-checked:bg-teal group-has-focus-visible:outline-3 group-has-focus-visible:outline-offset-2 group-has-focus-visible:outline-teal"
        >
          <span className="absolute top-0.75 left-0.75 size-4.5 rounded-full bg-white shadow-sm transition-transform group-has-checked:translate-x-4.5" />
        </span>
      </label>
      {description && (
        <p id={descId} className="text-12.5 font-light leading-normal text-muted">
          {description}
        </p>
      )}
    </div>
  );
}
