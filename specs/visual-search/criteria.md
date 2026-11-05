# Criteria: visual-search

AC-01 Given a buyer opens visual search When they select a reference photo Then the app shows visually similar items from the current event [ui]

AC-02 Given a buyer provides a reference photo When results load Then items are ranked by similarity with the most similar first [ui] [data]

AC-03 Given there are no visually similar items When results load Then an empty state is shown [ui]

AC-04 Given a buyer taps a visual search result When they select it Then the item detail screen opens for that item [ui]

AC-05 Given a buyer provides a reference photo with no clear subject When results load Then the app returns an empty state or low-confidence message rather than incorrect matches [ui] [manual]

AC-06 Given visual search results are shown When the buyer views them Then each result shows a thumbnail and the vendor name [ui]

AC-07 Given a buyer runs visual search on an event with no items When results load Then an empty state is shown [ui]

AC-08 Given visual search is used When results load Then the search completes within 5 seconds on the seeded dataset [nfr]

AC-09 Given a buyer provides a reference photo When results load Then the reference photo is not stored as a new catalogue item [data]

AC-10 Given visual search returns results When the buyer views them Then similarity scores are not exposed as raw numbers (shown as relative match quality) [ui]
