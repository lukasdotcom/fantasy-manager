import { sql } from "kysely";
import db from "#database";

/**
 * Handles API requests for retrieving a user's username given their id.
 *
 * @function handler
 * @param {http.IncomingMessage} req - The request object.
 * @param {http.ServerResponse} res - The response object.
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  switch (req.method) {
    case "GET":
      // Gets the id
      const id = req.query.id;
      await new Promise(async (resolve) => {
        // Checks if the user exists
        const users = await sql`SELECT username FROM users WHERE id=${id}`
          .execute(db)
          .then((e) => e.rows);
        if (users.length > 0) {
          res.status(200).json(users[0].username);
          resolve();
        } else {
          res.status(404).end("User not found");
          resolve();
        }
      });
      break;
    default:
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}
