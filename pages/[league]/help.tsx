import Head from "next/head";
import { createRef, useContext, useState } from "react";
import { GetServerSideProps } from "next";
import { TranslateContext } from "../../Modules/context";
import db from "../../Modules/database";
import { leagueSettings } from "#types/database";
import { Button, Icon, IconButton, Tooltip } from "@mui/material";
import { useRouter } from "next/router";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
export default function Home(props: leagueSettings) {
  const t = useContext(TranslateContext);
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [listView, setListView] = useState(false);
  const router = useRouter();
  const iframe = createRef<HTMLIFrameElement>();
  const tutorial = [];
  tutorial.push({
    title: t("Welcome"),
    text: t(
      "This is the welcome page for the tutorial. You can use the right and left arrows at the bottom of the page to navigate through the tutorial and the X in the top right of the screen to leave the tutorial. ",
    ),
  });
  if (props.predictionsEnabled) {
    tutorial.push({
      title: t("Predictions"),
      text: t(
        "On the predictions page you can enter the predictions for games. You will get {predictWinner} points for predicting the correct winner, {predictDifference} points for predicting the correct score difference, and {predictExact} points for predicting the exact score. ",
        {
          predictWinner: props.predictWinner,
          predictDifference: props.predictDifference,
          predictExact: props.predictExact,
        },
      ),
    });
  }
  if (props.fantasyEnabled) {
    tutorial.push({
      title: t("Transfers"),
      text: t(
        "Open up the transfers page on the website. At the top of the transfers page are a few things like ways of filtering players, the total amount of money you have left, and how long the transfer market is still open or closed. Here you can buy players. Now click the {buy} button to buy a player. ",
        { buy: t("Buy") },
      ),
    });
    tutorial.push({
      title: t("Transfer Details"),
      text: t(
        "Now you should see a window with that players transfer details. At the top is the players name. Underneath that you can see a section that is called transfers. This section shows the buyers and sellers of that player and how much they are paying right now for that player. Underneath that section is the Owners section. This section has a list of users that own that player. In this league {number} user(s) can have the same player. Then underneath that is how much you are willing to buy the player for. Note this is the maximum you are willing to pay. ",
        { number: props.duplicatePlayers },
      ),
    });
    tutorial.push({
      title: t("Player Details"),
      text: t(
        "Now click on a players name. You should now see that players detailed statistics including the history of that player at the bottom. You can go back now to the transfers page. ",
      ),
    });
    tutorial.push({
      title: t("Buying your Team"),
      text: t(
        "You can now close the player transfer details window. Now you should buy your team. It is reccomended to buy 2 Goalkeepers, 5 Defenders, 5 Midfielders, and 3 Attackers, but you can buy as many or as few as you want. Note that you can always cancel your purchases and get refunded the players value. Once you have bought your team go to the next step. ",
      ),
    });
    tutorial.push({
      title: t("Setting Up Your Squad"),
      text: t("{a}{b}{c}", {
        a: t(
          "Now you should go to the squad page. Here you can setup your squad. You can change your formation at the top. You can move players from the bench to the field and back again. You can also star one forward, one midfielder, and one defender. Starred players get {star_bonus}% of the points they would normally get. ",
          { star_bonus: props.starredPercentage },
        ),
        b: props.top11
          ? t(
              "Due to Top 11 being enabled you can not change formation, change starred players, or substitute players during the matchday. Instead your players will automatically be optimally substituted during the matchday. Note that your starred players and formations will not change during the matchday. ",
            )
          : t(
              "Once a player has played on that matchday you can not move them back onto the field or star them. ",
            ),
        c: t("Players on the bench earn you no points. "),
      }),
    });
    tutorial.push({
      title: t("Final Fantasy Tips"),
      text: t(
        "This is all you have to do for now. Between every matchday you can buy or sell {amount} players to improve your squad. You can click on the settings gear to change your user's settings. You can also click on the leagues page to show all the leagues you are in. Click on the league standings page to see the rules for this league. ",
        { amount: props.transfers },
      ),
    });
  }
  const exit = () => {
    router.push(iframe?.current?.contentWindow?.location.href ?? "/");
  };
  return (
    <>
      <Head>
        <title>{t("Help")}</title>
      </Head>
      <Tooltip title={t("Exit Tutorial")}>
        <IconButton
          onClick={exit}
          style={{ position: "absolute", top: 0, right: 0, zIndex: 99999999 }}
        >
          <Icon>close</Icon>
        </IconButton>
      </Tooltip>
      {!listView && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
          }}
        >
          <iframe
            ref={iframe}
            src={`/${router.locale}/${props.leagueID}`}
            style={{
              width: "100%",
              height: "100%",
            }}
          ></iframe>
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <IconButton
              disabled={tutorialIndex <= 0}
              onClick={() => {
                setTutorialIndex(tutorialIndex - 1);
              }}
            >
              <Icon>arrow_back</Icon>
            </IconButton>
            <div style={{ textAlign: "center" }}>
              <h2>{tutorial[tutorialIndex].title}</h2>
              <p>{tutorial[tutorialIndex].text}</p>
              {tutorialIndex == 0 && (
                <Button onClick={() => setListView(true)}>
                  {t("Switch to List View")}
                </Button>
              )}
            </div>
            <IconButton
              disabled={tutorialIndex >= tutorial.length - 1}
              onClick={() => {
                setTutorialIndex(tutorialIndex + 1);
              }}
            >
              <Icon>arrow_forward</Icon>
            </IconButton>
          </div>
        </div>
      )}
      {listView && (
        <>
          <Button onClick={() => setListView(false)}>
            {t("Switch to Step View")}
          </Button>
          {tutorial.map((step, index) => (
            <div key={index}>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
          ))}
        </>
      )}
    </>
  );
}
export const getServerSideProps: GetServerSideProps = async (context) => {
  const leagueID = parseInt(String(context?.params?.league));
  const settings = await db
    .selectFrom("leagueSettings")
    .selectAll()
    .where("leagueID", "=", leagueID)
    .executeTakeFirst();
  if (settings === undefined) {
    return {
      notFound: true,
    };
  }
  // Makes sure to say that the league tutorial has been looked at
  db.updateTable("leagueUsers")
    .set("tutorial", 0)
    .where("leagueID", "=", leagueID)
    .where(
      "user",
      "=",
      (await getServerSession(context.req, context.res, authOptions))?.user.id,
    )
    .execute();
  return { props: JSON.parse(JSON.stringify(settings)) };
};
