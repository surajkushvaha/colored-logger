"use strict";
exports.__esModule = true;
var fs = require("fs");
var path = require("path");
var source = path.join(__dirname, 'dist');
var destination = path.join(__dirname, '../npm-published/dist');
// Function to copy files and directories recursively
var copyRecursiveSync = function (src, dest) {
    if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.mkdirSync(dest, { recursive: true });
    var entries = fs.readdirSync(src, { withFileTypes: true });
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        var srcPath = path.join(src, entry.name);
        var destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyRecursiveSync(srcPath, destPath);
        }
        else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};
// Copy the dist folder
copyRecursiveSync(source, destination);
console.log("Copied ".concat(source, " to ").concat(destination));
