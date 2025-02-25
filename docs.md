# Dota Vision Simulation - Script Documentation

This document provides explanations for all the npm scripts defined in the package.json file.

## Build Scripts

### Browserify Scripts
- `browserify:demo`: Converts `src/app.js` into a standalone bundle (`www/bundle.js`) for demonstration purposes with the global name `VisionSimulation`.
- `browserify:prod`: Converts `src/vision-simulation.js` into a standalone production bundle (`dist/dota-vision-simulation.js`) with the global name `DotaVisionSimulation`.

### Minification Scripts
- `uglify:demo`: Compresses and minifies the demo bundle, removing console logs and dead code, outputting to `build/bundle.min.js`.
- `uglify:prod`: Compresses and minifies the production bundle, removing console logs and dead code, outputting to `dist/dota-vision-simulation.min.js`.

### Asset Processing
- `clean:build`: Removes all files from the `build` directory.
- `build:js`: Runs `browserify:demo` and `uglify:demo` to create the JavaScript files for the demo.
- `build:img`: Uses imagemin to optimize the `testing-assets/map_data.png` file and save it to the `build` directory.
- `build:html`: Runs the HTML preprocessing script with `NODE_ENV=prod`.

### Main Build Processes
- `build`: Complete build process that:
  1. Cleans the build directory
  2. Builds JavaScript files
  3. Copies map_data.png from testing-assets to the build directory
  4. Processes HTML files

### Staging and Deployment
- `stage:rev`: Runs the revision script (likely for versioning assets).
- `stage`: Runs the `build` script followed by `stage:rev`.
- `deploy:copy`: Executes the deployment copy script.
- `deploy`: Performs staging and then executes the git deployment script.

## Git Operations
- `git:dist`: Adds all changes to git and commits them with the message "update dist".
- `git:deploy`: Adds all changes (including untracked files) to git and commits them with the message "deploy".

## Testing
- `test`: Runs the Mocha test suite.
- `perf`: Executes performance tests and outputs results to `perf.log`.

## NPM Version Hooks
- `preversion`: Runs automatically before `npm version` to:
  1. Create the production bundle with browserify
  2. Minify the production bundle
  3. Commit these changes with "update dist" message
- `postversion`: Runs automatically after `npm version` to publish the package to npm.

## Usage Examples

### Development Build
```bash
npm run build
```

### Complete Deploy Process
```bash
npm run deploy
```

### Running Tests
```bash
npm test
```

### Performance Testing
```bash
npm run perf
``` 