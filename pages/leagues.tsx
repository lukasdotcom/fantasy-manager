import Head from "next/head";
import { useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { LeagueListPart, LeagueListResult } from "./api/league";
import Link from "../components/Link";
import Menu from "../components/Menu";
import {
  TextField,
  Button,
  IconButton,
  Icon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import { NotifyContext, TranslateContext } from "../Modules/context";
import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import db from "#/Modules/database";
import { getData } from "./api/theme";
interface MakeLeagueProps {
  getLeagueData: () => Promise<void>;
  leagues: string[];
}
// Used to create a new League
function MakeLeague({ getLeagueData, leagues }: MakeLeagueProps) {
  const t = useContext(TranslateContext);
  const notify = useContext(NotifyContext);
  const [leagueType, setLeagueType] = useState<string>(leagues[0]);
  const [leagueName, setLeagueName] = useState("");
  const [startingMoney, setStartingMoney] = useState(150);
  if (leagues.length === 0) {
    return (
      <>
        <h2>{t("Create League")}</h2>
        <Link href="/error/no-league">{t("No league types exist. ")}</Link>
      </>
    );
  }
  return (
    <>
      <h2>{t("Create League")}</h2>
      <TextField
        label={t("Starting Money")}
        type="number"
        id="startingMoney"
        variant="outlined"
        size="small"
        onChange={(e) => {
          setStartingMoney(parseFloat(e.target.value));
        }}
        value={startingMoney}
      />
      <br></br>
      <TextField
        label={t("League name")}
        id="name"
        variant="outlined"
        size="small"
        onChange={(e) => {
          setLeagueName(e.target.value);
        }}
        value={leagueName}
      />
      <InputLabel htmlFor="leagueType">
        {t("League")}(
        <Link
          href="https://github.com/Lukasdotcom/fantasy-manager/blob/main/leagues.md"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("League support levels are described here")}
        </Link>
        )
      </InputLabel>
      <Select
        value={leagueType}
        onChange={(val) => setLeagueType(val.target.value)}
        id="leagueType"
      >
        {leagues.map((val) => (
          <MenuItem key={val} value={val}>
            {t(val)}
          </MenuItem>
        ))}
      </Select>
      <br></br>
      <Button
        variant="contained"
        onClick={async () => {
          notify(t("Saving"));
          // Used to create a league
          const response = await fetch("/api/league", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: leagueName,
              startMoney: startingMoney * 1000000,
              leagueType,
            }),
          });
          notify(t(await response.text()), response.ok ? "success" : "error");
          getLeagueData();
        }}
      >
        {t("Create League")}
      </Button>
    </>
  );
}
interface LeaveLeagueProps {
  leagueID: number;
  leagueName: string;
  getLeagueData: () => Promise<void>;
}
// Used to leave a league
function LeaveLeague({
  leagueID,
  leagueName,
  getLeagueData,
}: LeaveLeagueProps) {
  const notify = useContext(NotifyContext);
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  // Handles the opening of the dialog
  function handleOpen() {
    setConfirmation("");
    setOpen(true);
  }
  // Handles the closing of the dialog
  function handleClose() {
    setOpen(false);
  }
  // Handles the closing of the dialog if it was confirmed
  async function deleteLeague() {
    setOpen(false);
    notify(t("Leaving"));
    const response = await fetch(`/api/league/${leagueID}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    notify(await response.text(), response.ok ? "success" : "error");
    getLeagueData();
  }
  const t = useContext(TranslateContext);
  return (
    <>
      <Button
        style={{ margin: "5px" }}
        variant="outlined"
        color="error"
        id={String(leagueID)}
        onClick={handleOpen}
      >
        {t("Leave league")}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          <Icon color="warning">warning</Icon>{" "}
          {t("Are you sure you want to leave?")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t(
              "Leaving a league will permanently delete all the data that you generated in the league. Please confirm that you want to do this by typing the name of the league in the box below. ",
            )}
            {t("The name of the league is:")}
            <b>{leagueName}</b>.
          </DialogContentText>
          <TextField
            error={leagueName !== confirmation}
            label={t("Enter league name here")}
            variant="standard"
            margin="dense"
            fullWidth
            size="small"
            placeholder={leagueName}
            onChange={(e) => {
              setConfirmation(e.target.value);
            }}
            value={confirmation}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            variant="outlined"
            color="error"
            autoFocus
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={deleteLeague}
            variant="contained"
            color="error"
            disabled={leagueName !== confirmation}
          >
            {t("Leave league")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
interface LeaguesProps {
  leagues: string[];
}
// Used to list all the leagues you are part of and to add a league
function Leagues({ leagues }: LeaguesProps) {
  const notify = useContext(NotifyContext);
  const t = useContext(TranslateContext);
  const { data: session, update } = useSession();
  const [leagueList, setLeagueList] = useState<LeagueListResult>({
    leagues: [],
    archived: [],
  });
  // Used to get a list of all the leagues
  const getLeagueData = async () => {
    const data = await fetch("/api/league");
    setLeagueList(await data.json());
  };
  // Makes sure to get the league data on the mount
  useEffect(() => {
    getLeagueData();
  }, []);
  const [favoriteLeague, setFavoriteLeague] = useState<
    LeagueListPart | undefined
  >(undefined);
  // Gets the favorite league
  useEffect(() => {
    // Only updates this when favorite league is undefined and in a session
    if (favoriteLeague || !session) {
      return;
    }
    const newFavoriteLeague = leagueList.leagues.filter(
      (e) => e.leagueID === session.user.favoriteLeague,
    );
    setFavoriteLeague(
      newFavoriteLeague.length > 0
        ? JSON.parse(JSON.stringify(newFavoriteLeague[0]))
        : undefined,
    );
  }, [session, leagueList, favoriteLeague]);
  // Used to update the favorite
  async function updateFavorite(val: LeagueListPart | undefined) {
    let leagueID = 0;
    if (val) {
      leagueID = val.leagueID;
    }
    notify(t("Updaing favorite"));
    const response = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        favorite: leagueID === 0 ? "none" : leagueID,
      }),
    });
    notify(t(await response.text()), response.ok ? "success" : "error");
    setFavoriteLeague(val);
    update();
  }
  return (
    <>
      <Head>
        <title>{t("Leagues")}</title>
      </Head>
      <h1>{t("Leagues")}</h1>
      <p>
        {t(
          "Your favorited league will be available in the menu when you are not in a league. ",
        )}
        {t(
          "You can favorite a league by clicking on the star next to the league. ",
        )}
      </p>
      {favoriteLeague && (
        <p>
          {t("Your favorite league is: {league}", {
            league: favoriteLeague.leagueName,
          })}
          .
        </p>
      )}
      {!favoriteLeague && <p>{t("You have no favorite league. ")}</p>}
      {leagueList.leagues.map((val) => (
        // Makes a link for every league
        <div key={val.leagueID}>
          <strong>{val.leagueName}</strong>
          <Link href={`/${val.leagueID}`}>
            <Button style={{ margin: "5px" }} variant="outlined">
              {t("Open league")}
            </Button>
          </Link>
          <LeaveLeague
            leagueName={val.leagueName}
            leagueID={val.leagueID}
            getLeagueData={getLeagueData}
          />
          <IconButton
            style={{ margin: "5px" }}
            color="secondary"
            onClick={() => updateFavorite(val)}
          >
            <Icon>
              {favoriteLeague && favoriteLeague.leagueID === val.leagueID
                ? "star"
                : "star_outline"}
            </Icon>
          </IconButton>
        </div>
      ))}
      <Button
        color="error"
        variant="outlined"
        onClick={() => updateFavorite(undefined)}
      >
        {t("Clear favorite league")}
        <Icon>delete</Icon>
      </Button>
      <MakeLeague getLeagueData={getLeagueData} leagues={leagues} />
      <h1>{t("Archived Leagues")}</h1>
      <p>
        {t(
          "These are leagues that can be viewed but you can not do anything in. ",
        )}
      </p>
      {leagueList.archived.map((val) => (
        // Makes a link for every league
        <div key={val.leagueID}>
          <strong>{val.leagueName}</strong>
          <Link href={`/${val.leagueID}`}>
            <Button style={{ margin: "5px" }} variant="outlined">
              {t("Open league")}
            </Button>
          </Link>
          <LeaveLeague
            leagueName={val.leagueName}
            leagueID={val.leagueID}
            getLeagueData={getLeagueData}
          />
        </div>
      ))}
    </>
  );
}
export default function Home({
  leagues,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Menu />
      <Leagues leagues={leagues} />
    </>
  );
}
export const getServerSideProps: GetServerSideProps = async (
  ctx: GetServerSidePropsContext,
) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  const leagues = await db
    .selectFrom("plugins")
    .select("name")
    .where("enabled", "=", 1)
    .execute()
    .then((e) => e.map((e) => e.name));
  if (session) {
    return {
      props: {
        leagues,
        t: await getData(ctx),
      },
    };
  } else {
    return {
      redirect: {
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(
          ctx.resolvedUrl,
        )}`,
        permanent: false,
      },
    };
  }
};
