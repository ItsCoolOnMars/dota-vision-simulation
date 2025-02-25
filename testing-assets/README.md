# Testing Assets

This directory contains example data files used for testing and demonstration purposes in the Dota Vision Simulation package.

## Files

- `worlddata.json` - Contains the world dimension boundaries for the Dota 2 map, defining the coordinate system
- `map_data.png` - A PNG image containing map data used by the vision simulation

## Usage

These files are referenced by the test suite and example code. They can be replaced with custom versions if you're working with different map data or coordinate systems.

## Source

These files are derived from [dota-map-coordinates](https://github.com/leamare/dota-map-coordinates).

## Custom Implementation

If you're implementing this package with your own map data, you should:

1. Create your own worlddata.json file with appropriate coordinate boundaries
2. Generate your own map_data.png representing your map's terrain
3. Update references in your code to point to your custom files

See the main README.md for more information on how these files are used in the simulation. 