/**
 * Title: LearnLink Class Folder Generator
 * Author: Eric Nakayama
 * Class: CPSC 491
 *
 * Description:
 * This Node.js script creates a standardized folder structure for organizing
 * learning materials in the LearnLink project. It generates a base LearnLink
 * directory, a class-specific folder, and optional subfolders (such as weeks)
 * to support structured uploads of course content.
 */

const fs = require("fs");
const path = require("path");

// Base directory where everything goes
const BASE_DIR = path.join(__dirname, "LearnLink");

// Inputs (to be filled later by user input, form, or API)
const className = "";
const weeks = [];

// Create base LearnLink directory
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR);
}

// Create class directory (only if className is provided)
if (className) {
  const classDir = path.join(BASE_DIR, className);

  if (!fs.existsSync(classDir)) {
    fs.mkdirSync(classDir);
  }

  // Create week folders
  weeks.forEach(week => {
    const weekDir = path.join(classDir, week);
    if (!fs.existsSync(weekDir)) {
      fs.mkdirSync(weekDir);
    }
  });
}

console.log("Folder creation script ran successfully.");
