# Criteria: billing

AC-01 Given a buyer views pricing When they open pricing Then available plans and their limits are shown [ui]

AC-02 Given a buyer subscribes to a paid plan When they complete payment Then their subscription is active and the plan's limits apply [ui] [api] [data]

AC-03 Given a buyer upgrades their plan When the change takes effect Then the new limits apply immediately [api] [data]

AC-04 Given a buyer cancels their subscription When the current period ends Then access reverts to the free tier limits [api] [data]

AC-05 Given a buyer exceeds their plan's item limit When they attempt to capture Then they are prompted to upgrade [ui]

AC-06 Given a payment fails When the provider notifies the app Then the buyer is notified and given a grace period [api] [manual]

AC-07 Given a buyer views their invoice history When they open it Then past invoices and payment status are shown [ui] [data]

AC-08 Given a buyer downgrades When the change takes effect Then features above the new tier are disabled [ui] [data]
