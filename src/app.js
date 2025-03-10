/**
 * Creates a Dota 2 vision simulation application with interactive visualization.
 * This is the main entry point for the demo application that visualizes the line of sight
 * and vision mechanics from Dota 2 using HTML canvas elements.
 * 
 * @param {string} mapImageDataPath - Path to the map image data used for vision calculations
 * @returns {void}
 */
function App(mapImageDataPath) {
    var worlddata = require("./worlddata.json");
    var VisionSimulation = require("./vision-simulation");

    var background = document.getElementById("canvas-background"),
        backgroundCtx = background.getContext("2d"),
        treeCanvas = document.getElementById("canvas-trees"),
        treeCtx = treeCanvas.getContext("2d"),
        canvas = document.getElementById("canvas-vision"),
        ctx = canvas.getContext("2d"),
        canvasContainer = document.getElementById("canvas-container"),
        CELL = [parseInt(Math.floor(parseInt(document.querySelector("#zoom").value))), parseInt(Math.floor(parseInt(document.querySelector("#zoom").value)))],
        COLOR_LIGHT_CENTER = [255,165,0],
        COLOR_LIGHT = [255, 255, 0],
        COLOR_TREE = [0,255,0],
        COLOR_STUMP = [102, 51, 0],
        COLOR_LIT_STUMP = [200, 200, 0],
        COLOR_INVALID = [255, 0, 0],
        COLOR_GRIDNAV = [0, 0, 0],
        COLOR_NO_WARDS = [200, 0,200],
        COLOR_FOW_BLOCKER = [0,200,200],
        COLOR_WALL = [255,255,255],
        debug = false;
        
            
    var vs = new VisionSimulation(worlddata);
    vs.initialize(mapImageDataPath, function () {console.log('ready 1');});
    vs.initialize(mapImageDataPath, onReady);
    
    /**
     * Resizes all canvas elements based on the current zoom level and grid dimensions.
     * Adjusts canvas size and container dimensions to match the current CELL size and grid dimensions.
     * 
     * @returns {void}
     */
    function resize() {
        canvas.width = CELL[0]*vs.gridWidth;
        canvas.height = CELL[1]*vs.gridHeight;
        background.width = CELL[0]*vs.gridWidth;
        background.height = CELL[1]*vs.gridHeight;
        treeCanvas.width = CELL[0]*vs.gridWidth;
        treeCanvas.height = CELL[1]*vs.gridHeight;
        canvasContainer.style.width = CELL[0]*vs.gridWidth + 'px';
        canvasContainer.style.height = CELL[1]*vs.gridHeight + 'px';
    }

    /**
     * Draws the background map with special terrain features highlighted.
     * Renders the base map image and overlays different colored squares for gridnav blockers,
     * ward-restricted areas, and fog of war blockers.
     * 
     * @returns {void}
     */
    function drawBackground() {
        backgroundCtx.drawImage(vs.imageHandler.canvas, 0, 0, vs.gridWidth, vs.gridHeight, 0, 0, CELL[0]*vs.gridWidth, CELL[1]*vs.gridHeight);
        
        for (p in vs.gridnav) {
            var pt = vs.gridnav[p];
            pt = vs.GridXYtoImageXY(pt.x, pt.y);
            backgroundCtx.fillStyle = "rgb("+COLOR_GRIDNAV.join(",")+")";
            backgroundCtx.fillRect(pt.x*CELL[0], pt.y*CELL[1], CELL[0], CELL[1]);
        }
        
        for (var k in vs.tools_no_wards) {
            var pt = vs.key2pt(k);
            pt = vs.GridXYtoImageXY(pt.x, pt.y);
            backgroundCtx.fillStyle = "rgb("+COLOR_NO_WARDS.join(",")+")";
            backgroundCtx.fillRect(pt.x*CELL[0], pt.y*CELL[1], CELL[0], CELL[1]);
        }
        
        for (var k in vs.ent_fow_blocker_node) {
            var pt = vs.key2pt(k);
            pt = vs.GridXYtoImageXY(pt.x, pt.y);
            backgroundCtx.fillStyle = "rgb("+COLOR_FOW_BLOCKER.join(",")+")";
            backgroundCtx.fillRect(pt.x*CELL[0], pt.y*CELL[1], CELL[0], CELL[1]);
        }
    }

    /**
     * Renders all trees and stumps on the dedicated tree canvas layer.
     * Uses different colors to represent standing trees (green) and cut trees/stumps (brown).
     * 
     * @returns {void}
     */
    function drawTrees() {
        for (var k in vs.tree_relations) {
            var pt = vs.key2pt(k);
            pt = vs.GridXYtoImageXY(pt.x, pt.y);
            var treePts = vs.tree_relations[k];
            var c = COLOR_STUMP;
            for (var i = 0; i < treePts.length; i++) {
                var treePt = treePts[i];
                c = vs.tree_state[treePt.key] ? COLOR_TREE : COLOR_STUMP;
                if (c === COLOR_TREE) break;
            }
            treeCtx.fillStyle = "rgb("+c.join(",")+")";
            treeCtx.fillRect(pt.x*CELL[0], pt.y*CELL[1], CELL[0], CELL[1]);
        }
    }

    /**
     * Redraws the vision layer showing visible areas based on the current position.
     * Renders the field of view from a specific grid coordinate, highlighting visible areas
     * and showing elevation walls in debug mode.
     * 
     * @param {number} gX - The x-coordinate in the grid to calculate vision from
     * @param {number} gY - The y-coordinate in the grid to calculate vision from
     * @returns {void}
     */
    function redraw(gX, gY) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var cpt = vs.GridXYtoImageXY(gX, gY);
        var key = vs.xy2key(gX, gY);
        if (!vs.gridnav[key] && !vs.tools_no_wards[key]) {
            for (var k in vs.lights) {
                var pt = vs.key2pt(k);
                pt = vs.GridXYtoImageXY(pt.x, pt.y);
                var c = vs.tree_relations[k] ? COLOR_LIT_STUMP : COLOR_LIGHT;
                ctx.fillStyle = "rgb("+c.join(",")+")";
                ctx.fillRect(pt.x*CELL[0], pt.y*CELL[1], CELL[0], CELL[1]);
            }
            ctx.fillStyle = "rgb("+COLOR_LIGHT_CENTER.join(",")+")";
            ctx.fillRect(cpt.x*CELL[0], cpt.y*CELL[1], CELL[0], CELL[1]);
        }
        else {
            ctx.fillStyle = "rgb("+COLOR_INVALID.join(",")+")";
            ctx.fillRect(cpt.x*CELL[0], cpt.y*CELL[1], CELL[0], CELL[1]);
        }
        
        if (debug && gX !== undefined && gY !== undefined) {
            var elevation = vs.elevationGrid[key].z;
            for (var i = 0; i < vs.elevationWalls[elevation].length; i++) {
                var pt = vs.xy2pt(vs.elevationWalls[elevation][i][1], vs.elevationWalls[elevation][i][2]);
                pt = vs.GridXYtoImageXY(pt.x, pt.y);
                ctx.fillStyle = "rgb("+COLOR_WALL.join(",")+")";
                ctx.fillRect(pt.x*CELL[0], pt.y*CELL[1], CELL[0], CELL[1]);
            }
        }
    }

    /**
     * Converts mouse event coordinates to grid coordinates.
     * Transforms client pixel coordinates to the grid coordinate system used by the vision simulation.
     * 
     * @param {MouseEvent} e - The mouse event containing client coordinates
     * @returns {Object} An object with x and y properties representing grid coordinates
     */
    function getCoords(e) {
        var x = e.clientX+document.body.scrollLeft - canvasContainer.offsetLeft - canvasContainer.clientLeft;
        var y = e.clientY+document.body.scrollTop - canvasContainer.offsetTop - canvasContainer.clientTop
        return vs.ImageXYtoGridXY(Math.floor(x/CELL[0]), Math.floor(y/CELL[1]));
    }

    /**
     * Callback function executed when the vision simulation is ready.
     * Sets up the initial display and binds event listeners for interactive visualization.
     * 
     * @param {Error|null} err - Error object if initialization failed, null on success
     * @returns {void}
     */
    function onReady(err) {
        if (err) {
            console.log(err);
            alert(err);
            return;
        }
        resize();
        drawBackground();
        drawTrees();

        document.getElementById("canvas-container").addEventListener("click", function(e) {
            var coords = getCoords(e);
            if (vs.toggleTree(coords.x, coords.y)) {
                var t1 = Date.now();
                vs.updateVisibility(coords.x, coords.y);
                var t2 = Date.now();
                document.querySelector("#fov").innerHTML = t2-t1;
                
                var t3 = Date.now();
                drawTrees();
                redraw(coords.x, coords.y);
                var t4 = Date.now();
                document.querySelector("#draw").innerHTML = t4 - t3;
            }
            e.preventDefault();
        });

        document.getElementById("canvas-container").addEventListener("mousemove", function(e) {
            var coords = getCoords(e);
            var worldXY = vs.GridXYtoWorldXY(coords.x, coords.y);
            document.querySelector("#x-coord").innerHTML = coords.x;
            document.querySelector("#y-coord").innerHTML = coords.y;
            document.querySelector("#worldX-coord").innerHTML = worldXY.x;
            document.querySelector("#worldY-coord").innerHTML = worldXY.y;
            
            var t1 = Date.now();
            vs.updateVisibility(coords.x, coords.y);
            document.querySelector("#visibility-area").innerHTML = (vs.lightArea / vs.area * 100).toFixed(2) + '%';
            var t2 = Date.now();
            document.querySelector("#fov").innerHTML = t2-t1;
            
            var t3 = Date.now();
            redraw(coords.x, coords.y);
            var t4 = Date.now();
            document.querySelector("#draw").innerHTML = t4 - t3;
        });

        document.getElementById("zoom").addEventListener("change", function (e){
            CELL = [parseInt(Math.floor(parseInt(document.querySelector("#zoom").value))), parseInt(Math.floor(parseInt(document.querySelector("#zoom").value)))];
            resize();
            var t3 = Date.now();
            drawBackground();
            drawTrees();
            redraw();
            var t4 = Date.now();
            document.querySelector("#draw").innerHTML = t4 - t3;
        }, false);

        document.getElementById("radius").addEventListener("change", function (e){
            vs.setRadius(parseInt(Math.floor(parseInt(document.getElementById("radius").value) / 64)));
        }, false);

        document.getElementById("debug").addEventListener("change", function (e){
            debug = document.getElementById('debug').checked;
        }, false);
    }
}

module.exports = App;