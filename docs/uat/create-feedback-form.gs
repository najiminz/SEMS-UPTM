function createFeedbackForm() {
  const form = FormApp.create("SEMS UAT Feedback");

  form.setDescription(
    "Thank you for testing SEMS, the UPTM Secure Event Management System. " +
    "These 21 questions take about 5 minutes. There are no right or wrong answers. " +
    "Please do not type any real IC number or password."
  );
  form.setConfirmationMessage("Thank you! Your feedback has been recorded.");
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setShuffleQuestions(false);
  form.setAllowResponseEdits(false);

  form.addTextItem()
    .setTitle("Your Tester ID (the code the facilitator gave you, for example T07)")
    .setHelpText("Example: T07")
    .setValidation(
      FormApp.createTextValidation()
        .setHelpText("Use the format T07 (the letter T and your number).")
        .requireTextMatchesPattern("[Tt][0-9]{1,3}")
        .build()
    )
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Which device did you mainly use?")
    .setChoiceValues(["Phone", "Laptop or desktop", "Tablet"])
    .setRequired(true);

  form.addPageBreakItem()
    .setTitle("About using the system")
    .setHelpText("How much do you agree with each statement? 1 = strongly disagree, 5 = strongly agree.");
  const sus = ["I think that I would like to use this system frequently.", "I found the system unnecessarily complex.", "I thought the system was easy to use.", "I think that I would need the support of a technical person to be able to use this system.", "I found the various functions in this system were well integrated.", "I thought there was too much inconsistency in this system.", "I would imagine that most people would learn to use this system very quickly.", "I found the system very cumbersome to use.", "I felt very confident using the system.", "I needed to learn a lot of things before I could get going with this system."];
  sus.forEach(function (statement) {
    form.addScaleItem()
      .setTitle(statement)
      .setBounds(1, 5)
      .setLabels("Strongly disagree", "Strongly agree")
      .setRequired(true);
  });

  form.addPageBreakItem()
    .setTitle("About this system")
    .setHelpText("1 = strongly disagree, 5 = strongly agree.");
  const statements = ["The system does what I expected it to do for my role.", "The messages and hints (errors, confirmations) were clear and helpful.", "I trust this system with my personal information."];
  statements.forEach(function (statement) {
    form.addScaleItem()
      .setTitle(statement)
      .setBounds(1, 5)
      .setLabels("Strongly disagree", "Strongly agree")
      .setRequired(true);
  });

  form.addPageBreakItem().setTitle("Your experience");

  form.addMultipleChoiceItem()
    .setTitle("Were you able to do the first thing you wanted to do in SEMS?")
    .setChoiceValues(["Yes, easily", "Yes, with a little effort", "No, I needed help", "No, I could not"])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Did any page confuse you or get in your way?")
    .setChoiceValues(["No, everything was clear", "A little, but I managed", "Yes, one page confused me", "Yes, several pages confused me"])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Were there features you found unnecessary, or anything missing?")
    .setChoiceValues(["No - the features were useful and complete", "Some features were unnecessary", "Something was missing", "Both (some unnecessary and something missing)"])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("What one change would make SEMS more useful for UPTM?")
    .setChoiceValues(["A mobile app", "Email / push notifications", "Faster performance", "More reports and analytics", "Nothing - it is good as it is", "Other"])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("Anything else you want to add? (optional)")
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle("Would you recommend this system for use at UPTM?")
    .setChoiceValues(["Yes", "Maybe", "No"])
    .setRequired(true);

  const sheet = SpreadsheetApp.create("SEMS UAT Feedback (responses)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log("SEND THIS LINK TO TESTERS: " + form.getPublishedUrl());
  Logger.log("Edit the form:             " + form.getEditUrl());
  Logger.log("Response sheet:            " + sheet.getUrl());
}
