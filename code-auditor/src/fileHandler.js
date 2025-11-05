// fileHandler.js - IMPROVED VERSION
import fs from "fs";
import path from "path";

/**
 * Get the correct project path
 */
function getProjectPath() {
  // Try environment variable first
  if (process.env.PROJECT_PATH) {
    const envPath = path.resolve(process.env.PROJECT_PATH);
    if (fs.existsSync(envPath)) {
      console.log(`✅ Using PROJECT_PATH from .env: ${envPath}`);
      return envPath;
    }
    console.warn(`⚠️ PROJECT_PATH in .env doesn't exist: ${envPath}`);
  }

  // Try common locations
  const possiblePaths = [
    '/home/runner/NNH-AI-Studio',
    '/home/runner/workspace/NNH-AI-Studio',
    path.resolve(process.cwd(), '../NNH-AI-Studio'),
    path.resolve(process.cwd(), '../../NNH-AI-Studio'),
  ];

  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      console.log(`✅ Found project at: ${tryPath}`);
      return tryPath;
    }
  }

  throw new Error(
    'NNH-AI-Studio project not found!\n' +
    'Please set PROJECT_PATH in .env to the correct path.\n' +
    'Tried:\n' + possiblePaths.map(p => `  - ${p}`).join('\n')
  );
}

/**
 * Recursively collect code files from a directory (TS, TSX, JS, JSX)
 */
export function collectFiles(componentPath) {
  const projectPath = getProjectPath();

  // Build full target path
  let targetDir;

  if (path.isAbsolute(componentPath)) {
    targetDir = componentPath;
  } else {
    // Relative path - append to project path
    targetDir = path.join(projectPath, componentPath);
  }

  console.log(`📁 Reading from: ${targetDir}`);

  // Check if directory exists
  if (!fs.existsSync(targetDir)) {
    throw new Error(
      `Directory not found: ${targetDir}\n` +
      `Project path: ${projectPath}\n` +
      `Component: ${componentPath}`
    );
  }

  const result = [];
  const stats = fs.statSync(targetDir);

  // If it's a file, just return that file
  if (stats.isFile()) {
    if (/\.(ts|tsx|js|jsx)$/.test(targetDir)) {
      const content = fs.readFileSync(targetDir, "utf8");
      result.push({
        path: path.relative(projectPath, targetDir),
        content,
        lines: content.split("\n").length,
        size: Buffer.byteLength(content, "utf8"),
      });
    }
    return result;
  }

  // If it's a directory, traverse it
  function traverse(dir) {
    let entries;

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      console.warn(`⚠️ Cannot read directory: ${dir}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .next, .git, etc.
      if (entry.name === 'node_modules' || 
          entry.name === '.next' || 
          entry.name === '.git' ||
          entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          result.push({
            path: path.relative(projectPath, fullPath),
            content,
            lines: content.split("\n").length,
            size: Buffer.byteLength(content, "utf8"),
          });
        } catch (error) {
          console.warn(`⚠️ Cannot read file: ${fullPath}`);
        }
      }
    }
  }

  traverse(targetDir);

  if (result.length === 0) {
    throw new Error(
      `No TypeScript/JavaScript files found in: ${targetDir}\n` +
      'Make sure the directory contains .ts, .tsx, .js, or .jsx files.'
    );
  }

  return result;
}

/**
 * List available components in the project
 */
export function listAvailableComponents() {
  try {
    const projectPath = getProjectPath();
    const appDir = path.join(projectPath, 'app');

    if (!fs.existsSync(appDir)) {
      return [];
    }

    const entries = fs.readdirSync(appDir, { withFileTypes: true });
    const components = entries
      .filter(e => e.isDirectory())
      .filter(e => !e.name.startsWith('.') && !e.name.startsWith('_'))
      .map(e => e.name);

    return components;
  } catch (error) {
    console.error('Error listing components:', error);
    return [];
  }
}