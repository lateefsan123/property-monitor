# Google spreadsheet selection

Google Sheets now opens a searchable list instead of asking for IDs. Select a spreadsheet, then a worksheet, to read the bounded A1:Z100 preview. This does not import or sync sellers automatically.

The existing spreadsheets.readonly permission reads cells. Browsing requests the additional drive.metadata.readonly scope through the existing user-scoped OAuth upgrade flow (`capability: browse`). This permission can view Drive file metadata; the app queries only non-trashed Google spreadsheets and returns names and IDs, 50 at a time. Tokens remain server-side. Searches are escaped and pagination tokens are passed only to the fixed Google endpoint.

Enable Google Drive API in the same Google Cloud project as the OAuth client. Existing connections must approve the additional metadata scope once using Choose from Google Drive. Do not report live browsing as verified until both steps are completed.

Reference: https://developers.google.com/workspace/drive/api/guides/file-metadata

Verification: integration-reads tests cover metadata scopes, search escaping, pagination, selected worksheet titles and rejected mixed inputs. The local integrations preview `?state=tools` exercises file selection, worksheet selection and cell preview with sample data.
