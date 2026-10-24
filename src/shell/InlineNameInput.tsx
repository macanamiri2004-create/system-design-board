import { useRef, useState } from "react";

type Props = {
  initial: string;
  label: string;
  className?: string;
  onCommit(name: string): void;
  onCancel(): void;
};

/** Text field for renaming in place. Enter or blur commits, Escape reverts, and a blank or unchanged name reverts. */
export function InlineNameInput({ initial, label, className, onCommit, onCancel }: Props) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);

  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    const name = value.trim();
    if (commit && name && name !== initial) onCommit(name);
    else onCancel();
  };

  return (
    <input
      className={`input ${className ?? ""}`}
      aria-label={label}
      value={value}
      maxLength={120}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          finish(false);
        }
      }}
    />
  );
}
