import db from "#database";
import redirect from "#/Modules/league";
import { leagueSettings } from "#/types/database";
import { GetServerSideProps } from "next";
import HistoricalView from ".";
import { predictions } from "#/components/Prediction";
import { get_predictions } from "#Modules/predictions";

export default function Home(props: {
  user: number;
  predictions: predictions[];
  username: string;
  latestMatchday: number;
  leagueSettings: leagueSettings;
  currentMatchday: number;
}) {
  return <HistoricalView {...props} />;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = parseInt(String(ctx.params?.user));
  const league = parseInt(String(ctx.params?.league));
  const currentMatchday = parseInt(String(ctx.params?.matchday));
  const [predictions, username, latestMatchday] = await Promise.all([
    // Gets the latest predictions for the user
    get_predictions(user, league, undefined, currentMatchday),
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
  if (currentMatchday > latestMatchday) {
    return {
      redirect: {
        destination: `/${league}/${user}/predictions/`,
        permanent: false,
      },
    };
  }
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
    currentMatchday,
  });
};
