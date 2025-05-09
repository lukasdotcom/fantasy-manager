import Menu from "../../components/Menu";
import redirect from "../../Modules/league";
import Head from "next/head";
import { SquadPlayer as Player } from "../../components/Player";
import { useContext, useState } from "react";
import { leagueSettings } from "#types/database";
import {
  Alert,
  AlertTitle,
  Box,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Typography,
} from "@mui/material";
import { getLeagueInfo, LeagueInfo } from "../api/squad/[league]";
import { NotifyContext, TranslateContext } from "../../Modules/context";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { GetServerSideProps } from "next";

export default function Home({
  league,
  leagueInfo,
  transferOpen,
  leagueSettings,
}: {
  league: number;
  leagueInfo: LeagueInfo;
  transferOpen: boolean;
  leagueSettings: leagueSettings;
}) {
  const notify = useContext(NotifyContext);
  const t = useContext(TranslateContext);
  const [showSelling, setShowSelling] = useState(true);
  interface squadMember {
    playeruid: string;
    starred: boolean;
    status: string;
  }
  const [squad, setSquad] = useState<{
    att: squadMember[];
    mid: squadMember[];
    def: squadMember[];
    gk: squadMember[];
    bench: squadMember[];
  }>(() => {
    // Turns the leagueInfo data into the data for the starting state
    const players: {
      att: squadMember[];
      mid: squadMember[];
      def: squadMember[];
      gk: squadMember[];
      bench: squadMember[];
    } = { att: [], mid: [], def: [], gk: [], bench: [] };
    leagueInfo.players.forEach((e) => {
      if (
        e.position === "att" ||
        e.position === "mid" ||
        e.position === "def" ||
        e.position === "gk" ||
        e.position === "bench"
      ) {
        players[e.position].push({
          playeruid: e.playeruid,
          starred: e.starred,
          status: e.status,
        });
      }
    });
    return players;
  });
  const [formation, setFormation] = useState(leagueInfo.formation);
  const [position_total, setPosition_total] = useState(
    leagueInfo.position_total,
  );
  const [validFormations, setValidFormations] = useState(
    leagueInfo.validFormations,
  );
  // Checks if the league is archived
  if (leagueSettings.archived) {
    return (
      <>
        <Head>
          <title>
            {t("Squad for {leagueName}", {
              leagueName: leagueSettings.leagueName,
            })}
          </title>
        </Head>
        <Menu league={league} />
        <h1>
          {t("Squad for {leagueName}", {
            leagueName: leagueSettings.leagueName,
          })}
        </h1>
        <Alert severity={"warning"} className="notification">
          <AlertTitle>{t("This league is archived")}</AlertTitle>
          <p>{t("This league is archived and this screen is disabled. ")}</p>
        </Alert>
      </>
    );
  }
  if (!leagueSettings.fantasyEnabled) {
    return (
      <>
        <Head>
          <title>
            {t("Squad for {leagueName}", {
              leagueName: leagueSettings.leagueName,
            })}
          </title>
        </Head>
        <Menu league={league} />
        <h1>
          {t("Squad for {leagueName}", {
            leagueName: leagueSettings.leagueName,
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
  }
  const field = {
    att: squad.att.length < formation[3],
    mid: squad.mid.length < formation[2],
    def: squad.def.length < formation[1],
    gk: squad.gk.length < formation[0],
  };
  function getSquad() {
    fetch(`/api/squad/${league}`).then(async (e) => {
      const val: LeagueInfo = await e.json();
      const players: {
        att: squadMember[];
        mid: squadMember[];
        def: squadMember[];
        gk: squadMember[];
        bench: squadMember[];
      } = { att: [], mid: [], def: [], gk: [], bench: [] };
      val.players.forEach((e) => {
        if (
          e.position === "att" ||
          e.position === "mid" ||
          e.position === "def" ||
          e.position === "gk" ||
          e.position === "bench"
        ) {
          players[e.position].push({
            playeruid: e.playeruid,
            starred: e.starred,
            status: e.status,
          });
        }
      });
      setFormation(val.formation);
      setSquad(players);
      setValidFormations(val.validFormations);
      setPosition_total(val.position_total);
    });
  }
  /**
   * This function checks if the formation can be changed to the new formation.
   *
   * @param {number[]} newFormation - An array representing the new formation with the number of players in each position.
   * @return {boolean} Returns true if the new formation is valid, false otherwise.
   */
  function changeToFormation(newFormation: number[]): boolean {
    const defenders = newFormation[1] - squad["def"].length;
    const midfielders = newFormation[2] - squad["mid"].length;
    const forwards = newFormation[3] - squad["att"].length;
    return !(defenders >= 0) || !(midfielders >= 0) || !(forwards >= 0);
  }
  const FieldPlayers = (
    <Box width={{ xs: "100%", lg: "50%" }}>
      <h2>{t("Attackers")}</h2>
      {squad["att"].map(
        (
          e, // Used to get the players for the attack
        ) => (
          <Player
            uid={e.playeruid}
            key={e.playeruid}
            league={league}
            starred={e.starred}
            update={getSquad}
            status={e.status}
            leagueType={leagueSettings.league}
            field={undefined}
            transferOpen={transferOpen}
            hideButton={!transferOpen && leagueSettings.top11}
          />
        ),
      )}
      <h2>{t("Midfielders")}</h2>
      {squad["mid"].map(
        (
          e, // Used to get the players for the mid
        ) => (
          <Player
            uid={e.playeruid}
            key={e.playeruid}
            league={league}
            starred={e.starred}
            update={getSquad}
            status={e.status}
            leagueType={leagueSettings.league}
            field={undefined}
            transferOpen={transferOpen}
            hideButton={!transferOpen && leagueSettings.top11}
          />
        ),
      )}
      <h2>{t("Defenders")}</h2>
      {squad["def"].map(
        (
          e, // Used to get the players for the defense
        ) => (
          <Player
            uid={e.playeruid}
            key={e.playeruid}
            league={league}
            starred={e.starred}
            update={getSquad}
            status={e.status}
            leagueType={leagueSettings.league}
            field={undefined}
            transferOpen={transferOpen}
            hideButton={!transferOpen && leagueSettings.top11}
          />
        ),
      )}
      <h2>{t("Goalkeeper")}</h2>
      {squad["gk"].map(
        (
          e, // Used to get the player for the goalkeeper
        ) => (
          <Player
            uid={e.playeruid}
            key={e.playeruid}
            league={league}
            update={getSquad}
            status={e.status}
            leagueType={leagueSettings.league}
            field={undefined}
            starred={undefined}
            transferOpen={transferOpen}
            hideButton={!transferOpen && leagueSettings.top11}
          />
        ),
      )}
    </Box>
  );
  const BenchPlayers = (
    <Box width={{ xs: "100%", lg: "50%" }}>
      <h2>{t("Bench")}</h2>
      <FormControlLabel
        control={
          <Switch
            id="showSelling"
            onChange={(e) => {
              setShowSelling(e.target.checked);
            }}
            checked={showSelling}
          />
        }
        label={
          transferOpen
            ? t("Show Players that are being sold")
            : t("Show Players that are being bought")
        }
      />
      {squad["bench"]
        .filter(
          (e) => showSelling || e.status !== (transferOpen ? "sell" : "buy"),
        )
        .map(
          (
            e, // Used to get the players for the bench
          ) => (
            <Player
              uid={e.playeruid}
              key={e.playeruid}
              field={field}
              league={league}
              update={getSquad}
              status={e.status}
              leagueType={leagueSettings.league}
              starred={
                !transferOpen && leagueSettings.top11 ? e.starred : undefined
              }
              transferOpen={transferOpen}
              hideButton={!transferOpen && leagueSettings.top11}
            />
          ),
        )}
    </Box>
  );
  return (
    <>
      <Head>
        <title>
          {t("Squad for {leagueName}", {
            leagueName: leagueSettings.leagueName,
          })}
        </title>
      </Head>
      <Menu league={league} />
      <h1>
        {t("Squad for {leagueName}", { leagueName: leagueSettings.leagueName })}
      </h1>
      <InputLabel htmlFor="formation">{t("Formation")}</InputLabel>
      <Select
        onChange={(e) => {
          // Used to change the formation
          const newFormation = JSON.parse(e.target.value);
          setFormation(newFormation);
          notify("Saving");
          fetch(`/api/squad/${league}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              formation: newFormation,
            }),
          }).then(async (response) => {
            notify(await response.text(), response.ok ? "success" : "error");
          });
        }}
        value={JSON.stringify(formation)}
        id="formation"
      >
        {validFormations.map((val) => (
          <MenuItem
            key={JSON.stringify(val)}
            disabled={changeToFormation(val)}
            value={JSON.stringify(val)}
          >
            {val[1]}-{val[2]}-{val[3]}
          </MenuItem>
        ))}
      </Select>
      <Typography>
        {t(
          "You have {att} attacker(s), {mid} midfielder(s), {def} defender(s), and {gk} goalkeeper(s) in your squad. ",
          {
            att: position_total.att,
            mid: position_total.mid,
            def: position_total.def,
            gk: position_total.gk,
          },
        )}
      </Typography>
      <Box sx={{ display: { xs: "block", lg: "none" } }}>
        {FieldPlayers}
        {BenchPlayers}
      </Box>
      <Box
        sx={{
          gap: 0.5,
          display: { xs: "none", lg: "flex" },
        }}
      >
        {FieldPlayers}
        {BenchPlayers}
      </Box>
    </>
  );
}

// Gets the users session
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  // Gets the league info
  const leagueInfo: LeagueInfo | void = await getLeagueInfo(
    parseInt(String(ctx.query.league)),
    session?.user?.id ? session?.user?.id : -1,
  ).catch((e) => {
    console.error(e);
  });
  return await redirect(ctx, { leagueInfo });
};
