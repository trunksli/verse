import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from 'react-native';

// Set EXPO_PUBLIC_API_URL to point the app at a deployed backend; Expo inlines
// EXPO_PUBLIC_* into the bundle at build time. Without it we fall back to a
// local server -- the Android emulator reaches the host via 10.0.2.2, everything
// else via localhost. A physical device has no local backend, so it needs the
// env var set.
//
// This value ships inside the app bundle and is not a secret. The Gemini key
// stays server-side; the app only ever talks to our own API.
const BACKEND_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({
    android: 'http://10.0.2.2:3000',
    default: 'http://localhost:3000',
  });

interface Verse {
  reference: string;
  text: string;
  explanation: string;
}

interface AdviceResult {
  isOffTopic: boolean;
  reflection: string;
  verses: Verse[];
}

const MOODS = [
  { emoji: '😔', label: 'Overwhelmed', query: 'I am feeling extremely overwhelmed with my work and family demands and need rest.' },
  { emoji: '😟', label: 'Anxious', query: 'I am facing financial anxiety and feel very uncertain about my career future.' },
  { emoji: '😠', label: 'Conflict', query: 'I had a heated argument with someone and need advice on how to respond with peace and de-escalate.' },
  { emoji: '😢', label: 'Grieving', query: 'I am grieving the loss of a loved one and need comfort and hope.' },
  { emoji: '😌', label: 'Peaceful', query: 'I want to offer a prayer of gratitude and study a verse about peace and contentment.' },
];

const LOADING_QUOTES = [
  "Be still, and know that I am God... (Psalm 46:10)",
  "The LORD is my shepherd; I shall not want. (Psalm 23:1)",
  "Ask, and it shall be given you; seek, and ye shall find... (Matthew 7:7)",
  "Thy word is a lamp unto my feet, and a light unto my path. (Psalm 119:105)",
  "Peace I leave with you, my peace I give unto you... (John 14:27)"
];

export default function HomeScreen() {
  const scheme = useColorScheme();
  const themeColors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const params = useLocalSearchParams<{ query?: string; autoSubmit?: string }>();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState('');
  const [result, setResult] = useState<AdviceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (params.query) {
      setQuery(params.query);
      if (params.autoSubmit === 'true') {
        triggerSeekGuidance(params.query);
      }
      router.setParams({ query: undefined, autoSubmit: undefined });
    }
  }, [params.query, params.autoSubmit]);

  useEffect(() => {
    if (loading) {
      const randomQuote = LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)];
      setLoadingQuote(randomQuote);
      const interval = setInterval(() => {
        const nextQuote = LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)];
        setLoadingQuote(nextQuote);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleMoodSelect = (moodQuery: string) => {
    setQuery(moodQuery);
    setResult(null);
    setError(null);
  };

  const triggerSeekGuidance = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setIsBookmarked(false);

    try {
      const response = await fetch(`${BACKEND_URL}/api/advise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error. Please verify the backend is running.');
      }

      const data: AdviceResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeekGuidance = async () => {
    if (!query.trim()) {
      Alert.alert('Empty Input', 'Please describe your situation or select a mood.');
      return;
    }
    await triggerSeekGuidance(query);
  };

  const handleBookmark = async () => {
    if (!result) return;
    try {
      const existing = await AsyncStorage.getItem('@scripture_advisor_bookmarks');
      const bookmarks = existing ? JSON.parse(existing) : [];
      
      // Check if already bookmarked
      const isAlreadySaved = bookmarks.some((b: any) => b.reflection === result.reflection);
      if (isAlreadySaved) {
        Alert.alert('Already Saved', 'This advice is already in your Saved tab.');
        setIsBookmarked(true);
        return;
      }

      const newBookmark = {
        id: Date.now().toString(),
        query,
        reflection: result.reflection,
        verses: result.verses,
        createdAt: new Date().toLocaleDateString()
      };

      bookmarks.unshift(newBookmark);
      await AsyncStorage.setItem('@scripture_advisor_bookmarks', JSON.stringify(bookmarks));
      setIsBookmarked(true);
      Alert.alert('Saved', 'Added to your bookmarked guidance.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save bookmark.');
    }
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

  const handleReset = () => {
    setQuery('');
    setResult(null);
    setError(null);
    setIsBookmarked(false);
  };

  // Themed Styles
  const dynamicStyles = {
    container: { backgroundColor: themeColors.background },
    text: { color: themeColors.text },
    textSecondary: { color: themeColors.textSecondary },
    input: {
      backgroundColor: themeColors.backgroundElement,
      borderColor: scheme === 'dark' ? '#3e4147' : '#d2d4d8',
      color: themeColors.text,
    },
    moodButton: {
      backgroundColor: themeColors.backgroundElement,
    },
    card: {
      backgroundColor: themeColors.backgroundElement,
      borderLeftColor: '#d97706', // Gold Accent
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWidthContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, dynamicStyles.text]}>Scripture Guide</Text>
            <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
              A specialized companion for spiritual encouragement & advice.
            </Text>
          </View>

          {/* Form Section */}
          {!result && !loading && (
            <View style={styles.formContainer}>
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>How are you feeling today?</Text>
              
              {/* Mood Quick Buttons */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.moodsScroll}
              >
                {MOODS.map((m, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.moodButton, dynamicStyles.moodButton]}
                    onPress={() => handleMoodSelect(m.query)}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, dynamicStyles.textSecondary]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Freeform input */}
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>Describe your situation or feelings</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="I am feeling overwhelmed with life, or need career direction..."
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={query}
                onChangeText={setQuery}
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSeekGuidance}>
                <Text style={styles.submitButtonText}>Seek Wisdom</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading View */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#d97706" />
              <Text style={[styles.loadingTitle, dynamicStyles.text]}>Searching Scriptures...</Text>
              <View style={styles.quoteBox}>
                <Text style={styles.loadingQuote}>"{loadingQuote}"</Text>
              </View>
            </View>
          )}

          {/* Error View */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Connection Error</Text>
              <Text style={[styles.errorText, dynamicStyles.textSecondary]}>{error}</Text>
              <Text style={[styles.errorSub, dynamicStyles.textSecondary]}>
                Make sure the backend server is running locally on port 3000.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleSeekGuidance}>
                <Text style={styles.retryButtonText}>Retry Request</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleReset}>
                <Text style={styles.cancelButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Result View */}
          {result && (
            <View style={styles.resultContainer}>
              {/* Query Recall */}
              <View style={styles.queryRecall}>
                <Text style={styles.queryRecallLabel}>YOUR REFLECTION</Text>
                <Text style={[styles.queryRecallText, dynamicStyles.textSecondary]}>"{query}"</Text>
              </View>

              {/* Off-Topic Pivot Notice */}
              {result.isOffTopic && (
                <View style={styles.offTopicBox}>
                  <Text style={styles.offTopicTitle}>Gently Pivoted to Scripture</Text>
                  <Text style={styles.offTopicText}>
                    This request lies outside biblical counsel, but here is a relevant scriptural theme.
                  </Text>
                </View>
              )}

              {/* Reflection Card */}
              <View style={[styles.reflectionBox, dynamicStyles.card]}>
                <Text style={styles.reflectionQuoteMark}>“</Text>
                <Text style={[styles.reflectionText, dynamicStyles.text]}>
                  {result.reflection}
                </Text>
              </View>

              <View style={styles.resultActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, isBookmarked && styles.actionButtonActive]} 
                  onPress={handleBookmark}
                >
                  <Text style={styles.actionButtonText}>
                    {isBookmarked ? '✓ Bookmarked' : '☆ Bookmark Advice'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                  <Text style={styles.resetButtonText}>New Query</Text>
                </TouchableOpacity>
              </View>

              {result.verses.length > 0 && (
                <>
                  <Text style={[styles.scriptureHeading, dynamicStyles.text]}>Relevant Scripture</Text>

                  {/* Verses List */}
                  {result.verses.map((verse, index) => (
                    <View key={index} style={[styles.verseCard, dynamicStyles.card]}>
                      <View style={styles.verseHeader}>
                        <Text style={styles.verseReference}>{verse.reference}</Text>
                        <TouchableOpacity onPress={() => handleShare(verse)}>
                          <Text style={styles.shareText}>Share</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.verseText, dynamicStyles.text]}>"{verse.text}"</Text>
                      <View style={styles.divider} />
                      <Text style={styles.explanationTitle}>GUIDANCE CONTEXT</Text>
                      <Text style={[styles.verseExplanation, dynamicStyles.textSecondary]}>
                        {verse.explanation}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
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
    paddingBottom: Spacing.six,
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
  formContainer: {
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.two,
    marginTop: Spacing.three,
  },
  moodsScroll: {
    paddingVertical: Spacing.one,
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    marginRight: Spacing.two,
  },
  moodEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: '#d97706',
    borderRadius: 8,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  quoteBox: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  loadingQuote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#d97706',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: Spacing.two,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  errorSub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  retryButton: {
    backgroundColor: '#d97706',
    borderRadius: 6,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: Spacing.two,
  },
  cancelButtonText: {
    color: '#d97706',
    fontWeight: '500',
  },
  resultContainer: {
    marginTop: Spacing.two,
  },
  queryRecall: {
    marginBottom: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: Spacing.two,
  },
  queryRecallLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d97706',
    letterSpacing: 1,
    marginBottom: 4,
  },
  queryRecallText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  reflectionBox: {
    borderLeftWidth: 4,
    padding: Spacing.three,
    borderRadius: 8,
    marginBottom: Spacing.four,
  },
  reflectionQuoteMark: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d97706',
    lineHeight: 24,
    marginTop: -8,
  },
  reflectionText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  resultActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d97706',
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#d97706',
  },
  actionButtonText: {
    color: '#d97706',
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#475569',
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scriptureHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  verseCard: {
    borderLeftWidth: 4,
    padding: Spacing.four,
    borderRadius: 8,
    marginBottom: Spacing.four,
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  verseReference: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d97706',
  },
  shareText: {
    color: '#d97706',
    fontSize: 13,
    fontWeight: '500',
  },
  verseText: {
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    lineHeight: 26,
    marginBottom: Spacing.two,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: Spacing.two,
  },
  explanationTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 4,
  },
  verseExplanation: {
    fontSize: 13,
    lineHeight: 20,
  },
  offTopicBox: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderWidth: 1,
    borderColor: '#d97706',
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  offTopicTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d97706',
    marginBottom: Spacing.one,
  },
  offTopicText: {
    fontSize: 12.5,
    color: '#b45309',
    textAlign: 'center',
    lineHeight: 18,
  },
  actionButtonTextActive: {
    color: '#ffffff',
  }
});
