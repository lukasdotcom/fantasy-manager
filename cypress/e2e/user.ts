import db from "#database";

run();
// Used to reset the users for the user test
async function run() {
  await db
    .deleteFrom("users")
    .where("username", "in", ["Sample User", "New Sample Username"])
    .execute();
}
