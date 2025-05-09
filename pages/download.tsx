import {
  Button,
  ButtonGroup,
  Checkbox,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import Head from "next/head";
import Link from "../components/Link";
import { useContext, useState } from "react";
import Menu from "../components/Menu";
import { GetStaticProps } from "next";
import { TranslateContext } from "../Modules/context";
import db from "#/Modules/database";
import { useRouter } from "next/router";
import { getData } from "./api/theme";
type historicalTimes = { [Key: string]: number[] };
interface props {
  historicalTimes: historicalTimes;
  leagues: string[];
  league_enabled: { [Key: string]: boolean };
}
type fileTypes = "json" | "csv";
export default function Home({
  historicalTimes,
  leagues,
  league_enabled,
}: props) {
  const [matchday, setMatchday] = useState(0);
  const [showHidden, setShowHidden] = useState(false);
  const [league, setLeague] = useState(leagues[0]);
  // Used to handle when the league selected changes
  const changeLeague = (e: SelectChangeEvent) => {
    setLeague(e.target.value);
    setMatchday(0);
  };
  const router = useRouter();
  const t = useContext(TranslateContext);
  // Generates the download link
  function downloadLink(type: fileTypes) {
    return `/api/download?type=${type}&league=${league}${
      matchday !== 0 ? `&time=${matchday}` : ""
    }${showHidden ? "&showHidden=true" : ""}&locale=${router.locale}`;
  }
  return (
    <>
      <Head>
        <title>{t("Download Data")}</title>
      </Head>
      <Menu />
      <h1>{t("Download Data")}</h1>
      <p>
        {t("Here you can download the player data for personal use. ")}
        {t("This downloaded player data is only available in english. ")}
      </p>
      {leagues.length > 0 && (
        <>
          <InputLabel htmlFor="time">{t("Time")}</InputLabel>
          <Select
            id="time"
            value={matchday}
            onChange={(val) => setMatchday(val.target.value as number)}
          >
            {historicalTimes[league].map((e: number) => {
              const date = new Date(e * 1000);
              return (
                <MenuItem key={e} value={e}>
                  {t("{date}", { date })}
                </MenuItem>
              );
            })}
            <MenuItem value={0}>{t("Latest")}</MenuItem>
          </Select>
          <InputLabel htmlFor="league">{t("League")}</InputLabel>
          <Select value={league} onChange={changeLeague} id="league">
            {leagues.map((val) => (
              <MenuItem key={val} value={val}>
                {t(val)}
              </MenuItem>
            ))}
          </Select>
          <br />
          {!league_enabled[league] && (
            <p>{t("Note that this league is not updated anymore.")}</p>
          )}
          <FormControlLabel
            label={t("Download hidden players in addition to all other ones")}
            control={
              <Checkbox
                id="showHidden"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
            }
          />
          <br />
          {t("CSV is the recommended format. ")}
          <br />
          <ButtonGroup>
            <Button>
              <Link disableNext={true} href={downloadLink("csv")}>
                {t("Download as {file}", { file: "csv" })}
              </Link>
            </Button>
            <Button>
              <Link disableNext={true} href={downloadLink("json")}>
                {t("Download as {file}", { file: "json" })}
              </Link>
            </Button>
          </ButtonGroup>
        </>
      )}
      {leagues.length === 0 && (
        <Link href="/error/no-league">{t("No league types exist. ")}</Link>
      )}
    </>
  );
}
export const getStaticProps: GetStaticProps = async (context) => {
  // Gets a list of all the times stored by each league
  const historicalTimes: historicalTimes = {};
  const leagueTypes = await db
    .selectFrom("players")
    .select("league")
    .distinct()
    .execute()
    .then((e) => e.map((e) => e.league));
  const league_enabled: { [Key: string]: boolean } = {};
  await Promise.all(
    leagueTypes.map(
      (league) =>
        new Promise<void>(async (res) => {
          const times = await db
            .selectFrom("historicalPlayers")
            .select("time")
            .distinct()
            .where("league", "=", league)
            .execute();
          historicalTimes[league] = times.map((e) => e.time);
          league_enabled[league] =
            (await db
              .selectFrom("plugins")
              .select("name")
              .where("name", "=", league)
              .where("enabled", "=", 1)
              .executeTakeFirst()) !== undefined;
          res();
        }),
    ),
  );
  return {
    props: {
      historicalTimes,
      leagues: leagueTypes,
      league_enabled,
      t: await getData(context),
    },
  };
};
