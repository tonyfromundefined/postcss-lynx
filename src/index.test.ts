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
});
