import {
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type HostContext,
  type Intent,
  type InterfaceDocument,
  type InterfaceObject,
  type InterfaceRuntime,
  formatValue,
  isSafeTokenValue,
  isSafeUrl,
  resolveInputs,
  resolveSource,
  type ValidationResult,
  validateDocument,
} from "@ciml/core";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { TrustBanner, type TrustSummary } from "./TrustBanner.js";

export interface ExtensionProps {
  object: InterfaceObject;
  value?: unknown;
}

export interface RendererProps {
  document: InterfaceDocument;
  runtime?: InterfaceRuntime;
  /** A result from verifyCiml, or your own check. Without one the banner says "not verified". */
  trust?: TrustSummary;
  /** Defaults to the shared checks. Pass validateCiml or validateIml for the binding checks too. */
  validate?: (document: unknown) => ValidationResult;
  extensions?: Record<string, ComponentType<ExtensionProps>>;
  /** Remote images reveal the viewer's IP address to their host, so they are opt-in. */
  loadRemoteImages?: boolean;
  /** Turns ipfs://CID into a loadable URL, such as https://gateway.example/ipfs/ */
  ipfsGateway?: string;
}

interface DataState {
  status: "waiting" | "loading" | "ready" | "error";
  value?: unknown;
  error?: string;
}

interface ActionState {
  busy?: boolean;
  error?: string;
  message?: string;
  result?: unknown;
}

const TOKEN_REFERENCE = /^\{([a-z]+)\.([A-Za-z0-9_-]+)\}$/;
const SLOT_TO_STYLE: Record<string, keyof CSSProperties> = {
  tone: "color",
  surface: "background",
  gap: "gap",
  inset: "padding",
  rounding: "borderRadius",
  elevation: "boxShadow",
  typography: "fontSize",
  motion: "transitionDuration",
};
const ROLE_KEYS = new Set(["variant", "priority", "region"]);
const SAFE_TOKEN_NAME = /^[A-Za-z0-9_-]+$/;

function tokenVariables(document: InterfaceDocument): CSSProperties {
  const variables: Record<string, string> = {};
  for (const [group, values] of Object.entries(document.tokens ?? {})) {
    for (const [name, value] of Object.entries(values ?? {})) {
      if (SAFE_TOKEN_NAME.test(name) && isSafeTokenValue(value)) {
        variables[`--ciml-${group}-${name}`] = String(value);
      }
    }
  }
  return variables as CSSProperties;
}

function presentationProps(object: InterfaceObject): { style?: CSSProperties; data: Record<string, string> } {
  const style: Record<string, string> = {};
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(object.presentation ?? {})) {
    if (ROLE_KEYS.has(key)) {
      data[`data-${key}`] = value;
      continue;
    }
    const match = TOKEN_REFERENCE.exec(value);
    const property = Object.prototype.hasOwnProperty.call(SLOT_TO_STYLE, key) ? SLOT_TO_STYLE[key] : undefined;
    if (match && property) style[property] = `var(--ciml-${match[1]}-${match[2]})`;
  }
  return { ...(Object.keys(style).length > 0 ? { style: style as CSSProperties } : {}), data };
}

function resolveImage(src: string | undefined, gateway: string | undefined): string | undefined {
  if (!src || !isSafeUrl(src)) return undefined;
  if (src.startsWith("ipfs://")) {
    if (!gateway || !gateway.startsWith("https://")) return undefined;
    return `${gateway.replace(/\/+$/, "")}/${src.slice("ipfs://".length).replace(/^ipfs\//, "")}`;
  }
  return src;
}

function isRowList(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((row) => typeof row === "object" && row !== null && !Array.isArray(row))
  );
}

/** Renders a CIML or IML document. All document text goes through React, so it stays plain text. */
export function CimlRenderer(props: RendererProps): ReactNode {
  const { document, runtime, trust, validate = validateDocument, extensions = {} } = props;
  const validation = useMemo(() => validate(document), [document, validate]);
  const [fields, setFields] = useState<Record<string, string | boolean>>({});
  const [dataStates, setDataStates] = useState<Record<string, DataState>>({});
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  const [intent, setIntent] = useState<{ id: string; intent: Intent; note?: string; body?: string }>();
  const [context, setContext] = useState<HostContext>(() => runtime?.context() ?? {});
  const [reloadCount, setReloadCount] = useState(0);
  const [connectError, setConnectError] = useState<string>();
  const loadGeneration = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!runtime) return;
    const update = (): void => {
      setContext(runtime.context());
      setReloadCount((count) => count + 1);
    };
    const refreshable = runtime as InterfaceRuntime & { refresh?: () => Promise<void> };
    void refreshable.refresh?.().then(update, () => undefined);
    return runtime.subscribe?.(update);
  }, [runtime]);

  const dataInputs = useMemo(() => {
    const inputs: Record<string, { key: string; values: Record<string, unknown>; missing: string[] }> = {};
    for (const [name, data] of Object.entries(document.data ?? {})) {
      const { values, missing } = resolveInputs(data.inputs, fields, context);
      inputs[name] = { key: JSON.stringify(values), values, missing };
    }
    return inputs;
  }, [document, fields, context]);
  const dataKey = JSON.stringify(Object.entries(dataInputs).map(([name, entry]) => [name, entry.key]));

  useEffect(() => {
    if (!runtime || !validation.ok) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      for (const [name, data] of Object.entries(document.data ?? {})) {
        const entry = dataInputs[name];
        if (!entry) continue;
        if (entry.missing.length > 0) {
          setDataStates((states) => ({ ...states, [name]: { status: "waiting" } }));
          continue;
        }
        const generation = (loadGeneration.current[name] ?? 0) + 1;
        loadGeneration.current[name] = generation;
        setDataStates((states) => ({ ...states, [name]: { ...states[name], status: "loading" } }));
        runtime.read(data, entry.values).then(
          (value) => {
            if (cancelled || loadGeneration.current[name] !== generation) return;
            setDataStates((states) => ({ ...states, [name]: { status: "ready", value } }));
          },
          (error: Error) => {
            if (cancelled || loadGeneration.current[name] !== generation) return;
            setDataStates((states) => ({ ...states, [name]: { status: "error", error: error.message } }));
          },
        );
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // dataKey covers dataInputs. reloadCount forces a fresh read after a write.
  }, [runtime, document, validation.ok, dataKey, reloadCount]);

  const setAction = useCallback((id: string, state: ActionState) => {
    setActions((current) => ({ ...current, [id]: state }));
  }, []);

  const runAction = useCallback(
    async (id: string, object: InterfaceObject) => {
      const { action } = object;
      if (!action || !runtime) return;
      const currentContext = runtime.context();
      const { values, missing } = resolveInputs(action.inputs, fields, currentContext);
      if (missing.length > 0) {
        setAction(id, { error: `Still needed: ${missing.join(", ")}` });
        return;
      }
      const value = action.value ? resolveSource(action.value, fields, currentContext) : undefined;
      setAction(id, { busy: true });
      try {
        const prepared = await runtime.prepare(action, values, value);
        if (prepared.effect === "read" && !prepared.blocked) {
          const { result } = await runtime.execute(prepared);
          setAction(id, { result });
          return;
        }
        setAction(id, {});
        // Everything that changes state goes through the dialog, whatever the document says.
        setIntent({
          id,
          intent: prepared,
          ...(action.confirm?.title ? { note: action.confirm.title } : {}),
          ...(action.confirm?.body ? { body: action.confirm.body } : {}),
        });
      } catch (error) {
        setAction(id, { error: (error as Error).message });
      }
    },
    [fields, runtime, setAction],
  );

  const confirmIntent = useCallback(async () => {
    if (!intent || !runtime) return;
    const { id } = intent;
    const prepared = intent.intent;
    setIntent(undefined);
    setAction(id, { busy: true });
    try {
      const outcome = await runtime.execute(prepared);
      setAction(id, {
        ...(outcome.result === undefined ? {} : { result: outcome.result }),
        message: outcome.id ? `Sent: ${outcome.id}` : "Done",
      });
      setReloadCount((count) => count + 1);
    } catch (error) {
      setAction(id, { error: (error as Error).message });
    }
  }, [intent, runtime, setAction]);

  if (!validation.ok) {
    return (
      <div className="ciml-root" role="alert">
        <p>This interface was not displayed because it failed validation.</p>
        <ul>
          {validation.issues.map((issue) => (
            <li key={`${issue.code}:${issue.path}`}>
              {issue.code} at {issue.path || "/"}: {issue.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const valueOf = (object: InterfaceObject): { text?: string; raw?: unknown; state?: DataState } => {
    if (!object.value) return object.text === undefined ? {} : { text: object.text };
    const state = dataStates[object.value.data];
    if (state?.status !== "ready") return { ...(state ? { state } : {}) };
    return { raw: state.value, text: formatValue(state.value, object.value), state };
  };

  const statusText = (state: DataState | undefined): string => {
    if (state?.status === "error") return "Unavailable";
    if (state?.status === "waiting") return "Waiting for input";
    return runtime ? "Loading" : "Not connected";
  };

  const renderChildren = (object: InterfaceObject): ReactNode[] =>
    (object.children ?? []).map((id) => renderObject(id));

  const renderObject = (id: string): ReactNode => {
    const object = document.objects[id];
    if (!object) return null;
    const { style, data } = presentationProps(object);
    const label = object.accessibility.label;
    const common = {
      key: id,
      "data-ciml-id": id,
      className: `ciml-${object.type.replace(".", "-")}`,
      ...(style ? { style } : {}),
      ...data,
    };
    const value = valueOf(object);
    const shown = value.text ?? (object.value ? statusText(value.state) : undefined);

    switch (object.type) {
      case "workspace":
        return <main {...common} aria-label={label}>{renderChildren(object)}</main>;
      case "screen":
      case "panel":
        return (
          <section {...common} aria-label={label}>
            <h2>{label}</h2>
            {renderChildren(object)}
          </section>
        );
      case "page":
        return (
          <article {...common} aria-label={label}>
            <h2>{label}</h2>
            {renderChildren(object)}
          </article>
        );
      case "navigation":
        return <nav {...common} aria-label={label}>{renderChildren(object)}</nav>;
      case "form":
        return (
          <form {...common} aria-label={label} onSubmit={(event) => event.preventDefault()} noValidate>
            <h3>{label}</h3>
            {renderChildren(object)}
          </form>
        );
      case "list":
      case "virtual_list":
        return (
          <ul {...common} aria-label={label}>
            {(object.children ?? []).map((child) => <li key={child}>{renderObject(child)}</li>)}
          </ul>
        );
      case "field": {
        const field = object.field;
        if (!field) return null;
        const inputId = `ciml-${id}`;
        const current = fields[id];
        const update = (next: string | boolean): void => setFields((all) => ({ ...all, [id]: next }));
        const hint = object.accessibility.hint;
        const describedBy = hint ? `${inputId}-hint` : undefined;
        let control: ReactNode;
        if (field.inputType === "boolean") {
          control = (
            <input id={inputId} type="checkbox" checked={current === true} aria-describedby={describedBy}
              onChange={(event) => update(event.target.checked)} />
          );
        } else if (field.inputType === "select") {
          control = (
            <select id={inputId} value={String(current ?? "")} aria-describedby={describedBy}
              onChange={(event) => update(event.target.value)}>
              <option value="">Choose</option>
              {(field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          );
        } else {
          const nativeType = { email: "email", url: "url", date: "date" }[field.inputType as string] ?? "text";
          const inputMode = field.inputType === "number" ? "numeric" : field.inputType === "amount" ? "decimal" : undefined;
          control = (
            // Number inputs round big values, which is not acceptable for amounts. These stay text.
            <input id={inputId} type={nativeType} value={String(current ?? "")} inputMode={inputMode}
              placeholder={field.placeholder} required={field.required} aria-describedby={describedBy}
              spellCheck={false} autoComplete="off" onChange={(event) => update(event.target.value)} />
          );
        }
        return (
          <div {...common}>
            <label htmlFor={inputId}>{field.label ?? label}</label>
            {control}
            {hint ? <small id={describedBy}>{hint}</small> : null}
          </div>
        );
      }
      case "action": {
        const state = actions[id];
        if (!object.action) {
          const safe = object.href && isSafeUrl(object.href) ? object.href : undefined;
          return safe ? (
            <a {...common} href={safe} rel="noopener noreferrer" target="_blank">{object.text ?? label}</a>
          ) : (
            <span {...common}>{object.text ?? label}</span>
          );
        }
        const { key: _key, ...rest } = common;
        return (
          <div key={id} className="ciml-action-group">
            <button {...rest} type="button" disabled={!runtime || state?.busy}
              onClick={() => void runAction(id, object)}>
              {object.text ?? label}
            </button>
            <div aria-live="polite">
              {state?.busy ? <span>Working</span> : null}
              {state?.error ? <span className="ciml-error" role="alert">{state.error}</span> : null}
              {state?.message ? <span>{state.message}</span> : null}
              {state?.result !== undefined ? <pre className="ciml-document">{formatValue(state.result, { format: "json" })}</pre> : null}
            </div>
          </div>
        );
      }
      case "metric":
        return (
          <dl {...common}>
            <dt>{label}</dt>
            <dd>
              {shown}
              {object.trend ? <span> ({object.trend})</span> : null}
            </dd>
          </dl>
        );
      case "status":
      case "telemetry":
        return <output {...common} aria-label={label}>{shown}</output>;
      case "alert":
        return <aside {...common} role="alert" aria-label={label}>{shown}</aside>;
      case "notification":
        return <aside {...common} role="status" aria-label={label}>{shown}</aside>;
      case "progress": {
        const amount = Number(value.raw ?? object.text);
        return <progress {...common} aria-label={label} max={100} {...(Number.isFinite(amount) ? { value: amount } : {})} />;
      }
      case "table": {
        const rows = isRowList(value.raw) ? value.raw : undefined;
        if (!rows) return <p {...common}>{rows === undefined && value.text === undefined ? statusText(value.state) : value.text}</p>;
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        return (
          <table {...common} aria-label={label}>
            <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>{columns.map((column) => <td key={column}>{formatValue(row[column])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        );
      }
      case "image": {
        const source = props.loadRemoteImages ? resolveImage(object.src, props.ipfsGateway) : undefined;
        return source ? <img {...common} src={source} alt={label} referrerPolicy="no-referrer" /> : <span {...common} role="img" aria-label={label}>{label}</span>;
      }
      case "symbol":
        return <span {...common} role="img" aria-label={label}>{object.text ?? label}</span>;
      case "document":
        return <pre {...common} aria-label={label}>{shown}</pre>;
      case "code":
        return <pre {...common} aria-label={label}><code>{shown}</code></pre>;
      case "text":
        return <p {...common}>{shown}</p>;
      case "extension": {
        const extension = object.extension;
        const Component = extension ? extensions[`${extension.id}@${extension.version}`] ?? extensions[extension.id] : undefined;
        if (Component) return <Component key={id} object={object} value={value.raw} />;
        return extension ? renderObject(extension.fallback) : null;
      }
      default:
        // Types with no web mapping keep their meaning for assistive technology and their children.
        return (
          <div {...common} role="group" aria-label={label}>
            {shown ? <span>{shown}</span> : null}
            {renderChildren(object)}
          </div>
        );
    }
  };

  const needsConnection =
    runtime?.connect && !context["wallet.address"] && !context["auth.subject"];

  return (
    <div className="ciml-root" style={tokenVariables(document)} lang={document.locale}>
      <TrustBanner trust={trust} />
      <h1>{document.title}</h1>
      {document.description ? <p>{document.description}</p> : null}
      {needsConnection ? (
        <button type="button" onClick={() => {
          setConnectError(undefined);
          void runtime.connect?.().then(() => {
            setContext(runtime.context());
            setReloadCount((count) => count + 1);
          }, (error: Error) => setConnectError(error.message));
        }}>
          {document.schema === "ciml/2" ? "Connect wallet" : "Sign in"}
        </button>
      ) : null}
      {connectError ? <p className="ciml-error" role="alert">{connectError}</p> : null}
      {renderObject(document.root)}
      {intent ? (
        <ConfirmDialog
          intent={intent.intent}
          documentNote={intent.note}
          documentBody={intent.body}
          onCancel={() => setIntent(undefined)}
          onConfirm={() => void confirmIntent()}
        />
      ) : null}
    </div>
  );
}
