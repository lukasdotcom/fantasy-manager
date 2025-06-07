import db from "../../../Modules/database";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { hash } from "bcrypt";

// Used to change a users username
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const id = session?.user?.id;
  switch (req.method) {
    case "POST":
      if (!id) {
        res.status(401).end("Not logged in");
      } else if (req.body.password !== undefined) {
        // Updates the password if one is given.
        const password = req.body.password;
        await db
          .updateTable("users")
          .set({
            password:
              password === ""
                ? ""
                : await hash(password, parseInt(process.env.BCRYPT_ROUNDS)),
          })
          .where("id", "=", id)
          .execute();
        if (password === "") {
          res.status(200).end("Disabled password auth");
          console.log(`User ${id} disabled password auth`);
        } else {
          res.status(200).end("Changed password");
          console.log(`User ${id} changed password`);
        }
      } else if (
        req.body.provider === "google" ||
        req.body.provider === "github"
      ) {
        // Used to update the username
        const email = String(req.body.email);
        // Disconnects the email
        if (email === "") {
          await db
            .updateTable("users")
            .set({
              [req.body.provider]: "",
            })
            .where("id", "=", id)
            .execute();
          console.log(`User ${id} disconnected from ${req.body.provider}`);
          res.status(200).end(`Disconnected from {provider}`);
        } else {
          await db
            .updateTable("users")
            .set({ [req.body.provider]: email })
            .where("id", "=", id)
            .execute();
          console.log(`User ${id} connected to ${req.body.provider}`);
          res.status(200).end(`Connected to {provider}`);
        }
        // Used to update the league favorite
      } else if (req.body.favorite) {
        // Checks if a possible favorite is given otherwise favorites are cleared
        if (parseInt(req.body.favorite) > 0) {
          await db
            .updateTable("users")
            .set({ favoriteLeague: parseInt(req.body.favorite) })
            .where("id", "=", id)
            .execute();
        } else {
          await db
            .updateTable("users")
            .set({ favoriteLeague: null })
            .where("id", "=", id)
            .execute();
        }
        res.status(200).end("Updated favorite");
      } else if (req.body.theme) {
        await db
          .updateTable("users")
          .set({ theme: req.body.theme })
          .where("id", "=", id)
          .execute();
        res.status(200).end("Updated theme");
      } else if (req.body.locale) {
        await db
          .updateTable("users")
          .set({ locale: req.body.locale })
          .where("id", "=", id)
          .execute();
        res.status(200).end("Updated locale");
      } else if (
        req.body.username === undefined ||
        String(req.body.username) === ""
      ) {
        // Checks if a username was given for this change
        res.status(500).end("No username given");
      } else {
        await db
          .updateTable("users")
          .set({ username: req.body.username })
          .where("id", "=", id)
          .execute();
        res.status(200).end("Changed username");
        console.log(`User ${id} changed username to ${req.body.username}`);
      }
      break;
    // Used to delete the user
    case "DELETE":
      if (!id) {
        res.status(401).end("Not logged in");
        // Makes sure the user passed the correct id
      } else if (req.body.user === id) {
        // Checks if the user is in any leagues
        const anyLeagues =
          (await db
            .selectFrom("leagueUsers")
            .selectAll()
            .where("user", "=", id)
            .executeTakeFirst()) !== undefined;
        if (anyLeagues) {
          res.status(401).end("You can not be in any leagues");
        } else {
          console.log(`User ${id} was deleted`);
          await db.deleteFrom("users").where("id", "=", id).execute();
          res.status(200).end("Deleted user successfully");
        }
      } else {
        res.status(400).end("Please pass the user id under user");
      }
      break;
    default:
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}
