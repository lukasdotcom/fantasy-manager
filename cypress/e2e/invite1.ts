import db from "#database";
import { updateData } from "#scripts/update";

run();
// Used to reset the users and invites for the user test
async function run() {
  await db.deleteFrom("users").where("username", "like", "Invite%").execute();
  await db.deleteFrom("invite").where("inviteID", "=", "invite1").execute();
  await db.deleteFrom("data").where("value1", "like", "locked%").execute();
  await updateData("", "./sample/data1.json");
}
