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

it("should resolve deep nested variable references like in design systems", async () => {
  const input = `
    :root {
      --seed-color-palette-blue-700: #217cf9;
      --seed-color-palette-red-700: #fa342c;
      --seed-color-palette-green-700: #22b27f;
      
      --seed-color-fg-informative: var(--seed-color-palette-blue-700);
      --seed-color-fg-critical: var(--seed-color-palette-red-700);
      --seed-color-fg-positive: var(--seed-color-palette-green-700);
      
      --component-status-info: var(--seed-color-fg-informative);
      --component-status-error: var(--seed-color-fg-critical);
      --component-status-success: var(--seed-color-fg-positive);
    }
    
    .status-info { color: var(--component-status-info); }
    .status-error { color: var(--component-status-error); }
    .status-success { color: var(--component-status-success); }
  `;

  const output = await postcss([lynx()]).process(input, { from: undefined });

  expect(output.css).toContain("--seed-color-fg-informative: #217cf9;");
  expect(output.css).toContain("--seed-color-fg-critical: #fa342c;");
  expect(output.css).toContain("--seed-color-fg-positive: #22b27f;");
  expect(output.css).toContain("--component-status-info: #217cf9;");
  expect(output.css).toContain("--component-status-error: #fa342c;");
  expect(output.css).toContain("--component-status-success: #22b27f;");

  // Property values should still use var() references
  expect(output.css).toContain("color: var(--component-status-info);");
  expect(output.css).toContain("color: var(--component-status-error);");
  expect(output.css).toContain("color: var(--component-status-success);");
});

it("should properly handle complex theme variables in light/dark mode contexts", async () => {
  const input = `
    :root, :root[data-theme="light"] {
      --color-gray-100: #f7f8f9;
      --color-gray-900: #2a3038;
      
      --color-bg-primary: var(--color-gray-100);
      --color-text-primary: var(--color-gray-900);
    }
    
    :root[data-theme="dark"] {
      --color-gray-100: #16171b;
      --color-gray-900: #f3f4f5;
      
      --color-bg-primary: var(--color-gray-100);
      --color-text-primary: var(--color-gray-900);
    }
    
    body {
      background-color: var(--color-bg-primary);
      color: var(--color-text-primary);
    }
  `;

  const output = await postcss([lynx()]).process(input, { from: undefined });

  // Check light theme variables
  expect(output.css).toMatch(
    /:root,\s*:root\[data-theme="light"\](?:,\s*\.data-theme__light)?\s*{[^}]*--color-bg-primary:\s*#f7f8f9/,
  );
  expect(output.css).toMatch(
    /:root,\s*:root\[data-theme="light"\](?:,\s*\.data-theme__light)?\s*{[^}]*--color-text-primary:\s*#2a3038/,
  );

  // Check dark theme variables
  expect(output.css).toMatch(
    /:root\[data-theme="dark"\](?:,\s*\.data-theme__dark)?\s*{[^}]*--color-bg-primary:\s*#16171b/,
  );
  expect(output.css).toMatch(
    /:root\[data-theme="dark"\](?:,\s*\.data-theme__dark)?\s*{[^}]*--color-text-primary:\s*#f3f4f5/,
  );

  // Property values should still use var() references
  expect(output.css).toContain("background-color: var(--color-bg-primary);");
  expect(output.css).toContain("color: var(--color-text-primary);");
});
