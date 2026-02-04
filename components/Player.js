import playerStyles from "../styles/Player.module.css";
import { useContext, useEffect, useState } from "react";
import { NotifyContext, TranslateContext } from "../Modules/context";
import Image from "next/image";
import { useSession } from "next-auth/react";
import fallbackImg from "../public/playerFallback.png";
import Link from "./Link";
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  alpha,
  useTheme,
} from "@mui/material";
import Dialog from "./Dialog";
import { UserChip } from "./Username";
// Used to create the layout for a player card that shows some simple details on a player just requires the data of the player to be passed into it and you can pass a custom button as a child of the component
// extraText is shown in parenthesis next to the player name
// condensed is which type of condensed view should be shown (transfer, squad, or historical)
function InternalPlayer({ data, children, starred, extraText, condensed }) {
  const t = useContext(TranslateContext);
  const [countdown, setCountown] = useState(0);
  useEffect(() => {
    const check = () =>
      setCountown(
        data.game
          ? Math.ceil((data.game.gameStart - Date.now() / 1000) / 60)
          : 0,
      );
    queueMicrotask(check);
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [data]);
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  let background = "main";
  if (Object.keys(data).length > 0) {
    // Changes the background to the correct color if the player is missing or not known if they are coming
    if (data.forecast == "u") {
      background = "warning";
    } else if (data.forecast == "m") {
      background = "error";
    }
    // Checks if the player exists
    if (data.exists === 0) {
      background = "secondary";
    }
    const price_component =
      data.value === data.sale_price ? (
        <p>{t("{amount} M", { amount: data.value / 1000000 })}</p>
      ) : (
        <p>
          <s>{t("{amount} M", { amount: data.value / 1000000 })}</s>{" "}
          {t("{amount} M", { amount: data.sale_price / 1000000 })}
        </p>
      );
    // Checks if the game has started less than 120 minutes ago and that this is the squad view
    const gameRunning =
      countdown < 0 &&
      countdown > (data.game.gameStart - data.game.gameEnd) / 60;
    const border =
      gameRunning && condensed === "squad"
        ? {
            border: `5px solid ${
              dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.5)"
            }`,
          }
        : {};
    return (
      <Paper
        elevation={1}
        className={playerStyles.container}
        style={{
          height: "120",
          ...border,
          background:
            background !== "main"
              ? alpha(theme.palette[background][theme.palette.mode], 0.3)
              : "rgba(0, 0, 0, 0)",
        }}
      >
        <div style={{ width: "min(10%, 80px)", textAlign: "center" }}>
          <p>{data.club}</p>
          <p>{t(data.position)}</p>
        </div>
        <Image
          alt=""
          src={data.downloaded ? "/api/picture/" + data.pictureID : fallbackImg}
          width={data.downloaded ? (data.width / data.height) * 100 : "100"}
          height="100"
        />
        <div style={{ width: "70%" }}>
          <p>
            <Link styled={false} href={`/player/${data.league}/${data.uid}`}>
              {data.name}
            </Link>
            {starred ? (
              <Image alt="starred" src="/star.svg" width="20" height="20" />
            ) : (
              ""
            )}
            {extraText && <i> {extraText}</i>}
            {data.updateRunning === false && (
              <Link color={"#ff0000"} href="/error/no-update">
                {t("Player Data not updating click for details")}
              </Link>
            )}
          </p>
          <Box
            className={playerStyles.innerContainer}
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            <div>
              <p>{t("Total")}</p>
              <p>{t("{value}", { value: data.total_points })}</p>
            </div>
            <div>
              <p>{t("Average")}</p>
              <p>{t("{value}", { value: data.average_points })}</p>
            </div>
            <div>
              <p>{t("Last")}</p>
              <p>
                {starred && countdown <= 0
                  ? t("{points} X Star", {
                      points: t("{value}", { value: data.last_match }),
                    })
                  : t("{value}", { value: data.last_match })}
              </p>
            </div>
            <div>
              <p>{t("Value")}</p>
              {price_component}
            </div>
            {data.game && (
              <div>
                <p>{t("Next")}</p>
                <p>
                  {countdown >= 0
                    ? t("{team} in {day} D {hour} H {minute} M ", {
                        team: data.game.opponent,
                        day: Math.floor(countdown / 60 / 24),
                        hour: Math.floor(countdown / 60) % 24,
                        minute: Math.floor(countdown) % 60,
                      })
                    : data.game.opponent}
                </p>
              </div>
            )}
          </Box>
          <Box
            className={playerStyles.innerContainer}
            sx={{ display: { xs: "flex", sm: "none" } }}
          >
            {condensed == "transfer" && (
              <div>
                <p>{t("Total")}</p>
                <p>{t("{value}", { value: data.total_points })}</p>
              </div>
            )}
            <div>
              <p>{t("Average")}</p>
              <p>{t("{value}", { value: data.average_points })}</p>
            </div>
            <div>
              <p>{t("Last")}</p>
              <p>
                {starred && countdown <= 0
                  ? t("{points} X Star", {
                      points: t("{value}", { value: data.last_match }),
                    })
                  : t("{value}", { value: data.last_match })}
              </p>
            </div>
            {condensed != "squad" && (
              <div>
                <p>{t("Value")}</p>
                {price_component}
              </div>
            )}
            {data.game && (
              <div>
                <p>{t("Next")}</p>
                <p>
                  {countdown >= 0 && condensed == "squad"
                    ? t("{team} in {day} D {hour} H {minute} M ", {
                        team: data.game.opponent,
                        day: Math.floor(countdown / 60 / 24),
                        hour: Math.floor(countdown / 60) % 24,
                        minute: Math.floor(countdown) % 60,
                      })
                    : data.game.opponent}
                </p>
              </div>
            )}
          </Box>
        </div>
        <div
          className="playerButton"
          style={{
            width: "min(30%, 230px)",
            textAlign: "center",
          }}
        >
          {children}
        </div>
      </Paper>
    );
  } else {
    return (
      <div className={playerStyles.container}>
        <CircularProgress />
      </div>
    );
  }
}
// Used for the transfer screen
export function TransferPlayer({
  uid,
  ownership,
  money,
  league,
  transferData,
  transferLeft,
  open,
  duplicatePlayers,
  allOwnership,
  leagueType,
  showHidden,
}) {
  const notify = useContext(NotifyContext);
  const session = useSession();
  const user = session.data ? session.data.user.id : -1;
  const [data, setData] = useState({});
  const [focused, setFocused] = useState(false);
  const [amount, setAmount] = useState(money);
  const t = useContext(TranslateContext);
  if (
    user !== -1 &&
    Object.values(allOwnership).filter(
      (e) => e.filter((e2) => e2.owner === user).length > 0,
    ).length == 0
  )
    transferLeft = true;
  // Used to get the data for the player
  useEffect(() => {
    async function getData() {
      const info = await (
        await fetch(`/api/player/${leagueType}/${uid}`)
      ).json();
      setData(info);
      setAmount(info.sale_price / 1000000);
    }
    getData();
  }, [uid, leagueType]);
  // Used to purchase a player
  function buySell(amount) {
    amount = amount * 1000000;
    setFocused(false);
    notify("Buying/Selling");
    fetch(`/api/transfer/${league}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playeruid: uid,
        amount,
      }),
    }).then(async (response) => {
      notify(
        t(await response.text(), { amount: amount / 1000000 }),
        response.ok ? "success" : "error",
      );
      transferData();
    });
  }
  let ButtonText = t("Error Getting Player info");
  let ButtonColor = "primary";
  const BuyText = (
    <>
      <TextField
        id="amount"
        variant="outlined"
        size="small"
        label={t("Max bid amount")}
        type="number"
        endadornment={<InputAdornment position="end">M</InputAdornment>}
        onChange={(val) => {
          // Used to change the invite link
          setAmount(val.target.value);
        }}
        value={amount}
      />
      <br />
      <Button color="success" onClick={() => buySell(amount)}>
        {t("Buy for max of {amount} M", { amount })}
      </Button>
    </>
  );
  const SellText = (
    <>
      <TextField
        id="amount"
        variant="outlined"
        size="small"
        label={t("Min sale amount")}
        type="number"
        endadornment={<InputAdornment position="end">M</InputAdornment>}
        onChange={(val) => {
          // Used to change the invite link
          setAmount(val.target.value);
        }}
        value={amount}
      />
      <br />
      <Button color="error" onClick={() => buySell(amount * -1)}>
        {t("Sell for min of {amount} M", { amount })}
      </Button>
    </>
  );
  // This will contain the input for everything you can do
  let Actions = <></>;
  // Checks if the ownership info exists
  if (ownership !== undefined) {
    // Checks if the transfer market is still open
    if (!open) {
      ButtonText = t("Transfer Market is closed");
      // Checks if the user is already purchasing the player
    } else if (ownership.filter((e) => e.buyer === user).length > 0) {
      ButtonText = t("Edit purchase");
      ButtonColor = "success";
      Actions = (
        <>
          {BuyText}
          <Button
            color="secondary"
            onClick={() => {
              buySell(0);
            }}
          >
            {t("Cancel purchase")}
          </Button>
        </>
      );
      // Checks if the user is already selling the player
    } else if (ownership.filter((e) => e.seller === user).length > 0) {
      ButtonText = t("Edit sale");
      ButtonColor = "error";
      Actions = (
        <>
          {SellText}
          <Button
            color="secondary"
            onClick={() => {
              buySell(0);
            }}
          >
            {t("Cancel sale")}
          </Button>
        </>
      );
      // Checks if ther user is out of transfers
    } else if (!transferLeft) {
      ButtonText = t("View transfers");
      // Checks if the user owns the player and can sell the player
    } else if (ownership.filter((e) => e.owner === user).length > 0) {
      ButtonText = t("Sell");
      ButtonColor = "error";
      Actions = <>{SellText}</>;
      // Checks if the player is still purchasable
    } else if (
      duplicatePlayers <= ownership.filter((e) => !e.transfer).length
    ) {
      ButtonText = t("View transfers");
      // Checks if the player can be bought from the market
    } else if (duplicatePlayers > ownership.length) {
      if (data.value > money) {
        ButtonText = t("View transfers");
      } else {
        ButtonText = t("Buy");
        ButtonColor = "success";
        Actions = BuyText;
      }
      // Finds the cheapest market price and sets the purchase for that
    } else {
      let bestDeal = ownership
        .filter((e) => e.transfer)
        .sort((a, b) => a.amount - b.amount)[0];
      let cheapestPrice = bestDeal.amount + 100000;
      if (cheapestPrice > money) {
        ButtonText = t("View transfers");
      } else {
        ButtonText = t("Buy");
        ButtonColor = "success";
        Actions = BuyText;
      }
    }
  } else {
    // If no ownership data exists the player must not be owned by anyone
    if (!open) {
      ButtonText = t("Transfer Market is closed");
    } else if (!transferLeft) {
      ButtonText = t("View transfers");
      // Checks if the user owns the player and can sell the player
    } else if (data.sale_price > money) {
      ButtonText = t("View transfers");
    } else {
      ButtonText = t("Buy");
      ButtonColor = "success";
      Actions = BuyText;
    }
  }
  // Checks if the player should even be shown
  if (
    Object.keys(data).length != 0 &&
    !showHidden &&
    !data.exists &&
    (!ownership ||
      ownership.filter((x) =>
        x.transfer ? x.buyer == user || x.seller == user : x.owner == user,
      ).length == 0)
  ) {
    return <></>;
  }
  return (
    <InternalPlayer data={data} condensed={"transfer"}>
      <Dialog
        onClose={() => setFocused(false)}
        open={focused}
        title={data.name}
      >
        <strong>{t("Transfers")}</strong>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("Seller")}</TableCell>
                <TableCell>{t("Buyer")}</TableCell>
                <TableCell>{t("Amount")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ownership &&
                ownership
                  .filter((e) => e.transfer)
                  .map((e) => (
                    <TableRow key={String(e.buyer + "plus" + e.seller)}>
                      <TableCell>
                        <UserChip userid={e.seller} />
                      </TableCell>
                      <TableCell>
                        <UserChip userid={e.buyer} />
                      </TableCell>
                      <TableCell>
                        {t("{amount} M", { amount: e.amount / 1000000 })}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
        <strong>{t("Owners")}</strong>
        {ownership &&
          ownership
            .filter((e) => !e.transfer)
            .map((e) => (
              <div key={e.owner}>
                <UserChip sx={{ margin: "10px" }} userid={e.owner} />
              </div>
            ))}
        {ownership &&
          ownership
            .filter((e) => e.seller != 0 && e.transfer)
            .map((e) => (
              <UserChip
                sx={{ margin: "10px" }}
                key={e.seller}
                userid={e.seller}
              />
            ))}
        <br />
        {Actions}
      </Dialog>
      <Button
        sx={{
          bgcolor: "background.paper",
        }}
        variant="outlined"
        disabled={
          ButtonText === t("Transfer Market is closed") ||
          ButtonText === t("Error Getting Player info")
        }
        color={ButtonColor}
        onClick={() => {
          setFocused(true);
        }}
      >
        {ButtonText}
      </Button>
    </InternalPlayer>
  );
}
/**
 * Renders a player component with the buttons for squad.
 *
 * @param {Object} props - The properties object for the component.
 * @param {string} props.uid - The unique ID of the player.
 * @param {function} props.update - The function to run whenever the squad is updated.
 * @param {undefined | {att: boolean, mid: boolean, def: boolean, gk: boolean}} props.field - The field property of the player.
 * @param {number} props.league - The league id of the user who has that player.
 * @param {undefined | boolean} props.starred - If the player is starred.
 * @param {string} props.status - Special status of the player like buy/sell.
 * @param {string} props.leagueType - The league type property of the player.
 * @param {boolean} props.transferOpen - If the transfer market is open
 * @param {boolean} [props.hideButton] - If the buttons should be shown
 */
export function SquadPlayer({
  uid,
  update,
  field,
  league,
  starred,
  status,
  leagueType,
  transferOpen,
  hideButton,
}) {
  const t = useContext(TranslateContext);
  const notify = useContext(NotifyContext);
  const [data, setData] = useState({});
  // Used to get the data for the player
  useEffect(() => {
    async function getData() {
      setData(await (await fetch(`/api/player/${leagueType}/${uid}`)).json());
    }
    getData();
  }, [uid, leagueType]);
  // Checks if the player is on the bench or not
  let MoveButton = "";
  let disabled = false;
  let extraText;
  let Buttons = <></>;
  if (!hideButton) {
    if (field === undefined) {
      MoveButton = t("Move to bench");
    } else {
      disabled = !field[data.position];
      MoveButton = !disabled ? t("Move to field") : t("Position is full");
      if (data.locked) {
        disabled = true;
        MoveButton = t("Player has already played");
      }
    }
    Buttons = (
      <>
        <Button
          variant="outlined"
          sx={{ bgcolor: "background.paper" }}
          onClick={() => {
            notify(t("Moving"));
            // Used to move the player
            fetch(`/api/squad/${league}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                playerMove: [uid],
              }),
            })
              .then(async (response) => {
                notify(
                  t(await response.text()),
                  response.ok ? "success" : "error",
                );
              })
              .then(update);
          }}
          disabled={disabled}
        >
          {MoveButton}
        </Button>
        {(starred === false || starred === 0) && !data.locked && (
          <Button
            variant="outlined"
            sx={{
              bgcolor: "background.paper",
            }}
            color="secondary"
            onClick={() => {
              notify(t("Starring"));
              fetch(`/api/squad/${league}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  star: [uid],
                }),
              })
                .then(async (response) => {
                  notify(
                    t(await response.text()),
                    response.ok ? "success" : "error",
                  );
                })
                .then(update);
            }}
          >
            {t("Star")}
          </Button>
        )}
      </>
    );
  }
  if (status == "buy") {
    extraText = transferOpen ? t("Buying") : t("Buying next transfer period");
  } else if (status == "sell") {
    extraText = transferOpen ? t("Selling") : t("Selling next transfer period");
  }
  return (
    <InternalPlayer
      data={data}
      starred={starred}
      extraText={extraText}
      condensed={"squad"}
    >
      {Buttons}
    </InternalPlayer>
  );
}
// Used to show the player without any buttons
export function Player({ uid, children, starred, leagueType }) {
  const [data, setData] = useState({});
  // Used to get the data for the player
  useEffect(() => {
    async function getData() {
      setData(await (await fetch(`/api/player/${leagueType}/${uid}`)).json());
    }
    getData();
  }, [uid, leagueType]);
  return (
    <InternalPlayer data={data} starred={starred} condensed={"historical"}>
      {" "}
      {children}
    </InternalPlayer>
  );
}
// Used to show the player with historical data
export function HistoricalPlayer({ uid, time, children, starred, leagueType }) {
  const [data, setData] = useState({});
  // Used to get the data for the player
  useEffect(() => {
    async function getData() {
      setData(
        await (
          await fetch(`/api/player/${leagueType}/${uid}?time=${time}`)
        ).json(),
      );
    }
    getData();
  }, [uid, time, leagueType]);
  return (
    <InternalPlayer data={data} starred={starred} condensed={"historical"}>
      {children}
    </InternalPlayer>
  );
}
