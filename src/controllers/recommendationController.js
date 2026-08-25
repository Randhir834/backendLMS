const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Questionnaire structure - Redesigned for 7 available courses
const getQuestionnaire = async (req, res, next) => {
  try {
    const questionnaire = {
      questions: [
        {
          id: 'child_age',
          type: 'number',
          question: "What is your child age?",
          required: true,
          min: 3,
          max: 18
        },
        {
          id: 'primary_interest',
          type: 'single_choice',
          question: "What is your child most interested in learning?",
          required: true,
          options: [
            { value: 'reading_language', label: 'Reading & Language Skills - Building vocabulary, comprehension & reading fluency' },
            { value: 'communication', label: 'Communication & Public Speaking - Expressing ideas confidently in front of others' },
            { value: 'spelling_grammar', label: 'Spelling & Grammar - Writing correctly and understanding language rules' },
            { value: 'technology', label: 'Technology & AI - Learning about artificial intelligence and digital creativity' }
          ]
        },
        {
          id: 'current_reading_level',
          type: 'single_choice',
          question: "How would you describe your child current reading ability?",
          required: true,
          options: [
            { value: 'beginner', label: 'Beginner - Just starting to read simple words' },
            { value: 'developing', label: 'Developing - Can read simple sentences and short stories' },
            { value: 'confident', label: 'Confident - Reads fluently and understands stories well' },
            { value: 'advanced', label: 'Advanced - Reads chapter books independently' }
          ]
        },
        {
          id: 'learning_goals',
          type: 'multiple_choice',
          question: "What specific skills would you like your child to improve? (Select all that apply)",
          required: true,
          options: [
            { value: 'phonics_pronunciation', label: 'Phonics & Pronunciation - Learning letter sounds and how to read words' },
            { value: 'reading_fluency', label: 'Reading Fluency - Reading smoothly and with understanding' },
            { value: 'vocabulary', label: 'Vocabulary - Learning new words and their meanings' },
            { value: 'spelling', label: 'Spelling - Writing words correctly' },
            { value: 'grammar', label: 'Grammar - Understanding sentence structure and language rules' },
            { value: 'speaking_confidence', label: 'Speaking Confidence - Talking clearly in front of others' },
            { value: 'comprehension', label: 'Comprehension - Understanding what they read' },
            { value: 'digital_skills', label: 'Digital Skills - Using technology creatively and safely' }
          ]
        },
        {
          id: 'personality_traits',
          type: 'multiple_choice',
          question: "Which traits best describe your child? (Select up to 3)",
          required: true,
          max_selections: 3,
          options: [
            { value: 'shy_quiet', label: 'Shy & Quiet - Needs encouragement to speak up' },
            { value: 'confident_expressive', label: 'Confident & Expressive - Loves to share ideas and perform' },
            { value: 'curious_eager', label: 'Curious & Eager to Learn - Asks lots of questions' },
            { value: 'creative_imaginative', label: 'Creative & Imaginative - Loves stories and creative thinking' },
            { value: 'focused_detail', label: 'Focused & Detail-Oriented - Careful with rules and accuracy' },
            { value: 'tech_savvy', label: 'Tech-Savvy - Interested in computers and technology' },
            { value: 'competitive', label: 'Competitive - Enjoys challenges and competitions' },
            { value: 'patient_persistent', label: 'Patient & Persistent - Does not give up easily' }
          ]
        },
        {
          id: 'specific_challenges',
          type: 'multiple_choice',
          question: "Does your child face any of these challenges? (Select all that apply)",
          required: true,
          options: [
            { value: 'pronunciation', label: 'Difficulty with Pronunciation - Struggles to say words correctly' },
            { value: 'spelling_errors', label: 'Frequent Spelling Errors - Makes many spelling mistakes' },
            { value: 'reading_slowly', label: 'Reading Slowly - Takes time to read and decode words' },
            { value: 'grammar_mistakes', label: 'Grammar Mistakes - Struggles with sentence structure' },
            { value: 'speaking_fear', label: 'Fear of Speaking - Gets nervous talking in front of others' },
            { value: 'comprehension', label: 'Comprehension Issues - Reads but does not understand the meaning' },
            { value: 'vocabulary_limited', label: 'Limited Vocabulary - Knows few words for their age' },
            { value: 'none', label: 'None of the Above - No specific challenges' }
          ]
        },
        {
          id: 'learning_preferences',
          type: 'single_choice',
          question: "How does your child enjoy learning most?",
          required: true,
          options: [
            { value: 'interactive_games', label: 'Through Games & Interactive Activities - Playful and engaging' },
            { value: 'structured_lessons', label: 'Through Structured Lessons - Step-by-step with clear instructions' },
            { value: 'stories_discussions', label: 'Through Stories & Discussions - Listening, talking, and sharing ideas' },
            { value: 'hands_on_practice', label: 'Through Hands-On Practice - Doing activities and exercises' }
          ]
        },
        {
          id: 'desired_outcomes',
          type: 'multiple_choice',
          question: "What outcomes are you hoping for after the course? (Select all that apply)",
          required: true,
          options: [
            { value: 'confident_reader', label: 'Become a Confident Reader - Read books independently' },
            { value: 'better_speller', label: 'Become a Better Speller - Win spelling competitions' },
            { value: 'public_speaker', label: 'Become a Public Speaker - Speak confidently in front of groups' },
            { value: 'grammar_master', label: 'Master Grammar - Write correct sentences' },
            { value: 'storyteller', label: 'Become a Storyteller - Share ideas and stories creatively' },
            { value: 'tech_literate', label: 'Become Tech-Literate - Use AI and technology safely' },
            { value: 'academic_success', label: 'Improve Academic Performance - Better grades in school' },
            { value: 'lifelong_learner', label: 'Develop Love for Learning - Enjoy reading and learning new things' }
          ]
        }
      ]
    };

    res.json(questionnaire);
  } catch (error) {
    next(error);
  }
};

// Calculate recommendation scores - Updated for 7 available courses
const calculateRecommendations = (responses, coursesWithMetadata) => {
  const recommendations = [];

  // Course mapping based on actual available courses
  const courseKeywords = {
    24: { // Public Speaking
      keywords: ['public', 'speaking', 'communication'],
      primary_interests: ['communication'],
      goals: ['speaking_confidence', 'public_speaker', 'confident_reader'],
      challenges: ['speaking_fear'],
      reading_levels: ['confident', 'advanced'],
      min_age: 7
    },
    25: { // Reader's Club - Intermediate
      keywords: ['reader', 'intermediate', 'reading'],
      primary_interests: ['reading_language'],
      goals: ['reading_fluency', 'vocabulary', 'confident_reader', 'storyteller'],
      challenges: ['reading_slowly', 'comprehension', 'vocabulary_limited'],
      reading_levels: ['developing', 'confident'],
      min_age: 5,
      max_age: 7
    },
    26: { // Reader's Club - Beginner
      keywords: ['reader', 'beginner', 'reading'],
      primary_interests: ['reading_language'],
      goals: ['phonics_pronunciation', 'reading_fluency', 'confident_reader'],
      challenges: ['pronunciation', 'reading_slowly', 'comprehension'],
      reading_levels: ['beginner', 'developing'],
      min_age: 4,
      max_age: 6
    },
    27: { // AI - Artificial Intelligence
      keywords: ['ai', 'artificial', 'intelligence', 'technology'],
      primary_interests: ['technology'],
      goals: ['digital_skills', 'tech_literate'],
      challenges: ['none'],
      reading_levels: ['developing', 'confident', 'advanced'],
      min_age: 6,
      max_age: 10
    },
    28: { // Phonics - Intermediate
      keywords: ['phonics', 'intermediate'],
      primary_interests: ['reading_language', 'spelling_grammar'],
      goals: ['phonics_pronunciation', 'spelling', 'reading_fluency'],
      challenges: ['pronunciation', 'spelling_errors', 'reading_slowly'],
      reading_levels: ['developing', 'confident'],
      min_age: 5
    },
    29: { // Spell Bee
      keywords: ['spell', 'bee', 'spelling'],
      primary_interests: ['spelling_grammar'],
      goals: ['spelling', 'better_speller', 'vocabulary'],
      challenges: ['spelling_errors', 'vocabulary_limited'],
      reading_levels: ['developing', 'confident', 'advanced'],
      min_age: 6
    },
    30: { // Grammar - Basic
      keywords: ['grammar', 'basic'],
      primary_interests: ['spelling_grammar'],
      goals: ['grammar', 'grammar_master', 'academic_success'],
      challenges: ['grammar_mistakes', 'comprehension'],
      reading_levels: ['developing', 'confident', 'advanced'],
      min_age: 6
    }
  };

  coursesWithMetadata.forEach(course => {
    let score = 0;
    const reasons = [];
    const courseMapping = courseKeywords[course.id];

    if (!courseMapping) {
      // Skip courses without mapping
      return;
    }

    // Age matching (25 points) - CRITICAL
    const courseMinAge = courseMapping.min_age || 3;
    const courseMaxAge = courseMapping.max_age || 18;
    
    if (responses.child_age >= courseMinAge && responses.child_age <= courseMaxAge) {
      score += 25;
      if (responses.child_age >= courseMinAge && responses.child_age <= courseMinAge + 2) {
        score += 5; // Bonus for being in ideal age range
        reasons.push(`Perfect age match for this course`);
      }
    } else if (responses.child_age < courseMinAge) {
      score -= 20; // Penalize if too young
    } else if (responses.child_age > courseMaxAge) {
      score -= 10; // Smaller penalty if too old
    }

    // Primary Interest matching (30 points) - MOST IMPORTANT
    if (responses.primary_interest && courseMapping.primary_interests) {
      if (courseMapping.primary_interests.includes(responses.primary_interest)) {
        score += 30;
        reasons.push(`Matches your child primary interest in ${responses.primary_interest.replace('_', ' ')}`);
      }
    }

    // Reading Level matching (20 points) - VERY IMPORTANT for literacy courses
    if (responses.current_reading_level && courseMapping.reading_levels) {
      if (courseMapping.reading_levels.includes(responses.current_reading_level)) {
        score += 20;
        reasons.push(`Appropriate for ${responses.current_reading_level} reading level`);
      }
    }

    // Learning Goals matching (15 points)
    if (responses.learning_goals && courseMapping.goals) {
      const goalMatches = responses.learning_goals.filter(goal => 
        courseMapping.goals.includes(goal)
      );
      if (goalMatches.length > 0) {
        const goalScore = Math.min((goalMatches.length / responses.learning_goals.length) * 15, 15);
        score += goalScore;
        reasons.push(`Addresses ${goalMatches.length} of your learning goals`);
      }
    }

    // Challenges matching (10 points) - Helps address specific problems
    if (responses.specific_challenges && courseMapping.challenges) {
      const challengeMatches = responses.specific_challenges.filter(challenge => 
        courseMapping.challenges.includes(challenge) || courseMapping.challenges.includes('none')
      );
      if (challengeMatches.length > 0 && !responses.specific_challenges.includes('none')) {
        score += 10;
        reasons.push(`Helps overcome specific challenges`);
      }
    }

    // Personality traits matching (5 points)
    if (responses.personality_traits) {
      const personalityBonus = {
        'shy_quiet': ['26', '25', '28'], // Reader's Club, Phonics
        'confident_expressive': ['24', '29'], // Public Speaking, Spell Bee
        'curious_eager': ['27', '26', '25'], // AI, Reader's Club
        'creative_imaginative': ['26', '25', '27'], // Reader's Club, AI
        'focused_detail': ['29', '30', '28'], // Spell Bee, Grammar, Phonics
        'tech_savvy': ['27'], // AI
        'competitive': ['29', '24'], // Spell Bee, Public Speaking
        'patient_persistent': ['28', '30', '29'] // Phonics, Grammar, Spell Bee
      };

      responses.personality_traits.forEach(trait => {
        if (personalityBonus[trait] && personalityBonus[trait].includes(String(course.id))) {
          score += 5;
          reasons.push(`Great fit for ${trait.replace('_', ' ')} personality`);
        }
      });
    }

    // Desired Outcomes matching (10 points)
    if (responses.desired_outcomes && courseMapping.goals) {
      const outcomeMatches = responses.desired_outcomes.filter(outcome => 
        courseMapping.goals.includes(outcome)
      );
      if (outcomeMatches.length > 0) {
        score += 10;
        reasons.push(`Achieves ${outcomeMatches.length} of your desired outcomes`);
      }
    }

    // Learning Preferences bonus (5 points)
    const preferenceBonus = {
      'interactive_games': ['26', '27', '28'], // Reader's Club Beginner, AI, Phonics
      'structured_lessons': ['30', '28', '29'], // Grammar, Phonics, Spell Bee
      'stories_discussions': ['25', '26', '24'], // Reader's Club, Public Speaking
      'hands_on_practice': ['28', '29', '30'] // Phonics, Spell Bee, Grammar
    };

    if (responses.learning_preferences) {
      if (preferenceBonus[responses.learning_preferences] && 
          preferenceBonus[responses.learning_preferences].includes(String(course.id))) {
        score += 5;
        reasons.push(`Matches ${responses.learning_preferences.replace('_', ' ')} learning style`);
      }
    }

    // Only include courses with a minimum score of 40 (out of ~100+)
    if (score >= 40) {
      recommendations.push({
        course_id: course.id,
        course_title: course.title,
        course_description: course.description,
        course_price: course.price,
        course_thumbnail: course.thumbnail_url,
        course_level: course.level,
        score: Math.round(score),
        reasons: reasons,
        benefits: [
          course.what_you_learn || 'Comprehensive skill development',
          'Live interactive classes with expert instructors',
          'Personalized attention and feedback'
        ],
        skills_developed: courseMapping.goals || []
      });
    }
  });

  // Sort by score (highest first) and return top 5
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

// Submit questionnaire and get recommendations
const submitQuestionnaire = async (req, res, next) => {
  try {
    const {
      parent_name,
      parent_email,
      parent_phone,
      child_name,
      responses
    } = req.body;

    // Validate required fields
    if (!responses || !responses.child_age) {
      return res.status(400).json({ error: 'Child age is required' });
    }

    // Generate session ID
    const sessionId = uuidv4();

    // Fetch all published courses with metadata
    const coursesQuery = `
      SELECT 
        c.id,
        c.title,
        c.description,
        c.price,
        c.thumbnail_url,
        c.level,
        c.what_you_learn,
        cm.age_min,
        cm.age_max,
        cm.skills_developed,
        cm.interests,
        cm.learning_style,
        cm.personality_traits,
        cm.time_commitment,
        cm.difficulty_level,
        cm.benefits
      FROM courses c
      LEFT JOIN course_metadata cm ON c.id = cm.course_id
      WHERE c.status = 'published'
    `;

    const coursesResult = await pool.query(coursesQuery);
    const coursesWithMetadata = coursesResult.rows;

    // Calculate recommendations
    const recommendations = calculateRecommendations(responses, coursesWithMetadata);

    // Store the response in database
    const insertQuery = `
      INSERT INTO recommendation_responses 
      (session_id, parent_name, parent_email, parent_phone, child_name, child_age, responses, recommended_courses)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, session_id
    `;

    const result = await pool.query(insertQuery, [
      sessionId,
      parent_name || null,
      parent_email || null,
      parent_phone || null,
      child_name || null,
      responses.child_age,
      JSON.stringify(responses),
      JSON.stringify(recommendations)
    ]);

    res.json({
      session_id: sessionId,
      recommendations: recommendations,
      message: recommendations.length > 0 
        ? 'Recommendations generated successfully' 
        : 'No suitable courses found. Please try adjusting your preferences.'
    });
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    next(error);
  }
};

// Get recommendations by session ID
const getRecommendationsBySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const query = `
      SELECT 
        id,
        session_id,
        parent_name,
        child_name,
        child_age,
        responses,
        recommended_courses,
        created_at
      FROM recommendation_responses
      WHERE session_id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get all recommendation responses (admin only)
const getAllRecommendations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        id,
        session_id,
        parent_name,
        parent_email,
        parent_phone,
        child_name,
        child_age,
        responses,
        recommended_courses,
        created_at
      FROM recommendation_responses
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = 'SELECT COUNT(*) FROM recommendation_responses';

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    res.json({
      recommendations: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    next(error);
  }
};

// Update course metadata (admin only)
const updateCourseMetadata = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const {
      age_min,
      age_max,
      skills_developed,
      interests,
      learning_style,
      personality_traits,
      time_commitment,
      difficulty_level,
      benefits
    } = req.body;

    const query = `
      INSERT INTO course_metadata 
      (course_id, age_min, age_max, skills_developed, interests, learning_style, 
       personality_traits, time_commitment, difficulty_level, benefits, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (course_id) 
      DO UPDATE SET
        age_min = EXCLUDED.age_min,
        age_max = EXCLUDED.age_max,
        skills_developed = EXCLUDED.skills_developed,
        interests = EXCLUDED.interests,
        learning_style = EXCLUDED.learning_style,
        personality_traits = EXCLUDED.personality_traits,
        time_commitment = EXCLUDED.time_commitment,
        difficulty_level = EXCLUDED.difficulty_level,
        benefits = EXCLUDED.benefits,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      courseId,
      age_min,
      age_max,
      skills_developed,
      interests,
      learning_style,
      personality_traits,
      time_commitment,
      difficulty_level,
      benefits
    ]);

    res.json({
      message: 'Course metadata updated successfully',
      metadata: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Get course metadata
const getCourseMetadata = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const query = `
      SELECT * FROM course_metadata WHERE course_id = $1
    `;

    const result = await pool.query(query, [courseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course metadata not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuestionnaire,
  submitQuestionnaire,
  getRecommendationsBySession,
  getAllRecommendations,
  updateCourseMetadata,
  getCourseMetadata
};
