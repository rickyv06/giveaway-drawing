/* Easy knobs — edit and refresh. No secrets here. */
window.DRAWING_CONFIG = {
  closesAt: "2026-11-30T23:59:00-06:00", // entries close (America/Chicago)
  announceBy: "December 4, 2026",
  // Live feed: public Google Sheet CSV (Zapier appends completed entries).
  sheetCsvUrl:
    "https://docs.google.com/spreadsheets/d/1iQqcqfUhk_GIkp-jD1iqizO_Pkl62rlBNl56KsE9e9E/gviz/tq?tqx=out:csv&sheet=Entries",
  // Same-origin fallback while the Sheet link-sharing is being set (or if Google blocks).
  liveCsvUrl: "live-entries.csv",
  entriesUrl: "entries.json",
  demoEntriesUrl: "demo-entries.json",
  pollMs: 25000, // re-fetch ~every 25s while live
  brandPhone: "726.200.6226",
  brandName: "Ricky Vasquez, REALTOR®",
  brandTeam: "Stellar Realty Group",
  prizes: [
    "Credit repair by CreditToClose ($1,500)",
    "Free movers",
    "Full appliance package",
  ],
};
