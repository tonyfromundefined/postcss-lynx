import type { PluginCreator } from "postcss";

const MAX_ITERATIONS = 100;
const LOG_WARNINGS = true;

// Properties to remove
const PROPERTIES_TO_REMOVE = [
  "color-scheme",
  "stroke-dasharray",
  "stroke-dashoffset",
];

export type Options = {
  maxIterations?: number;
  logWarnings?: boolean;
};

/**
 * PostCSS Lynx Plugin
 *
 * A PostCSS plugin that:
 * 1. Resolves CSS custom property references (including deeply nested ones)
 * 2. Removes specified CSS properties
 * 3. Handles theme variables in light/dark mode contexts
 * 4. Detects circular references and warns about undefined variables
 * 5. Converts data attribute selectors to class selectors for Lynx compatibility
 */
const lynx: PluginCreator<Options> = (_options) => {
  const defaultOptions = {
    maxIterations: MAX_ITERATIONS,
    logWarnings: LOG_WARNINGS,
  };
  const options = { ...defaultOptions, ..._options };

  return {
    postcssPlugin: "postcss-lynx",

    prepare(result) {
      // Map to store CSS custom properties and their values by selector
      // Key: selector, Value: Map of variable names to values
      const selectorVarMap = new Map<string, Map<string, string>>();

      // First, remove all specified property declarations throughout the CSS
      result.root.walkDecls((decl) => {
        if (PROPERTIES_TO_REMOVE.includes(decl.prop)) {
          decl.remove();
        }
      });

      // Helper to get selector for a declaration
      const getSelector = (decl: any): string => {
        return decl.parent && "selector" in decl.parent
          ? decl.parent.selector
          : "unknown";
      };

      // Helper to convert data attribute selector to class selector
      const convertDataAttrToClass = (selector: string): string => {
        // Match data attribute selectors like [data-seed-color-mode="light-only"]
        const dataAttrRegex = /\[([^\]=]+)(?:=["']?([^"'\]]+)["']?)?\]/g;
        let match: RegExpExecArray | null;
        let result = selector;

        // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec in loop
        while ((match = dataAttrRegex.exec(selector)) !== null) {
          const attrName = match[1];
          const attrValue = match[2] || "";

          // Only convert data-* attributes
          if (attrName.startsWith("data-")) {
            // Create class name: .data-attr-name__value
            const className = `.${attrName}__${attrValue.replace(/[^\w-]/g, "")}`;

            // Add the class selector alongside the original data attribute selector
            result = result.replace(match[0], `${match[0]}, ${className}`);
          }
        }

        return result;
      };

      // Convert data attribute selectors to class selectors
      result.root.walkRules((rule) => {
        const originalSelector = rule.selector;
        const convertedSelector = convertDataAttrToClass(originalSelector);

        if (originalSelector !== convertedSelector) {
          rule.selector = convertedSelector;
        }
      });

      return {
        Declaration(decl) {
          // Process CSS custom properties for variable resolution
          if (decl.prop.startsWith("--")) {
            const selector = getSelector(decl);

            // Store in the selector-specific map
            if (!selectorVarMap.has(selector)) {
              selectorVarMap.set(selector, new Map());
            }
            selectorVarMap.get(selector)?.set(decl.prop, decl.value);
          }
        },

        OnceExit() {
          // Process each selector context separately
          for (const [selector, varMap] of selectorVarMap.entries()) {
            let resolvedSomething = true;
            let iterations = 0;

            // Iterative approach to resolve variable references
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

                    // First try to find the variable in the current selector context
                    if (varMap.has(varName)) {
                      const resolvedValue = varMap.get(varName) || "";
                      newValue = newValue.replace(match[0], resolvedValue);
                      madeChange = true;
                    }
                    // Then try to find it in other selector contexts
                    else {
                      let found = false;
                      for (const [
                        otherSelector,
                        otherVarMap,
                      ] of selectorVarMap.entries()) {
                        if (
                          otherSelector !== selector &&
                          otherVarMap.has(varName)
                        ) {
                          const resolvedValue = otherVarMap.get(varName) || "";
                          newValue = newValue.replace(match[0], resolvedValue);
                          madeChange = true;
                          found = true;
                          break;
                        }
                      }

                      // If not found anywhere, use fallback if available
                      if (!found && fallback) {
                        newValue = newValue.replace(match[0], fallback);
                        madeChange = true;
                      }
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
          }

          // Only update variable declarations with resolved values
          result.root.walkDecls((decl) => {
            if (decl.prop.startsWith("--")) {
              const selector = getSelector(decl);

              if (
                selectorVarMap.has(selector) &&
                selectorVarMap.get(selector)?.has(decl.prop)
              ) {
                decl.value =
                  selectorVarMap.get(selector)?.get(decl.prop) || decl.value;
              }
            }
          });

          // Log warnings for undefined variables but don't replace them
          result.root.walkDecls((decl) => {
            if (decl.value?.includes("var(--")) {
              const varRegex = /var\(([^,)]+)(?:,([^)]+))?\)/g;
              const testValue = decl.value;
              let match: RegExpExecArray | null;
              const selector = getSelector(decl);
              const varMap = selectorVarMap.get(selector);

              // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec in loop
              while ((match = varRegex.exec(testValue)) !== null) {
                const varName = match[1].trim();
                const fallback = match[2] ? match[2].trim() : null;

                // Check if the variable exists in any selector context
                let exists = false;
                if (varMap?.has(varName)) {
                  exists = true;
                } else {
                  for (const otherVarMap of selectorVarMap.values()) {
                    if (otherVarMap.has(varName)) {
                      exists = true;
                      break;
                    }
                  }
                }

                if (!exists && !fallback && options.logWarnings) {
                  console.warn(
                    `postcss-lynx: Undefined variable '${varName}' used in '${selector}'`,
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
