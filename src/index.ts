import type { PluginCreator } from "postcss";

const MAX_ITERATIONS = 100;
const LOG_WARNINGS = true;

// Properties to remove
const PROPERTIES_TO_REMOVE = [
  "color-scheme",
  "stroke-dasharray",
  "stroke-dashoffset",
];

const lynx: PluginCreator<{}> = () => {
  const options = {
    maxIterations: MAX_ITERATIONS,
    logWarnings: LOG_WARNINGS,
  };

  return {
    postcssPlugin: "postcss-lynx",

    prepare(result) {
      const varMap = new Map();

      // First, remove all specified property declarations throughout the CSS
      result.root.walkDecls((decl) => {
        if (PROPERTIES_TO_REMOVE.includes(decl.prop)) {
          decl.remove();
        }
      });

      return {
        Declaration(decl) {
          // Process CSS custom properties for variable resolution
          if (decl.prop.startsWith("--")) {
            varMap.set(decl.prop, decl.value);
          }
        },

        OnceExit() {
          let resolvedSomething = true;
          let iterations = 0;

          while (resolvedSomething && iterations < options.maxIterations) {
            resolvedSomething = false;
            iterations++;

            for (const [prop, value] of varMap.entries()) {
              if (value.includes("var(--")) {
                let newValue = value;
                const varRegex = /var\(([^,)]+)(?:,([^)]+))?\)/g;
                let match: RegExpExecArray | null;
                let madeChange = false;
                const testValue = value;

                // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec in loop
                while ((match = varRegex.exec(testValue)) !== null) {
                  const varName = match[1].trim();
                  const fallback = match[2] ? match[2].trim() : null;

                  if (varMap.has(varName)) {
                    const resolvedValue = varMap.get(varName);
                    newValue = newValue.replace(match[0], resolvedValue);
                    madeChange = true;
                  } else if (fallback) {
                    newValue = newValue.replace(match[0], fallback);
                    madeChange = true;
                  }
                }

                if (madeChange) {
                  varMap.set(prop, newValue);
                  resolvedSomething = true;
                }
              }
            }
          }

          if (iterations >= options.maxIterations && options.logWarnings) {
            console.warn(
              "postcss-lynx: Maximum iterations reached. There might be circular references.",
            );
          }

          // Only update variable declarations, not property values
          result.root.walkDecls((decl) => {
            if (decl.prop.startsWith("--") && varMap.has(decl.prop)) {
              decl.value = varMap.get(decl.prop);
            }
          });

          // Log warnings for undefined variables but don't replace them
          result.root.walkDecls((decl) => {
            if (decl.value?.includes("var(--")) {
              const varRegex = /var\(([^,)]+)(?:,([^)]+))?\)/g;
              const testValue = decl.value;
              let match: RegExpExecArray | null;

              // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec in loop
              while ((match = varRegex.exec(testValue)) !== null) {
                const varName = match[1].trim();
                const fallback = match[2] ? match[2].trim() : null;

                if (!varMap.has(varName) && !fallback && options.logWarnings) {
                  console.warn(
                    `postcss-lynx: Undefined variable '${varName}' used in '${decl.parent && "selector" in decl.parent ? decl.parent.selector : "unknown location"}'`,
                  );
                }
              }
            }
          });
        },
      };
    },
  };
};

lynx.postcss = true;

export default lynx;
