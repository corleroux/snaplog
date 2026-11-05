# Criteria: user-accounts

AC-01 Given a buyer registers with email and password When they submit Then an account is created and a verification email is sent [ui] [api]

AC-02 Given a registered buyer logs in with correct credentials When they submit Then they are authenticated and redirected to their organisation or personal dashboard [ui] [api]

AC-03 Given a buyer logs in with incorrect credentials When they submit Then an error is shown and access is denied [ui] [api]

AC-04 Given a buyer requests password reset When they submit their email Then a reset link is sent to that email [api]

AC-05 Given a buyer views their profile When they edit it Then name and avatar changes are saved and reflected across the app [ui] [data]

AC-06 Given a buyer logs out When they confirm Then their session is cleared and they return to the login screen [ui]

AC-07 Given a buyer's session expires When they attempt an action Then they are redirected to login [api]

AC-08 Given a buyer registers When verification is complete Then captured items created before verification are attributed to their account [data]

AC-09 Given a buyer attempts to register with an existing email When they submit Then an error is shown [ui] [api]
