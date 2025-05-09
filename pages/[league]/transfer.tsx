import Menu from "../../components/Menu";
import redirect from "../../Modules/league";
import Head from "next/head";
import { useState, useEffect, useContext } from "react";
import { TransferPlayer as Player } from "../../components/Player";
import { useSession } from "next-auth/react";
import db from "../../Modules/database";
import Link from "../../components/Link";
import {
  Alert,
  AlertTitle,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormLabel,
  LinearProgress,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
} from "@mui/material";
import { Box } from "@mui/system";
import { TranslateContext } from "../../Modules/context";
import { GetServerSideProps } from "next";
import { GETResult } from "../api/transfer/[league]";
import { Selectable } from "kysely";
import { LeagueSettings } from "#type/db";

// Shows the amount of transfers left
function TransfersLeft({
  ownership,
  allowedTransfers,
  transferCount,
}: {
  ownership: GETResult["ownership"];
  allowedTransfers: number;
  transferCount: number;
}) {
  const session = useSession();
  const t = useContext(TranslateContext);
  const user = session.data ? session.data.user.id : 1;
  return (
    <p>
      {t("{amount} transfers left", {
        amount:
          Object.values(ownership).filter(
            (e) => e.filter((e) => !e.transfer && e.owner === user).length > 0,
          ).length == 0
            ? t("Unlimited")
            : allowedTransfers - transferCount,
      })}
    </p>
  );
}
// Used for the selecting and unselecting of a position
function Postion({
  position,
  positions,
  setPositions,
}: {
  position: string;
  positions: string[];
  setPositions: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const t = useContext(TranslateContext);
  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            checked={positions.includes(position)}
            onChange={(e) => {
              e.target.checked
                ? setPositions([...positions, position])
                : setPositions(positions.filter((e2) => e2 != position));
            }}
          />
        }
        label={t(position)}
      />
    </>
  );
}
function MainPage({
  league,
  maxPrice,
  transferOpen,
  leagueSettings,
}: {
  maxPrice: number;
  league: number;
  transferOpen: boolean;
  leagueSettings: Selectable<LeagueSettings>;
}) {
  const positionList = ["gk", "def", "mid", "att"];
  const [players, setPlayers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState(positionList);
  const [money, setMoney] = useState(0);
  const [ownership, setOwnership] = useState<GETResult["ownership"]>({});
  const [transferCount, setTransferCount] = useState(0);
  const [orderBy, setOrderBy] = useState("value");
  const [showHidden, setShowHidden] = useState(false);
  const [onlySales, setOnlySales] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [open, setOpen] = useState(transferOpen);
  const [clubSearch, setClubSearch] = useState("");
  const [price, setPrice] = useState([0, Math.ceil(maxPrice / 500000) / 2]);
  const [salePrice, setSalePrice] = useState(true);
  const t = useContext(TranslateContext);
  useEffect(() => {
    search(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchTerm,
    positions,
    orderBy,
    showHidden,
    clubSearch,
    price,
    onlySales,
    salePrice,
  ]);
  // Used to get the data for a list of transfers and money
  function transferData() {
    fetch(`/api/transfer/${league}`).then(async (val) => {
      const res: GETResult = await val.json();
      setMoney(res.money);
      setOwnership(res.ownership);
      setTransferCount(res.transferCount);
      setTimeLeft(res.timeLeft);
      setOpen(res.transferOpen);
    });
  }
  // Used to lower the time left by one every second
  useEffect(() => {
    const id = setInterval(
      () => setTimeLeft((timeLeft) => (timeLeft > 0 ? timeLeft - 1 : 0)),
      1000,
    );
    return () => {
      clearInterval(id);
    };
  }, []);
  // Used to calculate transfer message
  const transferMessage = (
    <p>
      {t("Transfer Market {open} for {day} D {hour} H {minute} M {second} S", {
        open: open ? t("open") : t("closed"),
        day: Math.floor(timeLeft / 3600 / 24),
        hour: Math.floor(timeLeft / 3600) % 24,
        minute: Math.floor(timeLeft / 60) % 60,
        second: timeLeft % 60,
      })}
    </p>
  );
  useEffect(transferData, [league]);
  // Used to search the isNew is used to check if it should reload everything back from the start
  async function search(isNew: boolean) {
    let length = -1;
    if (!isNew) {
      if (finished) {
        return;
      } else {
        length = players.length;
      }
    } else {
      setPlayers([]);
      setFinished(false);
    }
    // Gets the data and returns the amount of players found
    setLoading(true);
    const newLength = await fetch(
      `/api/player/${leagueSettings.league}/search?${
        isNew ? "" : `limit=${players.length + 50}&`
      }searchTerm=${encodeURIComponent(
        searchTerm,
      )}&clubSearch=${encodeURIComponent(
        clubSearch,
      )}&positions=${encodeURIComponent(
        JSON.stringify(positions),
      )}&order_by=${encodeURIComponent(orderBy)}&league=${league}&minPrice=${
        price[0] * 1000000
      }&maxPrice=${
        price[1] * 1000000
      }&showHidden=${showHidden}&onlySales=${onlySales}&salePrice=${salePrice}`,
    ).then(async (val) => {
      const res: string[] = await val.json();
      setPlayers(res);
      return res.length;
    });
    setLoading(false);
    if (newLength == length) {
      setFinished(true);
    } else {
      setFinished(false);
    }
  }
  const Part1 = (
    <Box sx={{ flexGrow: 1 }}>
      <TransfersLeft
        ownership={ownership}
        allowedTransfers={leagueSettings.transfers}
        transferCount={transferCount}
      />
      <p>{t("Money left: {amount} M", { amount: money / 1000000 })}</p>
      {transferMessage}
      <TextField
        onChange={(val) => {
          setSearchTerm(val.target.value);
        }}
        value={searchTerm}
        label="Search Player"
        id="searchPlayer"
      ></TextField>
      <TextField
        onChange={(val) => {
          setClubSearch(val.target.value);
        }}
        value={clubSearch}
        id="searchClub"
        label={t("Search Club")}
        helperText={t("Use the acronymn ex: FCB, VFB")}
      ></TextField>
      <br />
      <Box sx={{ width: "90%" }}>
        <FormLabel htmlFor="value">
          {t("Value: {price1} M to {price2} M", {
            price1: price[0],
            price2: price[1],
          })}
        </FormLabel>
        <Slider
          step={0.5}
          value={price}
          onChange={(_, value) => setPrice(value as number[])}
          id="value"
          max={Math.ceil(maxPrice / 500000) / 2}
        />
      </Box>
      <FormControlLabel
        control={
          <Switch
            id="sale"
            onChange={(e) => {
              setSalePrice(e.target.checked);
            }}
            checked={salePrice}
          />
        }
        label={t("Use sale price instead of value")}
      />
      <br></br>
      <FormLabel htmlFor="order">{t("Sort players by: ")}</FormLabel>
      <Select
        value={orderBy}
        onChange={(val) => setOrderBy(val.target.value)}
        id="order"
      >
        {[
          ["value", "Value"],
          ["total_points", "Total Points"],
          ["average_points", "Average Points"],
          ["last_match", "Last Match"],
        ].map((val) => (
          <MenuItem key={val[0]} value={val[0]}>
            {t(val[1])}
          </MenuItem>
        ))}
      </Select>
      <br></br>
    </Box>
  );
  const Part2 = (
    <Box sx={{ flexGrow: 1 }}>
      <FormLabel component="legend">{t("Positions to search: ")}</FormLabel>
      <FormGroup>
        {positionList.map((position) => (
          <Postion
            key={position}
            position={position}
            positions={positions}
            setPositions={setPositions}
          />
        ))}
      </FormGroup>
      <FormControlLabel
        control={
          <Switch
            id="showHidden"
            onChange={(e) => {
              setShowHidden(e.target.checked);
            }}
            checked={showHidden}
          />
        }
        label={t("Show hidden players")}
      />
      <br />
      <FormControlLabel
        control={
          <Switch
            id="onlySales"
            onChange={(e) => {
              setOnlySales(e.target.checked);
            }}
            checked={onlySales}
          />
        }
        label={t("Show only players on sale")}
      />
      <br />
      <Link href="/download">
        <Button>{t("Download Data")}</Button>
      </Link>
      <p>{t("Clicking on a player's name will show more information. ")}</p>
    </Box>
  );
  return (
    <div
      className="main-content"
      onScroll={(e) => {
        // Checks if scrolled to the bottom
        const bottom =
          e.currentTarget.scrollHeight -
          e.currentTarget.scrollTop -
          e.currentTarget.clientHeight;
        // Checks if there are only 2 players left that are not shown and if true requests 10 more players
        if (bottom < (e.currentTarget.scrollHeight / players.length) * 2) {
          search(false);
          setFinished(true);
        }
      }}
    >
      <Head>
        <title>
          {t("Transfers for {leagueName}", {
            leagueName: leagueSettings.leagueName,
          })}
        </title>
      </Head>
      <Menu league={league} />
      <h1>
        {t("Transfers for {leagueName}", {
          leagueName: leagueSettings.leagueName,
        })}
      </h1>
      <Box sx={{ marginLeft: 2, display: { xs: "block", md: "none" } }}>
        {Part1}
        {Part2}
      </Box>
      <Box
        sx={{
          marginLeft: 2,
          marginRight: 2,
          display: { xs: "none", md: "flex" },
        }}
      >
        {Part1}
        {Part2}
      </Box>
      {players.map((val) => (
        <Player
          key={val}
          uid={val}
          money={money}
          ownership={ownership[val]}
          league={league}
          transferLeft={transferCount < leagueSettings.transfers}
          allOwnership={ownership}
          transferData={transferData}
          open={open || leagueSettings.matchdayTransfers > 0}
          duplicatePlayers={leagueSettings.duplicatePlayers}
          leagueType={leagueSettings.league}
          showHidden={showHidden}
        />
      ))}
      {loading && <LinearProgress />}
    </div>
  );
}
export default function Home(props: {
  maxPrice: number;
  league: number;
  transferOpen: boolean;
  leagueSettings: Selectable<LeagueSettings>;
}) {
  const t = useContext(TranslateContext);
  const { archived, leagueName, fantasyEnabled } = props.leagueSettings;
  // Checks if the league is archived
  if (archived !== 0) {
    return (
      <>
        <Head>
          <title>{t("Transfers for {leagueName}", { leagueName })}</title>
        </Head>
        <Menu league={props.league} />
        <h1>{t("Transfers for {leagueName}", { leagueName })}</h1>
        <Alert severity={"warning"} className="notification">
          <AlertTitle>{t("This league is archived")}</AlertTitle>
          <p>{t("This league is archived and this screen is disabled. ")}</p>
        </Alert>
      </>
    );
  } else if (!fantasyEnabled) {
    return (
      <>
        <Head>
          <title>
            {t("Squad for {leagueName}", {
              leagueName,
            })}
          </title>
        </Head>
        <Menu league={props.league} />
        <h1>
          {t("Squad for {leagueName}", {
            leagueName,
          })}
        </h1>
        <Alert severity={"warning"} className="notification">
          <AlertTitle>{t("Fantasy is Disabled")}</AlertTitle>
          <p>
            {t("Fantasy manager must be enabled in the league to use this. ")}
          </p>
        </Alert>
      </>
    );
  } else {
    return <MainPage {...props} />;
  }
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const leagueID = parseInt(String(ctx?.params?.league));
  // Gets the amount of allowed transfers
  const league = await db
    .selectFrom("leagueSettings")
    .selectAll()
    .where("leagueID", "=", leagueID)
    .select("league")
    .executeTakeFirst()
    .then((e) => (e ? e.league : "Bundesliga"));
  const maxPrice = await db
    .selectFrom("players")
    .select("value")
    .orderBy("value", "desc")
    .where("league", "=", league)
    .executeTakeFirst()
    .then((e) => (e ? e.value : 0));
  return await redirect(ctx, { maxPrice });
};
