# Mobile gallery, appearance and scroll fixes

Apartment details fetch the full Bayut gallery on demand through authenticated `listing-photos`, keeping the cover visible while loading. Results are deduplicated and cached for one hour. Swipe or use previous/next controls; the counter shows the current photo. Provider failures retain the existing cover. The provider endpoint is documented at https://bayutapi.dev/documentation/endpoints/property-details.

Dark-mode switches now set the requested boolean state, retain a white thumb and consistent active colour, and avoid overwriting saved preferences before storage hydration. User changes during hydration win; storage writes are ordered.

The drawer renders the bundled logo directly with contain sizing and a flexible width rather than pre-decoded tinted variants. Its close icon follows the theme.

Apartment detail actions now occupy normal layout space. Removed the history minimum height and the 180-point bottom spacer. Other main lists retain 80 points for the floating assistant instead of 100-120 points.

Verification: targeted ESLint, iOS Expo export, endpoint tests for authentication/validation/photo normalization/cache/provider failure, and React Native Web fixtures for gallery navigation, activity layout, complete dark navigation logo, saved-theme restoration and toggling before storage resolves. The deployed endpoint returned 401 without authentication. Real authenticated Bayut photos and iPhone-native interactions remain unverified. No mobile OTA/store release was published.
