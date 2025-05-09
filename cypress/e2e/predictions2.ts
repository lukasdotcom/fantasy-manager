import db from "#database";
import { updateData } from "#scripts/update";

run();

async function run() {
  // Starts the matchday
  await updateData("", "./sample/data2.json");
  await db
    .updateTable("clubs")
    .set({ gameStart: Math.floor(Date.now() / 1000 - 200) })
    .execute();
  // Simulates all the games
  await updateData("", "./sample/data3.json");
}
