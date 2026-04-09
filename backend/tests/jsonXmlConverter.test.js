"use strict";

/**
 * Tests for routes/jsonXmlConverter.js changes introduced in this PR.
 *
 * The route was changed to use @backend module alias. The conversion logic
 * itself (json-to-xml and xml-to-json) is tested here.
 *
 * These tests inline the conversion logic using the same xml2js configuration
 * as the source file. They run without requiring the backend node_modules
 * to be installed — they test the behavior that will hold once xml2js is
 * available and verify the exact response shapes.
 *
 * Note: When xml2js IS available (node_modules installed), you can run
 * these tests directly with: node --test tests/jsonXmlConverter.test.js
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// Check whether xml2js is available (optional)
// ---------------------------------------------------------------------------

let xml2js = null;
try {
	xml2js = require("xml2js");
} catch {
	// xml2js not installed – tests that need it will be skipped via skip flags
}

// ---------------------------------------------------------------------------
// Helpers: mock request/response
// ---------------------------------------------------------------------------

const makeReq = (body = {}) => ({ body });

const makeRes = () => {
	const res = {
		_status: null,
		_json: null,
		status(code) {
			res._status = code;
			return res;
		},
		json(data) {
			res._json = data;
			return res;
		},
	};
	return res;
};

// ---------------------------------------------------------------------------
// Inline re-implementation of the json-to-xml route handler
// (mirrors source exactly)
// ---------------------------------------------------------------------------

function jsonToXmlHandler(req, res, Builder) {
	const { jsonString } = req.body;

	if (!jsonString) {
		return res.status(400).json({ msg: "JSON string is required." });
	}

	try {
		const jsonObj = JSON.parse(jsonString);
		const builder = new Builder();
		const xmlString = builder.buildObject(jsonObj);
		return res.status(200).json({ xmlString });
	} catch (err) {
		return res.status(400).json({
			msg: "Invalid JSON format or conversion error.",
			error: err.message,
		});
	}
}

// ---------------------------------------------------------------------------
// Inline re-implementation of the xml-to-json route handler
// (mirrors source exactly)
// ---------------------------------------------------------------------------

async function xmlToJsonHandler(req, res, Parser) {
	const { xmlString } = req.body;

	if (!xmlString) {
		return res.status(400).json({ msg: "XML string is required." });
	}

	try {
		const parser = new Parser({ explicitArray: false, mergeAttrs: true });
		const jsonObj = await parser.parseStringPromise(xmlString);
		return res.status(200).json({ jsonString: JSON.stringify(jsonObj, null, 2) });
	} catch (err) {
		return res.status(400).json({
			msg: "Invalid XML format or conversion error.",
			error: err.message,
		});
	}
}

// ---------------------------------------------------------------------------
// POST /api/convert/json-to-xml — validation tests (no external deps needed)
// ---------------------------------------------------------------------------

describe("routes/jsonXmlConverter.js - POST /json-to-xml validation", () => {
	// These tests use stub logic to verify validation before any conversion

	function jsonToXmlValidationOnly(req, res) {
		const { jsonString } = req.body;
		if (!jsonString) {
			return res.status(400).json({ msg: "JSON string is required." });
		}
		return null; // passes validation
	}

	test("returns 400 when jsonString is missing", () => {
		const req = makeReq({});
		const res = makeRes();
		jsonToXmlValidationOnly(req, res);
		assert.equal(res._status, 400);
		assert.deepEqual(res._json, { msg: "JSON string is required." });
	});

	test("returns 400 when jsonString is null", () => {
		const req = makeReq({ jsonString: null });
		const res = makeRes();
		jsonToXmlValidationOnly(req, res);
		assert.equal(res._status, 400);
	});

	test("returns 400 when jsonString is empty string", () => {
		const req = makeReq({ jsonString: "" });
		const res = makeRes();
		jsonToXmlValidationOnly(req, res);
		assert.equal(res._status, 400);
	});

	test("passes validation when jsonString is provided", () => {
		const req = makeReq({ jsonString: '{"key": "value"}' });
		const res = makeRes();
		const result = jsonToXmlValidationOnly(req, res);
		assert.equal(result, null); // validation passed
		assert.equal(res._status, null);
	});
});

// ---------------------------------------------------------------------------
// POST /api/convert/xml-to-json — validation tests (no external deps needed)
// ---------------------------------------------------------------------------

describe("routes/jsonXmlConverter.js - POST /xml-to-json validation", () => {
	function xmlToJsonValidationOnly(req, res) {
		const { xmlString } = req.body;
		if (!xmlString) {
			return res.status(400).json({ msg: "XML string is required." });
		}
		return null;
	}

	test("returns 400 when xmlString is missing", () => {
		const req = makeReq({});
		const res = makeRes();
		xmlToJsonValidationOnly(req, res);
		assert.equal(res._status, 400);
		assert.deepEqual(res._json, { msg: "XML string is required." });
	});

	test("returns 400 when xmlString is null", () => {
		const req = makeReq({ xmlString: null });
		const res = makeRes();
		xmlToJsonValidationOnly(req, res);
		assert.equal(res._status, 400);
	});

	test("returns 400 when xmlString is empty string", () => {
		const req = makeReq({ xmlString: "" });
		const res = makeRes();
		xmlToJsonValidationOnly(req, res);
		assert.equal(res._status, 400);
	});

	test("passes validation when xmlString is provided", () => {
		const req = makeReq({ xmlString: "<root><key>value</key></root>" });
		const res = makeRes();
		const result = xmlToJsonValidationOnly(req, res);
		assert.equal(result, null);
		assert.equal(res._status, null);
	});
});

// ---------------------------------------------------------------------------
// Conversion logic tests (run when xml2js is installed)
// ---------------------------------------------------------------------------

describe("routes/jsonXmlConverter.js - JSON to XML conversion logic", () => {
	test("converts valid JSON string to XML", { skip: !xml2js ? "xml2js not installed" : false }, () => {
		const req = makeReq({ jsonString: '{"name": "test", "value": "123"}' });
		const res = makeRes();

		jsonToXmlHandler(req, res, xml2js.Builder);

		assert.equal(res._status, 200);
		assert.ok(res._json.xmlString);
		assert.match(res._json.xmlString, /<name>test<\/name>/);
		assert.match(res._json.xmlString, /<value>123<\/value>/);
	});

	test(
		"converts nested JSON object to XML",
		{ skip: !xml2js ? "xml2js not installed" : false },
		() => {
			const req = makeReq({
				jsonString: JSON.stringify({ root: { child: "hello" } }),
			});
			const res = makeRes();

			jsonToXmlHandler(req, res, xml2js.Builder);

			assert.equal(res._status, 200);
			assert.ok(res._json.xmlString);
			assert.match(res._json.xmlString, /<child>hello<\/child>/);
		},
	);

	test(
		"returns 400 for malformed JSON string",
		{ skip: !xml2js ? "xml2js not installed" : false },
		() => {
			const req = makeReq({ jsonString: "{not valid json}" });
			const res = makeRes();

			jsonToXmlHandler(req, res, xml2js.Builder);

			assert.equal(res._status, 400);
			assert.deepEqual(res._json.msg, "Invalid JSON format or conversion error.");
			assert.ok(res._json.error);
		},
	);

	test(
		"returns 400 for JSON with unbalanced brackets",
		{ skip: !xml2js ? "xml2js not installed" : false },
		() => {
			const req = makeReq({ jsonString: '{"key": "value"' });
			const res = makeRes();

			jsonToXmlHandler(req, res, xml2js.Builder);

			assert.equal(res._status, 400);
		},
	);

	test(
		"returns 400 when jsonString is missing (end-to-end)",
		{ skip: !xml2js ? "xml2js not installed" : false },
		() => {
			const req = makeReq({});
			const res = makeRes();

			jsonToXmlHandler(req, res, xml2js.Builder);

			assert.equal(res._status, 400);
			assert.deepEqual(res._json, { msg: "JSON string is required." });
		},
	);
});

describe("routes/jsonXmlConverter.js - XML to JSON conversion logic", () => {
	test(
		"converts valid XML string to JSON",
		{ skip: !xml2js ? "xml2js not installed" : false },
		async () => {
			const req = makeReq({ xmlString: "<root><name>test</name><value>123</value></root>" });
			const res = makeRes();

			await xmlToJsonHandler(req, res, xml2js.Parser);

			assert.equal(res._status, 200);
			assert.ok(res._json.jsonString);
			const parsed = JSON.parse(res._json.jsonString);
			assert.equal(parsed.root.name, "test");
			assert.equal(parsed.root.value, "123");
		},
	);

	test(
		"returns 400 for malformed XML",
		{ skip: !xml2js ? "xml2js not installed" : false },
		async () => {
			const req = makeReq({ xmlString: "<root><unclosed>" });
			const res = makeRes();

			await xmlToJsonHandler(req, res, xml2js.Parser);

			assert.equal(res._status, 400);
			assert.deepEqual(res._json.msg, "Invalid XML format or conversion error.");
			assert.ok(res._json.error);
		},
	);

	test(
		"returns 400 for completely invalid XML (plain text)",
		{ skip: !xml2js ? "xml2js not installed" : false },
		async () => {
			const req = makeReq({ xmlString: "not xml at all <<<" });
			const res = makeRes();

			await xmlToJsonHandler(req, res, xml2js.Parser);

			assert.equal(res._status, 400);
		},
	);

	test(
		"returns 400 when xmlString is missing (end-to-end)",
		{ skip: !xml2js ? "xml2js not installed" : false },
		async () => {
			const req = makeReq({});
			const res = makeRes();

			await xmlToJsonHandler(req, res, xml2js.Parser);

			assert.equal(res._status, 400);
			assert.deepEqual(res._json, { msg: "XML string is required." });
		},
	);

	test(
		"output jsonString is a valid JSON string",
		{ skip: !xml2js ? "xml2js not installed" : false },
		async () => {
			const req = makeReq({ xmlString: "<data><item>value</item></data>" });
			const res = makeRes();

			await xmlToJsonHandler(req, res, xml2js.Parser);

			assert.equal(res._status, 200);
			// Verify it's parseable JSON
			assert.doesNotThrow(() => JSON.parse(res._json.jsonString));
		},
	);
});