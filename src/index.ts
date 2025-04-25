import type { PluginCreator } from "postcss";

const MAX_ITERATIONS = 100;
const LOG_WARNINGS = true;

const lynx: PluginCreator<{}> = () => {
  const options = {
    maxIterations: MAX_ITERATIONS,
    logWarnings: LOG_WARNINGS,
  };

  return {
    postcssPlugin: "postcss-lynx",

    prepare(result) {
      const varMap = new Map();

      return {
        Declaration(decl) {
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

          result.root.walkDecls((decl) => {
            if (decl.prop.startsWith("--") && varMap.has(decl.prop)) {
              decl.value = varMap.get(decl.prop);
            }
          });

          result.root.walkDecls((decl) => {
            if (decl.value?.includes("var(--")) {
              const varRegex = /var\(([^,)]+)(?:,([^)]+))?\)/g;
              let newValue = decl.value;
              const testValue = decl.value;
              let match: RegExpExecArray | null;

              // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec in loop
              while ((match = varRegex.exec(testValue)) !== null) {
                const varName = match[1].trim();
                const fallback = match[2] ? match[2].trim() : null;

                if (varMap.has(varName)) {
                  newValue = newValue.replace(match[0], varMap.get(varName));
                } else if (fallback) {
                  newValue = newValue.replace(match[0], fallback);
                } else if (options.logWarnings) {
                  console.warn(
                    `postcss-lynx: Undefined variable '${varName}' used in '${decl.parent && "selector" in decl.parent ? decl.parent.selector : "unknown location"}'`,
                  );
                }
              }

              decl.value = newValue;
            }
          });
        },
      };
    },
  };
};

lynx.postcss = true;

export default lynx;
