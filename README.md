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

## Example

### Input

```css
:root {
  --color-primary: #3366ff;
  --color-primary-dark: #0044cc;
  --button-background: var(--color-primary);
  --button-hover-background: var(--color-primary-dark);
}

.button {
  background-color: var(--button-background);
}

.button:hover {
  background-color: var(--button-hover-background);
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
```

## Why Use This Plugin?

This plugin helps manage CSS custom properties (variables) by:

1. Resolving nested variable references in variable definitions only
2. Preserving variable usage in style properties (keeping `var()` references intact)
3. Ensuring proper variable cascading by pre-resolving variable values at build time
4. Warning about undefined variables or circular references

This approach ensures your CSS variables have proper values defined at the root, while still allowing runtime features like theme switching to work properly.

## License

MIT
