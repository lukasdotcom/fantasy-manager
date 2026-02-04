describe("User", () => {
  before(() => {
    cy.exec(
      "export APP_ENV=test; ts-node --project=./tsconfig2.json cypress/e2e/user.ts",
    );
  });
  // Used to signup change username and password and login again
  it("signup", () => {
    // Signs in
    cy.visit("/");
    cy.get("#login").click();
    cy.contains("Click here for creating an account").click();
    cy.get("#username").type("Sample User");
    cy.get("#password").type("Sample Password");
    cy.get(".center > .MuiButtonBase-root").click();
    // Edits the user
    cy.contains("SU").click();
    cy.get("#username").should("value", "Sample User");
    cy.get("#username").clear();
    cy.get("#username").type("New Sample Username");
    cy.contains("Change Username").click();
    cy.get("#usermenu").click();
    cy.get("#username").should("value", "New Sample Username");
    cy.get("#password").type("New Password");
    cy.contains("Change password").click();
    // Signs out
    cy.get("#logout").click();
    // Trys to sign in with the wrong password and username
    cy.visit("http://localhost:3000");
    cy.get("#login").click();
    cy.get("#username").type("Sample User");
    cy.get("#password").type("Sample Password");
    cy.contains("Sign In").click();
    cy.contains("Check that you entered the correct username and password. ");
    // Trys to sign in with the wrong password and correct username
    cy.get("#username").type("New Sample Username");
    cy.get("#password").type("Sample Password");
    cy.contains("Sign In").click();
    cy.reload().then(() => {
      cy.contains("Check that you entered the correct username and password. ");
      // Trys to sign in with the correct password and correct username
      cy.get("#username").type("New Sample Username");
      cy.get("#password").type("New Password");
    });
    cy.contains("Sign In").click();
    // Creates a league
    cy.contains("Leagues").click();
    cy.get("#name").type("Sample League");
    cy.get("button").contains("Create League").click();
    // Verifies that the user can not be deleted
    cy.contains("NS").click();
    // Leaves the league
    cy.contains("Leagues").click();
    cy.contains("Leave league").click();
    cy.get(".MuiDialogContent-root > .MuiFormControl-root").type(
      "Sample League",
    );
    cy.get(".MuiDialogActions-root > .MuiButton-contained").click();
    // Deletes the User
    cy.contains("NS").click();
    cy.contains("Delete user").click();
    cy.contains("NS").should("not.exist");
  });
});
