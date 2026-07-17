#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import {
  classifyDomains, defaultCodexHome, sanitizePrompt, scanHistory,
} from "../packages/cli/src/scanner/history.mjs";

export { classifyDomains, sanitizePrompt, scanHistory };

function parseArgs(argv) {
  const options = { codexHome: defaultCodexHome(), output: resolve(".high-vive/private-evidence.json") };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--codex-home" && argv[index + 1]) options.codexHome = resolve(argv[++index]);
    else if (argv[index] === "--output" && argv[index + 1]) options.output = resolve(argv[++index]);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const evidence = await scanHistory({
    codexHome: options.codexHome,
    progress: (done, total) => process.stdout.write(`Scanned ${done}/${total} Codex sessions\n`),
  });
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`Evidence bundle: ${options.output}\nHistory root: ${evidence.commitment.historyRoot}\n`);
}

if (pathToFileURL(process.argv[1] || "").href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
