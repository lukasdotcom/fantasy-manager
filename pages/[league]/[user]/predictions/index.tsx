import db from "#/Modules/database";
import redirect from "#/Modules/league";
import Menu from "../../../../components/Menu";
import { leagueSettings } from "#/types/database";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { TranslateContext } from "#/Modules/context";
import { useContext } from "react";
import {
  Alert,
  AlertTitle,
  FormLabel,
  Grid,
  Pagination,
  PaginationItem,
} from "@mui/material";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { checkUpdate } from "#/scripts/checkUpdate";
import { Game, predictions } from "#/components/Prediction";
import { get_predictions } from "#Modules/predictions";

export default function HistoricalView({
  user,
  predictions,
  username,
  latestMatchday,
  leagueSettings,
  currentMatchday,
}: {
  user: number;
  predictions: predictions[];
  username: string;
  latestMatchday: number;
  leagueSettings: leagueSettings;
  currentMatchday: number;
}) {
  const t = useContext(TranslateContext);
  const router = useRouter();
  const { leagueName, leagueID, archived, predictionsEnabled } = leagueSettings;
  const session = useSession();
  const current_userid = session.data?.user?.id;
  if (!predictionsEnabled) {
    return (
      <>
        <Head>
          <title>
            {t("Predictions for {leagueName}", {
              leagueName,
            })}
          </title>
        </Head>
        <Menu league={leagueID} />
        <h1>
          {t("Predictions for {leagueName}", {
            leagueName,
          })}
        </h1>
        <Alert severity={"warning"} className="notification">
          <AlertTitle>{t("Predictions are Disabled")}</AlertTitle>
          <p>{t("Predictions must be enabled in the league to use this. ")}</p>
        </Alert>
      </>
    );
  }
  let title_text = t("{username}'s predictions {matchday} from {leagueName}", {
    username,
    matchday:
      currentMatchday === 0
        ? ""
        : t("on matchday {currentMatchday}", { currentMatchday }),
    leagueName,
  });
  if (currentMatchday === -1) {
    title_text = t("{username}'s future predictions for {leagueName}", {
      username,
      leagueName,
    });
  }
  return (
    <>
      <Head>
        <title>{title_text}</title>
      </Head>
      <Menu league={leagueID} />
      <h1>{title_text}</h1>
      <Grid container spacing={2}>
        {predictions.map((e) => (
          <Grid container size={{ lg: 4, xs: 6 }} key={e.home_team}>
            <Game
              league={leagueID}
              readOnly={user !== current_userid || !!archived}
              {...e}
            />
          </Grid>
        ))}
      </Grid>
      <FormLabel id="matchdayLabel">{t("Select matchday")}</FormLabel>
      <Pagination
        page={
          currentMatchday == 0
            ? latestMatchday + 1
            : currentMatchday == -1
              ? latestMatchday + 2
              : currentMatchday
        }
        count={latestMatchday + 2}
        onChange={(e, v) => {
          if (v === latestMatchday + 1) {
            router.push(`/${leagueID}/${user}/predictions`);
          } else if (v > latestMatchday + 1) {
            router.push(`/${leagueID}/${user}/predictions/future`);
          } else {
            router.push(`/${leagueID}/${user}/predictions/${v}`);
          }
        }}
        renderItem={(item) => {
          let page: number | string | null = item.page;
          if (item.page === null || item.page == latestMatchday + 1) {
            page = t("Latest");
          } else if (item.page === null || item.page > latestMatchday + 1) {
            page = t("Future");
          }
          return <PaginationItem {...item} page={page} />;
        }}
      ></Pagination>
    </>
  );
}
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = parseInt(String(ctx.params?.user));
  const league = parseInt(String(ctx.params?.league));
  const [predictions, username, latestMatchday] = await Promise.all([
    // Gets the latest predictions for the user
    get_predictions(user, league, checkUpdate),
    // Gets the username of the user
    db
      .selectFrom("users")
      .select("username")
      .where("id", "=", user)
      .executeTakeFirst()
      .then((e) => (e ? e.username : "")),
    // Gets the latest matchday in that league
    db
      .selectFrom("points")
      .select("matchday")
      .where("leagueID", "=", league)
      .where("user", "=", user)
      .orderBy("matchday", "desc")
      .executeTakeFirst()
      .then((e) => (e ? e.matchday : 0)),
  ]);
  // Checks if the user exists
  if (username === "") {
    return {
      notFound: true,
    };
  }
  return await redirect(ctx, {
    user,
    predictions,
    username,
    latestMatchday,
    currentMatchday: 0,
  });
};
