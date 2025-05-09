import db from "../Modules/database";
import { Pictures } from "#type/db";
import { existsSync, mkdirSync, rmSync, createWriteStream } from "fs";
import { rename } from "fs/promises";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { ReadableStream } from "stream/web";
import { Selectable } from "kysely";

// Used to get the correct path for a picture and will also make the folder if needed
export function picturePath(id: number, makeFolder = false): string {
  const subfolderPath = `./players/${id % 100}`;
  if (makeFolder && !existsSync("./players/")) {
    mkdirSync("./players/"); // Ensure base ./players directory exists
  }
  if (makeFolder && !existsSync(subfolderPath)) {
    mkdirSync(subfolderPath);
  }
  return `${subfolderPath}/${id}.jpg`;
}

// Used to download a specific picture
export async function downloadPicture(id: number): Promise<void> {
  const pictureEntry = await db
    .selectFrom("pictures")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  if (!pictureEntry) {
    console.warn(`Picture with id ${id} not found in database.`);
    return;
  }

  // Set downloading flag before checking other conditions to prevent race conditions
  // if multiple calls happen for the same picture around the same time.
  await db
    .updateTable("pictures")
    .set({ downloading: 1 })
    .where("id", "=", id)
    .execute();

  // Downloading stores if the picture has already had an attempt of downloading
  // while downloaded stores if it exists on disk. This is to prevent repeat
  // downloads. That value is eventually reset this is just meant as a cooldown.
  if (!pictureEntry.downloading) {
    const downloadDisabledConfig = await db
      .selectFrom("data")
      .select("value1") // Check for existence
      .where("value1", "=", "configDownloadPicture")
      .where("value2", "=", "no")
      .executeTakeFirst();
    if (downloadDisabledConfig === undefined) {
      await downloadPictureURL(pictureEntry.url, id);
    }
  }
}

// Actually sends the request to download a picture
async function downloadPictureURL(url: string, id: number): Promise<void> {
  console.log(`Downloading picture with id: ${id} from ${url}`);
  const tempFileName = `${Math.random().toString(36).substring(2, 15)}.jpg`;
  const downloadDir = "./players/download";
  const tempFilePath = `${downloadDir}/${tempFileName}`;

  try {
    if (!existsSync("./players/")) {
      mkdirSync("./players/");
    }
    if (!existsSync(downloadDir)) {
      mkdirSync(downloadDir);
    }

    const stream = createWriteStream(tempFilePath);
    const response = await fetch(url, {
      // Why an image requires a user agent IDK, but some places do so all of them now get chrome's user agent
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok || !response.body) {
      throw new Error(
        `Fetch failed with status ${response.status} for URL: ${url}`,
      );
    }

    await finished(
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(
        stream,
      ),
    );
    await rename(tempFilePath, picturePath(id, true));
    console.log(`Finished downloading picture with id: ${id}`);
  } catch (error) {
    console.error(`Failed to download picture with id: ${id}. Error: ${error}`);
  }
}

// Used to download every single picture needed
export async function downloadAllPictures(): Promise<void> {
  console.log("All pictures are being downloaded");

  const picturesToDownload: Selectable<Pictures>[] = await db
    .selectFrom("pictures")
    .selectAll()
    .where("downloaded", "=", 0)
    .execute();
  await Promise.allSettled(
    picturesToDownload.map((picture) =>
      downloadPictureURL(picture.url, picture.id),
    ),
  );
}

/**
 * Checks the pictures in the downloaded folder, deletes all invalid files in the folder, and updates the database accordingly.
 */
export async function checkPictures(): Promise<void> {
  const downloadDir = "./players/download/";
  if (existsSync(downloadDir)) {
    rmSync(downloadDir, { recursive: true, force: true });
  }

  await db
    .updateTable("pictures")
    .set({ downloading: (eb) => eb.ref("downloaded") })
    .execute();

  const downloadDisabledConfig = await db
    .selectFrom("data")
    .select("value1")
    .where("value1", "=", "configDownloadPicture")
    .where("value2", "=", "no")
    .executeTakeFirst();

  if (downloadDisabledConfig) {
    console.log("Picture downloading is disabled by config.");
    return;
  }

  const downloadedPictureRecords: Selectable<Pictures>[] = await db
    .selectFrom("pictures")
    .selectAll()
    .where("downloaded", "=", 1)
    .execute();

  const updateDbPromises = downloadedPictureRecords.map(async (picture) => {
    if (!existsSync(picturePath(picture.id))) {
      // If file doesn't exist but DB says it's downloaded, mark for re-download
      await db
        .updateTable("pictures")
        .set({ downloaded: 0, downloading: 0 })
        .where("id", "=", picture.id)
        .execute();
    }
  });
  await Promise.all(updateDbPromises);

  const forceDownloadAllConfig = await db
    .selectFrom("data")
    .select("value1")
    .where("value1", "=", "configDownloadPicture")
    .where("value2", "=", "yes") // Assuming 'yes' means force download all non-downloaded
    .executeTakeFirst();

  if (forceDownloadAllConfig) {
    await downloadAllPictures();
  }
}
