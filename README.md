# PostCSS Lynx

A PostCSS plugin that resolves nested CSS variable references at build time.

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

1. **Nested Variable Resolution**: Resolves nested CSS variable references to their final values at build time.
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
  background-color: #3366ff;
}

.button:hover {
  background-color: #0044cc;
}
```

## Why Use This Plugin?

Some environments or older browsers may not fully support CSS variable cascading. This plugin helps by:

1. Pre-computing all variable references at build time
2. Replacing variable references with their actual values
3. Maintaining the original variable declarations for better debugging

## License

MIT
