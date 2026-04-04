"use strict";

// Register module aliases before requiring any route
require("module-alias/register");

const jsonXmlRouter = require("../../routes/jsonXmlConverter");

/**
 * Creates a minimal mock request object for direct router invocation.
 */
function makeReq(method, path, body = {}) {
	return {
		method,
		url: path,
		path,
		body,
		headers: {},
		get: () => null,
		header: () => null,
	};
}

/**
 * Creates a mock response object that captures status and body.
 */
function makeRes() {
	const res = {
		statusCode: 200,
		body: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(data) {
			this.body = data;
			return this;
		},
		send(data) {
			this.body = data;
			return this;
		},
		set() {
			return this;
		},
		end() {},
	};
	return res;
}

/**
 * Dispatches a mock request through the given Express router and resolves
 * once the response has been sent.
 */
function dispatch(router, method, path, body = {}) {
	return new Promise((resolve) => {
		const req = makeReq(method, path, body);
		const res = makeRes();
		router.handle(req, res, () => {});
		// Give the router time to complete async operations
		setTimeout(() => resolve(res), 300);
	});
}

describe("POST /json-to-xml", () => {
	it("returns 400 when jsonString is missing", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/json-to-xml", {});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("JSON string is required.");
	});

	it("returns 400 when jsonString is an empty string", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/json-to-xml", {
			jsonString: "",
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("JSON string is required.");
	});

	it("returns 200 with xmlString for valid JSON", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/json-to-xml", {
			jsonString: '{"name":"test","value":42}',
		});

		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty("xmlString");
		expect(typeof res.body.xmlString).toBe("string");
		expect(res.body.xmlString).toContain("<name>test</name>");
		expect(res.body.xmlString).toContain("<value>42</value>");
	});

	it("returns 200 with valid XML containing nested elements", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/json-to-xml", {
			jsonString: '{"root":{"child":"value"}}',
		});

		expect(res.statusCode).toBe(200);
		expect(res.body.xmlString).toContain("<root>");
		expect(res.body.xmlString).toContain("<child>value</child>");
	});

	it("returns 400 for invalid JSON (syntax error)", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/json-to-xml", {
			jsonString: "{not valid json",
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("Invalid JSON format or conversion error.");
		expect(res.body).toHaveProperty("error");
	});

	it("returns 400 for malformed JSON (trailing comma)", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/json-to-xml", {
			jsonString: '{"key": "value",}',
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("Invalid JSON format or conversion error.");
	});

	it("converts simple key-value pair correctly", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/json-to-xml", {
			jsonString: '{"greeting":"hello"}',
		});

		expect(res.statusCode).toBe(200);
		expect(res.body.xmlString).toContain("<greeting>hello</greeting>");
	});

	it("handles nested objects correctly", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/json-to-xml", {
			jsonString: '{"outer":{"inner":"deep"}}',
		});

		expect(res.statusCode).toBe(200);
		expect(res.body.xmlString).toContain("<inner>deep</inner>");
	});
});

describe("POST /xml-to-json", () => {
	it("returns 400 when xmlString is missing", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/xml-to-json", {});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("XML string is required.");
	});

	it("returns 400 when xmlString is an empty string", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/xml-to-json", {
			xmlString: "",
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("XML string is required.");
	});

	it("returns 200 with jsonString for valid XML", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/xml-to-json", {
			xmlString: "<root><name>test</name><value>42</value></root>",
		});

		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty("jsonString");
		const parsed = JSON.parse(res.body.jsonString);
		expect(parsed.root.name).toBe("test");
		expect(parsed.root.value).toBe("42");
	});

	it("returns 400 for invalid XML (unclosed tags)", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/xml-to-json", {
			xmlString: "<unclosed><tag>",
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("Invalid XML format or conversion error.");
		expect(res.body).toHaveProperty("error");
	});

	it("returns 400 for non-XML content with angle brackets", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/xml-to-json", {
			xmlString: "this is not xml at all <<<",
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("Invalid XML format or conversion error.");
	});

	it("returns jsonString that is a valid JSON string", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/xml-to-json", {
			xmlString: "<data><item>hello</item></data>",
		});

		expect(res.statusCode).toBe(200);
		expect(() => JSON.parse(res.body.jsonString)).not.toThrow();
	});

	it("correctly parses nested XML elements", async () => {
		const res = await dispatch(jsonXmlRouter, "POST", "/xml-to-json", {
			xmlString: "<config><database><host>localhost</host></database></config>",
		});

		expect(res.statusCode).toBe(200);
		const parsed = JSON.parse(res.body.jsonString);
		expect(parsed.config.database.host).toBe("localhost");
	});

	it("round-trips JSON through XML and back to equivalent structure", async () => {
		const toXml = await dispatch(jsonXmlRouter, "POST", "/json-to-xml", {
			jsonString: '{"tool":{"name":"converter","version":"1"}}',
		});

		expect(toXml.statusCode).toBe(200);

		const toJson = await dispatch(jsonXmlRouter, "POST", "/xml-to-json", {
			xmlString: toXml.body.xmlString,
		});

		expect(toJson.statusCode).toBe(200);
		const parsed = JSON.parse(toJson.body.jsonString);
		expect(parsed.tool.name).toBe("converter");
		expect(parsed.tool.version).toBe("1");
	});
});