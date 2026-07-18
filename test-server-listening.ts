import express from 'express';
const app = express();
const server = app.listen(8787, () => {
  console.log("Listening callback fired");
});
server.on('error', (err) => {
  console.error("Server error event fired:", err);
});
setTimeout(() => {
  console.log("Status after 1s:", server.listening);
}, 1000);
