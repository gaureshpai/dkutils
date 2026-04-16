require("module-alias/register");
require("dotenv").config();

const mongoose = require("mongoose");
const { TotalUsage } = require("@backend/models/ServiceUsage");

const GLOBAL_KEY = "global";

/**
 * Migrate the TotalUsage model to ensure that only one document has key = "global".
 * Duplicate documents are deleted (not set to null). The document with key = "global"
 * is ensured to exist, and all other matching documents are removed while their
 * totalCount is aggregated into the canonical document.
 * @returns {{migrated: boolean, processed: number, totalCount: number}} An object containing migration status, number of documents processed, and the aggregated total count.
 */
const migrateTotalUsageKey = async () => {
	// Declare variables before try block so they remain in scope for the return
	let matchingDocs;
	let totalCount;

	// Perform read-and-aggregate step inside the same transaction
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		matchingDocs = await TotalUsage.find({
			$or: [{ key: GLOBAL_KEY }, { key: { $exists: false } }, { key: null }],
		})
			.sort({ _id: 1 })
			.lean()
			.session(session);

		totalCount = matchingDocs.reduce(
			(sum, doc) => sum + (typeof doc.totalCount === "number" ? doc.totalCount : 0),
			0,
		);

		const canonicalDoc =
			matchingDocs.find((doc) => doc.key === GLOBAL_KEY) ?? matchingDocs[0] ?? null;
		const duplicateIds = matchingDocs
			.filter((doc) => canonicalDoc && String(doc._id) !== String(canonicalDoc._id))
			.map((doc) => doc._id);

		if (canonicalDoc) {
			await TotalUsage.updateOne(
				{ _id: canonicalDoc._id },
				{ $set: { key: GLOBAL_KEY, totalCount } },
				{ session },
			);
		} else {
			await TotalUsage.updateOne(
				{ key: GLOBAL_KEY },
				{ $setOnInsert: { key: GLOBAL_KEY, totalCount } },
				{ upsert: true, session },
			);
		}

		if (duplicateIds.length > 0) {
			await TotalUsage.deleteMany({ _id: { $in: duplicateIds } }, { session });
		}

		await session.commitTransaction();
	} catch (error) {
		await session.abortTransaction();
		throw error;
	} finally {
		session.endSession();
	}

	const indexes = await TotalUsage.collection.indexes();
	const keyIndex = indexes.find((index) => index.name === "key_1");
	if (keyIndex && !keyIndex.unique) {
		await TotalUsage.collection.dropIndex("key_1");
	}
	await TotalUsage.collection.createIndex({ key: 1 }, { unique: true, name: "key_1" });

	return {
		migrated: matchingDocs.length > 0,
		processed: matchingDocs.length,
		totalCount,
	};
};

if (require.main === module) {
	(async () => {
		if (!process.env.MONGO_URI) {
			throw new Error("MONGO_URI environment variable is required for TotalUsage migration.");
		}

		await mongoose.connect(process.env.MONGO_URI);
		try {
			const result = await migrateTotalUsageKey();
			console.log(`TotalUsage migration complete. Processed ${result.processed} document(s).`);
		} finally {
			await mongoose.disconnect();
		}
	})().catch((error) => {
		console.error("TotalUsage migration failed:", error);
		process.exitCode = 1;
	});
}

module.exports = { migrateTotalUsageKey };