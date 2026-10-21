# Seller market-data freshness audit — 21 October 2026

Compared the pre-fix first-populated-key lookup with the shared transaction
resolver against a live database snapshot. No seller records or messages changed.

## Scope and findings

- 8 accounts with seller data; 38,833 seller records in total.
- 21,252 records have a non-empty building, covering 2,749 account/building groups.
- Applied each account's manual/global/automatic aliases and the frontend building
  resolver before comparing transaction keys and latest positive-price sale dates.
- 37 market projects across 4 accounts had newer stored sales than the old lookup
  selected, affecting 2,065 seller records.
- Examples: Imperial Avenue 5 Oct → 20 Oct; City Center Residences 24 Sep → 15 Oct;
  Bellevue Tower 2 31 Aug → 19 Oct; Address Sky View Mar/Apr → 13 Oct;
  Burj Views 8 Oct → 20 Oct; Forte Tower 2 16 Jul → 19 Oct.
- A further 3,260 seller records now have a direct stored-data match where the
  old direct lookup had none. This is not proof that the previous external DLD
  fallback showed no data: that network fallback was not replayed.
- 10,439 records have no direct stored transaction match in either lookup. That
  category includes unmatched names and missing source data and needs separate
  investigation; it is not evidence that those buildings have had no sales.

## Additional correction

The first fix preferred the resolved market feed whenever populated. The audit
found 39 seller records in Grande, One Residence and Beach Mansion where that
feed's latest sale was older than the legacy feed. The selector now compares
dates and preserves the newer existing feed. Comparisons use an immutable view
of the fetched data so one seller alias cannot influence another's selection.

Replayed the corrected service against all 2,749 groups using the snapshot's
latest dated sale per key: zero groups lost a newer date. This verifies lookup
selection, not source completeness, every browser screen, or message delivery.

Validation: 13 focused regression/matching tests passed; changed-file ESLint and
production build passed. Existing broader lint failures remain out of scope.
