const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/db.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the createOrder fallback return
const oldReturn = `  return { id: insertId, ...data }; // Return the created order or a fallback`;
const newReturn = `  // Fallback: throw error if order not found
  throw new Error(\`Failed to retrieve created order with ID \${insertId}\`);`;

content = content.replace(oldReturn, newReturn);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed createOrder function');
