import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { Colors, Spacing, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface Verse {
  reference: string;
  text: string;
  explanation: string;
}

interface Bookmark {
  id: string;
  query: string;
  reflection: string;
  verses: Verse[];
  createdAt: string;
}

export default function SavedScreen() {
  const scheme = useColorScheme();
  const themeColors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const navigation = useNavigation();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load bookmarks on screen focus
  const loadBookmarks = async () => {
    try {
      const existing = await AsyncStorage.getItem('@scripture_advisor_bookmarks');
      if (existing) {
        setBookmarks(JSON.parse(existing));
      } else {
        setBookmarks([]);
      }
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  };

  useEffect(() => {
    // Reload bookmarks when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      loadBookmarks();
    });
    loadBookmarks(); // Initial load
    return unsubscribe;
  }, [navigation]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Remove Bookmark',
      'Are you sure you want to delete this saved advice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = bookmarks.filter((b) => b.id !== id);
              setBookmarks(updated);
              await AsyncStorage.setItem('@scripture_advisor_bookmarks', JSON.stringify(updated));
              if (expandedId === id) setExpandedId(null);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete bookmark.');
            }
          }
        }
      ]
    );
  };

  const handleShare = async (verse: Verse) => {
    try {
      await Share.share({
        message: `"${verse.text}"\n— ${verse.reference}\n\nShared via Scripture Advisor.`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const dynamicStyles = {
    container: { backgroundColor: themeColors.background },
    text: { color: themeColors.text },
    textSecondary: { color: themeColors.textSecondary },
    card: {
      backgroundColor: themeColors.backgroundElement,
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWidthContainer}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, dynamicStyles.text]}>Saved Guidance</Text>
            <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
              Your bookmarked spiritual reflections and scriptures, saved locally on your device.
            </Text>
          </View>

          {/* Bookmarks List */}
          {bookmarks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📖</Text>
              <Text style={[styles.emptyTitle, dynamicStyles.text]}>No Bookmarks Yet</Text>
              <Text style={[styles.emptySubtitle, dynamicStyles.textSecondary]}>
                When you search for advice on the home tab, use the "Bookmark Advice" button to save it here for offline reading.
              </Text>
            </View>
          ) : (
            bookmarks.map((bookmark) => {
              const isExpanded = expandedId === bookmark.id;
              return (
                <View key={bookmark.id} style={[styles.bookmarkCard, dynamicStyles.card]}>
                  {/* Card Header (Tap to toggle collapse) */}
                  <TouchableOpacity 
                    style={styles.cardHeader} 
                    onPress={() => toggleExpand(bookmark.id)}
                  >
                    <View style={styles.headerTextContainer}>
                      <Text style={[styles.cardDate, dynamicStyles.textSecondary]}>
                        {bookmark.createdAt}
                      </Text>
                      <Text style={[styles.cardQuery, dynamicStyles.text]} numberOfLines={isExpanded ? 3 : 1}>
                        "{bookmark.query}"
                      </Text>
                    </View>
                    <Text style={styles.expandIcon}>
                      {isExpanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <View style={styles.cardBody}>
                      <View style={styles.divider} />
                      
                      {/* Reflection */}
                      <Text style={styles.sectionLabel}>PASTORAL REFLECTION</Text>
                      <Text style={[styles.reflectionText, dynamicStyles.text]}>
                        {bookmark.reflection}
                      </Text>

                      {/* Scriptures */}
                      <Text style={styles.sectionLabel}>SCRIPTURES</Text>
                      {bookmark.verses.map((verse, vIndex) => (
                        <View key={vIndex} style={styles.verseBox}>
                          <View style={styles.verseHeader}>
                            <Text style={styles.verseRef}>{verse.reference}</Text>
                            <TouchableOpacity onPress={() => handleShare(verse)}>
                              <Text style={styles.shareText}>Share</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={[styles.verseText, dynamicStyles.text]}>
                            "{verse.text}"
                          </Text>
                          <Text style={[styles.verseExplanation, dynamicStyles.textSecondary]}>
                            {verse.explanation}
                          </Text>
                        </View>
                      ))}

                      {/* Actions */}
                      <View style={styles.actionsContainer}>
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleDelete(bookmark.id)}
                        >
                          <Text style={styles.deleteButtonText}>Delete Bookmark</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.five,
    alignItems: 'center',
  },
  contentWidthContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  header: {
    marginVertical: Spacing.four,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    marginTop: Spacing.four,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.one,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.five,
  },
  bookmarkCard: {
    borderRadius: 10,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Platform.select({ ios: '#e2e8f0', android: '#e2e8f0', default: '#334155' }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: Spacing.three,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardQuery: {
    fontSize: 14,
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 12,
    color: '#d97706',
  },
  cardBody: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: Spacing.three,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d97706',
    letterSpacing: 1,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  reflectionText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: Spacing.three,
  },
  verseBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 6,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  verseRef: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d97706',
  },
  shareText: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '500',
  },
  verseText: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    lineHeight: 22,
    marginBottom: Spacing.two,
  },
  verseExplanation: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.two,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  }
});
