# Criteria: procurement

AC-01 Given a buyer selects catalogue items When they create a purchase order Then a draft PO is created with those items [ui] [data]

AC-02 Given a draft PO exists When the buyer sets quantities Then each variant's quantity is stored [ui] [data]

AC-03 Given a draft PO exists When the buyer sends it to a vendor Then the PO status changes to "sent" [ui] [data]

AC-04 Given a PO is sent When the vendor fulfils it Then the buyer records received quantities [ui] [data]

AC-05 Given a PO has received quantities When the buyer views it Then received vs ordered quantities are shown [ui] [data]

AC-06 Given a buyer views a vendor's history When they open it Then all POs for that vendor are listed with status [ui] [data]

AC-07 Given a buyer cancels a PO When they confirm Then the PO status is "cancelled" and items are not ordered [ui] [data]

AC-08 Given a PO is in draft When the buyer edits quantities Then changes are saved before sending [ui] [data]
