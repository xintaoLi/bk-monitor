#!/usr/bin/env node
import { program } from "commander";

program
  .command("init")
  .description("Initialize MCP E2E testing environment")
  .action(async () => {
    const { default: init } = await import("./commands/init.js");
    await init();
  });

program
  .command("analyze")
  .description("Analyze component dependencies using AST")
  .action(async () => {
    const { default: analyze } = await import("./commands/analyze.js");
    await analyze();
  });

program
  .command("generate")
  .description("Generate MCP test flows based on changes")
  .action(async () => {
    const { default: generate } = await import("./commands/generate.js");
    await generate();
  });

program
  .command("run")
  .description("Execute automated tests")
  .action(async () => {
    const { default: run } = await import("./commands/run.js");
    await run();
  });

program
  .command("promote")
  .description("Promote generated tests to permanent test assets")
  .action(async () => {
    const { default: promote } = await import("./commands/promote.js");
    await promote();
  });

program.parse();