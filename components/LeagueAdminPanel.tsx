import { NotifyContext, TranslateContext } from "#/Modules/context";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  TextField,
} from "@mui/material";
import { ReactNode, SyntheticEvent, useContext, useState } from "react";
import { UserChip } from "./Username";
import { BoxTypeMap } from "@mui/system";
import { useRouter } from "next/router";
import { leagueSettings as leagueSettingsDB } from "#/types/database";
import { useSession } from "next-auth/react";
export interface AdminUserData {
  user: number;
  admin: number;
}
export interface AdminPanelProps {
  league: number;
  leagueName: string;
  setLeagueName: (name: string) => void;
  admin: boolean;
  leagueSettings: leagueSettingsDB;
  adminUsers: AdminUserData[];
}
/**
 * Renders the admin panel or a view only panel of the settings based on the given props.
 *
 * @param {AdminPanelProps} props - The props for the admin panel.
 * @return {ReactNode} The rendered admin panel component.
 */
export default function AdminPanel(props: AdminPanelProps): ReactNode {
  if (props.admin && !props.leagueSettings.archived) {
    return <AdminPanelAdmin {...props} />;
  } else {
    return <AdminPanelView {...props} />;
  }
}

function AdminPanelAdmin({
  league,
  leagueName,
  setLeagueName,
  leagueSettings,
  adminUsers,
}: AdminPanelProps) {
  const notify = useContext(NotifyContext);
  const t = useContext(TranslateContext);
  const data = useSession().data?.user;
  const userid = data?.id;
  const username = data?.username;
  const [startingMoney, setStartingMoney] = useState(
    leagueSettings.startMoney / 1000000,
  );
  const [users, setUsers] = useState<AdminUserData[]>(adminUsers);
  // Checks if the user is removing themselves from being an admin
  const removingSelfFromAdmin =
    !!userid && !users.every((user) => user.user !== userid || user.admin);
  const [transfers, setTransfers] = useState(leagueSettings.transfers);
  const [duplicatePlayers, setDuplicatePlayers] = useState(
    leagueSettings.duplicatePlayers,
  );
  const [starredPercentage, setStarredPercentage] = useState(
    leagueSettings.starredPercentage,
  );
  const [confirmationAdmin, setConfirmationAdmin] = useState("");
  const [archive, setArchive] = useState(false);
  const [confirmationArchive, setConfirmationArchive] = useState("");
  const [matchdayTransfers, setMatchdayTransfers] = useState(
    Boolean(leagueSettings.matchdayTransfers),
  );
  const [top, setTop] = useState(Boolean(leagueSettings.top11));
  const [fantasyEnabled, setFantasyEnabled] = useState(
    Boolean(leagueSettings.fantasyEnabled),
  );
  const [predictionsEnabled, setPredictionsEnabled] = useState(
    Boolean(leagueSettings.predictionsEnabled),
  );
  const [predictWinner, setPredictWinner] = useState(
    leagueSettings.predictWinner,
  );
  const [predictDifference, setPredictDifference] = useState(
    leagueSettings.predictDifference,
  );
  const [predictExact, setPredictExact] = useState(leagueSettings.predictExact);
  const Router = useRouter();
  return (
    <>
      <h1>{t("Admin Panel")}</h1>
      <p>
        {t("League Type Used: {leagueType}", {
          leagueType: t(leagueSettings.league),
        })}
      </p>
      <TextField
        id="leagueName"
        variant="outlined"
        size="small"
        label={t("League name")}
        onChange={(val) => {
          // Used to change the invite link
          setLeagueName(val.target.value);
        }}
        value={leagueName}
      />
      <br />
      <FormControlLabel
        label={<h4>{t("Enable Fantasy Manager")}</h4>}
        control={
          <Checkbox
            checked={fantasyEnabled}
            onChange={() => {
              setFantasyEnabled((e) => !e);
            }}
          />
        }
      />
      <br />
      {!!fantasyEnabled && (
        <>
          <TextField
            id="startingMoney"
            variant="outlined"
            size="small"
            label={t("Starting Money")}
            type="number"
            onChange={(val) => {
              setStartingMoney(parseInt(val.target.value));
            }}
            value={startingMoney}
          />
          <br />
          <TextField
            id="transfers"
            variant="outlined"
            size="small"
            label={t("Transfer Limit")}
            type="number"
            onChange={(val) => {
              setTransfers(parseInt(val.target.value));
            }}
            value={transfers}
          />
          <br />
          <TextField
            id="duplicatePlayers"
            variant="outlined"
            size="small"
            helperText={t("Amount of squads a player can be in")}
            type="number"
            onChange={(val) => {
              setDuplicatePlayers(parseInt(val.target.value));
            }}
            value={duplicatePlayers}
          />
          <br></br>
          <TextField
            id="starredPercentage"
            variant="outlined"
            size="small"
            helperText={t("Point boost for starred players")}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            type="number"
            onChange={(val) => {
              setStarredPercentage(parseFloat(val.target.value));
            }}
            value={starredPercentage}
          />
          <br></br>
          <FormControlLabel
            label={t("Allow picking transfers during matchday. ")}
            control={
              <Checkbox
                checked={matchdayTransfers}
                onChange={() => {
                  setMatchdayTransfers((e) => !e);
                }}
              />
            }
          />
          <br />
          <FormControlLabel
            label={t(
              "Use top 11, this will automatically do substitutions in squads. ",
            )}
            control={
              <Checkbox
                checked={top}
                onChange={() => {
                  setTop((e) => !e);
                }}
              />
            }
          />
          <br />
        </>
      )}
      <FormControlLabel
        label={<h4>{t("Enable Predictions")}</h4>}
        control={
          <Checkbox
            checked={predictionsEnabled}
            onChange={() => {
              setPredictionsEnabled((e) => !e);
            }}
          />
        }
      />
      <br />
      {!!predictionsEnabled && (
        <>
          <TextField
            id="predictWinner"
            variant="outlined"
            size="small"
            label={t("Points for Predicting Winner")}
            type="number"
            onChange={(val) => {
              setPredictWinner(parseInt(val.target.value));
            }}
            value={predictWinner}
          />
          <br />
          <TextField
            id="predictDifference"
            variant="outlined"
            size="small"
            label={t("Points for Predicting Goal Difference")}
            type="number"
            onChange={(val) => {
              setPredictDifference(parseInt(val.target.value));
            }}
            value={predictDifference}
          />
          <br />
          <TextField
            id="predictExact"
            variant="outlined"
            size="small"
            label={t("Points for Predicting Exact Score")}
            type="number"
            onChange={(val) => {
              setPredictExact(parseInt(val.target.value));
            }}
            value={predictExact}
          />
          <br />
        </>
      )}
      <Autocomplete<AdminUserData, true, false, true, "div">
        sx={{ width: "99%" }}
        multiple
        id="admins"
        options={users}
        freeSolo
        value={users.filter((e) => e.admin)}
        renderTags={(value, getTagProps) =>
          value.map((option: AdminUserData, index) => (
            <UserChip
              userid={option.user}
              {...getTagProps({ index })}
              key={option.user}
            />
          ))
        }
        onChange={(
          e: SyntheticEvent<Element, Event>,
          value: readonly (string | AdminUserData)[],
        ): void => {
          const admins = value.map((e) => (typeof e === "string" ? e : e.user));
          setUsers((e2) => {
            // Updates the value for all of the users
            e2.forEach((e3) => {
              e3.admin = +admins.includes(e3.user);
            });
            return [...e2];
          });
        }}
        renderOption={(props, option: AdminUserData) => {
          const newprops = props as unknown as BoxTypeMap;
          return (
            <Box {...newprops} key={option.user}>
              <UserChip userid={option.user} />
            </Box>
          );
        }}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : String(option.user)
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            label={t("Admins")}
            placeholder={t("New admin")}
          />
        )}
      />
      {removingSelfFromAdmin && (
        <>
          <TextField
            id="confirmationAdmin"
            error={username !== confirmationAdmin}
            helperText={t(
              "Enter username to confirm removal of yourself from list of league admins. ",
            )}
            variant="outlined"
            margin="dense"
            size="small"
            placeholder={username}
            onChange={(e) => {
              setConfirmationAdmin(e.target.value);
            }}
            value={confirmationAdmin}
          />
          <br />
        </>
      )}
      <FormControlLabel
        label={t("Check this to archive the league when you press save. ")}
        control={
          <Checkbox
            checked={archive}
            onChange={() => {
              setArchive((e) => !e);
            }}
          />
        }
      />
      <br />
      {archive && (
        <TextField
          id="confirmationArchive"
          error={leagueName !== confirmationArchive}
          helperText={t("Enter league name here to confirm archive. ")}
          variant="outlined"
          margin="dense"
          size="small"
          placeholder={leagueName}
          onChange={(e) => {
            setConfirmationArchive(e.target.value);
          }}
          value={confirmationArchive}
        />
      )}
      <br></br>
      <Button
        onClick={() => {
          // Checks if the confirmation text was inputed for archiving or removing yourself from the list of admin users
          if (
            (archive && confirmationArchive !== leagueName) ||
            (removingSelfFromAdmin && confirmationAdmin !== username)
          ) {
            notify(t("Confirmation text is wrong"), "error");
            return;
          }
          // Used to save the data
          notify("Saving");
          fetch(`/api/league/${league}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              users,
              settings: {
                fantasyEnabled,
                startMoney: startingMoney * 1000000,
                transfers,
                duplicatePlayers,
                starredPercentage,
                leagueName,
                matchdayTransfers,
                top11: top,
                predictionsEnabled,
                predictWinner,
                predictDifference,
                predictExact,
                archive,
              },
            }),
          }).then(async (res) => {
            notify(t(await res.text()), res.ok ? "success" : "error");
            if (archive) Router.push("/leagues");
            if (removingSelfFromAdmin) Router.push(Router.asPath);
          });
        }}
        variant="contained"
        color="success"
      >
        {t("Save admin settings")}
      </Button>
      <br />
      <br />
      <Button
        variant="outlined"
        onClick={async () => {
          const res = await fetch(`/api/league/${league}/recalculate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              predictions: true,
            }),
          });
          if (res.ok) {
            notify(t(await res.text()), "success");
            Router.push(Router.asPath);
          } else {
            notify(t(await res.text()), "error");
          }
        }}
      >
        {t("Recalculate Prediction Points")}
      </Button>
    </>
  );
}
function AdminPanelView({ leagueSettings }: AdminPanelProps) {
  const t = useContext(TranslateContext);
  return (
    <>
      <h1>{t("Settings")}</h1>
      <p>
        {t("League Type Used: {leagueType}", {
          leagueType: t(leagueSettings.league),
        })}
      </p>
      <h2>
        {leagueSettings.fantasyEnabled
          ? t("Fantasy is Enabled")
          : t("Fantasy is Disabled")}
      </h2>
      {leagueSettings.fantasyEnabled && (
        <>
          <p>
            {t("Starting money : {amount} M", {
              amount: leagueSettings.startMoney / 1000000,
            })}
          </p>
          <p>
            {t("Transfer limit : {amount}", {
              amount: leagueSettings?.transfers,
            })}
          </p>
          <p>
            {t("Amount of squads a player can be in : {duplicatePlayers}", {
              duplicatePlayers: leagueSettings?.duplicatePlayers,
            })}
          </p>
          <p>
            {t("Point boost for starred players : {starBoost}%", {
              starBoost: leagueSettings.starredPercentage,
            })}
          </p>
          <p>
            {t("Transfers on matchdays are {allowed}", {
              allowed: leagueSettings.matchdayTransfers
                ? t("Allowed")
                : t("Forbidden"),
            })}
          </p>
          <p>
            {t("Top 11 is {enabled}", {
              enabled: leagueSettings.top11 ? t("enabled") : t("disabled"),
            })}
          </p>
        </>
      )}
      <h2>
        {leagueSettings.predictionsEnabled
          ? t("Predictions are Enabled")
          : t("Predictions are Disabled")}
      </h2>
      {leagueSettings.predictionsEnabled && (
        <>
          <p>
            {t("{label}: {value}", {
              label: t("Points for Predicting Winner"),
              value: leagueSettings.predictWinner,
            })}
          </p>
          <p>
            {t("{label}: {value}", {
              label: t("Points for Predicting Goal Difference"),
              value: leagueSettings.predictDifference,
            })}
          </p>
          <p>
            {t("{label}: {value}", {
              label: t("Points for Predicting Exact Score"),
              value: leagueSettings.predictExact,
            })}
          </p>
        </>
      )}
      {Boolean(leagueSettings.archived) && (
        <p>
          {t(
            "This league is {archived}",
            leagueSettings.archived
              ? { archived: t("archived") }
              : { archived: t("not archived") },
          )}
        </p>
      )}
    </>
  );
}
