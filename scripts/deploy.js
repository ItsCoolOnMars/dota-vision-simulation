var config = require('../config.json');
var path = require('path');
var execSync = require('child_process').execSync;
var del = require('del');

// clean and move to deploy directory
var normalizedPath = path.normalize(config.path);
var paths = [
    normalizedPath + '/**/*'
]
console.log(paths);
// Updated for del v8.x API
(async () => {
    await del(paths, {force: true});
    execSync('cp -r dist/* ' + normalizedPath);
})();