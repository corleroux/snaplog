# Criteria: spreadsheet-export

AC-01 Given a buyer is viewing an event's item list When they choose export Then a CSV file is generated containing all items for that event [ui] [data]

AC-02 Given a buyer exports an event When they open the CSV Then each row is one item and each column is an extracted schema field [data]

AC-03 Given a buyer exports an event When they open the CSV Then columns include vendor name, item status, and source capture reference [data]

AC-04 Given an event has items with colourways When they export Then each colourway is represented (one row per colourway or expanded columns) [data]

AC-05 Given an event has no items When the buyer chooses export Then an empty CSV with headers only is generated [data]

AC-06 Given a buyer exports an event When the download completes Then the file is saved to the device downloads folder [ui] [manual]

AC-07 Given an event has 100+ items When the buyer exports Then the export completes within 10 seconds [nfr]

AC-08 Given a buyer exports When the CSV opens Then extracted field values match what is shown in the app [data]

AC-09 Given a buyer exports an event with mixed catalogue types When they open the CSV Then schema-specific fields appear as columns with empty values where not applicable [data]

AC-10 Given a buyer triggers export When the file is generated Then the filename includes the event name and date [ui]

AC-11 Given export fails When the buyer attempts it Then an error message is shown and no partial file is left [ui] [manual]
