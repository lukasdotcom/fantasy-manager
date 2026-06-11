describe("Create Predictions league and do some simple predictions.", () => {
  function predictionCard(matchup) {
    return cy.contains(matchup).closest(".MuiPaper-root");
  }

  function enterPrediction(matchup, home, away) {
    predictionCard(matchup).within(() => {
      cy.get("input").eq(0).clear().type(String(home));
      cy.get("input").eq(1).clear().type(String(away));
    });
  }

  function assertPredictionScores(matchup, prediction, actual) {
    predictionCard(matchup).within(() => {
      cy.contains("Predictions").parent().contains(prediction);
      cy.contains(/Final Scores|Current Scores/)
        .parent()
        .contains(actual);
    });
  }

  before(() => {
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/predictions1.ts",
    );
  });
  // Used to signup change username and password and login again
  it("invite", () => {
    // Signs in
    cy.visit("/signup");
    cy.get("#username").type("Predictions 1");
    cy.get("#password").type("password");
    cy.get(".center > .MuiButtonBase-root").click();
    // Creates league with alternate points for predictions
    cy.contains("Leagues").click();
    cy.get("#name").type("Sample League");
    cy.get("button").contains("Create League").click();
    cy.contains("Open league").click();
    cy.contains("Standings for Sample League");
    // Changes the settings for the points
    cy.get("#predictWinner").clear();
    cy.get("#predictWinner").type(2);
    cy.get("#predictDifference").clear();
    cy.get("#predictDifference").type(3);
    cy.get("#predictExact").clear();
    cy.get("#predictExact").type(5);
    cy.contains("Save admin settings").click();
    cy.contains("Predictions").click();
    cy.contains("RBL").should("not.exist");
    enterPrediction("FCB - WOB", 3, 0);
    enterPrediction("BVB - BSC", 2, 2);
    enterPrediction("SGE - M05", 4, 0);
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/predictions2.ts",
    );
    cy.contains("Standings").click();
    cy.get(".MuiTableBody-root > :nth-child(1) > :nth-child(2)").contains("10");
    cy.contains("Predictions").click();
    assertPredictionScores("FCB - WOB", "3 - 0", "5 - 1");
    assertPredictionScores("BVB - BSC", "2 - 2", "2 - 2");
    assertPredictionScores("SGE - M05", "4 - 0", "5 - 1");
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/predictions3.ts",
    );
    cy.contains("Standings").click();
    cy.get(".MuiPagination-ul > :nth-child(2) > .MuiButtonBase-root").click();
    cy.get("#predictions0").click();
    // Confirms that the historical predictions and game scores are stored directly
    assertPredictionScores("FCB - WOB", "3 - 0", "5 - 1");
    assertPredictionScores("BVB - BSC", "2 - 2", "2 - 2");
    assertPredictionScores("SGE - M05", "4 - 0", "5 - 1");
  });
});
