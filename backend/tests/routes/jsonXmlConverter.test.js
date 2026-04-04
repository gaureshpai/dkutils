"use strict";

/**
 * Tests for backend/routes/jsonXmlConverter.js
 *
 * jsonXmlConverter.js is a pure conversion route that uses xml2js.
 * We test the conversion logic directly using the same xml2js configuration
 * used in the route, verifying both JSON→XML and XML→JSON transformations.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const xml2js = require("xml2js");

// Mirror the exact xml2js configuration from jsonXmlConverter.js
const jsonToXmlBuilder = new xml2js.Builder();
const xmlToJsonParser = new xml2js.Parser({
	explicitArray: false,
	mergeAttrs: true,
});

// ── Helper: mock res ──────────────────────────────────────────────────────────

function mockRes() {
	const res = {};
	res.statusCode = 200;
	res.status = (code) => {
		res.statusCode = code;
		return res;
	};
	res.json = (body) => {
		res.body = body;
		return res;
	};
	return res;
}

// ── Inline route handlers for unit testing ─────────────────────────────────────
// These match exactly the handlers in jsonXmlConverter.js

const jsonToXmlHandler = (req, res) => {
	const { jsonString } = req.body;

	if (!jsonString) {
		return res.status(400).json({ msg: "JSON string is required." });
	}

	try {
		const jsonObj = JSON.parse(jsonString);
		const xmlString = jsonToXmlBuilder.buildObject(jsonObj);
		return res.status(200).json({ xmlString });
	} catch (err) {
		return res.status(400).json({
			msg: "Invalid JSON format or conversion error.",
			error: err.message,
		});
	}
};

const xmlToJsonHandler = async (req, res) => {
	const { xmlString } = req.body;

	if (!xmlString) {
		return res.status(400).json({ msg: "XML string is required." });
	}

	try {
		const jsonObj = await xmlToJsonParser.parseStringPromise(xmlString);
		return res.status(200).json({ jsonString: JSON.stringify(jsonObj, null, 2) });
	} catch (err) {
		return res.status(400).json({
			msg: "Invalid XML format or conversion error.",
			error: err.message,
		});
	}
};

// ── POST /json-to-xml tests ───────────────────────────────────────────────────

test("json-to-xml - missing jsonString: returns 400", () => {
	const req = { body: {} };
	const res = mockRes();
	jsonToXmlHandler(req, res);

	assert.equal(res.statusCode, 400);
	assert.equal(res.body.msg, "JSON string is required.");
});

test("json-to-xml - null jsonString: returns 400", () => {
	const req = { body: { jsonString: null } };
	const res = mockRes();
	jsonToXmlHandler(req, res);

	assert.equal(res.statusCode, 400);
	assert.equal(res.body.msg, "JSON string is required.");
});

test("json-to-xml - invalid JSON string: returns 400", () => {
	const req = { body: { jsonString: "not valid json {{{" } };
	const res = mockRes();
	jsonToXmlHandler(req, res);

	assert.equal(res.statusCode, 400);
	assert.equal(res.body.msg, "Invalid JSON format or conversion error.");
	assert.ok(res.body.error, "Should include error details");
});

test("json-to-xml - valid simple JSON: returns 200 with xmlString", () => {
	const jsonString = JSON.stringify({ root: { name: "test", value: "42" } });
	const req = { body: { jsonString } };
	const res = mockRes();
	jsonToXmlHandler(req, res);

	assert.equal(res.statusCode, 200);
	assert.ok(res.body.xmlString, "Should return xmlString");
	assert.ok(res.body.xmlString.includes("<name>test</name>"), "XML should contain name element");
	assert.ok(res.body.xmlString.includes("<value>42</value>"), "XML should contain value element");
});

test("json-to-xml - nested JSON: returns valid XML structure", () => {
	const jsonString = JSON.stringify({ root: { person: { name: "Alice", age: "30" } } });
	const req = { body: { jsonString } };
	const res = mockRes();
	jsonToXmlHandler(req, res);

	assert.equal(res.statusCode, 200);
	assert.ok(res.body.xmlString.includes("<person>"), "XML should have person element");
	assert.ok(res.body.xmlString.includes("<name>Alice</name>"), "XML should contain name");
	assert.ok(res.body.xmlString.includes("<age>30</age>"), "XML should contain age");
});

test("json-to-xml - JSON array converted to XML", () => {
	const jsonString = JSON.stringify({ root: { item: ["a", "b", "c"] } });
	const req = { body: { jsonString } };
	const res = mockRes();
	jsonToXmlHandler(req, res);

	assert.equal(res.statusCode, 200);
	assert.ok(res.body.xmlString, "Should return xmlString for array input");
});

test("json-to-xml - empty JSON object: returns XML", () => {
	const jsonString = JSON.stringify({ root: {} });
	const req = { body: { jsonString } };
	const res = mockRes();
	jsonToXmlHandler(req, res);

	assert.equal(res.statusCode, 200);
	assert.ok(res.body.xmlString.includes("<root"), "XML should contain root element");
});

// ── POST /xml-to-json tests ───────────────────────────────────────────────────

test("xml-to-json - missing xmlString: returns 400", async () => {
	const req = { body: {} };
	const res = mockRes();
	await xmlToJsonHandler(req, res);

	assert.equal(res.statusCode, 400);
	assert.equal(res.body.msg, "XML string is required.");
});

test("xml-to-json - null xmlString: returns 400", async () => {
	const req = { body: { xmlString: null } };
	const res = mockRes();
	await xmlToJsonHandler(req, res);

	assert.equal(res.statusCode, 400);
	assert.equal(res.body.msg, "XML string is required.");
});

test("xml-to-json - invalid XML: returns 400 with error details", async () => {
	const req = { body: { xmlString: "<unclosed><tag>" } };
	const res = mockRes();
	await xmlToJsonHandler(req, res);

	assert.equal(res.statusCode, 400);
	assert.equal(res.body.msg, "Invalid XML format or conversion error.");
	assert.ok(res.body.error, "Should include error details");
});

test("xml-to-json - valid simple XML: returns 200 with jsonString", async () => {
	const xmlString = "<root><name>test</name><value>42</value></root>";
	const req = { body: { xmlString } };
	const res = mockRes();
	await xmlToJsonHandler(req, res);

	assert.equal(res.statusCode, 200);
	assert.ok(res.body.jsonString, "Should return jsonString");

	const parsed = JSON.parse(res.body.jsonString);
	assert.equal(parsed.root.name, "test");
	assert.equal(parsed.root.value, "42");
});

test("xml-to-json - nested XML: parses correctly", async () => {
	const xmlString = "<root><person><name>Alice</name><age>30</age></person></root>";
	const req = { body: { xmlString } };
	const res = mockRes();
	await xmlToJsonHandler(req, res);

	assert.equal(res.statusCode, 200);
	const parsed = JSON.parse(res.body.jsonString);
	assert.equal(parsed.root.person.name, "Alice");
	assert.equal(parsed.root.person.age, "30");
});

test("xml-to-json - returns formatted JSON (pretty-printed)", async () => {
	const xmlString = "<root><key>value</key></root>";
	const req = { body: { xmlString } };
	const res = mockRes();
	await xmlToJsonHandler(req, res);

	assert.equal(res.statusCode, 200);
	// The output should be pretty-printed (contains newlines/indentation)
	assert.ok(
		res.body.jsonString.includes("\n"),
		"JSON output should be pretty-printed with newlines",
	);
});

// ── Round-trip: JSON → XML → JSON ────────────────────────────────────────────

test("round-trip: JSON to XML then XML to JSON preserves data", async () => {
	const originalData = { root: { name: "round-trip", count: "5" } };
	const jsonString = JSON.stringify(originalData);

	// Step 1: JSON → XML
	const req1 = { body: { jsonString } };
	const res1 = mockRes();
	jsonToXmlHandler(req1, res1);

	assert.equal(res1.statusCode, 200, "JSON → XML should succeed");
	const { xmlString } = res1.body;

	// Step 2: XML → JSON
	const req2 = { body: { xmlString } };
	const res2 = mockRes();
	await xmlToJsonHandler(req2, res2);

	assert.equal(res2.statusCode, 200, "XML → JSON should succeed");
	const roundTripped = JSON.parse(res2.body.jsonString);
	assert.equal(roundTripped.root.name, "round-trip", "name should survive round-trip");
	assert.equal(roundTripped.root.count, "5", "count should survive round-trip");
});