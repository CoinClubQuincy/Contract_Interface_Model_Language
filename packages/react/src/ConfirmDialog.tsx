import { type ReactNode, useEffect, useId, useRef } from "react";
import type { Intent } from "@ciml/core";

export interface ConfirmDialogProps {
  intent: Intent;
  /** The document's own wording. Shown as a claim, below what the runtime decoded. */
  documentNote?: string;
  documentBody?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Shows what an action really does, decoded by the runtime, not what the document says it does. */
export function ConfirmDialog(props: ConfirmDialogProps): ReactNode {
  const { intent, documentNote, documentBody, onConfirm, onCancel } = props;
  const titleId = useId();
  const cancel = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus starts on Cancel, so an accidental Enter cannot confirm.
    cancel.current?.focus();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === "Escape") {
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const items = dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled)");
    if (!items?.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && globalThis.document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && globalThis.document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div className="ciml-overlay">
      <div ref={dialog} className="ciml-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <h2 id={titleId}>Review this action</h2>
        {intent.warnings.map((warning) => (
          <div key={warning.code} className="ciml-warning" role="alert" data-code={warning.code}>
            {warning.message}
          </div>
        ))}
        <dl>
          <dt>Target</dt>
          <dd>{intent.target}</dd>
          <dt>Operation</dt>
          <dd>{intent.operation}</dd>
          {intent.inputs.map((input) => [
            <dt key={`${input.name}-name`}>{input.name}</dt>,
            <dd key={`${input.name}-value`}>{input.value}</dd>,
          ])}
        </dl>
        {documentNote ? <p>The interface describes this as: {documentNote}</p> : null}
        {documentBody ? <p>{documentBody}</p> : null}
        <div className="ciml-dialog-actions">
          <button ref={cancel} type="button" onClick={onCancel}>Cancel</button>
          <button type="button" disabled={intent.blocked} onClick={onConfirm}>
            {intent.effect === "write" ? "Continue" : "Run"}
          </button>
        </div>
      </div>
    </div>
  );
}
