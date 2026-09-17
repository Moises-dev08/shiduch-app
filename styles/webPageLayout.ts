import { Platform, StyleSheet } from 'react-native';

/** Narrower width for settings-style icon+chevron rows on web. */
export const WEB_SETTINGS_CONTENT_MAX_WIDTH = 560;

/** Slightly wider for card/list pages (connect, admin, notifications, matches). */
export const WEB_LIST_CONTENT_MAX_WIDTH = 800;

const isWeb = Platform.OS === 'web';

export const webPageLayout = StyleSheet.create({
  centeredContent: {
    width: '100%',
    maxWidth: isWeb ? WEB_SETTINGS_CONTENT_MAX_WIDTH : undefined,
    alignSelf: 'center',
  },
  centeredScrollContent: {
    width: '100%',
    maxWidth: isWeb ? WEB_SETTINGS_CONTENT_MAX_WIDTH : undefined,
    alignSelf: 'center',
    flexGrow: 1,
  },
  centeredListContent: {
    width: '100%',
    maxWidth: isWeb ? WEB_LIST_CONTENT_MAX_WIDTH : undefined,
    alignSelf: 'center',
  },
  centeredListScrollContent: {
    width: '100%',
    maxWidth: isWeb ? WEB_LIST_CONTENT_MAX_WIDTH : undefined,
    alignSelf: 'center',
    flexGrow: 1,
  },
});
