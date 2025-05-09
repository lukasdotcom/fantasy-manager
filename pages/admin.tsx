import Menu from "../components/Menu";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import Head from "next/head.js";
import db from "../Modules/database";
import { analytics, data, plugins } from "#type/database";
import React, { useContext, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { compareSemanticVersions } from "../Modules/semantic";
import store from "#/types/store";
import { NotifyContext } from "#Modules/context";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { useRouter } from "next/router";
import Link from "#components/Link";
import { MUIThemeCodetoJSONString } from "#components/theme";
import { sql } from "kysely";
interface settingsType {
  name: string;
  shortName: string;
  variant: string;
  options?: string[];
}
export const settings: settingsType[] = [
  {
    name: "Minimum Time Before Updating during games",
    shortName: "MinTimeGame",
    variant: "number",
  },
  {
    name: "Maximum Time Before Updating during games",
    shortName: "MaxTimeGame",
    variant: "number",
  },
  {
    name: "Minimum Time Before Updating during no games",
    shortName: "MinTimeTransfer",
    variant: "number",
  },
  {
    name: "Maximum Time Before Updating during no games",
    shortName: "MaxTimeTransfer",
    variant: "number",
  },
  {
    name: "Days of inactivity until a league is archived",
    shortName: "ArchiveInactiveLeague",
    variant: "number",
  },
  {
    name: "Days of inactivity until a user is deleted",
    shortName: "DeleteInactiveUser",
    variant: "number",
  },
  {
    name: "Enable Signups with passwords",
    shortName: "EnablePasswordSignup",
    variant: "boolean",
  },
];
interface LeaguePluginsProps {
  plugins: plugins[];
  pluginData: (store | "error")[];
  version: string;
}

function LeaguePlugins({ plugins, pluginData, version }: LeaguePluginsProps) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Link</TableCell>
            <TableCell>Enabled</TableCell>
            <TableCell>Installed</TableCell>
            <TableCell>Settings</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plugins.map((plugin, idx) => (
            <LeaguePlugin
              key={idx}
              data={plugin}
              store={pluginData[idx]}
              version={version}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
interface LeaguePluginProps {
  data: plugins;
  store: store | "error";
  version: string;
}
function LeaguePlugin({ data, store, version }: LeaguePluginProps) {
  const [deleted, setDeleted] = useState(false);
  const notify = useContext(NotifyContext);
  const [enabled, setEnabled] = useState(data.enabled);
  const [settings, setSettings] = useState<{ [Key: string]: string }>(
    JSON.parse(data.settings),
  );
  const checkboxChange = (_: unknown, checked: boolean) => {
    setEnabled(checked);
  };
  const changeSettings = (value: string, name: string) => {
    setSettings((prev) => {
      prev = { ...prev, [name]: value };
      return prev;
    });
  };
  // Used to save the preferences for the plugin
  const save = async () => {
    const res = await fetch("/api/admin/plugins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: data.url,
        enabled,
        settings: JSON.stringify(settings),
      }),
    });
    notify(await res.text(), res.ok ? "success" : "error");
  };
  // Used to delete the plugin
  const deletePlugin = async () => {
    const res = await fetch(
      `/api/admin/plugins?url=${encodeURIComponent(data.url)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    notify(await res.text(), res.ok ? "success" : "error");
    if (res.ok) {
      setDeleted(true);
    }
  };
  let installedText = <></>;
  // Gets the text for the installed column
  if (data.installed) {
    if (store === "error") {
      installedText = (
        <Typography color="secondary">
          Installed, but failed to Check for Update
        </Typography>
      );
    } else if (store.version !== data.version) {
      if (
        store.min_version &&
        compareSemanticVersions(store.min_version, version) === -1
      ) {
        installedText = (
          <Typography color="warning.main">
            Installed but unsupported(Update Fantasy Manger to Update)
          </Typography>
        );
      } else {
        installedText = (
          <Typography color="warning.main">
            Installed but out of Date
          </Typography>
        );
      }
    } else {
      installedText = <Typography color="success.main">Installed</Typography>;
    }
  } else {
    if (store === "error") {
      installedText = (
        <Typography color="secondary">
          Uninstalled and not accessible
        </Typography>
      );
    } else if (
      store.min_version &&
      compareSemanticVersions(store.min_version, version) === -1
    ) {
      installedText = (
        <Typography color="warning.main">
          Unsupported (Update Fantasy Manger to Install)
        </Typography>
      );
    } else {
      installedText = (
        <Typography color="error">
          Not Installed(Restart Server to Install)
        </Typography>
      );
    }
  }
  if (deleted) return <></>;
  return (
    <TableRow>
      <TableCell>{data.name}</TableCell>
      <TableCell>
        {store !== "error" && store.description
          ? store.description
          : "No Description"}
      </TableCell>
      <TableCell>{data.url}</TableCell>
      <TableCell>
        {enabled ? (
          <Typography color="success.main">Enabled</Typography>
        ) : (
          <Typography color="error">Disabled</Typography>
        )}
      </TableCell>
      <TableCell>{installedText}</TableCell>
      <TableCell>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox checked={Boolean(enabled)} onChange={checkboxChange} />
            }
            label="Enabled"
          />
          {store !== "error" &&
            /* Creates a form with all the inputs needed for this plugin*/
            store.input &&
            store.input.map((input) => {
              return (
                <TextField
                  key={input.name}
                  label={input.name}
                  helperText={input.description}
                  value={
                    Object.keys(settings).includes(input.name)
                      ? settings[input.name]
                      : ""
                  }
                  onChange={(e) => {
                    changeSettings(e.target.value, input.name);
                  }}
                ></TextField>
              );
            })}
          <Button variant="outlined" color="success" onClick={save}>
            Save
          </Button>
          <br />
          <Button variant="outlined" color="error" onClick={deletePlugin}>
            Delete
          </Button>
        </FormGroup>
      </TableCell>
    </TableRow>
  );
}

function Analytics({
  analytics,
  firstDay,
}: {
  analytics: analytics[];
  firstDay: number;
}) {
  const [graphLength, setGraphLength] = useState(
    analytics.length > 28 ? 28 : analytics.length,
  );
  const [graphPrecision, setGraphPrecision] = useState(30);
  const [analyticsData, setAnalyticsData] = useState(analytics);
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
  );
  const options = {
    maintainAspectRatio: false,
    responsive: true,
    normalized: true,
    scales: {
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: "Users",
        },
      },
    },
  };
  // List of all the versions
  const versions: string[] = Object.keys(
    JSON.parse(analyticsData[analyticsData.length - 1]?.versionTotal || "{}"),
  );
  const leagueList: string[] = Object.keys(
    JSON.parse(analyticsData[analyticsData.length - 1]?.leagueTotal || "{}"),
  );
  const locales: string[] = Object.keys(
    JSON.parse(analyticsData[analyticsData.length - 1]?.localeTotal || "{}"),
  );
  // Calculates colors for things
  const calculateColor = (idx: number, length: number) => {
    length = length + 1;
    return ((length - idx) * 360) / length - 120;
  };
  // Calculates the hue for an id for the version number
  const calculateVersionColor = (idx: number) => {
    return calculateColor(idx, 14);
  };
  versions.sort((a, b) => compareSemanticVersions(a, b));
  const slicedAnalytics = analyticsData.slice(graphLength * -1);
  const amountBetween = Math.ceil(slicedAnalytics.length / graphPrecision);
  let remainder = (slicedAnalytics.length % amountBetween) - 1;
  if (remainder === -1) remainder = amountBetween - 1;
  const condensedAnalytics =
    slicedAnalytics.length > graphPrecision
      ? slicedAnalytics.filter((_, idx) => idx % amountBetween === remainder)
      : slicedAnalytics;
  const labels = condensedAnalytics.map((e) => {
    const date = new Date(e.day * 3600 * 24 * 1000);
    return date.toDateString();
  });
  const condensed_versions: Set<string> = new Set();
  const condensedAnalyticsParsed = condensedAnalytics.map((e) => {
    const versionTotal = JSON.parse(e.versionTotal);
    Object.keys(versionTotal).forEach((key) => {
      if (versionTotal[key] > 0) condensed_versions.add(key);
    });
    return {
      day: e.day,
      versionActive: JSON.parse(e.versionActive),
      versionTotal,
      leagueActive: JSON.parse(e.leagueActive),
      leagueTotal: JSON.parse(e.leagueTotal),
      localeActive: JSON.parse(e.localeActive),
      localeTotal: JSON.parse(e.localeTotal),
      themeActive: JSON.parse(e.themeActive),
      themeTotal: JSON.parse(e.themeTotal),
    };
  });
  const condensedVersions = Array.from(condensed_versions);
  const versionData = {
    labels,
    datasets: [
      ...condensedVersions.map((version, idx) => {
        return {
          fill: true,
          label: version + " Active",
          data: condensedAnalyticsParsed.map(
            (e) => e.versionActive[version] ?? 0,
          ),
          borderColor: `hsla(${calculateVersionColor(idx)}, 100%, 50%, 1)`,
          backgroundColor: `hsla(${calculateVersionColor(idx)}, 100%, 50%, 1)`,
        };
      }),
      ...condensedVersions.map((version, idx) => {
        return {
          fill: false,
          label: version + " Inactive",
          data: condensedAnalytics.map(
            (e) =>
              (JSON.parse(e.versionTotal)[version] ?? 0) -
              (JSON.parse(e.versionActive)[version] ?? 0),
          ),
          borderColor: `hsla(${calculateVersionColor(idx)}, 100%, 50%, 1)`,
          backgroundColor: `hsla(${calculateVersionColor(idx)}, 100%, 50%, 0)`,
        };
      }),
    ],
  };
  // Data for the league graph
  const leagueData = {
    labels,
    datasets: [
      ...leagueList.map((league, idx) => {
        return {
          fill: true,
          label: league + " Active",
          data: condensedAnalyticsParsed.map(
            (e) => e.leagueActive[league] ?? 0,
          ),
          borderColor: `hsla(${calculateColor(
            idx,
            league.length,
          )}, 100%, 50%, 1)`,
          backgroundColor: `hsla(${calculateColor(
            idx,
            league.length,
          )}, 100%, 50%, 1)`,
        };
      }),
      ...leagueList.map((league, idx) => {
        return {
          fill: true,
          label: league + " Inactive",
          data: condensedAnalyticsParsed.map(
            (e) => (e.leagueTotal[league] ?? 0) - (e.leagueActive[league] ?? 0),
          ),
          borderColor: `hsla(${calculateColor(
            idx,
            league.length,
          )}, 100%, 50%, 1)`,
          backgroundColor: `hsla(${calculateColor(
            idx,
            league.length,
          )}, 100%, 50%, 0)`,
        };
      }),
    ],
  };
  // Gets the locale data
  const localeData = {
    labels,
    datasets: [
      ...locales.map((locale, idx) => {
        return {
          fill: true,
          label: locale + " Active",
          data: condensedAnalyticsParsed.map(
            (e) => e.localeActive[locale] ?? 0,
          ),
          borderColor: `hsla(${calculateColor(
            idx,
            locale.length,
          )}, 100%, 50%, 1)`,
          backgroundColor: `hsla(${calculateColor(
            idx,
            locale.length,
          )}, 100%, 50%, 1)`,
        };
      }),
      ...locales.map((locale, idx) => {
        return {
          fill: true,
          label: locale + " Inactive",
          data: condensedAnalyticsParsed.map(
            (e) => (e.localeTotal[locale] ?? 0) - (e.localeActive[locale] ?? 0),
          ),
          borderColor: `hsla(${calculateColor(
            idx,
            locale.length,
          )}, 100%, 50%, 1)`,
          backgroundColor: `hsla(${calculateColor(
            idx,
            locale.length,
          )}, 100%, 50%, 0)`,
        };
      }),
    ],
  };
  // Gets the theme data
  const darkColor = dark ? 30 : 0;
  const lightColor = dark ? 100 : 80;
  // const custom
  const themeData = {
    labels,
    datasets: [
      {
        fill: true,
        label: "Dark Active",
        data: condensedAnalyticsParsed.map((e) => e.themeActive.dark ?? 0),
        borderColor: `hsla(0, 0%, ${darkColor}%, 1)`,
        backgroundColor: `hsla(0, 0%, ${darkColor}%, 1)`,
      },
      {
        fill: true,
        label: "Light Active",
        data: condensedAnalyticsParsed.map((e) => e.themeActive.light ?? 0),
        borderColor: `hsla(120, 0%, ${lightColor}%, 1)`,
        backgroundColor: `hsla(120, 0%, ${lightColor}%, 1)`,
      },
      {
        fill: true,
        label: "Custom Active",
        data: condensedAnalyticsParsed.map((e) => e.themeActive.custom ?? 0),
        borderColor: theme.palette.secondary.main,
        backgroundColor: theme.palette.secondary.main,
      },
      {
        fill: true,
        label: "Dark Inactive",
        data: condensedAnalyticsParsed.map(
          (e) => (e.themeTotal.dark ?? 0) - (e.themeActive.dark ?? 0),
        ),
        borderColor: `hsla(0, 0%, ${darkColor}%, 1)`,
        backgroundColor: `hsla(0, 0%, ${darkColor}%, 0)`,
      },
      {
        fill: true,
        label: "Light Inactive",
        data: condensedAnalyticsParsed.map(
          (e) => (e.themeTotal.light ?? 0) - (e.themeActive.light ?? 0),
        ),
        borderColor: `hsla(120, 0%, ${lightColor}%, 1)`,
        backgroundColor: `hsla(120, 0%, ${lightColor}%, 0)`,
      },
      {
        fill: true,
        label: "Custom Inactive",
        data: condensedAnalyticsParsed.map(
          (e) => (e.themeTotal.custom ?? 0) - (e.themeActive.custom ?? 0),
        ),
        borderColor: theme.palette.secondary.main,
        backgroundColor: `hsla(20, 100%, 50%, 0)`,
      },
    ],
  };
  // Loads analytics data
  useEffect(() => {
    let canceled = false;
    setTimeout(async () => {
      if (canceled || analyticsData.length == 0) {
        return;
      }
      const loadUntilDay =
        analyticsData[analyticsData.length - 1].day - graphLength - 10;
      let firstLoadedDay = analyticsData[0].day;

      while (loadUntilDay < firstLoadedDay && firstDay < firstLoadedDay) {
        firstLoadedDay -= 50;
        const result = await fetch(
          `/api/admin/analytics?day=${firstLoadedDay}`,
        );
        const data: analytics[] = await result.json();
        if (canceled) {
          return;
        }
        setAnalyticsData((prev) => {
          if (prev.length == analyticsData.length) {
            return [...data, ...prev];
          }
          return prev;
        });
      }
    }, 100);
    return () => {
      canceled = true;
    };
  }, [graphLength, analyticsData, firstDay]);
  // Handles when the graph slider changes
  function graphLengthChange(e: Event, value: number | number[]) {
    if (typeof value === "number") {
      setGraphLength(value);
    }
  }
  function graphPrecisionChange(e: Event, value: number | number[]) {
    if (typeof value === "number") {
      setGraphPrecision(value);
    }
  }
  return (
    <>
      <h3>Version Data</h3>
      <p>
        This graph shows how many users are using each (server) version. Active
        users are defined as users that are active on that day.
      </p>
      <div style={{ height: "min(max(50vh, 50vw), 80vh)", width: "95%" }}>
        <Line options={options} data={versionData} />
      </div>
      <h3>League Type Data</h3>
      <p>
        This graph shows how many users are using each league type. Note that
        users are counted based on how many leagues they are in.
      </p>
      <div style={{ height: "min(max(50vh, 50vw), 80vh)", width: "95%" }}>
        <Line options={options} data={leagueData} />
      </div>
      <h3>Locale Data</h3>
      <p>This graph shows how many users are using which languages.</p>
      <div style={{ height: "min(max(50vh, 50vw), 80vh)", width: "95%" }}>
        <Line options={options} data={localeData} />
      </div>
      <h3>Theme Data</h3>
      <p>This graph shows how many users are using dark vs light theme.</p>
      <div style={{ height: "min(max(50vh, 50vw), 80vh)", width: "95%" }}>
        <Line options={options} data={themeData} />
      </div>
      <Typography id="graph-length" gutterBottom>
        Graph Data Length: {graphLength} Days
      </Typography>
      <div style={{ width: "95%", margin: "2%" }}>
        <Slider
          value={graphLength}
          min={1}
          step={1}
          max={analyticsData[analyticsData.length - 1]?.day - firstDay}
          onChange={graphLengthChange}
          valueLabelDisplay="auto"
        />
      </div>
      <Typography id="graph-precision" gutterBottom>
        Maximum points on the Graph: {graphPrecision}
      </Typography>
      <div style={{ width: "95%", margin: "2%" }}>
        <Slider
          value={graphPrecision}
          min={1}
          step={1}
          max={analyticsData[analyticsData.length - 1]?.day - firstDay}
          onChange={graphPrecisionChange}
          valueLabelDisplay="auto"
        />
      </div>
    </>
  );
}
interface configProps extends settingsType {
  default_value: string;
}
function Config({
  shortName,
  name,
  default_value,
  variant,
  options,
}: configProps) {
  const [value, setValue] = useState(
    variant === "boolean"
      ? default_value === "1"
        ? true
        : false
      : default_value,
  );
  const notify = useContext(NotifyContext);
  const save = async () => {
    notify("Saving");
    let value2 = value;
    if (variant === "textarea") {
      setValue(String(value).replace(/\n/g, "").replaceAll(" ", ""));
      value2 = String(value).replace(/\n/g, "").replaceAll(" ", "");
    }
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: shortName,
        value: value2,
      }),
    });
    notify(await res.text(), res.ok ? "success" : "error");
  };
  switch (variant) {
    case "number":
      return (
        <>
          <TextField
            value={value}
            onChange={(e) => setValue(e.target.value)}
            helperText={name}
            type="number"
          ></TextField>
          <Button variant="outlined" color="success" onClick={save}>
            Save
          </Button>
          <br />
        </>
      );
    case "select":
      return (
        <>
          <InputLabel htmlFor={shortName}>{name}</InputLabel>
          <Select
            value={String(value)}
            onChange={(e) => setValue(e.target.value)}
            id={shortName}
          >
            {options?.map((e) => (
              <MenuItem key={e} value={e}>
                {e}
              </MenuItem>
            ))}
          </Select>
          <Button variant="outlined" color="success" onClick={save}>
            Save
          </Button>
          <br />
        </>
      );
    case "boolean":
      return (
        <>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(e) => setValue(e.target.checked)}
              />
            }
            label={name}
          />
          <Button variant="outlined" color="success" onClick={save}>
            Save
          </Button>
          <br />
        </>
      );
    case "textarea":
      // Automatically parses when pasted in
      if (String(value).includes("import")) {
        setValue(MUIThemeCodetoJSONString(String(value)));
      }
      return (
        <>
          <TextField
            value={value}
            onChange={(e) => setValue(e.target.value)}
            helperText={name}
            multiline
            fullWidth
          ></TextField>
          <Button variant="outlined" color="success" onClick={save}>
            Save
          </Button>
          <br />
        </>
      );
    default:
      return <></>;
  }
}
interface props {
  analytics: analytics[];
  firstDay: number | null;
  plugins: plugins[];
  pluginData: (store | "error")[];
  version: string;
  config: data[];
}
export default function Home({
  analytics,
  firstDay,
  plugins,
  pluginData,
  version,
  config,
}: props) {
  const [newPlugin, setNewPlugin] = useState("");
  const router = useRouter();
  const notify = useContext(NotifyContext);
  // Used to install a plugin
  async function installPlugin() {
    const res = await fetch("/api/admin/plugins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: newPlugin,
        enabled: false,
        settings: "{}",
      }),
    });
    notify(await res.text(), res.ok ? "success" : "error");
    router.push("/admin");
  }
  return (
    <>
      <Head>
        <title>Admin Panel</title>
      </Head>
      <Menu />
      <h1>Admin Panel</h1>
      <h2>League Plugins</h2>
      <Typography variant="body1">
        For a league to be useable it needs to be installed and enabled. Leagues
        will be installed on a server restart.
      </Typography>
      <LeaguePlugins
        plugins={plugins}
        pluginData={pluginData}
        version={version}
      />
      <br />
      <TextField
        value={newPlugin}
        onChange={(e) => setNewPlugin(e.target.value)}
        fullWidth
        label="Plugin Url"
        placeholder="https://raw.githubusercontent.com/"
      />
      <br />
      <Button variant="outlined" color="success" onClick={installPlugin}>
        Install New Plugin
      </Button>
      <h2>Settings</h2>
      <h3>Information Update Settings</h3>
      <p>
        Data is automatically updated following these settings. There is a min
        and a max time for during the game and one for the transfer times. The
        data is updated when the maximum time is exceeded or a request is
        recieved asking for data from the server when the minimum time is
        exceeded.
      </p>
      {settings.map((setting) => (
        <Config
          key={setting.shortName}
          default_value={
            (
              config.filter(
                (e) => e.value1 === "config" + setting.shortName,
              )[0] ?? { value2: "" }
            ).value2
          }
          {...setting}
        />
      ))}
      <h3>Picture Downloading</h3>
      <p>
        This is the setting for how player pictures should be downloaded. No
        means they are never downloaded, needed means they are downloaded when
        needed, new&needed means they are downloaded when needed and when a new
        picture is found, and yes means every picture is downloaded on startup
        and downloaded when discovered.
      </p>
      <Config
        default_value={
          (
            config.filter((e) => e.value1 === "configDownloadPicture")[0] ?? {
              value2: "",
            }
          ).value2
        }
        name={"Picture Downloading"}
        shortName="DownloadPicture"
        variant="select"
        options={["no", "needed", "new&needed", "yes"]}
      />
      <h3>Custom Theme</h3>
      <p>
        In the textbox below you can paste a custom theme. To create one go to{" "}
        <Link
          href="https://zenoo.github.io/mui-theme-creator/"
          rel="noopener noreferrer"
          target="_blank"
        >
          MUI Theme Creator.
        </Link>{" "}
        When you are done editing your theme copy it and paste it below, it will
        be automatically formatted to the correct format. The first textarea is
        the dark theme while the second one is the light theme. If you want to
        use the default just enter `{"{}"}` as the value.
      </p>
      {["Dark", "Light"].map((theme) => (
        <Config
          default_value={
            (
              config.filter((e) => e.value1 === "configTheme" + theme)[0] ?? {
                value2: "{}",
              }
            ).value2
          }
          key={theme}
          name={`${theme} Theme`}
          shortName={`Theme${theme}`}
          variant="textarea"
        />
      ))}

      <h2>Analytics</h2>
      {firstDay !== null && (
        <Analytics analytics={analytics} firstDay={firstDay} />
      )}
      {firstDay === null && <p>No Analytics Data Exists</p>}
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (
  ctx: GetServerSidePropsContext,
) => {
  const user = await getServerSession(ctx.req, ctx.res, authOptions);
  // Makes sure the user is logged in
  if (!user) {
    return {
      redirect: {
        destination: `/api/auth/signin?callbackUrl=${encodeURIComponent(
          ctx.resolvedUrl,
        )}`,
        permanent: false,
      },
    };
  }
  if (user.user.admin) {
    // Used to find the amount of historical data to get
    const analytics = await db
      .selectFrom("analytics")
      .selectAll()
      .where((eb) =>
        eb(
          "day",
          ">",
          eb
            .selectFrom("analytics")
            .select(eb.fn.max("day").as("max_day"))
            .where(sql`day % 50`, "=", 0),
        ),
      )
      .execute();
    const firstDay =
      (
        await db
          .selectFrom("analytics")
          .select("day")
          .orderBy("day", "asc")
          .executeTakeFirst()
      )?.day ?? 0;
    const plugins = await db.selectFrom("plugins").selectAll().execute();
    const pluginData: (store | "error")[] = await Promise.all(
      plugins.map(async (plugin) => {
        const request = await fetch(plugin.url).catch(() => "error");
        if (!(request instanceof Response)) {
          return "error";
        } else {
          return await request.json().catch(() => "error");
        }
      }),
    );
    const version = (await import("#/package.json")).default.version;
    const config = await db
      .selectFrom("data")
      .selectAll()
      .where("value1", "like", "config%")
      .execute();
    return {
      props: {
        analytics,
        firstDay,
        plugins,
        pluginData,
        version,
        config,
      },
    };
  }
  return {
    notFound: true,
  };
};
