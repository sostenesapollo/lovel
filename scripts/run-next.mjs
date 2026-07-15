import { config } from "dotenv";
import { spawn } from "node:child_process";

config();

const args = process.argv.slice(2);
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", ...args],
  { stdio: "inherit", env: process.env },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
