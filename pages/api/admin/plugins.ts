import { updateData } from "#/scripts/update";
import db from "#database";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Check if the user is logged in and an admin
  const user = await getServerSession(req, res, authOptions);
  if (!user) {
    res.status(401).end("Not logged in");
    return;
  }
  if (!user.user.admin) {
    res.status(403).end("Not an admin");
    return;
  }
  switch (req.method) {
    case "POST":
      // Used to edit or create a plugin
      let {
        // eslint-disable-next-line prefer-const
        body: { url = "", enabled = false, settings = "{}" },
      } = req;
      enabled = enabled ? 1 : 0;
      // Check if the plugin exists
      const plugin = await db
        .selectFrom("plugins")
        .where("url", "=", url)
        .selectAll()
        .executeTakeFirst();
      if (plugin === undefined) {
        // Creates the plugin
        await db
          .insertInto("plugins")
          .values({ settings, enabled, url })
          .execute();
        console.log("Created plugin with url", url);
        res.status(200).end("Created Plugin");
      } else {
        // Update the plugin
        // Checks if the plugin should be enabled and if it is it checks that there is no other plugin with the same name enabled
        if (
          enabled === 1 &&
          (await db
            .selectFrom("plugins")
            .where("enabled", "=", 1)
            .where("url", "!=", url)
            .where("name", "=", plugin.name)
            .select("name")
            .executeTakeFirst()) !== undefined
        ) {
          res.status(400).end("A plugin with the same name is already enabled");
          return;
        } else {
          await db
            .updateTable("plugins")
            .where("url", "=", url)
            .set({
              enabled: enabled ? 1 : 0,
              settings,
            })
            .execute();
          res.status(200).end("Plugin settings updated");
          // Runs the plugin once
          if (enabled) {
            updateData(url);
          }
        }
      }
      break;
    case "DELETE":
      // Deletes the plugin
      await db
        .deleteFrom("plugins")
        .where("url", "=", String(req.query.url))
        .execute();
      console.log("Deleted plugin with url", req.query.url);
      res.status(200).end("Plugin deleted");
      break;
    default:
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}
