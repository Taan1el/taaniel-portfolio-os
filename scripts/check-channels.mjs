// Walks every channel the way a player would and writes a report for the scheduled job.
import { appendFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { LIVE_CHANNELS } from "../src/data/live-channels.ts";
import { checkAll, formatReport } from "./tv/stream-check.mjs";

const RETRY_AFTER_MS = 90_000;
const REPORT_FILE = "channel-report.md";

const first = await checkAll(LIVE_CHANNELS);
const unsure = first.filter((result) => result.status !== "ok");

// Live streams hiccup. Only what fails twice gets flagged.
if (unsure.length) await sleep(RETRY_AFTER_MS);
const second = unsure.length ? await checkAll(unsure.map((result) => result.channel)) : [];
const secondById = new Map(second.map((result) => [result.channel.id, result]));
const results = first.map((result) => secondById.get(result.channel.id) ?? result);

const report = formatReport(results, new Date().toISOString().slice(0, 10));
const failing = results.filter((result) => result.status === "dead").length;

writeFileSync(REPORT_FILE, report);
console.log(report);

if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `failing=${failing}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
