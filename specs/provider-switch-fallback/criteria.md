# Criteria: provider-switch-fallback

AC-01 Given a buyer opens settings When they view extraction provider options Then the list of configured providers is shown and one is marked as default [ui]

AC-02 Given a buyer changes the default provider in settings When they run a new extraction Then the selected provider is used for the extraction [ui] [api]

AC-03 Given the primary provider returns an error during extraction When the extraction is retried Then the system automatically attempts the fallback provider [api]

AC-04 Given both primary and fallback providers fail When extraction is attempted Then the buyer is shown an error and the capture is preserved for retry [ui] [data]

AC-05 Given an extraction completes When the buyer views the extraction run details Then the provider used is recorded and visible [ui] [data]

AC-06 Given the fallback provider succeeds When the item is committed Then the item is saved with the fallback provider's extraction [data]

AC-07 Given a transient network error occurs on the primary provider When extraction is retried Then the fallback provider is used and the capture completes [api] [manual]

AC-08 Given a buyer switches the default provider When they view past extraction runs Then past runs still show the provider that was used at the time [data]

AC-09 Given no fallback provider is configured When the primary provider fails Then extraction fails with a clear error rather than silently falling back [api] [manual]

AC-10 Given the buyer switches provider mid-session When they start a new capture Then the new provider is used without requiring a restart [ui]

AC-11 Given fallback is triggered When the buyer views the capture history Then the fallback event is noted on that extraction [ui] [manual]

AC-12 Given fallback to a provider with different schema support When extraction runs Then fields unsupported by the fallback are flagged as missing rather than guessed [api]
