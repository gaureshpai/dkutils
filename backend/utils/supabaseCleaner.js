// Use shared Supabase client module
const { supabase } = require("./supabaseClient");

const SUPABASE_BUCKET_NAME = "utilityhub";
const DAYS_TO_KEEP = 7;

const cleanSupabaseStorage = async () => {
  console.log("Starting Supabase storage cleanup...");
  const now = new Date();
  const sevenDaysAgo = new Date(
    now.getTime() - DAYS_TO_KEEP * 24 * 60 * 60 * 1000,
  );

  try {
    const listAllFilesRecursive = async (currentPath = "") => {
      let allFiles = [];
      let hasMore = true;
      let offset = 0;
      const limit = 100;

      while (hasMore) {
        const { data, error } = await supabase.storage
          .from(SUPABASE_BUCKET_NAME)
          .list(currentPath, {
            limit,
            offset,
            sortBy: { column: "created_at", order: "asc" },
          });

        if (error) {
          throw error;
        }

        if (data && Array.isArray(data) && data.length > 0) {
          for (const item of data) {
            if (item.id !== null) {
              allFiles.push({
                ...item,
                fullPath: currentPath + item.name,
              });
            } else {
              const subfolderFiles = await listAllFilesRecursive(
                `${currentPath + item.name}/`,
              );
              allFiles = allFiles.concat(subfolderFiles);
            }
          }
        }

        if (!data || data.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
      return allFiles;
    };

    const files = await listAllFilesRecursive();

    if (!files || files.length === 0) {
      console.log("No files found in Supabase bucket.");
      return;
    }

    const filesToDelete = files
      .filter((file) => {
        const fileCreatedAt = new Date(file.created_at);
        return fileCreatedAt < sevenDaysAgo;
      })
      .map((file) => file.fullPath);

    if (filesToDelete.length > 0) {
      console.log(
        `Found ${filesToDelete.length} files older than ${DAYS_TO_KEEP} days to delete.`,
      );
      const { error: deleteError } = await supabase.storage
        .from(SUPABASE_BUCKET_NAME)
        .remove(filesToDelete);

      if (deleteError) {
        throw deleteError;
      }
      console.log(
        `Successfully deleted ${filesToDelete.length} old files from Supabase.`,
      );
    } else {
      console.log("No old files found to delete from Supabase.");
    }
  } catch (error) {
    console.error("Error during Supabase storage cleanup:", error.message);
    // Re-throw error to surface failures to schedulers/callers
    throw error;
  }
};

module.exports = { cleanSupabaseStorage };
