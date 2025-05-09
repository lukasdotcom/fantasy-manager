import { createReadStream, existsSync, statSync } from "fs";
import db from "#database";
import { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "stream";
import { picturePath } from "#/scripts/pictures";
export const config = {
  api: {
    responseLimit: false,
  },
};
// This exists for the purpose of making it easier for the next image component to get the data it needs
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", `public, max-age=108000`);
  if (
    (await db
      .selectFrom("data")
      .selectAll()
      .where("value1", "=", "configDownloadPicture")
      .where("value2", "=", "no")
      .executeTakeFirst()) !== undefined
  ) {
    const picture = await db
      .selectFrom("pictures")
      .where("id", "=", parseInt(String(req.query.id)))
      .selectAll()
      .executeTakeFirst();
    if (picture === undefined) {
      res.status(404).end();
      return;
    }
    await fetch(picture.url)
      .then((r) => {
        // Note the following code is from https://stackoverflow.com/questions/74699607/how-to-pipe-to-next-js-13-api-response
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        Readable.fromWeb(r.body).pipe(res);
      })
      .catch(() => {
        const data = statSync("./public/playerFallback.png");
        const stream = createReadStream("./public/playerFallback.png");
        res.setHeader("Content-Length", data.size);
        res.writeHead(200);
        stream.pipe(res);
      });
  } else {
    const filePath = picturePath(parseInt(String(req.query.id)));
    if (!existsSync(filePath)) {
      res.status(404).end();
      return;
    }
    // This will create a stream to lower memory usage.
    const data = statSync(filePath);
    const stream = createReadStream(filePath);
    res.setHeader("Content-Length", data.size);
    res.writeHead(200);
    stream.pipe(res);
  }
}
