# Criteria: team-management

AC-01 Given an organisation admin invites a teammate When the invite is sent Then the teammate receives an email invitation [ui] [api]

AC-02 Given an organisation admin assigns a role When they save it Then the member's role is updated [ui] [data]

AC-03 Given a viewer attempts to export data When they try Then export is blocked [ui] [api]

AC-04 Given a member attempts to manage billing When they try Then billing management is blocked [ui] [api]

AC-05 Given an organisation admin removes a member When they confirm Then the member loses access to organisation data [api] [data]

AC-06 Given a buyer views organisation members When they open the team page Then all members and their roles are listed [ui] [data]

AC-07 Given an owner attempts to remove themselves When they try Then removal is blocked (owner cannot leave) [ui] [api]

AC-08 Given a member's role is changed When they next log in Then the new role's permissions apply [api] [data]
