# Building logos and exterior-image source register

Local design preview, checked 21 September 2026. The landing page keeps building
logos: nine identities in three columns / three rows. Exterior images are separate
small thumbnails on Listings building rows, never images of a particular unit.
Unknown or ambiguous names keep a neutral icon; there is no fuzzy photo fallback.

## Additional official logos

The existing six logos are unchanged. Three more come from Select Group's project
header logos (rendered monochrome with CSS, not redrawn):

| Asset under `public/landing/tower-logos/` | Official project source | Original asset |
| --- | --- | --- |
| jumeirah-business-bay.png | https://www.select-group.ae/developments/jumeirah-living-business-bay | https://cdn.prod.website-files.com/63bd7443c5c4c66606ad6362/672854d8d76ed5042468baa3_JLBB_ID_WHT_RGB-p-500.png |
| peninsula-four.svg | https://www.select-group.ae/developments/peninsula-four-the-plaza | https://cdn.prod.website-files.com/63bd7443c5c4c66606ad6362/63c0097e0fc062544a43fa59_peninsula-four.svg |
| six-senses-marina.png | https://www.select-group.ae/developments/six-senses-residences-dubai-marina | https://cdn.prod.website-files.com/63bd7443c5c4c66606ad6362/65fbda395bb711dd1dc7d91c_SSR_Dubai%20Marina_standard_logo_white-p-500.png |

## Publication gate

These are third-party developer/architect images, **not newly licensed stock**.
Public availability and attribution are not proof of commercial reuse permission.
Obtain the owners' permission or replace with appropriately licensed equivalents
before publishing the imagery. No deployment or rights clearance was performed.
Do not remove watermarks or claim any developer endorses Repeat AI.

| Asset in `public/landing/buildings/` | Owner/source | Original URL | Treatment |
| --- | --- | --- | --- |
| forte.jpg | Emaar, Forte project page | https://uae-cms.emaar.com/uploads/10946_property_Hero_Image_1db0c1fc35.jpg | Render; both Forte towers, not one specific tower |
| burj-khalifa.jpg | Emaar, Downtown attractions on Forte page | https://uae-cms.emaar.com/uploads/242507_attraction_cecda9b15d.jpg | Exterior image |
| one-zaabeel.jpg | Nikken Sekkei, One Za'abeel project page | https://www.nikken.jp/ja/projects/pj4urv0000006d34-img/pj0288_00_ogp.jpg | Exterior photograph |
| marina-gate.jpg | Select Group, Marina Gate I project page | https://cdn.prod.website-files.com/63bd7443c5c4c66606ad6362/64709e3d66b64d914863de76_1000X100%20(5).jpg | Exterior photograph |
| st-regis.webp | Refine, St. Regis Financial Center Road | https://refinedubai.com/wp-content/uploads/2024/12/St.-Regis-Exterior-Downtown-View_2-scaled-1-1536x864.webp | Architectural render; not Emaar's other St. Regis project |
| jumeirah-business-bay.jpg | Select Group's project navigation | https://cdn.prod.website-files.com/63bd7443c5c4c66606ad6362/67c5a554c8b4fca4c244fd4a_JLBB_Architecture_03.jpg | Architectural render |

Files retain original bytes, with CSS framing only. No generated building geometry
or invented listing photos. Unselected candidates are retained under
`outputs/building-image-candidates/`, not shipped in public assets.

## Sales-result correction

Live read-only query found 25 records under `forte1`, with dates from 2025-10-13
through 2026-03-06. The 2026-09-01–2026-09-21 request is outside that observed
range. It cannot establish no September sales. This change does not refresh the
upstream source or merge `forte1` into the newer `forte2` history.

Empty sales responses now omit summary/total badges, show a coverage or no-match
card, and offer historical results. Text and voice share those rules. The bounded
`Fort 1` / `Fort 2` spelling fallback preserves the tower number, discloses the
correction, and does not broaden queries to other towers.
