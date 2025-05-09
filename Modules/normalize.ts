// This is very similar to https://github.com/tyxla/remove-accents/blob/master/index.js but with less characters to improve performance
// Use the following sql query to find missing accents in the database: SELECT * FROM players WHERE nameAscii REGEXP '[^ -~]';
import db from "./database";

// List of characters to change
const characterMap: Record<string, string> = {
  Á: "A",
  Â: "A",
  á: "a",
  ą: "a",
  ã: "a",
  ä: "a",
  â: "a",
  ă: "a",
  à: "a",
  æ: "ae",
  Ç: "C",
  Č: "C",
  Ć: "C",
  ç: "c",
  ć: "c",
  č: "c",
  Đ: "D",
  Ď: "D",
  đ: "d",
  É: "E",
  é: "e",
  ë: "e",
  è: "e",
  ê: "e",
  ě: "e",
  ę: "e",
  ğ: "g",
  İ: "i",
  í: "i",
  ï: "i",
  î: "i",
  ı: "i",
  Ľ: "L",
  Ł: "L",
  ł: "l",
  ľ: "l",
  ñ: "n",
  ń: "n",
  Ö: "O",
  Ø: "O",
  ö: "o",
  ø: "o",
  ō: "o",
  ô: "o",
  ó: "o",
  ò: "o",
  ř: "r",
  ß: "ss",
  Š: "S",
  Ş: "S",
  Ś: "S",
  Ș: "S",
  š: "s",
  ş: "s",
  ś: "s",
  ș: "s",
  Ţ: "T",
  ț: "t",
  ţ: "t",
  Ü: "U",
  ü: "u",
  ú: "u",
  ý: "y",
  Ž: "Z",
  ž: "z",
  "’": "'",
};
function matcher(match: string): string {
  return characterMap[match];
}
// This function will remove accents and other non ascii symbols
export default function noAccents(word: string) {
  const chars = Object.keys(characterMap).join("|");
  const allAccents = new RegExp(chars, "g");
  return word.replaceAll(allAccents, (e) => matcher(e));
}
export async function normalize_db() {
  console.log(
    "Renormalizing all player names to ascii due to updated definitions.",
  );
  const unique_players = await db
    .selectFrom("players")
    .select(["name", "nameAscii"])
    .distinct()
    .execute();
  for (const player of unique_players) {
    const no_accents = noAccents(player.name);
    if (no_accents == player.nameAscii) continue;
    await db
      .updateTable("players")
      .set("nameAscii", no_accents)
      .where("name", "=", player.name)
      .execute();
  }
  const unique_historical_players = await db
    .selectFrom("historicalPlayers")
    .select(["name", "nameAscii"])
    .distinct()
    .execute();
  for (const player of unique_historical_players) {
    const no_accents = noAccents(player.name);
    if (no_accents == player.nameAscii) continue;
    await db
      .updateTable("historicalPlayers")
      .set("nameAscii", no_accents)
      .where("name", "=", player.name)
      .execute();
  }
  console.log("Done renormalizing all player names to ascii.");
}
/**
 * Finds all non ascii characters in player names and logs the details. Meant for testing the noAccents function
 *
 */
export async function find_all_bad_chars() {
  const players = await db.selectFrom("players").select("name").execute();
  const chars_found = new Set<string>();
  for (const player of players) {
    for (const char of noAccents(player.name)) {
      if (char.charCodeAt(0) > 127 && !chars_found.has(char)) {
        chars_found.add(char);
        console.log(`Player ${player.name} has bad character ${char}`);
      }
    }
  }
  const players2 = await db
    .selectFrom("historicalPlayers")
    .select("name")
    .execute();
  for (const player of players2) {
    for (const char of noAccents(player.name)) {
      if (char.charCodeAt(0) > 127 && !chars_found.has(char)) {
        chars_found.add(char);
        console.log(`Player ${player.name} has bad character ${char}`);
      }
    }
  }
}
