import { NotifyContext, TranslateContext } from "#/Modules/context";
import { useContext, useEffect, useState } from "react";
import {
  Box,
  Chip,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

function ScoreRow({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  label,
  emphasized = false,
}: {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | string | null;
  awayScore: number | string | null;
  label?: string;
  emphasized?: boolean;
}) {
  return (
    <Box sx={{ py: 1 }}>
      {label && (
        <Typography variant="overline" color="text.secondary" display="block">
          {label}
        </Typography>
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          sx={{
            flex: 1,
            textAlign: "right",
            fontWeight: emphasized ? 600 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {homeTeam}
        </Typography>
        <Typography
          variant={emphasized ? "h5" : "h6"}
          sx={{ fontWeight: 700, minWidth: 72, textAlign: "center" }}
        >
          {homeScore} - {awayScore}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            textAlign: "left",
            fontWeight: emphasized ? 600 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {awayTeam}
        </Typography>
      </Box>
    </Box>
  );
}

function PointsChip({
  points,
  predictExact,
  predictDifference,
  predictWinner,
}: {
  points: number;
  predictExact: number;
  predictDifference: number;
  predictWinner: number;
}) {
  const t = useContext(TranslateContext);
  const color =
    points === predictExact
      ? "success"
      : points === predictDifference
        ? "primary"
        : points === predictWinner
          ? "secondary"
          : "default";
  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Chip
        label={t("Points earned: {points}", { points })}
        color={color}
        size="small"
        variant={points > 0 ? "filled" : "outlined"}
      />
    </Box>
  );
}

export interface predictions {
  home_team: string;
  home_team_name: string | null;
  away_team: string;
  away_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
  gameStart: number;
  gameEnd: number;
  home_prediction: number | null;
  away_prediction: number | null;
}
export interface GameProps extends predictions {
  league: number;
  predictWinner: number;
  predictDifference: number;
  predictExact: number;
  readOnly?: boolean;
}
export function Game({
  home_team,
  home_team_name,
  away_team,
  away_team_name,
  home_score,
  away_score,
  gameStart,
  gameEnd,
  home_prediction,
  away_prediction,
  league,
  predictWinner,
  predictDifference,
  predictExact,
  // This is used to mean an outside viewer that should only see the prediction when the game starts
  readOnly = false,
}: GameProps) {
  const t = useContext(TranslateContext);
  const [home, setHome] = useState(home_prediction);
  const [away, setAway] = useState(away_prediction);
  const notify = useContext(NotifyContext);
  const [isPastGameEnd, setIsPastGameEnd] = useState(
    () => Date.now() / 1000 > gameEnd,
  );
  useEffect(() => {
    const check = () => setIsPastGameEnd(Date.now() / 1000 > gameEnd);
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [gameEnd]);

  function updateHome(e: React.ChangeEvent<HTMLInputElement>) {
    setHome(parseInt(e.target.value));
    save(parseInt(e.target.value), away);
  }
  function updateAway(e: React.ChangeEvent<HTMLInputElement>) {
    setAway(parseInt(e.target.value));
    save(home, parseInt(e.target.value));
  }
  function save(home: number | null, away: number | null) {
    notify(t("Saving"));
    fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        home_team,
        away_team,
        league,
        home,
        away,
        gameStart,
      }),
    }).then(async (response) => {
      notify(t(await response.text()), response.ok ? "success" : "error");
    });
  }
  const [countdown, setCountown] = useState<number>(() =>
    Math.ceil((gameStart - Date.now() / 1000) / 60),
  );
  useEffect(() => {
    const check = () =>
      setCountown(Math.ceil((gameStart - Date.now() / 1000) / 60));
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [gameStart]);

  const home_team_text = home_team_name || home_team;
  const away_team_text = away_team_name || away_team;

  const pointsEarned =
    home_score === null ||
    away_score === null ||
    home_prediction === null ||
    away_prediction === null
      ? null
      : home_prediction === home_score && away_prediction === away_score
        ? predictExact
        : home_prediction - away_prediction === home_score - away_score
          ? predictDifference
          : home_prediction > away_prediction === home_score > away_score &&
              (home_prediction === away_prediction) ===
                (home_score === away_score)
            ? predictWinner
            : 0;

  return (
    <Paper elevation={1} sx={{ p: 2, height: "100%" }}>
      <Typography fontWeight={600}>
        {countdown > 0
          ? t("{home_team} - {away_team} in {day} D {hour} H {minute} M ", {
              home_team: home_team_text,
              away_team: away_team_text,
              day: Math.floor(countdown / 60 / 24),
              hour: Math.floor(countdown / 60) % 24,
              minute: Math.floor(countdown) % 60,
            })
          : `${home_team_text} - ${away_team_text}`}
      </Typography>

      {countdown > 0 && !readOnly && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            mt: 1,
          }}
        >
          <TextField
            label={t("Home Prediction")}
            type="number"
            size="small"
            value={home ?? ""}
            onChange={updateHome}
            slotProps={{
              htmlInput: { min: 0, style: { textAlign: "center" } },
            }}
          />
          <Typography variant="h6" color="text.secondary">
            -
          </Typography>
          <TextField
            label={t("Away Prediction")}
            type="number"
            size="small"
            value={away ?? ""}
            onChange={updateAway}
            slotProps={{
              htmlInput: { min: 0, style: { textAlign: "center" } },
            }}
          />
        </Box>
      )}

      {countdown > 0 && readOnly && (
        <ScoreRow
          label={t("Predictions")}
          homeTeam={home_team_text}
          awayTeam={away_team_text}
          homeScore={home_prediction}
          awayScore={away_prediction}
        />
      )}

      {countdown <= 0 && (
        <>
          {home_prediction !== null && away_prediction !== null && (
            <>
              <ScoreRow
                label={t("Predictions")}
                homeTeam={home_team_text}
                awayTeam={away_team_text}
                homeScore={home_prediction}
                awayScore={away_prediction}
              />
              <Divider />
            </>
          )}
          <ScoreRow
            label={isPastGameEnd ? t("Final Scores") : t("Current Scores")}
            homeTeam={home_team_text}
            awayTeam={away_team_text}
            homeScore={home_score ?? "-"}
            awayScore={away_score ?? "-"}
            emphasized
          />
          {pointsEarned !== null && (
            <PointsChip
              points={pointsEarned}
              predictExact={predictExact}
              predictDifference={predictDifference}
              predictWinner={predictWinner}
            />
          )}
        </>
      )}
    </Paper>
  );
}
