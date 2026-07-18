console.log("Importing index.ts...");
import "./server/index.js";
console.log("Imported index.ts");
setTimeout(() => {
  console.log("Active handles:", (process as any)._getActiveHandles());
}, 1000);
