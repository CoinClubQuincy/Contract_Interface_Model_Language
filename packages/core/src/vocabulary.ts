/** The closed vocabularies of the interface model. Adding a word is a spec change. */

export const SEMANTIC_TYPES = [
  "workspace", "screen", "page", "panel", "group", "list", "table", "tree", "virtual_list",
  "map", "chart", "diagram", "timeline",
  "form", "field", "action", "command", "signature",
  "status", "alert", "progress", "notification", "metric", "telemetry",
  "text", "document", "code", "symbol", "image", "audio", "media.stream", "media.recording",
  "navigation", "authentication", "workflow", "collaborator", "drag_drop",
  "spatial.anchor", "spatial.object",
  "extension",
] as const;
export type SemanticType = (typeof SEMANTIC_TYPES)[number];

export const MODALITIES = [
  "visual", "touch", "pointer", "keyboard", "controller", "gaze", "gesture", "voice", "audio",
  "haptic", "spatial", "hardware", "sensor",
] as const;
export type Modality = (typeof MODALITIES)[number];

/** A document describes an interface. These keys could smuggle in execution, at any depth. */
export const FORBIDDEN_KEYS = new Set([
  "command", "cmd", "shell", "argv", "script", "executable", "eval", "html", "innerHTML",
  "dangerouslySetInnerHTML", "__proto__", "constructor", "prototype",
]);

/** Appearance goes through design tokens, so a renderer can keep its own look and accessibility. */
export const RAW_STYLE_KEYS = new Set([
  "color", "background", "backgroundColor", "foregroundColor", "font", "fontSize", "fontWeight",
  "font_size", "padding", "margin", "border", "borderRadius", "border_radius", "cornerRadius",
  "shadow", "width", "height", "style", "css", "className",
]);

/** The only presentation keys that hold plain words rather than token references. */
export const PRESENTATION_ROLES: Record<string, readonly string[]> = {
  variant: ["primary", "secondary", "danger", "ghost"],
  priority: ["high", "normal", "low"],
  region: ["header", "main", "aside", "footer"],
};

/** Slots that hold a design token reference, such as {color.accent}. The list is closed. */
export const PRESENTATION_TOKEN_KEYS: readonly string[] = [
  "tone", "surface", "gap", "inset", "rounding", "elevation", "typography", "motion",
];

const UNSAFE_TOKEN_CHARACTERS = /[;{}<>@\\]/;
const CSS_FUNCTION = /([a-z0-9-]*)\s*\(/gi;
/** Only functions that compute a value. url(), image-set() and the like can make network requests. */
const SAFE_CSS_FUNCTIONS = new Set([
  "", "rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color", "color-mix",
  "calc", "min", "max", "clamp", "cubic-bezier", "steps",
]);

/** Token values become CSS, so anything that is not a plain value is refused. */
export function isSafeTokenValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string" || value.length > 200 || UNSAFE_TOKEN_CHARACTERS.test(value)) {
    return false;
  }
  for (const match of value.matchAll(CSS_FUNCTION)) {
    if (!SAFE_CSS_FUNCTIONS.has((match[1] ?? "").toLowerCase())) return false;
  }
  return true;
}

export const TOKEN_GROUPS = [
  "color", "typography", "spacing", "size", "radius", "elevation", "motion",
] as const;
export type TokenGroup = (typeof TOKEN_GROUPS)[number];

export const METRIC_TRENDS = ["up", "down", "flat"] as const;

/** Values a document may read from the host, by document kind. */
export const CONTEXT_VALUES = {
  "ciml/2": ["wallet.address", "wallet.chainId"],
  "iml/1": ["auth.subject"],
} as const;

export const FIELD_INPUT_TYPES = [
  "text", "number", "amount", "address", "boolean", "hex", "email", "url", "date", "select",
] as const;
export type FieldInputType = (typeof FIELD_INPUT_TYPES)[number];

export const VALUE_FORMATS = [
  "text", "number", "amount", "address", "boolean", "date", "datetime", "percent", "json",
] as const;
export type ValueFormat = (typeof VALUE_FORMATS)[number];

export const SCHEMA_IDS = ["ciml/2", "iml/1"] as const;
export type SchemaId = (typeof SCHEMA_IDS)[number];
