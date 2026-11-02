import { getAddress, isAddress } from "viem";
import type {
  FieldSpec,
  InputSource,
  InterfaceDocument,
  InterfaceObject,
} from "@ciml/core";
import { compatibleInputTypes, findFunction, inputName, isReadOnly } from "./abi.js";

/** Networks that CIML v1 documents name. Unknown names stop the migration rather than guess. */
const V1_NETWORKS: Record<string, number> = {
  XDC: 50,
  "XDC Mainnet": 50,
  Apothem: 51,
  Ethereum: 1,
  Polygon: 137,
};

interface V1Object {
  name: string;
  type: string;
  value?: unknown;
}

interface V1Document {
  name?: string;
  appVersion?: string;
  description?: string;
  logo?: string;
  websitelink?: string;
  networks?: string[];
  contractMainnet?: string;
  abi?: string | unknown[];
  byteCode?: string;
  thumbnail?: string;
  screenShots?: unknown[];
  cimlURL?: string;
  metadata?: unknown[];
  variables?: { name: string; type: string; value?: unknown }[];
  functions?: {
    funcName: string;
    objectName?: string;
    type: string;
    inputValue?: string[];
    outputValue?: string[];
  }[];
  objects?: V1Object[];
  views?: { View: number; Object: string; location: number }[];
}

export interface MigrationNote {
  path: string;
  message: string;
}

export interface MigrationReport {
  ok: boolean;
  /** Behaviour v2 cannot carry over. Read these: the result does less than the original. */
  dropped: MigrationNote[];
  /** Converted, but check the result. */
  warnings: MigrationNote[];
  /** Why no document could be produced. */
  errors: MigrationNote[];
}

export interface MigrationResult {
  document?: InterfaceDocument;
  report: MigrationReport;
}

function objectId(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[^a-z]+/, "");
  return cleaned || "object";
}

function parseAbi(raw: V1Document["abi"]): unknown[] | undefined {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return undefined;
  try {
    // v1 stored the ABI as a string with @ in place of double quotes.
    const parsed = JSON.parse(raw.replace(/@/g, '"')) as unknown;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Convert a CIML v1 document, listing everything that could not be carried across. */
export function migrateV1(input: unknown): MigrationResult {
  const source = (Array.isArray(input) ? input[0] : input) as V1Document | undefined;
  const report: MigrationReport = { ok: false, dropped: [], warnings: [], errors: [] };
  const drop = (path: string, message: string): void => void report.dropped.push({ path, message });
  const warn = (path: string, message: string): void => void report.warnings.push({ path, message });
  const error = (path: string, message: string): void => void report.errors.push({ path, message });

  if (typeof source !== "object" || source === null) {
    error("", "not a CIML v1 document");
    return { report };
  }

  const networks = source.networks ?? [];
  const [network] = networks;
  const chainId = network === undefined ? undefined : V1_NETWORKS[network];
  if (chainId === undefined) error("networks", `unknown network "${network ?? "none"}": add it by hand`);
  if (networks.length > 1) drop("networks", `only ${network} was kept: a binding names one chain`);

  let address = source.contractMainnet ?? "";
  if (/^xdc[0-9a-fA-F]{40}$/.test(address)) address = `0x${address.slice(3)}`;
  if (!isAddress(address, { strict: false })) error("contractMainnet", "not a contract address");

  const abi = parseAbi(source.abi);
  if (!abi) error("abi", "the ABI could not be parsed");
  if (report.errors.length > 0 || !abi || chainId === undefined) return { report };

  if (source.byteCode) drop("byteCode", "v2 interfaces do not deploy contracts");
  if (source.thumbnail) drop("thumbnail", "not part of v2");
  if (source.screenShots?.length) drop("screenShots", "not part of v2");
  if (source.cimlURL) drop("cimlURL", "documents no longer point at their own location");
  if (source.metadata?.length) drop("metadata", "free-form metadata is not part of v2");

  const v1Objects = source.objects ?? [];
  const byName = new Map(v1Objects.map((object) => [object.name, object]));
  const objects: Record<string, InterfaceObject> = {};
  const data: NonNullable<InterfaceDocument["data"]> = {};
  const binding = "contract";

  const functions = source.functions ?? [];
  const outputOf = new Map<string, string>();
  const dataNameOf = (name: string): string => `d_${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
  for (const fn of functions) {
    if (fn.type !== "Read") continue;
    const lookup = findFunction(abi, fn.funcName);
    if (lookup.kind !== "found") {
      drop(`functions/${fn.funcName}`, `the ABI has no single function called ${fn.funcName}`);
      continue;
    }
    if (!isReadOnly(lookup.item)) {
      drop(`functions/${fn.funcName}`, "v1 called this Read, but the ABI says it changes state");
      continue;
    }
    if ((lookup.item.inputs ?? []).length > 0) {
      drop(`functions/${fn.funcName}`, "reads with inputs must be rebuilt as a form");
      continue;
    }
    const name = dataNameOf(fn.funcName);
    data[name] = { binding, operation: fn.funcName };
    for (const output of fn.outputValue ?? []) outputOf.set(output, name);
  }

  // Buttons reach functions through a variable named _<button> whose value is the function's objectName.
  const variables = source.variables ?? [];
  const writeFor = (buttonName: string) => {
    const variable = variables.find((item) => item.name === `_${buttonName}`);
    if (!variable) return { variable };
    const fn = functions.find((item) => item.type === "Write" && item.objectName === variable.value);
    return { variable, fn };
  };

  const fieldTypeFor = (name: string): FieldSpec["inputType"] => {
    for (const fn of functions) {
      const position = fn.inputValue?.indexOf(name) ?? -1;
      if (position < 0) continue;
      const lookup = findFunction(abi, fn.funcName);
      const parameter = lookup.kind === "found" ? lookup.item.inputs?.[position] : undefined;
      const [compatible] = compatibleInputTypes(parameter?.type ?? "string");
      if (compatible) return compatible as FieldSpec["inputType"];
    }
    return "text";
  };

  const usedIds = new Set(["root"]);
  const uniqueId = (wanted: string): string => {
    let id = wanted;
    for (let n = 2; usedIds.has(id); n += 1) id = `${wanted}-${n}`;
    usedIds.add(id);
    return id;
  };
  const primaryIds = new Map<string, string>();
  const primaryIdFor = (name: string): string => {
    let id = primaryIds.get(name);
    if (!id) {
      id = uniqueId(objectId(name));
      primaryIds.set(name, id);
    }
    return id;
  };
  // Reserve ids first, so a field's id is known wherever a button refers to it.
  for (const object of v1Objects) primaryIdFor(object.name);

  const convertObject = (object: V1Object, id: string): InterfaceObject => {
    const label = String(object.value ?? object.name);
    const purpose = `Migrated from the v1 object "${object.name}"`;
    switch (object.type) {
      case "textField":
        return {
          type: "field",
          purpose,
          accessibility: { label: object.name },
          field: { name: id, inputType: fieldTypeFor(object.name), label: object.name },
        };
      case "sysimage":
        warn(`objects/${object.name}`, `"${label}" is an Apple SF Symbol name: other platforms need their own icon`);
        return { type: "symbol", purpose, accessibility: { label: object.name }, text: label };
      case "button": {
        const { variable, fn } = writeFor(object.name);
        const lookup = fn ? findFunction(abi, fn.funcName) : undefined;
        if (!fn || lookup?.kind !== "found") {
          const send = /^Send\d*(0x[0-9a-fA-F]{40})$/.exec(variable?.type ?? "");
          drop(
            `objects/${object.name}`,
            send
              ? `labelled "${label}", but in v1 it sent ${String(variable?.value)} base units of native coin to ${send[1]}. This was not carried over: review it, and make it an explicit payable action if it was intended`
              : variable
                ? `its "${variable.type}" behaviour runs on the client and has no v2 equivalent: now plain text`
                : "it did nothing in v1: now plain text",
          );
          return { type: "text", purpose, accessibility: { label }, text: label };
        }
        if (isReadOnly(lookup.item)) {
          warn(
            `functions/${fn.funcName}`,
            `v1 called this a write, but the ABI says ${lookup.item.stateMutability}: it now runs as a read and changes nothing`,
          );
        }
        const parameters = lookup.item.inputs ?? [];
        const inputs: Record<string, InputSource> = {};
        parameters.forEach((parameter, index) => {
          const name = inputName(parameter, index);
          const sourceName = fn.inputValue?.[index];
          const sourceObject = sourceName === undefined ? undefined : byName.get(sourceName);
          if (sourceObject?.type === "textField" && sourceName) {
            inputs[name] = { field: primaryIdFor(sourceName) };
          } else {
            const literal = sourceObject?.value ?? sourceName ?? "";
            warn(`functions/${fn.funcName}`, `input ${name} is now the fixed value "${String(literal)}"`);
            inputs[name] = { literal: String(literal) };
          }
        });
        return {
          type: "action",
          purpose: `Calls ${fn.funcName}`,
          accessibility: { label },
          text: label,
          action: {
            binding,
            operation: fn.funcName,
            inputs,
            effect: isReadOnly(lookup.item) ? "read" : "write",
            ...(isReadOnly(lookup.item) ? {} : { confirm: { title: label } }),
          },
        };
      }
      default: {
        if (object.type !== "text") {
          drop(`objects/${object.name}`, `unknown v1 type "${object.type}": now plain text`);
        }
        const dataName = outputOf.get(object.name);
        return {
          type: "text",
          purpose,
          accessibility: { label: object.name },
          ...(dataName ? { value: { data: dataName } } : { text: label }),
        };
      }
    }
  };

  const views = [...(source.views ?? [])].sort((a, b) => a.location - b.location);
  const viewNumbers = [...new Set(views.map((view) => view.View))].sort((a, b) => a - b);
  const rootChildren: string[] = [];
  const placed = new Set<string>();
  for (const number of viewNumbers) {
    const children: string[] = [];
    for (const view of views.filter((item) => item.View === number)) {
      const object = byName.get(view.Object);
      if (!object) {
        drop(`views/${number}/${view.Object}`, "the view names an object that does not exist");
        continue;
      }
      // v2 gives each object one parent, so later placements become copies.
      let id = primaryIdFor(object.name);
      if (placed.has(id)) {
        if (object.type === "textField") {
          drop(`views/${number}/${view.Object}`, "a field can appear once: the extra placement was removed");
          continue;
        }
        id = uniqueId(`${id}.copy`);
      }
      placed.add(id);
      objects[id] = convertObject(object, id);
      children.push(id);
    }
    const screen = `view-${number}`;
    usedIds.add(screen);
    objects[screen] = {
      type: "screen",
      purpose: `Screen ${number + 1} of the original interface`,
      accessibility: { label: `Screen ${number + 1}` },
      children,
    };
    rootChildren.push(screen);
  }
  for (const object of v1Objects) {
    if (!placed.has(primaryIdFor(object.name))) {
      drop(`objects/${object.name}`, "no view shows this object");
    }
  }
  drop("objects", "v1 styling (colors, fonts, frames, shadows, positions) does not carry over: use design tokens");
  drop("variables", "v1 variables, including background colors and send-to-address behaviour, do not carry over");

  const title = source.name?.trim() || "Migrated interface";
  objects.root = {
    type: "workspace",
    purpose: `Migrated from the CIML v1 document "${title}"`,
    accessibility: { label: title },
    children: rootChildren,
  };

  const version = /^\d+\.\d+\.\d+/.test(source.appVersion ?? "") ? (source.appVersion as string) : "1.0.0";
  if (version !== source.appVersion) warn("appVersion", `"${source.appVersion ?? ""}" is not a version number: using ${version}`);
  const logo = source.logo?.startsWith("https://") ? source.logo : undefined;
  if (source.logo && !logo) drop("logo", "only https and ipfs links are allowed");
  if (source.websitelink && !/^https:\/\/[^/]/.test(source.websitelink)) {
    drop("websitelink", `"${source.websitelink}" is not a valid link`);
  }
  const homepage = source.websitelink && /^https:\/\/[^/]/.test(source.websitelink) ? source.websitelink : undefined;

  const document: InterfaceDocument = {
    schema: "ciml/2",
    id: objectId(title).replace(/[._]+/g, "-").replace(/-+$/, "") || "migrated",
    version,
    title,
    ...(source.description ? { description: source.description.slice(0, 2000) } : {}),
    ...(homepage ? { homepage } : {}),
    ...(logo ? { icon: logo } : {}),
    bindings: {
      [binding]: {
        kind: "evm",
        chainId,
        address: getAddress(address),
        abi: abi as Record<string, unknown>[],
      },
    },
    ...(Object.keys(data).length > 0 ? { data } : {}),
    root: "root",
    objects,
  };
  report.ok = true;
  return { document, report };
}
