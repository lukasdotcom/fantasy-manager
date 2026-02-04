import db from "#database";
import { updateData } from "#scripts/update";

run();
// Seeds Bundesliga data for the download test
async function run() {
  await db.deleteFrom("data").where("value1", "like", "locked%").execute();
  await updateData("", "./sample/data1.json");
}
