import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import db from "./database";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";
import { getData } from "#/pages/api/theme";
// Used to get information about the redirect for the league runs on every league page
const redirect = async (
  ctx: GetServerSidePropsContext,
  data: { [key: string]: unknown },
): Promise<GetServerSidePropsResult<{ [key: string]: unknown }>> => {
  const league = parseInt(String(ctx.params?.league));
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session) {
    // Checks if the user is in the league or not
    const leagueInfo = await db
      .selectFrom("leagueSettings")
      .selectAll()
      .where("leagueID", "=", league)
      .where((qb) =>
        qb.exists(
          qb
            .selectFrom("leagueUsers")
            .selectAll("leagueUsers")
            .where("leagueID", "=", qb.ref("leagueSettings.leagueID"))
            .where("user", "=", session.user.id),
        ),
      )
      .execute();
    db.updateTable("leagueSettings")
      .set("active", 1)
      .where("leagueID", "=", league)
      .execute();
    if (leagueInfo.length > 0) {
      const transferOpen = await db
        .selectFrom("data")
        .select("value1")
        .where("value1", "=", "transferOpen" + leagueInfo[0].league)
        .where("value2", "=", "true")
        .execute()
        .then((e) => e.length > 0);
      return {
        props: {
          ...data,
          league: league,
          leagueSettings: leagueInfo[0],
          transferOpen,
          t: await getData(ctx),
        },
      };
    } else {
      return {
        notFound: true,
      };
    }
  } else {
    // If the user is not logged in it checks if the league exists
    const leagueExists = await db
      .selectFrom("leagueSettings")
      .selectAll()
      .where("leagueID", "=", league)
      .execute()
      .then((res) => res.length > 0);
    if (leagueExists) {
      // Makes sure to redirect a user that is not logged in but went to a valid league to a login
      return {
        redirect: {
          destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(
            ctx.resolvedUrl,
          )}`,
          permanent: false,
        },
      };
    } else {
      return {
        notFound: true,
      };
    }
  }
};
export default redirect;
