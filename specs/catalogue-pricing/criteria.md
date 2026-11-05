# Criteria: catalogue-pricing

AC-01 Given a buyer views an item variant When they open item detail Then the variant's price is shown [ui] [data]

AC-02 Given a buyer edits a variant's price When they save Then the new price is stored with an effective date [ui] [data]

AC-03 Given a variant has a previous price When a new price is set Then the previous price is retained in price history [data]

AC-04 Given a buyer views price history When they open it Then all historical prices with dates are shown [ui] [data]

AC-05 Given a variant has no price When the buyer views item detail Then a "price not set" state is shown [ui]

AC-06 Given a buyer bulk-updates variant prices When they apply changes Then all selected variants receive the new price [ui] [data]

AC-07 Given a buyer sets a cost price When they save Then cost is stored separately from selling price [data]

AC-08 Given a buyer views an item with multiple variants When they open detail Then each variant shows its own price [ui]
