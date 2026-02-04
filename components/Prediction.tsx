import { NotifyContext, TranslateContext } from "#/Modules/context";
import { useContext, useEffect, useState } from "react";
import { TextField } from "@mui/material";

function GameEndHeader({ gameEnd }: { gameEnd: number }) {
  const t = useContext(TranslateContext);
  const [isPastGameEnd, setIsPastGameEnd] = useState(false);
  useEffect(() => {
    const check = () => setIsPastGameEnd(Date.now() / 1000 > gameEnd);
    queueMicrotask(check);
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [gameEnd]);
  return <h4>{isPastGameEnd ? t("Final Scores") : t("Current Scores")}</h4>;
}
export interface predictions {
  home_team: string;
  home_team_name: string | undefined;
  away_team: string;
  away_team_name: string | undefined;
  home_score?: number;
  away_score?: number;
  gameStart: number;
  gameEnd: number;
  home_prediction?: number;
  away_prediction?: number;
}
export interface GameProps extends predictions {
  league: number;
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
  // This is used to mean an outside viewer that should only see the prediction when the game starts
  readOnly = false,
}: GameProps) {
  // const t = useContext(TranslateContext);
  const [home, setHome] = useState(home_prediction);
  const [away, setAway] = useState(away_prediction);
  const notify = useContext(NotifyContext);
  function updateHome(e: React.ChangeEvent<HTMLInputElement>) {
    setHome(parseInt(e.target.value));
    save(parseInt(e.target.value), away);
  }
  function updateAway(e: React.ChangeEvent<HTMLInputElement>) {
    setAway(parseInt(e.target.value));
    save(home, parseInt(e.target.value));
  }
  function save(home: number | undefined, away: number | undefined) {
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
  const [countdown, setCountown] = useState<number>(0);
  useEffect(() => {
    const check = () =>
      setCountown(Math.ceil((gameStart - Date.now() / 1000) / 60));
    queueMicrotask(check);
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [gameStart]);
  const t = useContext(TranslateContext);
  const home_team_text = home_team_name || home_team;
  const away_team_text = away_team_name || away_team;
  return (
    <div>
      <h2>
        {countdown > 0
          ? t("{home_team} - {away_team} in {day} D {hour} H {minute} M ", {
              home_team: home_team_text,
              away_team: away_team_text,
              day: Math.floor(countdown / 60 / 24),
              hour: Math.floor(countdown / 60) % 24,
              minute: Math.floor(countdown) % 60,
            })
          : `${home_team_text} - ${away_team_text}`}
      </h2>
      {countdown > 0 && (
        <>
          {!readOnly && (
            <>
              <TextField
                label={t("Home Prediction")}
                type="number"
                value={home ?? ""}
                onChange={updateHome}
              />
              <TextField
                label={t("Away Prediction")}
                type="number"
                value={away ?? ""}
                onChange={updateAway}
              />
            </>
          )}
          {readOnly && (
            <>
              <h4>{t("Predictions")}</h4>
              <p>
                {home_prediction} - {away_prediction}
              </p>
            </>
          )}
        </>
      )}
      {countdown <= 0 && (
        <>
          {home_prediction !== null && away_prediction !== null && (
            <>
              <h4>{t("Predictions")}</h4>
              <p>
                {home_prediction} - {away_prediction}
              </p>
            </>
          )}
          <GameEndHeader gameEnd={gameEnd} />
          <p>
            {home_score} - {away_score}
          </p>
        </>
      )}
    </div>
  );
}
