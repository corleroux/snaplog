# Criteria: multi-tenancy

AC-01 Given a buyer creates an organisation When they complete setup Then the organisation exists and they are its owner [ui] [data]

AC-02 Given an organisation owner invites a buyer by email When the invite is accepted Then the buyer becomes a member of that organisation [ui] [data]

AC-03 Given a buyer belongs to an organisation When they view events Then only that organisation's events are shown [ui] [data]

AC-04 Given a buyer belongs to two organisations When they switch organisation context Then the data shown changes to the selected organisation [ui]

AC-05 Given a buyer attempts to view another organisation's event When they access it by ID Then access is denied [api] [data]

AC-06 Given an organisation member creates a vendor When they save it Then the vendor is stamped with the organisation ID [data]

AC-07 Given an organisation is deleted When all members leave Then the organisation's data is retained or archived per retention policy [data] [manual]

AC-08 Given a buyer is not a member of any organisation When they log in Then they are prompted to create or join an organisation [ui]

AC-09 Given an organisation admin removes a member When the removal completes Then the member can no longer access that organisation's data [api] [data]

AC-10 Given organisation data isolation When RLS policies are evaluated Then queries are automatically scoped to the buyer's active organisation [nfr] [manual]
