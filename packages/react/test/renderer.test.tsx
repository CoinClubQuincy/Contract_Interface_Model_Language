// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Intent, InterfaceDocument, InterfaceRuntime } from "@ciml/core";
import { CimlRenderer, ConfirmDialog, TrustBanner } from "@ciml/react";

afterEach(cleanup);

const base = (objects: InterfaceDocument["objects"], extra: Partial<InterfaceDocument> = {}): InterfaceDocument => ({
  schema: "iml/1",
  id: "test.doc",
  version: "1.0.0",
  title: "Test title",
  bindings: { a: { kind: "openapi", server: "https://api.example.com", spec: { inline: {} } } },
  root: "root",
  objects: {
    root: { type: "workspace", purpose: "Root", accessibility: { label: "Workspace" }, children: Object.keys(objects) },
    ...objects,
  },
  ...extra,
});

const intent = (overrides: Partial<Intent> = {}): Intent => ({
  title: "Do it",
  effect: "write",
  target: "https://api.example.com",
  operation: "POST /things",
  inputs: [{ name: "name", type: "input", value: "Rex" }],
  warnings: [],
  blocked: false,
  payload: {},
  ...overrides,
});

const fakeRuntime = (overrides: Partial<InterfaceRuntime> = {}): InterfaceRuntime => ({
  context: () => ({}),
  read: vi.fn(async () => "loaded"),
  prepare: vi.fn(async () => intent()),
  execute: vi.fn(async () => ({ id: "0xabc" })),
  ...overrides,
});

const writeObjects = (): InterfaceDocument["objects"] => ({
  name: { type: "field", purpose: "Name", accessibility: { label: "Name" }, field: { name: "name", inputType: "text" } },
  go: {
    type: "action",
    purpose: "Go",
    accessibility: { label: "Go" },
    action: { binding: "a", operation: "op", effect: "write", inputs: { name: { field: "name" } }, confirm: { title: "A friendly claim" } },
  },
});

describe("semantic mapping", () => {
  it.each([
    ["panel", "region", { name: "L" }],
    ["form", "form", { name: "L" }],
    ["navigation", "navigation", { name: "L" }],
    ["list", "list", { name: "L" }],
    ["alert", "alert", { name: "L" }],
    ["image", "img", { name: "L" }],
    ["symbol", "img", { name: "L" }],
    ["progress", "progressbar", { name: "L" }],
  ])("renders %s with the %s role", (type, role, query) => {
    render(<CimlRenderer document={base({ item: { type: type as never, purpose: "P", accessibility: { label: "L" } } })} />);
    expect(screen.getByRole(role, query)).toBeTruthy();
  });

  it("gives types without a web mapping a labelled group", () => {
    render(<CimlRenderer document={base({ item: { type: "spatial.anchor", purpose: "P", accessibility: { label: "L" } } })} />);
    expect(screen.getByRole("group", { name: "L" })).toBeTruthy();
  });

  it("connects a field's label and hint", () => {
    render(<CimlRenderer document={base({ item: { type: "field", purpose: "P", accessibility: { label: "L", hint: "H" }, field: { name: "n", inputType: "text" } } })} />);
    const input = screen.getByLabelText("L");
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("H").id).toBe(input.getAttribute("aria-describedby"));
  });

  it("keeps amounts as text inputs, which do not round", () => {
    render(<CimlRenderer document={base({ item: { type: "field", purpose: "P", accessibility: { label: "L" }, field: { name: "n", inputType: "amount", decimals: 18 } } })} />);
    expect((screen.getByLabelText("L") as HTMLInputElement).type).toBe("text");
  });
});

describe("hostile documents", () => {
  const payload = "<img src=x onerror=alert(1)><script>alert(2)</script>";

  it("shows markup as plain text everywhere", () => {
    const { container } = render(
      <CimlRenderer
        document={base(
          {
            t: { type: "text", purpose: payload, accessibility: { label: payload }, text: payload },
            b: { type: "panel", purpose: payload, accessibility: { label: payload } },
            f: { type: "field", purpose: payload, accessibility: { label: payload, hint: payload }, field: { name: "f", inputType: "text", placeholder: payload } },
          },
          { title: payload, description: payload },
        )}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img[onerror]")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getAllByText(payload).length).toBeGreaterThan(1);
  });

  it("shows data values as plain text", async () => {
    const runtime = fakeRuntime({ read: vi.fn(async () => payload) });
    const { container } = render(
      <CimlRenderer
        runtime={runtime}
        document={base({ t: { type: "text", purpose: "P", accessibility: { label: "T" }, value: { data: "d" } } }, { data: { d: { binding: "a", operation: "op" } } })}
      />,
    );
    await screen.findByText(payload);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("refuses to render an invalid document, and shows why", () => {
    const document = base({ t: { type: "text", purpose: "P", accessibility: { label: "Secret content" }, text: "Secret content" } });
    (document.objects.t as any).script = "alert(1)";
    render(<CimlRenderer document={document} />);
    expect(screen.queryByText("Secret content")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("E_FORBIDDEN_KEY");
  });

  it("refuses a document whose digest does not match", () => {
    const document = base({});
    document.integrity = { digest: `sha256:${"0".repeat(64)}` };
    render(<CimlRenderer document={document} />);
    expect(screen.getByRole("alert").textContent).toContain("E_DIGEST");
    expect(screen.queryByRole("main")).toBeNull();
  });

  it("uses a stricter validator when given one", () => {
    const validate = () => ({ ok: false, issues: [{ code: "E_ABI_FUNCTION", path: "/x", message: "nope" }] });
    render(<CimlRenderer document={base({})} validate={validate} />);
    expect(screen.getByRole("alert").textContent).toContain("E_ABI_FUNCTION");
  });

  it("does not link unsafe hrefs, even if validation is bypassed", () => {
    const document = base({ l: { type: "action", purpose: "P", accessibility: { label: "Link" }, href: "javascript:alert(1)" } });
    const { container } = render(<CimlRenderer document={document} validate={() => ({ ok: true, issues: [] })} />);
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("Link")).toBeTruthy();
  });

  it("hardens safe links", () => {
    render(<CimlRenderer document={base({ l: { type: "action", purpose: "P", accessibility: { label: "Link" }, href: "https://a.example" } })} />);
    const link = screen.getByRole("link", { name: "Link" });
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("does not put unsafe token values on the page, even if validation is bypassed", () => {
    const document = base({}, { tokens: { color: { evil: "url(https://evil.example/x)", good: "#123456" } } });
    const { container } = render(<CimlRenderer document={document} validate={() => ({ ok: true, issues: [] })} />);
    const root = container.querySelector(".ciml-root") as HTMLElement;
    expect(root.style.getPropertyValue("--ciml-color-good")).toBe("#123456");
    expect(root.style.getPropertyValue("--ciml-color-evil")).toBe("");
  });

  it("applies tokens through known slots only", () => {
    const document = base(
      { t: { type: "text", purpose: "P", accessibility: { label: "T" }, text: "x", presentation: { tone: "{color.good}", variant: "primary" } } },
      { tokens: { color: { good: "#123456" } } },
    );
    const { container } = render(<CimlRenderer document={document} />);
    const element = container.querySelector('[data-ciml-id="t"]') as HTMLElement;
    expect(element.style.color).toBe("var(--ciml-color-good)");
    expect(element.getAttribute("data-variant")).toBe("primary");
  });
});

describe("images", () => {
  const image = base({ i: { type: "image", purpose: "P", accessibility: { label: "Alt" }, src: "https://images.example/a.png" } });
  const ipfs = base({ i: { type: "image", purpose: "P", accessibility: { label: "Alt" }, src: "ipfs://bafy/a.png" } });

  it("does not fetch remote images by default, because that reveals the viewer's address", () => {
    const { container } = render(<CimlRenderer document={image} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img", { name: "Alt" })).toBeTruthy();
  });
  it("loads them when the host opts in", () => {
    const { container } = render(<CimlRenderer document={image} loadRemoteImages />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://images.example/a.png");
    expect(container.querySelector("img")?.getAttribute("referrerpolicy")).toBe("no-referrer");
  });
  it("needs a gateway for ipfs", () => {
    const none = render(<CimlRenderer document={ipfs} loadRemoteImages />);
    expect(none.container.querySelector("img")).toBeNull();
    none.unmount();
    const withGateway = render(<CimlRenderer document={ipfs} loadRemoteImages ipfsGateway="https://gw.example/ipfs/" />);
    expect(withGateway.container.querySelector("img")?.getAttribute("src")).toBe("https://gw.example/ipfs/bafy/a.png");
  });
});

describe("data", () => {
  const document = base(
    {
      m: { type: "metric", purpose: "P", accessibility: { label: "Balance" }, value: { data: "d", format: "amount", decimals: 2 } },
    },
    { data: { d: { binding: "a", operation: "op" } } },
  );

  it("loads and formats values", async () => {
    render(<CimlRenderer document={document} runtime={fakeRuntime({ read: vi.fn(async () => "150") })} />);
    expect(await screen.findByText("1.5")).toBeTruthy();
  });
  it("says when data is unavailable, and never shows a false value", async () => {
    render(<CimlRenderer document={document} runtime={fakeRuntime({ read: vi.fn(async () => { throw new Error("rpc secret"); }) })} />);
    expect(await screen.findByText("Unavailable")).toBeTruthy();
    expect(screen.queryByText(/rpc secret/)).toBeNull();
  });
  it("says when there is no runtime", () => {
    render(<CimlRenderer document={document} />);
    expect(screen.getByText("Not connected")).toBeTruthy();
  });
  it("waits for inputs before reading, and ignores a stale answer", async () => {
    const resolvers: ((value: string) => void)[] = [];
    const read = vi.fn(() => new Promise((resolve) => resolvers.push(resolve as never)));
    const doc = base(
      {
        q: { type: "field", purpose: "P", accessibility: { label: "Query" }, field: { name: "q", inputType: "text" } },
        r: { type: "text", purpose: "P", accessibility: { label: "R" }, value: { data: "d" } },
      },
      { data: { d: { binding: "a", operation: "op", inputs: { q: { field: "q" } } } } },
    );
    render(<CimlRenderer document={doc} runtime={fakeRuntime({ read: read as never })} />);
    expect(await screen.findByText("Waiting for input")).toBeTruthy();
    expect(read).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Query"), { target: { value: "first" } });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Query"), { target: { value: "second" } });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await act(async () => {
      resolvers[1]?.("answer two");
      await Promise.resolve();
    });
    expect(await screen.findByText("answer two")).toBeTruthy();
    await act(async () => {
      resolvers[0]?.("answer one");
      await Promise.resolve();
    });
    expect(screen.queryByText("answer one")).toBeNull();
    expect(screen.getByText("answer two")).toBeTruthy();
  });
  it("renders rows as a table", async () => {
    const doc = base(
      { t: { type: "table", purpose: "P", accessibility: { label: "Rows" }, value: { data: "d" } } },
      { data: { d: { binding: "a", operation: "op" } } },
    );
    render(<CimlRenderer document={doc} runtime={fakeRuntime({ read: vi.fn(async () => [{ a: 1, b: "<b>x</b>" }, { a: 2 }]) })} />);
    expect(await screen.findByRole("table", { name: "Rows" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "b" })).toBeTruthy();
    expect(screen.getByText("<b>x</b>")).toBeTruthy();
  });
});

describe("actions", () => {
  const click = () => fireEvent.click(screen.getByRole("button", { name: "Go" }));
  const fill = () => fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Rex" } });

  it("lists missing inputs and does not call the runtime", () => {
    const runtime = fakeRuntime();
    render(<CimlRenderer document={base(writeObjects())} runtime={runtime} />);
    click();
    expect(screen.getByRole("alert").textContent).toContain("name");
    expect(runtime.prepare).not.toHaveBeenCalled();
  });

  it("never executes a write without confirmation", async () => {
    const runtime = fakeRuntime();
    render(<CimlRenderer document={base(writeObjects())} runtime={runtime} />);
    fill();
    click();
    await screen.findByRole("alertdialog");
    expect(runtime.prepare).toHaveBeenCalled();
    expect(runtime.execute).not.toHaveBeenCalled();
  });

  it("asks for confirmation even when the document gives no confirm text", async () => {
    const objects = writeObjects();
    delete (objects.go as any).action.confirm;
    const runtime = fakeRuntime();
    render(<CimlRenderer document={base(objects)} runtime={runtime} />);
    fill();
    click();
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(runtime.execute).not.toHaveBeenCalled();
  });

  it("goes by the runtime's decoded effect, not the document's claim", async () => {
    const objects = writeObjects();
    (objects.go as any).action.effect = "read";
    const runtime = fakeRuntime();
    render(<CimlRenderer document={base(objects)} runtime={runtime} />);
    fill();
    click();
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(runtime.execute).not.toHaveBeenCalled();
  });

  it("shows the decoded intent, keeping the document's wording separate", async () => {
    render(<CimlRenderer document={base(writeObjects())} runtime={fakeRuntime()} />);
    fill();
    click();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("POST /things");
    expect(dialog.textContent).toContain("https://api.example.com");
    expect(dialog.textContent).toContain("Rex");
    expect(dialog.textContent).toContain("The interface describes this as: A friendly claim");
    expect(screen.getByRole("heading", { name: "Review this action" })).toBeTruthy();
  });

  it("executes only after confirming, then reloads data", async () => {
    const read = vi.fn(async () => "v");
    const runtime = fakeRuntime({ read });
    const document = base(
      { ...writeObjects(), v: { type: "text", purpose: "P", accessibility: { label: "V" }, value: { data: "d" } } },
      { data: { d: { binding: "a", operation: "op" } } },
    );
    render(<CimlRenderer document={document} runtime={runtime} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    const before = read.mock.calls.length;
    fill();
    click();
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Sent: 0xabc");
    expect(runtime.execute).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(read.mock.calls.length).toBeGreaterThan(before));
  });

  it("cancels without executing", async () => {
    const runtime = fakeRuntime();
    render(<CimlRenderer document={base(writeObjects())} runtime={runtime} />);
    fill();
    click();
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(runtime.execute).not.toHaveBeenCalled();
  });

  it("disables confirmation for a blocked intent, and shows the reason", async () => {
    const runtime = fakeRuntime({
      prepare: vi.fn(async () => intent({ blocked: true, warnings: [{ code: "W_CHAIN_MISMATCH", message: "Wrong network." }] })),
    });
    render(<CimlRenderer document={base(writeObjects())} runtime={runtime} />);
    fill();
    click();
    await screen.findByRole("alertdialog");
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Wrong network.")).toBeTruthy();
  });

  it("does not auto-run a blocked read", async () => {
    const runtime = fakeRuntime({ prepare: vi.fn(async () => intent({ effect: "read", blocked: true })) });
    render(<CimlRenderer document={base(writeObjects())} runtime={runtime} />);
    fill();
    click();
    await screen.findByRole("alertdialog");
    expect(runtime.execute).not.toHaveBeenCalled();
  });

  it("runs an unblocked read straight away and shows the result", async () => {
    const runtime = fakeRuntime({
      prepare: vi.fn(async () => intent({ effect: "read" })),
      execute: vi.fn(async () => ({ result: { a: 1 } })),
    });
    render(<CimlRenderer document={base(writeObjects())} runtime={runtime} />);
    fill();
    click();
    expect(await screen.findByText('{"a":1}')).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("shows errors from prepare and from execute", async () => {
    const failing = fakeRuntime({ prepare: vi.fn(async () => { throw new Error("bad input"); }) });
    const first = render(<CimlRenderer document={base(writeObjects())} runtime={failing} />);
    fill();
    click();
    expect(await screen.findByText("bad input")).toBeTruthy();
    first.unmount();
    const rejected = fakeRuntime({ execute: vi.fn(async () => { throw new Error("user rejected"); }) });
    render(<CimlRenderer document={base(writeObjects())} runtime={rejected} />);
    fill();
    click();
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("user rejected")).toBeTruthy();
  });

  it("disables actions with no runtime", () => {
    render(<CimlRenderer document={base(writeObjects())} />);
    expect((screen.getByRole("button", { name: "Go" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("passes the native value", async () => {
    const objects: InterfaceDocument["objects"] = {
      coin: { type: "field", purpose: "P", accessibility: { label: "Coin" }, field: { name: "coin", inputType: "amount", decimals: 18 } },
      go: { type: "action", purpose: "P", accessibility: { label: "Go" }, action: { binding: "a", operation: "op", effect: "write", value: { field: "coin" } } },
    };
    const runtime = fakeRuntime();
    render(<CimlRenderer document={base(objects)} runtime={runtime} />);
    fireEvent.change(screen.getByLabelText("Coin"), { target: { value: "2" } });
    click();
    await screen.findByRole("alertdialog");
    expect(runtime.prepare).toHaveBeenCalledWith(expect.anything(), {}, "2");
  });
});

describe("connection", () => {
  it("offers to connect, and hides the offer once connected", async () => {
    let address: string | undefined;
    const runtime = fakeRuntime({
      context: () => ({ "wallet.address": address }),
      connect: vi.fn(async () => {
        address = "0x1";
      }),
    });
    const document = { ...base({}), schema: "ciml/2" as const };
    render(<CimlRenderer document={document} runtime={runtime} />);
    fireEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Connect wallet" })).toBeNull());
  });
  it("says why a connection failed", async () => {
    const runtime = fakeRuntime({ connect: vi.fn(async () => { throw new Error("no wallet is available"); }) });
    render(<CimlRenderer document={{ ...base({}), schema: "ciml/2" }} runtime={runtime} />);
    fireEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "no wallet is available");
  });
  it("refreshes and unsubscribes", async () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const { unmount } = render(<CimlRenderer document={base({})} runtime={fakeRuntime({ subscribe })} />);
    expect(subscribe).toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("extensions", () => {
  const document = base({
    x: { type: "extension", purpose: "P", accessibility: { label: "X" }, extension: { id: "acme.chart", version: "1.0.0", fallback: "plain" } },
    plain: { type: "text", purpose: "P", accessibility: { label: "Plain" }, text: "Fallback text" },
  });
  (document.objects.root as any).children = ["x"];

  it("renders the fallback for an unknown extension", () => {
    render(<CimlRenderer document={document} />);
    expect(screen.getByText("Fallback text")).toBeTruthy();
  });
  it("renders a registered extension", () => {
    render(<CimlRenderer document={document} extensions={{ "acme.chart": () => <p>Custom chart</p> }} />);
    expect(screen.getByText("Custom chart")).toBeTruthy();
    expect(screen.queryByText("Fallback text")).toBeNull();
  });
});

describe("ConfirmDialog", () => {
  const dialog = (overrides = {}) => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDialog intent={intent()} onCancel={onCancel} onConfirm={onConfirm} {...overrides} />);
    return { onCancel, onConfirm };
  };
  it("starts focus on Cancel, so Enter cannot confirm by accident", () => {
    dialog();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });
  it("closes on Escape", () => {
    const { onCancel } = dialog();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });
  it("keeps Tab inside", () => {
    dialog();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const proceed = screen.getByRole("button", { name: "Continue" });
    proceed.focus();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Tab" });
    expect(document.activeElement).toBe(cancel);
    cancel.focus();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(proceed);
  });
  it("is labelled and modal", () => {
    dialog();
    const element = screen.getByRole("alertdialog", { name: "Review this action" });
    expect(element.getAttribute("aria-modal")).toBe("true");
  });
});

describe("TrustBanner", () => {
  it.each([
    [undefined, /not been verified/],
    [{ level: "unverified" }, /not been verified/],
    [{ level: "digest-valid" }, /nobody has signed/],
    [{ level: "signed", signers: ["0xabc"] }, /Signed by 0xabc\. Check that you trust/],
    [{ level: "digest-invalid" }, /Do not use it/],
    [{ level: "made-up-by-a-document" }, /not been verified/],
  ])("describes %j", (trust, text) => {
    render(<TrustBanner {...(trust ? { trust } : {})} />);
    expect(document.querySelector(".ciml-trust")?.textContent).toMatch(text);
  });
});
