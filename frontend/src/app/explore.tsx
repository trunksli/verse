import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface Scenario {
  title: string;
  situation: string;
  verseRef: string;
  verseQuote: string;
  whyFits: string;
  query: string;
}

interface Category {
  name: string;
  scenarios: Scenario[];
}

const CATEGORIES: Category[] = [
  {
    name: 'Navigating Challenges & Stress',
    scenarios: [
      {
        title: 'Job Loss or Career Uncertainty',
        situation: 'Facing unexpected unemployment, financial difficulty, or deep anxiety about your professional future.',
        verseRef: 'Jeremiah 29:11',
        verseQuote: '“For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.”',
        whyFits: 'It serves as a reminder that a temporary setback isn’t the end of your story, offering reassurance when next steps are unclear.',
        query: 'I am dealing with job loss and career uncertainty. I feel anxious about my future and need spiritual reassurance.'
      },
      {
        title: 'Burnout or Feeling Overwhelmed',
        situation: 'Juggling family, work, and personal demands to the point of mental, emotional, or physical exhaustion.',
        verseRef: 'Matthew 11:28',
        verseQuote: '“Come to me, all you who are weary and burdened, and I will give you rest.”',
        whyFits: 'It frames rest as a necessity rather than a weakness, inviting you to lay down your heavy burdens.',
        query: 'I feel deeply burned out and overwhelmed by all my responsibilities. I am exhausted and need peace.'
      },
      {
        title: 'Facing Conflict or Anger',
        situation: 'A heated moment with a partner, family member, or coworker where tempers and tensions are rising.',
        verseRef: 'Proverbs 15:1',
        verseQuote: '“A gentle answer turns away wrath, but a harsh word stirs up anger.”',
        whyFits: 'A practical, tactical reminder on how to de-escalate tension before saying something you will regret.',
        query: 'I am experiencing conflict and anger with someone in my life. I need guidance on how to de-escalate the tension.'
      }
    ]
  },
  {
    name: 'Finding Peace & Comfort',
    scenarios: [
      {
        title: 'Anxiety & Worry',
        situation: 'Feeling consumed by worry, fear, or a racing mind about health, safety, or life events.',
        verseRef: 'Philippians 4:6-7',
        verseQuote: '“Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God...”',
        whyFits: 'It instructs you to replace internal worry with active prayer, promising a supernatural peace that guards your mind.',
        query: 'I am struggling with severe anxiety and worry. I need comfort and biblical guidance to calm my racing mind.'
      },
      {
        title: 'Grief, Loss, & Sadness',
        situation: 'Coping with the painful absence of a loved one, a broken relationship, or general feelings of sorrow.',
        verseRef: 'Psalm 34:18',
        verseQuote: '“The Lord is close to the brokenhearted and saves those who are crushed in spirit.”',
        whyFits: 'Offers profound comfort by declaring that God does not withdraw during grief, but draws closer to us.',
        query: 'I am grieving a major loss in my life and my heart is broken. I need comfort, hope, and strength.'
      }
    ]
  }
];

export default function ExploreScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const themeColors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const handleLaunchScenario = (queryText: string) => {
    router.push({
      pathname: '/',
      params: {
        query: queryText,
        autoSubmit: 'true'
      }
    });
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
            <Text style={[styles.title, dynamicStyles.text]}>Explore Guidance</Text>
            <Text style={[styles.subtitle, dynamicStyles.textSecondary]}>
              Tap on any typical situation below to get scripture-based counsel, reflection, and explanations.
            </Text>
          </View>

          {/* Categories list */}
          {CATEGORIES.map((category, catIndex) => (
            <View key={catIndex} style={styles.categoryBlock}>
              <Text style={[styles.categoryName, dynamicStyles.text]}>
                {category.name}
              </Text>
              
              {category.scenarios.map((sc, scIndex) => (
                <View key={scIndex} style={[styles.scenarioCard, dynamicStyles.card]}>
                  <Text style={[styles.scenarioTitle, dynamicStyles.text]}>{sc.title}</Text>
                  <Text style={[styles.scenarioSituation, dynamicStyles.textSecondary]}>
                    <Text style={styles.boldText}>The Situation: </Text>
                    {sc.situation}
                  </Text>
                  
                  {/* Scripture Preview */}
                  <View style={styles.scripturePreview}>
                    <Text style={styles.verseRef}>{sc.verseRef}</Text>
                    <Text style={styles.verseQuote} numberOfLines={2}>{sc.verseQuote}</Text>
                  </View>

                  <Text style={[styles.whyFitsText, dynamicStyles.textSecondary]}>
                    <Text style={styles.whyFitsLabel}>Why It Fits: </Text>
                    {sc.whyFits}
                  </Text>

                  <TouchableOpacity 
                    style={styles.launchButton}
                    onPress={() => handleLaunchScenario(sc.query)}
                  >
                    <Text style={styles.launchButtonText}>Get Advisor Reflection</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
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
  categoryBlock: {
    marginTop: Spacing.three,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.three,
    marginTop: Spacing.two,
  },
  scenarioCard: {
    borderRadius: 12,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: Platform.select({ ios: '#e2e8f0', android: '#e2e8f0', default: '#334155' }),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      }
    })
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
  },
  scenarioSituation: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  boldText: {
    fontWeight: '600',
  },
  scripturePreview: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
    padding: Spacing.three,
    borderRadius: 4,
    marginBottom: Spacing.three,
  },
  verseRef: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d97706',
    marginBottom: 4,
  },
  verseQuote: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 18,
  },
  whyFitsText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.four,
  },
  whyFitsLabel: {
    fontWeight: '600',
    color: '#d97706',
  },
  launchButton: {
    backgroundColor: '#d97706',
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  launchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  }
});
