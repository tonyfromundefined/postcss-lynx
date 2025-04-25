import postcss from "postcss";
import lynx from "./index";

describe("postcss-lynx", () => {
  it("should resolve basic variable references", async () => {
    const input = `
      :root {
        --color-red: red;
        --color-critical: var(--color-red);
      }
      .text { color: var(--color-critical); }
    `;

    const output = await postcss([lynx()]).process(input, { from: undefined });

    expect(output.css).toContain("--color-critical: red;");
    expect(output.css).toContain(".text { color: var(--color-critical); }");
  });

  it("should resolve nested variable references", async () => {
    const input = `
      :root {
        --base-size: 16px;
        --spacing-unit: var(--base-size);
        --spacing-large: calc(var(--spacing-unit) * 2);
      }
      .container { 
        padding: var(--spacing-large); 
        margin: var(--spacing-unit);
      }
    `;

    const output = await postcss([lynx()]).process(input, { from: undefined });

    expect(output.css).toContain("--spacing-unit: 16px;");
    expect(output.css).toContain("--spacing-large: calc(16px * 2);");
    expect(output.css).toContain("padding: var(--spacing-large);");
    expect(output.css).toContain("margin: var(--spacing-unit);");
  });

  it("should use fallback values when variables are undefined", async () => {
    const input = `
      :root {
        --primary-color: blue;
      }
      .button { 
        background-color: var(--secondary-color, red);
        color: var(--primary-color, green);
      }
    `;

    const output = await postcss([lynx()]).process(input, { from: undefined });

    expect(output.css).toContain(
      "background-color: var(--secondary-color, red);",
    );
    expect(output.css).toContain("color: var(--primary-color, green);");
  });

  it("should warn about undefined variables without fallbacks", async () => {
    const originalWarn = console.warn;
    const mockWarn = vi.fn();
    console.warn = mockWarn;

    const input = `
      :root {
        --known-var: blue;
      }
      .element { 
        color: var(--unknown-var);
        background: var(--known-var);
      }
    `;

    const output = await postcss([lynx()]).process(input, { from: undefined });

    expect(mockWarn).toHaveBeenCalled();
    expect(output.css).toContain("color: var(--unknown-var);");
    expect(output.css).toContain("background: var(--known-var);");

    console.warn = originalWarn;
  });

  it("should detect circular references", async () => {
    const originalWarn = console.warn;
    const mockWarn = vi.fn();
    console.warn = mockWarn;

    const input = `
      :root {
        --var1: var(--var2);
        --var2: var(--var1);
      }
      .element { color: var(--var1); }
    `;

    const output = await postcss([lynx()]).process(input, { from: undefined });

    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("Maximum iterations reached"),
    );

    console.warn = originalWarn;
  });

  it("should remove color-scheme properties", async () => {
    const input = `
      :root {
        color-scheme: light dark;
        --theme-color: blue;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          color-scheme: dark;
          --theme-color: navy;
        }
      }
      body {
        background-color: var(--theme-color);
        color-scheme: inherit;
      }
    `;

    const result = postcss([lynx()]).process(input, { from: undefined });

    // Get the AST
    const root = result.root;

    // Check that color-scheme declarations are removed
    let hasColorScheme = false;
    root.walkDecls("color-scheme", () => {
      hasColorScheme = true;
    });

    expect(hasColorScheme).toBe(false);

    // Check that other properties are preserved
    let hasThemeColor = false;
    let hasBackgroundColor = false;

    root.walkDecls((decl) => {
      if (decl.prop === "--theme-color") {
        hasThemeColor = true;
      }
      if (decl.prop === "background-color") {
        hasBackgroundColor = true;
      }
    });

    expect(hasThemeColor).toBe(true);
    expect(hasBackgroundColor).toBe(true);
  });

  it("should remove stroke-dasharray and stroke-dashoffset properties", async () => {
    const input = `
      svg {
        stroke: #333;
        stroke-width: 2px;
        stroke-dasharray: 5 5;
        stroke-dashoffset: 10;
        fill: none;
      }
      .path {
        stroke-dasharray: 10;
        stroke-dashoffset: 5;
      }
    `;

    const result = postcss([lynx()]).process(input, { from: undefined });
    const root = result.root;

    // Check that stroke-dasharray and stroke-dashoffset are removed
    let hasDashArray = false;
    let hasDashOffset = false;

    root.walkDecls((decl) => {
      if (decl.prop === "stroke-dasharray") {
        hasDashArray = true;
      }
      if (decl.prop === "stroke-dashoffset") {
        hasDashOffset = true;
      }
    });

    expect(hasDashArray).toBe(false);
    expect(hasDashOffset).toBe(false);

    // Check that other stroke properties are preserved
    let hasStroke = false;
    let hasStrokeWidth = false;

    root.walkDecls((decl) => {
      if (decl.prop === "stroke") {
        hasStroke = true;
      }
      if (decl.prop === "stroke-width") {
        hasStrokeWidth = true;
      }
    });

    expect(hasStroke).toBe(true);
    expect(hasStrokeWidth).toBe(true);
  });
});
