"use strict";
let filesToBeCopy = ['./README.md', './changelog.md', './LICENSE', './image.png','./package.json'];
let foldersToBeCopied = ['./dist'];
let locationWhereToBeCopied = ['../npm-published/'];

var fs = require("fs");
var path = require("path");

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
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};

// Function to copy files
var copyFileSync = function (src, dest) {
    var destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
};

// Copy the files and folders
for (let location of locationWhereToBeCopied) {
    for (let file of filesToBeCopy) {
        let src = path.join(__dirname, file);
        let dest = path.join(__dirname, location, path.basename(file));
        copyFileSync(src, dest);
        console.log(`Copied ${src} to ${dest}`);
    }

    for (let folder of foldersToBeCopied) {
        let src = path.join(__dirname, folder);
        let dest = path.join(__dirname, location, path.basename(folder));
        copyRecursiveSync(src, dest);
        console.log(`Copied ${src} to ${dest}`);
    }
}
