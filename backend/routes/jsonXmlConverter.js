const router = require("express").Router();
const xml2js = require("xml2js");

const jsonToXmlBuilder = new xml2js.Builder();
const xmlToJsonParser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
});

// @route   POST /api/convert/json-to-xml
// @desc    Convert JSON string to XML string
// @access  Public
router.post("/json-to-xml", (req, res) => {
  const { jsonString } = req.body;

  if (!jsonString) {
    return res.status(400).json({ msg: "JSON string is required." });
  }

  try {
    const jsonObj = JSON.parse(jsonString);
    const xmlString = jsonToXmlBuilder.buildObject(jsonObj);
    return res.status(200).json({ xmlString });
  } catch (err) {
    console.error("Error converting JSON to XML:", err);
    return res.status(400).json({
      msg: "Invalid JSON format or conversion error.",
      error: err.message,
    });
  }
});

// @route   POST /api/convert/xml-to-json
// @desc    Convert XML string to JSON string
// @access  Public
router.post("/xml-to-json", async (req, res) => {
  const { xmlString } = req.body;

  if (!xmlString) {
    return res.status(400).json({ msg: "XML string is required." });
  }

  try {
    const jsonObj = await xmlToJsonParser.parseStringPromise(xmlString);
    return res
      .status(200)
      .json({ jsonString: JSON.stringify(jsonObj, null, 2) });
  } catch (err) {
    console.error("Error converting XML to JSON:", err);
    return res.status(400).json({
      msg: "Invalid XML format or conversion error.",
      error: err.message,
    });
  }
});

module.exports = router;
