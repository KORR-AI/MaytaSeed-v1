/**
 * This is a patch script for the Raydium SDK to fix the bn.js compatibility issue.
 *
 * To apply this patch:
 * 1. Install patch-package: npm install --save-dev patch-package
 * 2. Add this script to your project
 * 3. Run: node patches/raydium-sdk-bn-patch.js
 * 4. Add "postinstall": "patch-package" to your package.json scripts
 */

const fs = require("fs")
const path = require("path")

// Path to the Raydium SDK node_modules directory
const sdkPath = path.resolve(__dirname, "../node_modules/@raydium-io/raydium-sdk")

// Function to recursively find files
function findFiles(dir, pattern) {
  let results = []
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      results = results.concat(findFiles(filePath, pattern))
    } else if (pattern.test(file)) {
      results.push(filePath)
    }
  }

  return results
}

// Find all JavaScript files in the SDK
const jsFiles = findFiles(sdkPath, /\.(js|ts)$/)

// Patch the files
let patchCount = 0

for (const file of jsFiles) {
  let content = fs.readFileSync(file, "utf8")

  // Replace direct isBN imports from bn.js
  if (content.includes('import { BN, isBN } from "bn.js"')) {
    content = content.replace(
      'import { BN, isBN } from "bn.js"',
      'import { BN } from "bn.js"\n' +
        'function isBN(object) { return object !== null && typeof object === "object" && object instanceof BN; }',
    )
    patchCount++
  }

  // Replace other variations of isBN imports
  if (content.includes('import { isBN } from "bn.js"')) {
    content = content.replace(
      'import { isBN } from "bn.js"',
      'import { BN } from "bn.js"\n' +
        'function isBN(object) { return object !== null && typeof object === "object" && object instanceof BN; }',
    )
    patchCount++
  }

  // Write the patched content back to the file
  fs.writeFileSync(file, content, "utf8")
}

console.log(`Patched ${patchCount} files to fix bn.js compatibility issues.`)
