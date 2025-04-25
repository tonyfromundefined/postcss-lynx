# PostCSS Lynx

A PostCSS plugin that resolves nested CSS variable references in variable definitions at build time.

## Installation

```bash
npm install postcss-lynx --save-dev
# or
yarn add postcss-lynx --dev
```

## Usage

### Basic Configuration (postcss.config.js)

```js
module.exports = {
  plugins: [
    require('postcss-lynx')(),
    // other plugins...
  ]
}
```

### With Webpack

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('postcss-lynx')(),
                ]
              }
            }
          }
        ]
      }
    ]
  }
}
```

## Features

This plugin provides the following features:

1. **Variable Definition Resolution**: Resolves nested CSS variable references in variable definitions, keeping references in style properties intact.
2. **Fallback Support**: Uses fallback values when variables are undefined.
3. **Circular Reference Detection**: Detects circular references between variables and provides warnings.
4. **Unsupported Property Removal**: Automatically removes potentially problematic properties from CSS:
   - `color-scheme` - May cause issues in some browsers
   - `stroke-dasharray` - SVG property that can be problematic
   - `stroke-dashoffset` - SVG property that can be problematic
5. **Data Attribute Selector Conversion**: Converts data attribute selectors to class selectors for better compatibility with Lynx platform:
   - `[data-theme="dark"]` → `[data-theme="dark"], .data-theme__dark`
   - `[data-seed-color-mode="light-only"]` → `[data-seed-color-mode="light-only"], .data-seed-color-mode__light-only`

## Example

### Input

```css
:root {
  --color-primary: #3366ff;
  --color-primary-dark: #0044cc;
  --button-background: var(--color-primary);
  --button-hover-background: var(--color-primary-dark);
  color-scheme: light dark;
}

.button {
  background-color: var(--button-background);
}

.button:hover {
  background-color: var(--button-hover-background);
  color-scheme: inherit;
}

svg.icon {
  stroke: currentColor;
  stroke-width: 2;
  stroke-dasharray: 5 2;
  stroke-dashoffset: 2;
}
```

### Output

```css
:root {
  --color-primary: #3366ff;
  --color-primary-dark: #0044cc;
  --button-background: #3366ff;
  --button-hover-background: #0044cc;
}

.button {
  background-color: var(--button-background);
}

.button:hover {
  background-color: var(--button-hover-background);
}

svg.icon {
  stroke: currentColor;
  stroke-width: 2;
}
```

### Data Attribute Selector Conversion Example

#### Input

```css
[data-theme="dark"] {
  --color-background: #121212;
  --color-text: #ffffff;
}

[data-seed-color-mode="light-only"] {
  --seed-color-primary: #3366ff;
}

.card[data-size="large"] {
  padding: 2rem;
}
```

#### Output

```css
[data-theme="dark"], .data-theme__dark {
  --color-background: #121212;
  --color-text: #ffffff;
}

[data-seed-color-mode="light-only"], .data-seed-color-mode__light-only {
  --seed-color-primary: #3366ff;
}

.card[data-size="large"], .card.data-size__large {
  padding: 2rem;
}
```

## Why Use This Plugin?

This plugin helps manage CSS custom properties (variables) by:

1. Resolving nested variable references in variable definitions only
2. Preserving variable usage in style properties (keeping `var()` references intact)
3. Ensuring proper variable cascading by pre-resolving variable values at build time
4. Warning about undefined variables or circular references
5. Removing problematic properties (`color-scheme`, `stroke-dasharray`, `stroke-dashoffset`) that might not be supported or might cause rendering issues in some environments
6. Converting data attribute selectors to class selectors for better compatibility with platforms like Lynx that may not fully support data attribute selectors

This approach ensures your CSS variables have proper values defined at the root, while still allowing runtime features like theme switching to work properly, and preventing issues with unsupported or problematic CSS properties.

## License

MIT
