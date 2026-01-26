#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 3) {
    console.error('Usage: node insert-doc.js <path> <title> <icon-name>');
    process.exit(1);
}

const [docPath, title, iconName] = args;

// Validate icon name
const allIconsPath = path.join(__dirname, 'all-icons.json');
const allIcons = JSON.parse(fs.readFileSync(allIconsPath, 'utf-8'));

if (!allIcons.includes(iconName)) {
    console.error(`Error: Icon "${iconName}" not found in all-icons.json`);
    console.error(`Available icons: ${allIcons.slice(0, 10).join(', ')}... (and ${allIcons.length - 10} more)`);
    process.exit(1);
}

// Generate random UUID for the directory
const randomId = randomUUID();

// Create the full directory path
const fullPath = path.join(docPath, randomId);

// Create the directory
fs.mkdirSync(fullPath, { recursive: true });

// Create content.mdx with initial content (title as heading)
const contentMdx = `# ${title}

`;
const contentMdxPath = path.join(fullPath, 'content.mdx');
fs.writeFileSync(contentMdxPath, contentMdx, 'utf-8');

// Create config.json
const configJson = {
    title: title,
    icon: iconName
};
const configJsonPath = path.join(fullPath, 'config.json');
fs.writeFileSync(configJsonPath, JSON.stringify(configJson, null, 2) + '\n', 'utf-8');

console.log(`Created new document at: ${fullPath}`);
console.log(`Title: ${title}`);
console.log(`Icon: ${iconName}`);
console.log(`ID: ${randomId}`);
console.log('\nThe generate-doclific-mdx skill can now be used to add content to content.mdx');
