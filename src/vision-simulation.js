/**
 * Vision Simulation Module for Dota 2
 * 
 * Provides a simulation of the vision and line of sight mechanics in Dota 2,
 * including elevation-based vision, trees, and other vision-blocking entities.
 * 
 * @module vision-simulation
 */
var ImageHandler = require("./imageHandler.js");
var ROT = require("./rot6.js");

/**
 * Cache for key to point conversions to improve performance
 * @type {Object}
 * @private
 */
var key2pt_cache = {};

/**
 * Converts a coordinate key string to a point object
 * Uses cached results when available for performance
 * 
 * @param {string} key - Coordinate key in format "x,y"
 * @returns {Object} Point object with x, y, and key properties
 */
function key2pt(key) {
    if (key in key2pt_cache) return key2pt_cache[key];
    var p = key.split(',').map(function (c) { return parseInt(c) });
    var pt = {x: p[0], y: p[1], key: key};
    key2pt_cache[key] = pt;
    return pt;
}

/**
 * Converts x,y coordinates to a key string
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {string} Coordinate key in format "x,y"
 */
function xy2key(x, y) {
    return x + "," + y;
}

/**
 * Creates a point object from x,y coordinates
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object} Point object with x, y, and key properties
 */
function xy2pt(x, y) {
    return {x: x, y: y, key: x + "," + y};
}

/**
 * Extracts a key string from a point object
 * 
 * @param {Object} pt - Point object with x and y properties
 * @returns {string} Coordinate key in format "x,y"
 */
function pt2key(pt) {
    return pt.x + "," + pt.y;
}

/**
 * Generates a set of walls based on elevation data
 * Identifies cells with elevation differences that form visual barriers
 * 
 * @param {Object} data - Elevation grid data mapping keys to points with z-values
 * @param {number} elevation - Reference elevation value to compare against
 * @returns {Object} Map of coordinate keys to points representing elevation walls
 */
function generateElevationWalls(data, elevation) {
    var t1 = Date.now();
    var walls = {};
    for (var key in data) {
        var pt = data[key];
        if (pt.z > elevation) {
            adjLoop:
            for (var i = -1; i <= 1; i++) {
                for (var j = -1; j <= 1; j++) {
                    if (0 !== i || 0 !== j) {
                        var k = (pt.x + i) + "," + (pt.y + j);
                        if (data[k] && data[k].z <= elevation) {
                            walls[pt.key] = pt;
                            break adjLoop;
                        }
                    }
                }
            }
        }
    }
    console.log('generateElevationWalls', Date.now() - t1 + 'ms');
    return walls;
}

/**
 * Sets elevation walls from a pre-computed dataset
 * 
 * @param {Object} obj - Target object to receive the elevation walls
 * @param {Array} data - Array of elevation data
 * @param {number} elevation - Elevation index to use from the data array
 */
function setElevationWalls(obj, data, elevation) {
    for (var i = 0; i < data[elevation].length; i++) {
        var el = data[elevation][i];
        obj[el[1] + "," + el[2]] = el;
    }
}

/**
 * Sets wall data in the target object
 * 
 * @param {Object} obj - Target object to receive the wall data
 * @param {Object} data - Source data containing wall positions
 * @param {string} [id='wall'] - Identifier for the wall type
 * @param {number} [r=Math.SQRT2/2] - Radius of the wall object
 */
function setWalls(obj, data, id, r) {
    id = id || 'wall';
    r = r || (Math.SQRT2 / 2);
    for (var i in data) {
        obj[i] = [id, data[i].x, data[i].y, r];
    }
}

/**
 * Sets tree walls based on tree data, considering elevation and tree state
 * 
 * @param {Object} obj - Target object to receive the tree walls
 * @param {number} elevation - Current elevation for visibility calculation
 * @param {Object} tree - Map of tree positions
 * @param {Object} tree_elevations - Map of tree elevations
 * @param {Object} tree_state - Map of tree states (standing or cut)
 * @param {Object} tree_blocks - Map of tree blocking areas
 */
function setTreeWalls(obj, elevation, tree, tree_elevations, tree_state, tree_blocks) {
    for (var i in tree) {
        if (elevation < tree_elevations[i]) {
            if (tree_state[i]) {
                //obj[i] = ['tree', tree[i].x, tree[i].y, Math.SQRT2];
                tree_blocks[i].forEach(function (pt) {
                    var k = pt.x + "," + pt.y;
                    obj[k] = (obj[k] || []).concat([['tree', tree[i].x, tree[i].y, Math.SQRT2]]);
                });
            }
        }
    }
}

/**
 * Parses an image using the ImageHandler to extract map data
 * 
 * @param {ImageHandler} imageHandler - Handler for the image data
 * @param {number} offset - X offset in the image to start scanning from
 * @param {number} width - Width of the area to scan
 * @param {number} height - Height of the area to scan
 * @param {Function} pixelHandler - Function to process each pixel's data
 * @returns {Object} Grid object with the processed data
 */
function parseImage(imageHandler, offset, width, height, pixelHandler) {
    var grid = {};
    imageHandler.scan(offset, width, height, pixelHandler, grid);
    return grid;
}

/**
 * VisionSimulation class for Dota 2
 * Simulates the field of view and visibility mechanics from the game
 * 
 * @constructor
 * @param {Object} worlddata - World boundaries for the map
 * @param {number} worlddata.worldMinX - Minimum X coordinate of the world
 * @param {number} worlddata.worldMinY - Minimum Y coordinate of the world
 * @param {number} worlddata.worldMaxX - Maximum X coordinate of the world
 * @param {number} worlddata.worldMaxY - Maximum Y coordinate of the world
 * @param {Object} [opts] - Optional configuration settings
 * @param {number} [opts.radius] - Vision radius in grid tiles (default: 1600/64)
 */
function VisionSimulation(worlddata, opts) {
    var self = this;
    
    this.opts = opts || {};
    this.radius = this.opts.radius || parseInt(1600 / 64);
    this.worldMinX = worlddata.worldMinX;
    this.worldMinY = worlddata.worldMinY;
    this.worldMaxX = worlddata.worldMaxX;
    this.worldMaxY = worlddata.worldMaxY;
    this.worldWidth = this.worldMaxX - this.worldMinX;
    this.worldHeight = this.worldMaxY - this.worldMinY;
    this.gridWidth = this.worldWidth / 64 + 1;
    this.gridHeight = this.worldHeight / 64 + 1;
    this.ready = false;

    /**
     * Callback function that determines if light passes through a cell
     * Used by the ROT.js FOV calculation
     * 
     * @param {number} x - X coordinate to check
     * @param {number} y - Y coordinate to check
     * @returns {boolean} True if light can pass through this cell
     * @private
     */
    this.lightPassesCallback = function (x, y) {
        var key = x + ',' + y;
        return !(key in self.elevationWalls[self.elevation]) && !(key in self.ent_fow_blocker_node) && !(key in self.treeWalls[self.elevation] && self.treeWalls[self.elevation][key].length > 0) ;
    }
    
    /**
     * Field of view calculator using precise shadowcasting
     * @type {ROT.FOV.PreciseShadowcasting}
     * @private
     */
    this.fov = new ROT.FOV.PreciseShadowcasting(this.lightPassesCallback, {topology:8});
}

/**
 * Initializes the vision simulation with map data
 * Loads and processes the map image to extract terrain information
 * 
 * @param {string} mapDataImagePath - Path to the map data image
 * @param {Function} onReady - Callback executed when initialization is complete
 * @param {Error} onReady.err - Error object if initialization fails, null on success
 */
VisionSimulation.prototype.initialize = function (mapDataImagePath, onReady) {
    var self = this;
    this.ready = false;
    this.grid = [];
    this.gridnav = null;
    this.ent_fow_blocker_node = null;
    this.tools_no_wards = null;
    this.elevationValues = [];
    this.elevationGrid = null;
    this.elevationWalls = {};
    this.treeWalls = {};
    this.tree = {}; // center key to point map
    this.tree_blocks = {}; // center to corners map
    this.tree_relations = {}; // corner to center map
    this.tree_elevations = {};
    this.tree_state = {};
    this.walls = {};
    this.lights = {};
    this.area = 0;
    if (this.imageHandler) this.imageHandler.disable();
    this.imageHandler = new ImageHandler(mapDataImagePath);
    var t1 = Date.now();
    this.imageHandler.load(function (err) {
        if (!err) {
            var t2 = Date.now();
            console.log('image load', t2 - t1 + 'ms');
            self.gridnav = parseImage(self.imageHandler, self.gridWidth * 2, self.gridWidth, self.gridHeight, self.blackPixelHandler.bind(self));
            self.ent_fow_blocker_node = parseImage(self.imageHandler, self.gridWidth * 3, self.gridWidth, self.gridHeight, self.blackPixelHandler.bind(self));
            self.tools_no_wards = parseImage(self.imageHandler, self.gridWidth * 4, self.gridWidth, self.gridHeight, self.blackPixelHandler.bind(self));
            parseImage(self.imageHandler, self.gridWidth, self.gridWidth, self.gridHeight, self.treeElevationPixelHandler.bind(self));
            self.elevationGrid = parseImage(self.imageHandler, 0, self.gridWidth, self.gridHeight, self.elevationPixelHandler.bind(self));
            var t3 = Date.now();
            console.log('image process', t3 - t2 + 'ms');
            self.elevationValues.forEach(function (elevation) {
                //self.elevationWalls[elevation] = generateElevationWalls(self.elevationGrid, elevation);
                self.treeWalls[elevation] = {};
                setTreeWalls(self.treeWalls[elevation], elevation, self.tree, self.tree_elevations, self.tree_state, self.tree_blocks)
            });
            var t4 = Date.now();
            console.log('walls generation', t4 - t3 + 'ms');
            for (var i = 0; i < self.gridWidth; i++) {
                self.grid[i] = [];
                for (var j = 0; j < self.gridHeight; j++) {
                    var pt = xy2pt(i, j);
                    key2pt_cache[pt.key] = pt;
                    self.grid[i].push(pt);
                }
            }
            var t5 = Date.now();
            console.log('cache prime', t5 - t4 + 'ms');
            self.ready = true;
        }
        onReady(err);
    });
}

/**
 * Handler for black pixels in the map data image
 * Used to identify navigation blockers, FOW blockers, and no-ward areas
 * 
 * @param {number} x - X coordinate in the image
 * @param {number} y - Y coordinate in the image
 * @param {Array<number>} p - RGB values of the pixel
 * @param {Object} grid - Target grid to store the result
 */
VisionSimulation.prototype.blackPixelHandler = function (x, y, p, grid) {
    var pt = this.ImageXYtoGridXY(x, y);
    if (p[0] === 0) {
        grid[pt.x + "," + pt.y] = pt;
    }
}

/**
 * Handler for elevation pixels in the map data image
 * Extracts elevation data from pixel brightness values
 * 
 * @param {number} x - X coordinate in the image
 * @param {number} y - Y coordinate in the image
 * @param {Array<number>} p - RGB values of the pixel
 * @param {Object} grid - Target grid to store the result
 */
VisionSimulation.prototype.elevationPixelHandler = function (x, y, p, grid) {
    var pt = this.ImageXYtoGridXY(x, y);
    pt.z = p[0];
    grid[pt.x + "," + pt.y] = pt;
    if (this.elevationValues.indexOf(p[0]) == -1) {
        this.elevationValues.push(p[0]);
    }
}

/**
 * Handler for tree elevation pixels in the map data image
 * Extracts tree positions and their elevation data
 * 
 * @param {number} x - X coordinate in the image
 * @param {number} y - Y coordinate in the image
 * @param {Array<number>} p - RGB values of the pixel
 * @param {Object} grid - Target grid to store the result
 */
VisionSimulation.prototype.treeElevationPixelHandler = function (x, y, p, grid) {
    var self = this;
    var pt = this.ImageXYtoGridXY(x, y);
    if (p[1] == 0 && p[2] == 0) {
        // trees are 2x2 in grid
        // tree origins rounded up when converted to grid, so they represent top right corner. subtract 0.5 to get grid origin
        var treeOrigin = xy2pt(pt.x - 0.5, pt.y - 0.5);
        var treeElevation = p[0] + 40;
        var kC = treeOrigin.key;
        this.tree[kC] = treeOrigin;
        this.tree_elevations[kC] = treeElevation;
        this.tree_blocks[kC] = [];
        this.tree_state[kC] = true;
        // iterate through tree 2x2 by taking floor and ceil of tree grid origin
        [Math.floor, Math.ceil].forEach(function (i) {
            [Math.floor, Math.ceil].forEach(function (j) {
                var treeCorner = xy2pt(i(treeOrigin.x), j(treeOrigin.y));
                self.tree_relations[treeCorner.key] = (self.tree_relations[treeCorner.key] || []).concat(treeOrigin);
                self.tree_blocks[kC].push(treeCorner);
            });
        });
    }
}

/**
 * Updates the visibility from a specific grid position
 * Calculates which cells are visible from the given coordinates
 * 
 * @param {number} gX - X coordinate in the grid
 * @param {number} gY - Y coordinate in the grid
 * @param {number} [radius] - Vision radius, defaults to the instance's radius setting
 */
VisionSimulation.prototype.updateVisibility = function (gX, gY, radius) {
    var self = this,
        key = xy2key(gX, gY);

    radius = radius || self.radius;
    this.elevation = this.elevationGrid[key].z;
    this.walls = this.treeWalls[this.elevation];
    if (!this.elevationWalls[this.elevation]) this.elevationWalls[this.elevation] = generateElevationWalls(this.elevationGrid, this.elevation);
    //setElevationWalls(this.walls, this.elevationWalls, this.elevation)
    //setWalls(this.walls, this.ent_fow_blocker_node);
    //setWalls(this.walls, this.tools_no_wards);
    //setTreeWalls(this.walls, this.elevation, this.tree, this.tree_elevations, this.tree_state, this.tree_blocks);

    this.fov.walls = this.walls;
    this.lights = {};
    this.area = this.fov.compute(gX, gY, radius, function(x2, y2, r, vis) {
        var key = xy2key(x2, y2);
        if (!self.elevationGrid[key]) return;
        var treePts = self.tree_relations[key];
        var treeBlocking = false;
        if (treePts) {
            for (var i = 0; i < treePts.length; i++) {
                var treePt = treePts[i];
                treeBlocking = self.tree_state[treePt.key] && self.tree_elevations[treePt.key] > self.elevation;
                if (treeBlocking) break;
            }
        }
        if (vis == 1 && !self.ent_fow_blocker_node[key] && !treeBlocking) {
            self.lights[key] = 255;
        }
    });
    this.lightArea = Object.keys(this.lights).length;
}

/**
 * Checks if a grid position is valid based on various criteria
 * Can check for gridnav blockers, ward placement restrictions, and tree blockers
 * 
 * @param {number} x - X coordinate in the grid
 * @param {number} y - Y coordinate in the grid
 * @param {boolean} [bCheckGridnav=false] - Whether to check if position is blocked by gridnav
 * @param {boolean} [bCheckToolsNoWards=false] - Whether to check if ward placement is restricted
 * @param {boolean} [bCheckTreeState=false] - Whether to check if position is blocked by trees
 * @returns {boolean} True if the position is valid based on all specified criteria
 */
VisionSimulation.prototype.isValidXY = function (x, y, bCheckGridnav, bCheckToolsNoWards, bCheckTreeState) {
    if (!this.ready) return false;
    
    var key = xy2key(x, y),
        treeBlocking = false;
        
    if (bCheckTreeState) {
        var treePts = this.tree_relations[key];
        if (treePts) {
            for (var i = 0; i < treePts.length; i++) {
                var treePt = treePts[i];
                treeBlocking = this.tree_state[treePt.key];
                if (treeBlocking) break;
            }
        }
    }
    
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight && (!bCheckGridnav || !this.gridnav[key]) && (!bCheckToolsNoWards || !this.tools_no_wards[key]) && (!bCheckTreeState || !treeBlocking);
}

/**
 * Toggles the state of a tree at the specified grid coordinates
 * Trees can be standing (blocking vision) or cut down (not blocking)
 * 
 * @param {number} x - X coordinate in the grid
 * @param {number} y - Y coordinate in the grid
 * @returns {boolean} True if there was a tree at the position that was toggled
 */
VisionSimulation.prototype.toggleTree = function (x, y) {
    var self = this;
    var key = xy2key(x, y);
    var isTree = !!this.tree_relations[key];
    if (isTree) {
        var treePts = this.tree_relations[key];
        for (var i = 0; i < treePts.length; i++) {
            var pt = treePts[i];
            this.tree_state[pt.key] = !this.tree_state[pt.key];
            
            this.elevationValues.forEach(function (elevation) {
                if (elevation < self.tree_elevations[pt.key]) {
                    self.tree_blocks[pt.key].forEach(function (ptB) {
                        for (var j = self.treeWalls[elevation][ptB.key].length - 1; j >= 0; j--) {
                            if (pt.x == self.treeWalls[elevation][ptB.key][j][1] && pt.y == self.treeWalls[elevation][ptB.key][j][2]) {
                                self.treeWalls[elevation][ptB.key].splice(j, 1);
                            }
                        }
                    });
                    if (self.tree_state[pt.key]) {
                        self.tree_blocks[pt.key].forEach(function (ptB) {
                            self.treeWalls[elevation][ptB.key] = (self.treeWalls[elevation][ptB.key] || []).concat([['tree', pt.x, pt.y, Math.SQRT2]]);
                        });
                    }
                }
            });
        }
    }

    return isTree;
}

/**
 * Sets the vision radius for the simulation
 * 
 * @param {number} r - New radius value in grid tiles
 */
VisionSimulation.prototype.setRadius = function (r) {
    this.radius = r;
}

/**
 * Converts world coordinates to grid coordinates
 * 
 * @param {number} wX - X coordinate in world space
 * @param {number} wY - Y coordinate in world space
 * @param {boolean} [bNoRound=false] - Whether to return exact coordinates or round to integers
 * @returns {Object} Point object with grid coordinates
 */
VisionSimulation.prototype.WorldXYtoGridXY = function (wX, wY, bNoRound) {
    var x = (wX - this.worldMinX) / 64,
        y = (wY - this.worldMinY) / 64;
    if (!bNoRound) {
        x = parseInt(Math.round(x))
        y = parseInt(Math.round(y))
    }
    return {x: x, y: y, key: x + ',' + y};
}

/**
 * Converts grid coordinates to world coordinates
 * 
 * @param {number} gX - X coordinate in the grid
 * @param {number} gY - Y coordinate in the grid
 * @returns {Object} Point object with world coordinates
 */
VisionSimulation.prototype.GridXYtoWorldXY = function (gX, gY) {
    return {x: gX * 64 + this.worldMinX, y: gY * 64 + this.worldMinY};
}

/**
 * Converts grid coordinates to image coordinates
 * Accounts for the y-axis flip between grid and image space
 * 
 * @param {number} gX - X coordinate in the grid
 * @param {number} gY - Y coordinate in the grid
 * @returns {Object} Point object with image coordinates
 */
VisionSimulation.prototype.GridXYtoImageXY = function (gX, gY) {
    return {x: gX, y: this.gridHeight - gY - 1};
}

/**
 * Converts image coordinates to grid coordinates
 * Accounts for the y-axis flip between image and grid space
 * 
 * @param {number} x - X coordinate in the image
 * @param {number} y - Y coordinate in the image
 * @returns {Object} Point object with grid coordinates and key
 */
VisionSimulation.prototype.ImageXYtoGridXY = function (x, y) {
    var gY = this.gridHeight - y - 1;
    return {x: x, y: gY, key: x + ',' + gY};
}

/**
 * Converts world coordinates to image coordinates
 * Combines WorldXYtoGridXY and GridXYtoImageXY conversions
 * 
 * @param {number} wX - X coordinate in world space
 * @param {number} wY - Y coordinate in world space
 * @returns {Object} Point object with image coordinates
 */
VisionSimulation.prototype.WorldXYtoImageXY = function (wX, wY) {
    var pt = this.WorldXYtoGridXY(wX, wY);
    return this.GridXYtoImageXY(pt.x, pt.y);
}

/**
 * Expose the utility functions as methods on the VisionSimulation prototype
 */
VisionSimulation.prototype.key2pt = key2pt;
VisionSimulation.prototype.xy2key = xy2key;
VisionSimulation.prototype.xy2pt = xy2pt;
VisionSimulation.prototype.pt2key = pt2key;

module.exports = VisionSimulation;