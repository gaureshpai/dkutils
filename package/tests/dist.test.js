import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { DKUTILS } from "../dist/DKUTILS.js";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("dist/bin/dkutils.js");

test("dist export exposes the branded dkutils object", () => {
	assert.equal(DKUTILS.branding.name, "dkutils");
	assert.equal(DKUTILS.branding.watermark, "dkutils");
	assert.match(DKUTILS.branding.renderCliBanner(), /dkutils/);
});

test("dist PDF helper parses page ranges", () => {
	assert.deepEqual(DKUTILS.pdf.parsePageRanges("1-3,2,5", 8), [0, 1, 2, 4]);
});

test("dist CLI banner prints without arguments", async () => {
	const { stdout } = await execFileAsync("node", [cliPath], {
		cwd: path.resolve("."),
	});
	assert.match(stdout, /dkutils/);
	assert.match(stdout, /image/);
	assert.match(stdout, /pdf/);
	assert.match(stdout, /video/);
	assert.match(stdout, /youtube/);
});

test("dist CLI image convert shows help", async () => {
	const { stdout } = await execFileAsync("node", [cliPath, "image", "convert", "--help"], {
		cwd: path.resolve("."),
	});
	assert.match(stdout, /--input/);
	assert.match(stdout, /--format/);
});

test("dist CLI pdf merge shows help", async () => {
	const { stdout } = await execFileAsync("node", [cliPath, "pdf", "merge", "--help"], {
		cwd: path.resolve("."),
	});
	assert.match(stdout, /pdf merge/);
});

test("dist CLI video mov-to-mp4 shows help", async () => {
	const { stdout } = await execFileAsync("node", [cliPath, "video", "mov-to-mp4", "--help"], {
		cwd: path.resolve("."),
	});
	assert.match(stdout, /--input/);
});

test("dist CLI youtube download shows help", async () => {
	const { stdout } = await execFileAsync("node", [cliPath, "youtube", "download", "--help"], {
		cwd: path.resolve("."),
	});
	assert.match(stdout, /--url/);
});

test("dist DKUTILS has image, pdf, video exports", () => {
	assert.ok(DKUTILS.image);
	assert.ok(DKUTILS.pdf);
	assert.ok(DKUTILS.video);
	assert.ok(DKUTILS.branding);
});
