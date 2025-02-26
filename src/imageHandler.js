/**
 * ImageHandler provides functionality for loading and processing image data.
 * It serves as a wrapper around the Jimp library to handle image loading and pixel data scanning.
 * 
 * @constructor
 * @param {string} imagePath - The file path to the image to be loaded and processed
 */
const { Jimp } = require("jimp");

function ImageHandler(imagePath) {
    this.imagePath = imagePath;
    this.image = null;
    this.enabled = true;
}

/**
 * Loads the image from the specified path using Jimp.
 * Once loaded, the image data is accessible via the image property.
 * 
 * @param {Function} callback - Callback function called when image loading completes or fails
 * @param {Error} [callback.err] - Error object if loading fails, undefined on success
 * @returns {void}
 */
ImageHandler.prototype.load = function (callback) {
    var self = this;
    // Using the correct API for Jimp v1.x
    Jimp.read(this.imagePath)
        .then(function (image) {
            self.image = image;
            if (self.enabled) callback();
        })
        .catch(function (err) {
            console.log('error', err);
            if (self.enabled) callback(err);
        });
}

/**
 * Disables the image handler to prevent further callbacks from being executed.
 * This is useful when the handler is no longer needed but async operations are still in progress.
 * 
 * @returns {void}
 */
ImageHandler.prototype.disable = function () {
    this.enabled = false;
}

/**
 * Scans a portion of the image and executes a callback for each pixel.
 * Provides RGB and alpha values for each pixel to the handler function.
 * 
 * @param {number} offset - X-coordinate offset to start scanning from
 * @param {number} width - Width of the area to scan in pixels
 * @param {number} height - Height of the area to scan in pixels
 * @param {Function} pixelHandler - Function called for each pixel in the scanned area
 * @param {number} pixelHandler.x - X-coordinate of the pixel (adjusted by offset)
 * @param {number} pixelHandler.y - Y-coordinate of the pixel
 * @param {Array<number>} pixelHandler.rgb - Array containing [r,g,b] values of the pixel
 * @param {Object} [grid] - Optional grid object that may be passed to the pixel handler
 * @returns {void}
 */
ImageHandler.prototype.scan = function (offset, width, height, pixelHandler, grid) {
    this.image.scan(offset, 0, width, height, function (x, y, idx) {
        var r = this.bitmap.data[idx + 0];
        var g = this.bitmap.data[idx + 1];
        var b = this.bitmap.data[idx + 2];
        var alpha = this.bitmap.data[idx + 3];
        pixelHandler(x - offset, y, [r, g, b], grid);
    });
}

module.exports = ImageHandler;