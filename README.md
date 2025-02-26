# Dota 2 Vision Simulation

This project provides a precise simulation of Dota 2's vision mechanics, including elevation-based vision, tree line-of-sight blocking, and fog of war calculations. It uses a shadowcasting algorithm to accurately calculate visibility from any point on the map.

This project is a fork of [dota-vision-simulation](https://github.com/devilesk/dota-vision-simulation)

![Dota 2 Vision Simulation Demo](https://i.imgur.com/example.gif)

## Features

- Accurate representation of Dota 2's vision mechanics
- Support for elevation-based visibility (high ground advantage)
- Interactive tree cutting mechanics
- Precise shadowcasting algorithm for field of view calculations
- Coordinate conversion between world, grid, and image spaces
- Debug visualization of elevation walls and visibility areas

## Installation

### As an NPM Package

```bash
npm install dota-vision-simulation
```

### Standalone Usage

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dota-vision-simulation.git
cd dota-vision-simulation
```

2. Install dependencies:
```bash
npm install
```

3. Build the project (if necessary):
```bash
npm run build
```

## Usage

### As an NPM Package

```javascript
const VisionSimulation = require("dota-vision-simulation");
const worlddata = require("dota-vision-simulation/testing-assets/worlddata.json");

// Configuration options
const options = {
  radius: 25 // Vision radius in grid tiles (equivalent to 1600 units in Dota 2)
};

// Create a new simulation instance
const vs = new VisionSimulation(worlddata, options);

// Initialize with map data
vs.initialize("node_modules/dota-vision-simulation/testing-assets/map_data.png", function(err) {
  if (err) {
    console.error("Failed to initialize vision simulation:", err);
    return;
  }
  
  // Calculate visibility from position (128, 128) in grid coordinates
  vs.updateVisibility(128, 128);
   
  // Access visible areas
  console.log(`Total visible area: ${vs.lightArea} cells`);
  
  // Toggle a tree (cut it down)
  const treeToggled = vs.toggleTree(130, 130);
  console.log(`Tree toggled: ${treeToggled}`);
  
  // Recalculate visibility with tree cut down
  vs.updateVisibility(128, 128);
  console.log(`New visible area: ${vs.lightArea} cells`);
});
```

### Standalone Demo Application

A demo application is included in the `www/` folder. To run it:

1. Start a local web server in the project directory:
```bash
npx http-server
```

2. Open your browser and navigate to `http://localhost:8080/www/`

3. Interact with the demo:
   - Click to calculate visibility from that point
   - Right-click on trees to toggle their state (cut/uncut)
   - Use the slider to adjust vision radius
   - Toggle debug view to see elevation walls

## API Documentation

### Constructor

```javascript
const vs = new VisionSimulation(worlddata, options);
```

#### Parameters

- `worlddata` - World boundaries object with the following properties:
  - `worldMinX` - Minimum X coordinate of the world (usually -8288)
  - `worldMinY` - Minimum Y coordinate of the world (usually -8288)
  - `worldMaxX` - Maximum X coordinate of the world (usually 8288)
  - `worldMaxY` - Maximum Y coordinate of the world (usually 8288)

- `options` - Optional settings object:
  - `radius` - Initial vision radius in grid tiles. Default: 1600 / 64 = 25 tiles

### Methods

#### `initialize(mapImageDataPath, onReadyCallback)`

Loads the map data image and initializes the vision simulation.

- `mapImageDataPath` - Path to the map data image containing elevation, tree, and blocker information
- `onReadyCallback(err)` - Callback executed when initialization is complete, with an error parameter if initialization fails

#### `updateVisibility(gX, gY, radius)`

Calculates visible cells from the specified position.

- `gX` - X coordinate in grid space
- `gY` - Y coordinate in grid space
- `radius` - Optional vision radius. If not provided, uses the instance's radius setting

#### `toggleTree(gX, gY)`

Toggles a tree between standing (blocks vision) and cut down (doesn't block vision).

- `gX` - X coordinate in grid space
- `gY` - Y coordinate in grid space
- Returns: Boolean indicating whether a tree was found and toggled at the specified position

#### `setRadius(r)`

Sets the default vision radius for future calculations.

- `r` - Radius in grid tiles

#### `isValidXY(gX, gY, bCheckGridnav, bCheckToolsNoWards, bCheckTreeState)`

Checks if a position is valid based on various criteria.

- `gX` - X coordinate in grid space
- `gY` - Y coordinate in grid space
- `bCheckGridnav` - Optional. Whether to check if position is blocked by gridnav
- `bCheckToolsNoWards` - Optional. Whether to check if ward placement is restricted
- `bCheckTreeState` - Optional. Whether to check if position is blocked by trees
- Returns: Boolean indicating whether the position is valid based on all specified criteria

#### Coordinate Conversion Methods

The library provides several methods for converting between different coordinate systems:

- `WorldXYtoGridXY(wX, wY, bNoRound)` - Converts world coordinates to grid coordinates
- `GridXYtoWorldXY(gX, gY)` - Converts grid coordinates to world coordinates
- `GridXYtoImageXY(gX, gY)` - Converts grid coordinates to image coordinates
- `ImageXYtoGridXY(x, y)` - Converts image coordinates to grid coordinates
- `WorldXYtoImageXY(wX, wY)` - Converts world coordinates to image coordinates

#### Utility Functions

The library also provides utility functions for working with different point formats:

- `key2pt(key)` - Converts a coordinate key string "x,y" to a point object {x, y, key}
- `xy2key(x, y)` - Converts x,y coordinates to a key string "x,y"
- `xy2pt(x, y)` - Creates a point object {x, y, key} from x,y coordinates
- `pt2key(pt)` - Extracts a key string "x,y" from a point object

### Properties

After calling `updateVisibility()`, the following properties are available:

- `lights` - Object mapping visible grid cell keys to their visibility level
- `lightArea` - Number of visible grid cells
- `elevation` - Current elevation of the observer position
- `area` - Total area processed by the FOV algorithm

## Map Data Format

The map data image (`map_data.png`) contains encoded information about the Dota 2 map:

- First column (0): Elevation data - Brightness represents height
- Second column (width): Tree positions and elevations
- Third column (width*2): Gridnav blockers (areas units cannot walk)
- Fourth column (width*3): FOW blockers (areas that block vision)
- Fifth column (width*4): Ward placement restrictions

## Building from Source

If you want to modify the library and rebuild it:

1. Make your changes to the source files in the `src/` directory
2. Run the build process:
```bash
npm run build
```

## Performance Considerations

- The FOV calculation is relatively expensive, especially with large vision radii
- Tree toggling requires recalculating multiple data structures and can cause brief performance spikes
- The library includes debug logging that can be disabled in production environments

## Credits

- Original implementation by [devilesk](https://github.com/devilesk)
- Map data from [dota-map-coordinates](https://github.com/leamare/dota-map-coordinates)
- FOV algorithm based on [ROT.js](https://github.com/ondras/rot.js)