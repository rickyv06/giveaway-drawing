/* Easy knobs — edit and refresh. No secrets here. */
window.DRAWING_CONFIG = {
  goal: 500,                         // progress bar target (completed entries)
  closesAt: "2026-11-30T23:59:00-06:00", // entries close (America/Chicago)
  announceBy: "December 4, 2026",
  entriesUrl: "entries.json",        // sanitized public feed
  demoEntriesUrl: "demo-entries.json",
  pollMs: 60000,                     // how often to re-fetch entries.json while live
  brandPhone: "726.200.6226",
  brandName: "Ricky Vasquez, REALTOR®",
  brandTeam: "Stellar Realty Group",
  prizes: [
    "Credit repair by CreditToClose ($1,500)",
    "Free movers",
    "Full appliance package",
  ],
};
