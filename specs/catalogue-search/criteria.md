# Criteria: catalogue-search

AC-01 Given a buyer is viewing an event's item list When they type a vendor name into the search field Then only items from vendors matching that name are shown [ui]

AC-02 Given a buyer is viewing fabric items When they filter by composition "denim" Then only items whose extracted composition contains "denim" are shown [ui] [data]

AC-03 Given a buyer is viewing garment items When they filter by garment type "jacket" Then only items whose extracted garment type is "jacket" are shown [ui] [data]

AC-04 Given a buyer types a search term and selects a filter When results load Then only items matching both the search term and the filter are shown [ui] [data]

AC-05 Given a buyer searches for a term that matches no items When results load Then an empty state is shown with a clear prompt [ui]

AC-06 Given a buyer filters by item status "unassigned" When results load Then only vendor-less items are shown [ui] [data]

AC-07 Given there are 50+ items in an event When the buyer applies a filter Then results update within 2 seconds [nfr]

AC-08 Given a buyer clears the search field and filters When the view refreshes Then all items for the event are shown again [ui]

AC-09 Given search is applied to an event with no items When the view loads Then an empty state is shown [ui]

AC-10 Given a buyer searches using special characters (e.g. "&", "'", "-") When results load Then the search does not crash and returns matching or empty results [ui] [manual]

AC-11 Given a buyer filters by a colourway colour When results load Then only items with a colourway matching that colour are shown [ui] [data]

AC-12 Given a buyer navigates away from the search results and returns When the view reloads Then the search term and filters are not persisted (reset to all items) [ui]
