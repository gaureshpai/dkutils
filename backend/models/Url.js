const mongoose = require("mongoose");

const UrlSchema = new mongoose.Schema({
	originalUrl: {
		type: String,
		required: true,
		index: true,
	},
	shortUrl: {
		type: String,
		required: true,
		unique: true,
	},
	urlCode: {
		type: String,
		required: true,
		unique: true,
	},
	date: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("Url", UrlSchema);