import Menu from "../../components/Menu";
import redirect from "../../Modules/league";
import Head from "next/head";
import { useContext, useEffect, useState } from "react";
import { stringToColor, UserChip } from "../../components/Username";
import db from "../../Modules/database";
import {
  announcements,
  anouncementColor,
  leagueSettings,
} from "#types/database";
import Link from "../../components/Link";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Pagination,
  PaginationItem,
  TextField,
  Slider,
  Alert,
  AlertTitle,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Icon,
  FormLabel,
} from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  NotifyContext,
  TranslateContext,
  UserContext,
} from "../../Modules/context";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import AdminPanel, { AdminUserData } from "#/components/LeagueAdminPanel";
interface InviteProps {
  link: string;
  league: number;
  host: string | undefined;
  remove: () => void;
}
// Used to show all the invites that exist and to delete an individual invite
function Invite({ link, league, host, remove }: InviteProps) {
  const notify = useContext(NotifyContext);
  const t = useContext(TranslateContext);
  return (
    <p style={{ wordWrap: "break-word" }}>
      <a
        onClick={() => {
          // Sets the clipboard to the invite link
          navigator.clipboard.writeText(`${host}/api/invite/${link}`);
          notify(t("Copied to clipboard"));
        }}
      >
        {t("Link: {link}", { link: `${host}/api/invite/${link}` })}
      </a>
      <Button
        onClick={async () => {
          notify(t("Deleting"));
          const response = await fetch("/api/invite", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              leagueID: league,
              link: link,
            }),
          });
          notify(t(await response.text()), response.ok ? "success" : "error");
          remove();
        }}
        sx={{ margin: "5px" }}
        variant="outlined"
        color="error"
      >
        {t("Delete")}
      </Button>
    </p>
  );
}
// Used to generate the graph of the historical points
function Graph({
  historicalPoints,
  filter,
}: {
  historicalPoints: historialData;
  filter: HistoricalDataTypes;
}) {
  const [getUser, getUserNow] = useContext(UserContext);
  const t = useContext(TranslateContext);
  const [usernames, setUsernames] = useState(
    Object.keys(historicalPoints).map((e) => getUserNow(parseInt(e))),
  );
  const [dataRange, setDataRange] = useState<number[]>([
    1,
    Object.values(historicalPoints)[0].length,
  ]);
  useEffect(() => {
    Object.keys(historicalPoints).forEach((e, index) => {
      getUser(parseInt(e)).then(async (newUsername) => {
        setUsernames((val) => {
          val[index] = newUsername;
          // Makes sure that the component updates after the state is changed
          return JSON.parse(JSON.stringify(val));
        });
      });
    });
  }, [historicalPoints, getUser]);
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
  );
  const options: {
    maintainAspectRatio: boolean;
    responsive: boolean;
    plugins: {
      legend: {
        position: "top";
      };
      title: {
        display: boolean;
        text: string;
      };
    };
    scales: {
      x: {
        title: {
          display: boolean;
          text: string;
        };
      };
      y: {
        title: {
          display: boolean;
          text: string;
        };
      };
    };
  } = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: t("Points over Time"),
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t("Matchday"),
        },
      },
      y: {
        title: {
          display: true,
          text: t("Points"),
        },
      },
    },
  };
  // Adds a label for every matchday
  const labels = Array(dataRange[1] - dataRange[0] + 1)
    .fill(0)
    .map((_, index) => index + dataRange[0]);
  const datasets: {
    label: string;
    data: number[];
    borderColor: string;
  }[] = [];
  // Adds every dataset
  Object.keys(historicalPoints).forEach((e, index) => {
    let counter = 0;
    datasets.push({
      label: usernames[index],
      data: historicalPoints[e]
        // Filters out the data that is outside of the range specified
        .slice(dataRange[0] - 1, dataRange[1] + 1)
        .map((e) => {
          counter += e[filter];
          return counter;
        }),
      borderColor: stringToColor(parseInt(e)),
    });
  });
  const data = {
    labels,
    datasets,
  };
  return (
    <div
      style={{
        height: "min(max(50vh, 50vw), 50vh)",
        width: "95%",
        margin: "2%",
      }}
    >
      <Line options={options} data={data} />
      <Slider
        getAriaLabel={() => "Standings Range"}
        value={dataRange}
        onChange={(_, value) => {
          typeof value === "number" ? "" : setDataRange(value);
        }}
        valueLabelDisplay="auto"
        max={Object.values(historicalPoints)[0].length}
        min={1}
      />
    </div>
  );
}
interface Props {
  OGannouncement: announcements[];
  admin: boolean;
  tutorial: boolean;
  standings: standingsData[];
  historicalPoints: historialData;
  inviteLinks: string[];
  adminUsers: AdminUserData[];
  host: string | undefined;
  league: number;
  leagueSettings: leagueSettings;
  startFilter: HistoricalDataTypes;
}
export default function Home({
  OGannouncement,
  admin,
  tutorial,
  standings,
  historicalPoints,
  inviteLinks,
  adminUsers,
  host,
  league,
  leagueSettings,
  startFilter,
}: Props) {
  const t = useContext(TranslateContext);
  const notify = useContext(NotifyContext);
  const [inputLeagueName, setInputLeagueName] = useState(
    leagueSettings.leagueName,
  );
  // Calculates the current matchday
  let currentMatchday = 0;
  if (Object.values(historicalPoints).length !== 0) {
    currentMatchday = Object.values(historicalPoints)[0].length;
  }
  // Used to generate a random invite link
  const randomLink = (): string => {
    return (
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2) +
      Math.random().toString(36).substring(2)
    );
  };
  const [filter, setFilter] = useState<HistoricalDataTypes>(startFilter);
  const [showTutorial, setShowTutorial] = useState(tutorial);
  const [announcementPriority, setAnouncementPriority] =
    useState<anouncementColor>("info");
  const [announcementDescription, setAnouncementDescription] = useState("");
  const [announcementTitle, setAnouncementTitle] = useState("");
  const [announcements, setAnouncements] = useState(OGannouncement);
  const [matchday, setmatchday] = useState(currentMatchday + 1);
  const [invites, setInvites] = useState(inviteLinks);
  const [newInvite, setnewInvite] = useState(randomLink);
  // Used to delete an anouncement
  const deleteAnouncement = (idx: number) => {
    notify(t("Deleting anouncement"));
    fetch(`/api/league/${league}/announcement`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leagueID: league,
        title: announcements[idx].title,
        description: announcements[idx].description,
      }),
    }).then(async (response) => {
      notify(t(await response.text()), response.ok ? "success" : "error");
      if (response.ok) {
        setAnouncements((e) => {
          e = e.filter((e, index) => index !== idx);
          return e;
        });
      }
    });
  };
  // Used to add an anouncement
  const addAnouncement = () => {
    notify(t("Adding announcement"));
    fetch(`/api/league/${league}/announcement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        priority: announcementPriority,
        title: announcementTitle,
        description: announcementDescription,
      }),
    }).then(async (response) => {
      notify(t(await response.text()), response.ok ? "success" : "error");
      if (response.ok) {
        setAnouncements((e) => {
          e.push({
            leagueID: league,
            priority: announcementPriority,
            title: announcementTitle,
            description: announcementDescription,
          });
          return e;
        });
      }
    });
  };
  // Orders the players in the correct order by points
  let newStandings: { user: number; points: number }[] = [];
  if (matchday <= currentMatchday) {
    Object.keys(historicalPoints).forEach((e: string) => {
      newStandings.push({
        user: parseInt(e),
        points: historicalPoints[e][matchday - 1][filter],
      });
    });
  } else {
    newStandings = standings.map((e) => {
      return {
        user: e.user,
        points: filter != "totalPoints" ? e[filter] : e.points,
      };
    });
  }
  newStandings.sort((a, b) => b.points - a.points);
  return (
    <>
      <Head>
        <title>
          {t("Standings for {leagueName}", { leagueName: inputLeagueName })}
        </title>
      </Head>
      <Menu league={league} />
      {Boolean(showTutorial) && (
        <Alert severity="info">
          <AlertTitle>{t("Help")}</AlertTitle>
          <p>
            {t("A tutorial can always be found just under the invite links. ")}
          </p>
          <Button
            onClick={() => {
              fetch(`/${league}/help`);
              setShowTutorial(false);
            }}
            variant="outlined"
            color="error"
          >
            {t("Don't show this message")}
          </Button>
        </Alert>
      )}
      <h1>
        {t("Standings for {leagueName}", { leagueName: inputLeagueName })}
      </h1>
      <Select
        value={filter}
        onChange={(e) => setFilter(e.target.value as HistoricalDataTypes)}
        id={"filter"}
      >
        <MenuItem value={"totalPoints"}>{t("Total Points")}</MenuItem>
        {!!leagueSettings.fantasyEnabled && (
          <MenuItem value={"fantasyPoints"}>{t("Fantasy Points")}</MenuItem>
        )}
        {!!leagueSettings.predictionsEnabled && (
          <MenuItem value={"predictionPoints"}>
            {t("Prediction Points")}
          </MenuItem>
        )}
      </Select>
      <TableContainer sx={{ width: "95%" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("Username")}</TableCell>
              <TableCell>
                {matchday > currentMatchday
                  ? t("Total Points")
                  : t("Matchday {matchday} Points", { matchday })}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {newStandings.map((val, idx) => (
              <TableRow key={val.user + "m" + matchday}>
                <TableCell>
                  <UserChip userid={val.user} />
                </TableCell>
                <TableCell>
                  {matchday > currentMatchday
                    ? val.points
                    : historicalPoints[val.user][matchday - 1][filter]}
                </TableCell>
                <TableCell>
                  {!!leagueSettings.fantasyEnabled &&
                    filter != "predictionPoints" && (
                      <Link
                        href={`/${league}/${val.user}/fantasy/${
                          matchday > currentMatchday ? "" : matchday
                        }`}
                      >
                        <Button id={"fantasy" + idx}>
                          {t("Click to view squad")}
                        </Button>
                      </Link>
                    )}
                  {!!leagueSettings.predictionsEnabled &&
                    filter != "fantasyPoints" && (
                      <Link
                        href={`/${league}/${val.user}/predictions/${
                          matchday > currentMatchday ? "" : matchday
                        }`}
                      >
                        <Button id={"predictions" + idx}>
                          {t("Click to view predictions")}
                        </Button>
                      </Link>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <FormLabel id="matchdayLabel">{t("Select matchday")}</FormLabel>
      <Pagination
        id="matchdayLabel"
        page={matchday}
        count={currentMatchday + 1}
        onChange={(e, v) => {
          setmatchday(v);
        }}
        renderItem={(item) => {
          const page =
            item.page && item.page > currentMatchday ? t("All") : item.page;
          return <PaginationItem {...item} page={page} />;
        }}
      ></Pagination>
      {Object.values(historicalPoints).length > 0 && (
        <Graph historicalPoints={historicalPoints} filter={filter} />
      )}
      <h1>{t("Announcements")}</h1>
      {announcements.map((e: announcements, idx) => (
        <Alert key={idx} severity={e.priority} sx={{ position: "relative" }}>
          <AlertTitle>{e.title}</AlertTitle>
          {!!admin && (
            <IconButton
              id="close"
              aria-label="close"
              onClick={() => {
                deleteAnouncement(idx);
              }}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <Icon>close</Icon>
            </IconButton>
          )}
          {e.description}
        </Alert>
      ))}
      {!!admin && (
        <>
          <TextField
            id="announcementTitle"
            variant="outlined"
            size="small"
            label={t("Title")}
            onChange={(val) => {
              // Used to change the title
              setAnouncementTitle(val.target.value);
            }}
            value={announcementTitle}
          />
          <br />
          <TextField
            id="announcementDescription"
            variant="outlined"
            label={t("Content")}
            multiline
            minRows={2}
            onChange={(val) => {
              // Used to change the description
              setAnouncementDescription(val.target.value);
            }}
            value={announcementDescription}
          />
          <br />
          <InputLabel htmlFor="priority">
            {t("Announcement Priority: ")}
          </InputLabel>
          <Select
            id="priority"
            value={announcementPriority}
            onChange={(val) =>
              setAnouncementPriority(val.target.value as anouncementColor)
            }
          >
            {["info", "success", "warning", "error"].map((e: string) => (
              <MenuItem key={e} value={e}>
                {t(e)}
              </MenuItem>
            ))}
          </Select>
          <br />
          <Button variant="contained" color="success" onClick={addAnouncement}>
            {t("Add announcement")}
          </Button>
        </>
      )}
      <h1>{t("Invite Links")}</h1>
      <p>{t("Tap to copy a link")}</p>
      {invites.map((val) => (
        <Invite
          host={host}
          key={val}
          link={val}
          league={league}
          remove={() => {
            setInvites(invites.filter((e) => e != val));
          }}
        />
      ))}
      {/* Used to create a new invite link */}
      <TextField
        id="invite"
        variant="outlined"
        size="small"
        label={t("Invite link")}
        onChange={(val) => {
          // Used to change the invite link
          setnewInvite(val.target.value);
        }}
        value={newInvite}
      />
      <Button
        onClick={async () => {
          const link = newInvite;
          notify(t("Creating new invite link"));
          const response = await fetch("/api/invite", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              leagueID: league,
              link: link,
            }),
          });
          notify(t(await response.text()), response.ok ? "success" : "error");
          if (response.ok) {
            setInvites([...invites, link]);
            // Makes sure to generate a new random link id
            setnewInvite(randomLink());
          }
        }}
      >
        {t("Add invite")}
      </Button>
      <br />
      <br />
      <Link href={`/${league}/help`}>
        <Button variant="contained" color="info">
          {t("Click Here For a Tutorial")}
        </Button>
      </Link>
      <AdminPanel
        leagueName={inputLeagueName}
        setLeagueName={setInputLeagueName}
        league={league}
        admin={admin}
        leagueSettings={leagueSettings}
        adminUsers={adminUsers}
      />
    </>
  );
}
type HistoricalDataTypes = "totalPoints" | "fantasyPoints" | "predictionPoints";
interface historialData {
  [Key: string]: {
    totalPoints: number;
    fantasyPoints: number;
    predictionPoints: number;
  }[];
}
interface standingsData {
  user: number;
  points: number;
  fantasyPoints: number;
  predictionPoints: number;
}
// Gets the users session
export const getServerSideProps: GetServerSideProps = async (
  ctx: GetServerSidePropsContext,
) => {
  // Gets the user id
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  const user = session ? session.user.id : -1;
  const leagueID = parseInt(String(ctx.params?.league));
  // Gets the leaderboard for the league
  const standings: standingsData[] = await db
    .selectFrom("leagueUsers")
    .select(["user", "points", "fantasyPoints", "predictionPoints"])
    .where("leagueID", "=", leagueID)
    .execute();
  // Gets the historical amount of points for every matchday in the league
  const historicalPoints = new Promise<historialData>(async (resolve) => {
    const results = await db
      .selectFrom("points")
      .where("leagueID", "=", leagueID)
      .selectAll()
      .execute();
    // Reformats the result into a dictionary that has an entry for each user and each entry for that user is an array of all the points the user has earned in chronological order.
    const points: historialData = {};
    results.forEach((element) => {
      if (points[element.user]) {
        points[String(element.user)].push({
          totalPoints: element.points,
          fantasyPoints: element.fantasyPoints,
          predictionPoints: element.predictionPoints,
        });
      } else {
        points[String(element.user)] = [
          {
            totalPoints: element.points,
            fantasyPoints: element.fantasyPoints,
            predictionPoints: element.predictionPoints,
          },
        ];
      }
    });
    resolve(points);
  });
  const inviteLinks = db
    .selectFrom("invite")
    .select("inviteID")
    .where("leagueID", "=", leagueID)
    .execute()
    .then((e) => e.map((val) => val.inviteID));
  // Checks if the user is an admin
  const data = db
    .selectFrom("leagueUsers")
    .where("leagueID", "=", leagueID)
    .where("user", "=", user)
    .select(["admin", "tutorial"])
    .executeTakeFirst()
    .then((e) => {
      return {
        admin: e ? e.admin : false,
        tutorial: e ? e.tutorial : false,
      };
    });
  const announcements = db
    .selectFrom("announcements")
    .selectAll()
    .where("leagueID", "=", leagueID)
    .execute();
  const adminUsers: Promise<AdminUserData[]> = db
    .selectFrom("leagueUsers")
    .select(["user", "admin"])
    .where("leagueID", "=", leagueID)
    .execute();
  let startFilter: HistoricalDataTypes = "totalPoints";
  const standings_user = standings.filter((val) => val.user === user);
  if (standings_user.length > 0) {
    if (
      standings_user[0].fantasyPoints === 0 &&
      standings_user[0].predictionPoints !== 0
    ) {
      startFilter = "predictionPoints";
    }
    if (
      standings_user[0].fantasyPoints !== 0 &&
      standings_user[0].predictionPoints === 0
    ) {
      startFilter = "fantasyPoints";
    }
  }
  return redirect(ctx, {
    OGannouncement: await announcements,
    admin: (await data).admin,
    tutorial: (await data).tutorial,
    standings: standings,
    historicalPoints: await historicalPoints,
    inviteLinks: await inviteLinks,
    adminUsers: await adminUsers,
    host: ctx.req.headers.host,
    startFilter,
  });
};
