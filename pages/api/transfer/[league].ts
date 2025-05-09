import { NextApiRequest, NextApiResponse } from "next";
import db from "../../../Modules/database";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";
// This is the structure of the get response
export interface getLeagues {
  money: number;
  transferCount: number;
  timeLeft: number;
  ownership: { [Key: string]: (ownershipInfo | transferInfo)[] };
  transferOpen: boolean;
}
interface ownershipInfo {
  transfer: false;
  owner: number;
}
interface transferInfo {
  transfer: true;
  seller: number;
  buyer: number;
  amount: number;
}
export interface GETResult {
  money: number;
  transferCount: number;
  timeLeft: number;
  ownership: { [Key: string]: (ownershipInfo | transferInfo)[] };
  transferOpen: boolean;
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  const league = parseInt(String(req.query.league));
  if (!session) {
    res.status(401).end("Not logged in");
  } else {
    const user = session.user.id;
    const leagueSettings = await db
      .selectFrom("leagueSettings")
      .selectAll()
      .where("leagueID", "=", league)
      .executeTakeFirst();
    // Checks if the league ia archived
    if (leagueSettings?.archived !== 0) {
      res.status(400).end("This league is archived");
      return;
    }
    // Gets users money
    const money =
      (
        await db
          .selectFrom("leagueUsers")
          .select("money")
          .where("leagueID", "=", league)
          .where("user", "=", user)
          .executeTakeFirst()
      )?.money || 0;
    // Gets the leagues settings
    if (leagueSettings.fantasyEnabled === 0) {
      res.status(400).end("This league does not have fantasy enabled. ");
      return;
    }
    // Checks if the transfer market is open
    const transferOpen = await db
      .selectFrom("data")
      .select("value1")
      .where("value1", "=", "transferOpen" + leagueSettings.league)
      .where("value2", "=", "true")
      .execute()
      .then((e) => e.length > 0);
    switch (req.method) {
      // Used to return a dictionary of all transfers and ownerships
      case "GET":
        if (money !== undefined) {
          const [transfers, squads, timeLeft] = await Promise.all([
            // Gets list of all transfers
            db
              .selectFrom("transfers")
              .selectAll()
              .where("leagueID", "=", league)
              .execute(),
            // Gets squads
            db
              .selectFrom("squad")
              .selectAll()
              .where("leagueID", "=", league)
              .execute(),
            // Gets the amount of time left in the transfer period
            db
              .selectFrom("data")
              .select("value2")
              .where("value1", "=", "countdown" + leagueSettings.league)
              .executeTakeFirst()
              .then((e) => parseInt(String(e?.value2))),
          ]);
          // Puts all the ownership and transfer info in a dictionary
          const ownership: { [Key: string]: (ownershipInfo | transferInfo)[] } =
            {};
          let transferCount = 0;
          squads.forEach((e) => {
            if (ownership[e.playeruid] === undefined) {
              ownership[e.playeruid] = [{ transfer: false, owner: e.user }];
            } else {
              ownership[e.playeruid].push({ transfer: false, owner: e.user });
            }
          });
          transfers.forEach((e) => {
            const data: transferInfo = {
              transfer: true,
              seller: e.seller,
              buyer: e.buyer,
              amount: e.value,
            };
            if (ownership[e.playeruid] === undefined) {
              ownership[e.playeruid] = [data];
            } else {
              ownership[e.playeruid] = ownership[e.playeruid].filter(
                (f) => e.seller !== (f as ownershipInfo).owner,
              );
              ownership[e.playeruid].push(data);
            }
            if (e.seller == user || e.buyer == user) {
              transferCount++;
            }
          });
          const result: GETResult = {
            money,
            transferCount,
            timeLeft,
            ownership,
            transferOpen,
          };
          res.status(200).json(result);
        } else {
          res.status(404).end("League not found");
        }
        break;
      // Used to create a new transfer
      case "POST":
        const playeruid = req.body.playeruid;
        const amount = parseInt(req.body.amount);
        // Checks if the transfer market is still open
        if (!transferOpen && !leagueSettings.matchdayTransfers) {
          res.status(400).end("Transfer Market is closed");
          break;
        }
        const player = await db
          .selectFrom("players")
          .selectAll()
          .where("uid", "=", playeruid)
          .where("league", "=", leagueSettings.league)
          .executeTakeFirst();
        // Checks if the player exists
        if (player === undefined) {
          res.status(404).end("Player does not exist");
          break;
        }
        // Says if the user still has transfers left
        const emptySquad =
          (await db
            .selectFrom("squad")
            .select(["playeruid"])
            .where("leagueID", "=", league)
            .where("user", "=", user)
            .executeTakeFirst()) === undefined;
        const transferCount = db
          .selectFrom("transfers")
          .select((eb) => [eb.fn.count("playeruid").as("count")])
          .where("leagueID", "=", league)
          .where((eb) =>
            eb.or([eb("buyer", "=", user), eb("seller", "=", user)]),
          )
          .executeTakeFirst()
          .then((e) => parseInt(String(e?.count)));
        const transferLeft =
          emptySquad || (await transferCount) < leagueSettings.transfers;
        // Checks if this was a purchase
        if (amount > 0) {
          // Checks if the player is already owned by the user
          if (
            (await db
              .selectFrom("squad")
              .select(["playeruid"])
              .where("leagueID", "=", league)
              .where("user", "=", user)
              .where("playeruid", "=", playeruid)
              .executeTakeFirst()) !== undefined
          ) {
            res.status(400).end("You already own the player");
            break;
          }
          // Checks if the player is already being purchased
          const purchaseTransfer = await db
            .selectFrom("transfers")
            .selectAll()
            .where("buyer", "=", user)
            .where("playeruid", "=", playeruid)
            .where("leagueID", "=", league)
            .executeTakeFirst();
          if (purchaseTransfer !== undefined) {
            // Makes sure the bid is greater than or equal to the current purchase amount
            if (purchaseTransfer.value > amount) {
              res
                .status(400)
                .end("You can not bid lower than your current purchase");
              break;
            }
            await db
              .updateTable("transfers")
              .set({ max: amount })
              .where("buyer", "=", user)
              .where("playeruid", "=", playeruid)
              .where("leagueID", "=", league)
              .execute();
            res.status(200).end(`Updated max bid to {amount} M`);
            break;
          }
          // Checks if the user still has transfers left
          if (!transferLeft) {
            res.status(400).end("You have no more transfers");
            break;
          }
          // Checks if the player can still be bought from the AI
          const squadCount = await db
            .selectFrom("squad")
            .select((eb) => [eb.fn.count("user").as("count")])
            .where("leagueID", "=", league)
            .where("playeruid", "=", playeruid)
            .executeTakeFirst()
            .then((e) => parseInt(String(e?.count)));
          const transferCountBuy = await db
            .selectFrom("transfers")
            .select((eb) => [eb.fn.count("buyer").as("count")])
            .where("seller", "=", 0)
            .where("leagueID", "=", league)
            .where("playeruid", "=", playeruid)
            .executeTakeFirst()
            .then((e) => parseInt(String(e?.count)));
          if (squadCount + transferCountBuy < leagueSettings.duplicatePlayers) {
            // Checks if the user has offered enough money.
            if (amount < player.sale_price) {
              res
                .status(400)
                .end(
                  "You can not buy a player for less than the player's value",
                );
              break;
            }
            if (money < player.sale_price) {
              res.status(400).end("You do not have enough money");
              break;
            }
            await db
              .insertInto("transfers")
              .values({
                leagueID: league,
                seller: 0,
                buyer: user,
                playeruid,
                value: player.sale_price,
                max: amount,
              })
              .execute();
            await db
              .updateTable("leagueUsers")
              .set({ money: money - player.sale_price })
              .where("leagueID", "=", league)
              .where("user", "=", user)
              .execute();
            console.log(
              `Player ${playeruid} bought for ${player.sale_price} with max bid of ${amount} by user ${user} in league ${league}`,
            );
            res.status(200).end("Bought player");
            break;
          }
          // Checks if the player can even be bought from anyone
          const transferCountSell = await db
            .selectFrom("transfers")
            .select((eb) => [eb.fn.count("buyer").as("count")])
            .where("leagueID", "=", league)
            .where("playeruid", "=", playeruid)
            .where("seller", "!=", 0)
            .executeTakeFirst()
            .then((e) => parseInt(String(e?.count)));
          if (
            squadCount - transferCountSell <
            leagueSettings.duplicatePlayers
          ) {
            // Increments all the offers by 100000 until someone drops their transfer
            while (true) {
              const cheapest = await db
                .selectFrom("transfers")
                .selectAll()
                .where("leagueID", "=", league)
                .where("playeruid", "=", playeruid)
                .orderBy("value", "asc")
                .limit(1)
                .executeTakeFirst();
              if (cheapest === undefined) {
                res.status(500).end("Could not find transfer to outbid");
                break;
              }
              // Checks if this is an AI
              const isAI = cheapest.buyer === 0 || cheapest.buyer === -1;
              // Checks if the player still wants to pay that amount
              if (cheapest.value >= amount + (isAI ? 100000 : 0)) {
                res.status(400).end("Not enough money offered");
                break;
              }
              if (cheapest.value + 100000 > money + (isAI ? 100000 : 0)) {
                res.status(400).end("You do not have enough money");
                break;
              }
              // Checks if that player wants to increment the offer and if they can afford it
              if (
                cheapest.max > cheapest.value &&
                (await db
                  .selectFrom("leagueUsers")
                  .select(["leagueID"])
                  .where("leagueID", "=", league)
                  .where("user", "=", cheapest.buyer)
                  .where("money", ">=", 100000)
                  .executeTakeFirst()) !== undefined
              ) {
                console.log(
                  `User ${cheapest.buyer} increased bid to ${
                    cheapest.value + 100000
                  } for ${playeruid} due to automatic bid increase in league ${league}`,
                );
                // Increases the bidding amount by 100k for that bid
                await Promise.all([
                  db
                    .updateTable("leagueUsers")
                    .set((eb) => ({
                      money: eb("money", "-", 100000),
                    }))
                    .where("user", "=", cheapest.buyer)
                    .where("leagueID", "=", league)
                    .execute(),
                  db
                    .updateTable("leagueUsers")
                    .set((eb) => ({
                      money: eb("money", "+", 100000),
                    }))
                    .where("user", "=", cheapest.seller)
                    .where("leagueID", "=", league)
                    .execute(),
                  db
                    .updateTable("transfers")
                    .set((eb) => ({
                      value: eb("value", "+", 100000),
                    }))
                    .where("buyer", "=", cheapest.buyer)
                    .where("leagueID", "=", league)
                    .where("playeruid", "=", playeruid)
                    .execute(),
                ]);
              } else {
                // Moves transfer to the new bidder
                await Promise.all([
                  // Updates the original buyers money
                  db
                    .updateTable("leagueUsers")
                    .set((eb) => ({ money: eb("money", "+", cheapest.value) }))
                    .where("user", "=", cheapest.buyer)
                    .where("leagueID", "=", league)
                    .execute(),
                  // Updates the new buyers money
                  db
                    .updateTable("leagueUsers")
                    .set((eb) => ({
                      money: eb(
                        "money",
                        "-",
                        cheapest.value + (isAI ? 0 : 100000),
                      ),
                    }))
                    .where("user", "=", user)
                    .where("leagueID", "=", league)
                    .execute(),
                  // Updates the sellers money
                  db
                    .updateTable("leagueUsers")
                    .set((eb) => ({
                      money: eb("money", "-", isAI ? 0 : 100000),
                    }))
                    .where("user", "=", cheapest.seller)
                    .where("leagueID", "=", league)
                    .execute(),
                  // Updates the transfers data
                  db
                    .updateTable("transfers")
                    .set((eb) => ({
                      value: eb("value", "+", isAI ? 0 : 100000),
                      position: "bench",
                      starred: 0,
                      buyer: user,
                    }))
                    .where("leagueID", "=", league)
                    .where("buyer", "=", cheapest.buyer)
                    .where("playeruid", "=", playeruid)
                    .execute(),
                ]);
                console.log(
                  `User ${user} outbid ${cheapest.buyer} with ${
                    cheapest.value + (isAI ? 0 : 100000)
                  } for ${playeruid} in league ${league}`,
                );
                res.status(200).end("Bought player");
                break;
              }
            }
            break;
          } else {
            res.status(400).end("Player not for sale");
            break;
          }
          // Checks if this is a sale
        } else if (amount < 0) {
          // Checks if the player is already being sold
          const possibleTransfer = await db
            .selectFrom("transfers")
            .selectAll()
            .where("leagueID", "=", league)
            .where("seller", "=", user)
            .where("playeruid", "=", playeruid)
            .executeTakeFirst();
          if (possibleTransfer !== undefined) {
            if (possibleTransfer.value < amount * -1) {
              // Used to check if the buyer has enough money
              const enoughMoney = await db
                .selectFrom("leagueUsers")
                .where("leagueID", "=", league)
                .where("user", "=", possibleTransfer.buyer)
                .select("money")
                .executeTakeFirst()
                .then(
                  (e) =>
                    (e?.money || 0) >= amount * -1 - possibleTransfer.value,
                );
              // Checks if the user is willing to pay enough for the player
              if (possibleTransfer.max >= amount * -1 && enoughMoney) {
                await db
                  .updateTable("transfers")
                  .set({
                    value: amount * -1,
                  })
                  .where("leagueID", "=", league)
                  .where("buyer", "=", possibleTransfer.buyer)
                  .where("seller", "=", user)
                  .where("playeruid", "=", playeruid)
                  .execute();
                await db
                  .updateTable("leagueUsers")
                  .set({
                    money: (eb) =>
                      eb("money", "-", amount * -1 - possibleTransfer.value),
                  })
                  .where("leagueID", "=", league)
                  .where("user", "=", possibleTransfer.buyer)
                  .execute();
                await db
                  .updateTable("leagueUsers")
                  .set({
                    money: (eb) =>
                      eb("money", "+", amount * -1 - possibleTransfer.value),
                  })
                  .where("leagueID", "=", league)
                  .where("user", "=", user)
                  .execute();
              } else {
                if (possibleTransfer.buyer !== -1) {
                  // Makes sure to check if the player has enough money to cancel this
                  if (money < possibleTransfer.value) {
                    res
                      .status(400)
                      .end(
                        `You need to have ${
                          possibleTransfer.value / 1000000
                        }M to increase the minimum amount of the transfer`,
                      );
                    break;
                  }
                  // Makes the transaction a possible offer
                  await db
                    .updateTable("transfers")
                    .set({
                      buyer: -1,
                      max: amount * -1,
                      value: amount * -1,
                    })
                    .where("leagueID", "=", league)
                    .where("seller", "=", user)
                    .where("playeruid", "=", playeruid)
                    .execute();
                  await db
                    .updateTable("leagueUsers")
                    .set({
                      money: (eb) => eb("money", "-", possibleTransfer.value),
                    })
                    .where("leagueID", "=", league)
                    .where("user", "=", user)
                    .execute();
                }
              }
            }
            res.status(200).end("Updated Transfer");
            break;
          }
          // Checks if the player is owned by the user
          if (
            (await db
              .selectFrom("squad")
              .selectAll()
              .where("leagueID", "=", league)
              .where("user", "=", user)
              .where("playeruid", "=", playeruid)
              .executeTakeFirst()) === undefined
          ) {
            res.status(400).end("You do not own this player");
            break;
          }
          // Checks if the user still has a transfer left
          if (!transferLeft) {
            res.status(400).end("You have no more transfers");
            break;
          }
          // Sells the player
          const playerValue = player.sale_price;
          // Stores the amount that the user actually wants for the player
          const actualAmount =
            amount * -1 > player.sale_price ? amount * -1 : player.sale_price;
          const success = await db
            .insertInto("transfers")
            .values({
              leagueID: league,
              seller: user,
              buyer: -1,
              playeruid: playeruid,
              value: actualAmount,
              max: actualAmount,
            })
            .execute()
            .then(() => true)
            .catch(() => false);
          if (!success) {
            res.status(400).end("Failed to sell player");
            break;
          }
          // Checks if this transaction actually has a seller
          if (actualAmount === playerValue) {
            await db
              .updateTable("leagueUsers")
              .set((eb) => ({ money: eb("money", "+", actualAmount) }))
              .where("leagueID", "=", league)
              .where("user", "=", user)
              .execute();
          }
          console.log(
            `User ${user} is ${
              actualAmount > player.sale_price ? "planning to sell" : "selling"
            } ${playeruid} for ${actualAmount} in league ${league}`,
          );
          res
            .status(200)
            .end(
              `${
                actualAmount > player.sale_price
                  ? "Planning to sell"
                  : "Selling"
              } player for minimum of ${actualAmount / 1000000}M`,
            );
          break;
          // Cancels the transaction
        } else {
          // Trys to find the transaction
          const transfer = await db
            .selectFrom("transfers")
            .selectAll()
            .where("leagueID", "=", league)
            .where((eb) =>
              eb.or([eb("seller", "=", user), eb("buyer", "=", user)]),
            )
            .where("playeruid", "=", playeruid)
            .executeTakeFirst();
          if (transfer === undefined) {
            res.status(404).end("Transfer must exist to be cancelled");
            break;
          }
          // Checks if it was a sale
          if (transfer.seller == user) {
            const sale = transfer;
            // Checks if this offer was taken and if it was the seller has to give a refund
            if (sale.buyer !== -1) {
              if (money < sale.value) {
                res
                  .status(400)
                  .end(
                    `You need to have ${
                      sale.value / 1000000
                    }M to cancel the transfer`,
                  );
                break;
              }
              await db
                .updateTable("leagueUsers")
                .set((eb) => ({ money: eb("money", "-", sale.value) }))
                .where("leagueID", "=", league)
                .where("user", "=", user)
                .execute();
            }
            // Removes the transaction and refunds all the money
            await db
              .updateTable("leagueUsers")
              .set((eb) => ({ money: eb("money", "+", sale.value) }))
              .where("leagueID", "=", league)
              .where("user", "=", sale.buyer)
              .execute();
            await db
              .deleteFrom("transfers")
              .where("leagueID", "=", league)
              .where("seller", "=", user)
              .where("playeruid", "=", playeruid)
              .execute();
            res.status(200).end("Transfer cancelled");
            console.log(
              `User ${user} cancelled sale of ${playeruid} to ${sale.buyer} for ${sale.value} in league ${league}`,
            );
            break;
          }
          if (transfer.buyer == user) {
            const purchase = transfer;
            // Removes the canceller from the transaction and refunds them the value of the player
            await db
              .updateTable("leagueUsers")
              .set((eb) => ({ money: eb("money", "+", player.sale_price) }))
              .where("leagueID", "=", league)
              .where("user", "=", user)
              .execute();

            await db
              .updateTable("transfers")
              .set({ max: purchase.value, buyer: 0 })
              .where("leagueID", "=", league)
              .where("buyer", "=", user)
              .where("playeruid", "=", playeruid)
              .execute();

            await db
              .deleteFrom("transfers")
              .where("leagueID", "=", league)
              .where("buyer", "=", 0)
              .where("seller", "=", 0)
              .where("playeruid", "=", playeruid)
              .execute();
            res.status(200).end("Transfer cancelled");
            console.log(
              `User ${user} cancelled purchase of ${playeruid} from ${purchase.buyer} for ${player.sale_price} in league ${league}`,
            );
            break;
          }
        }
        // This will run if something went wrong
        console.log("A transfer failed to finish");
        res.status(500).end("An unknown error happened");
        break;
      default:
        res.status(405).end(`Method ${req.method} Not Allowed`);
        break;
    }
  }
}
