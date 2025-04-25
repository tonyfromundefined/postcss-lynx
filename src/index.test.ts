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
    expect(output.css).toContain(".text { color: red; }");
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
    expect(output.css).toContain("padding: calc(16px * 2);");
    expect(output.css).toContain("margin: 16px;");
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

    expect(output.css).toContain("background-color: red;");
    expect(output.css).toContain("color: blue;");
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
    expect(output.css).toContain("background: blue;");
    expect(output.css).toContain("color: var(--unknown-var);");

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
});
