import { StyleSheet } from 'react-native';

export const CARD_WIDTH = 180;
export const CARD_GAP = 12;

export const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ececec',
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.3,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f4f6f8',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  collapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  collapsedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
  },
  cardImageWrap: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * (9 / 16),
    borderRadius: 12,
    backgroundColor: '#f4f6f8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardTitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d0d5db',
  },
  dotActive: {
    width: 16,
    backgroundColor: '#1293DA',
  },
});
