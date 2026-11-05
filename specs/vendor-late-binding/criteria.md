# Criteria: vendor-late-binding

AC-01 Given a buyer is viewing an event with no vendor selected When they start a capture Then the capture flow proceeds without requiring a vendor choice [ui]

AC-02 Given a buyer captures an item without selecting a vendor When extraction completes Then the item is stored as unassigned within that event [data]

AC-03 Given there are unassigned items in an event When the buyer opens the event's inbox Then the unassigned items are listed together [ui]

AC-04 Given an unassigned item in the inbox When the buyer assigns it to an existing vendor Then the item moves to that vendor's catalogue [ui] [data]

AC-05 Given an unassigned item in the inbox When the buyer creates a new vendor and assigns the item to it Then the item appears under the new vendor [ui] [data]

AC-06 Given an unassigned item When the buyer reaches the review step Then they must select or create a vendor before committing [ui]

AC-07 Given multiple unassigned items in an event's inbox When the buyer selects several and assigns them to one vendor in a single action Then all selected items move to that vendor [ui] [data]

AC-08 Given a buyer starts a capture without an event When they attempt to proceed Then capture is blocked and an event is required [ui]

AC-09 Given an unassigned item references a vendor that no longer exists When the buyer opens the inbox Then the item remains listed and is not lost [data]

AC-10 Given extraction fails for a vendor-less capture When the buyer views the item in the inbox Then the item remains in the inbox with an error state and can be retried [ui] [manual]

AC-11 Given an unassigned item is assigned to a vendor When the buyer views that vendor's item list Then the item appears there and no longer appears in the unassigned inbox [data]

AC-12 Given the inbox is empty When the buyer opens it Then an empty state is shown [ui]
