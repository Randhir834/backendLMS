const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Questionnaire structure
const getQuestionnaire = async (req, res, next) => {
  try {
    const questionnaire = {
      questions: [
        {
          id: 'child_age',
          type: 'number',
          question: "What is your child's age?",
          required: true,
          min: 3,
          max: 18
        },
        {
          id: 'interests',
          type: 'multiple_choice',
          question: "What are your child's primary interests? (Select all that apply)",
          required: true,
          options: [
            { value: 'arts', label: 'Arts & Creativity' },
            { value: 'music', label: 'Music & Performance' },
            { value: 'strategy', label: 'Strategy & Games' },
            { value: 'language', label: 'Language & Reading' },
            { value: 'mathematics', label: 'Mathematics & Logic' },
            { value: 'technology', label: 'Technology & Computers' },
            { value: 'communication', label: 'Communication & Leadership' },
            { value: 'puzzles', label: 'Puzzles & Problem Solving' }
          ]
        },
        {
          id: 'learning_style',
          type: 'single_choice',
          question: "How does your child learn best?",
          required: true,
          options: [
            { value: 'visual', label: 'Visual - Through pictures, diagrams, and demonstrations' },
            { value: 'hands-on', label: 'Hands-on - Through practice and physical activities' },
            { value: 'auditory', label: 'Auditory - Through listening and discussions' },
            { value: 'logical', label: 'Logical - Through reasoning and problem-solving' }
          ]
        },
        {
          id: 'personality',
          type: 'multiple_choice',
          question: "Which traits best describe your child? (Select up to 3)",
          required: true,
          max_selections: 3,
          options: [
            { value: 'creative', label: 'Creative & Imaginative' },
            { value: 'analytical', label: 'Analytical & Logical' },
            { value: 'social', label: 'Social & Outgoing' },
            { value: 'patient', label: 'Patient & Focused' },
            { value: 'competitive', label: 'Competitive & Ambitious' },
            { value: 'curious', label: 'Curious & Eager to Learn' },
            { value: 'expressive', label: 'Expressive & Confident' },
            { value: 'detail_oriented', label: 'Detail-Oriented & Careful' }
          ]
        },
        {
          id: 'goals',
          type: 'multiple_choice',
          question: "What skills would you like your child to develop? (Select all that apply)",
          required: true,
          options: [
            { value: 'creativity', label: 'Creativity & Artistic Expression' },
            { value: 'problem_solving', label: 'Problem Solving & Critical Thinking' },
            { value: 'communication', label: 'Communication & Public Speaking' },
            { value: 'academic', label: 'Academic Skills (Reading, Math, etc.)' },
            { value: 'confidence', label: 'Confidence & Self-Esteem' },
            { value: 'discipline', label: 'Discipline & Focus' },
            { value: 'leadership', label: 'Leadership & Teamwork' },
            { value: 'technology', label: 'Technology & Digital Skills' }
          ]
        },
        {
          id: 'time_commitment',
          type: 'single_choice',
          question: "How much time can your child dedicate to learning per week?",
          required: true,
          options: [
            { value: 'low', label: '1-2 hours per week' },
            { value: 'medium', label: '3-5 hours per week' },
            { value: 'high', label: '6+ hours per week' }
          ]
        },
        {
          id: 'experience_level',
          type: 'single_choice',
          question: "What is your child's experience level with structured learning activities?",
          required: true,
          options: [
            { value: 'beginner', label: 'Beginner - New to structured activities' },
            { value: 'intermediate', label: 'Intermediate - Some experience with classes' },
            { value: 'advanced', label: 'Advanced - Experienced with multiple activities' }
          ]
        },
        {
          id: 'challenges',
          type: 'multiple_choice',
          question: "Are there any specific areas where your child needs support? (Optional)",
          required: false,
          options: [
            { value: 'concentration', label: 'Concentration & Focus' },
            { value: 'confidence', label: 'Building Confidence' },
            { value: 'social_skills', label: 'Social Skills' },
            { value: 'academic_support', label: 'Academic Support' },
            { value: 'creative_outlet', label: 'Creative Outlet' },
            { value: 'physical_coordination', label: 'Physical Coordination' }
          ]
        }
      ]
    };

    res.json(questionnaire);
  } catch (error) {
    next(error);
  }
};

// Calculate recommendation scores
const calculateRecommendations = (responses, coursesWithMetadata) => {
  const recommendations = [];

  coursesWithMetadata.forEach(course => {
    let score = 0;
    const reasons = [];

    // Age matching (20 points)
    if (responses.child_age >= course.age_min && responses.child_age <= course.age_max) {
      score += 20;
    } else {
      // Penalize if outside age range
      return; // Skip this course
    }

    // Interest matching (25 points)
    if (responses.interests && course.interests) {
      const interestMatches = responses.interests.filter(interest => 
        course.interests.includes(interest)
      );
      if (interestMatches.length > 0) {
        const interestScore = (interestMatches.length / responses.interests.length) * 25;
        score += interestScore;
        reasons.push(`Matches ${interestMatches.length} of your child's interests`);
      }
    }

    // Learning style matching (20 points)
    if (responses.learning_style && course.learning_style) {
      if (course.learning_style.includes(responses.learning_style)) {
        score += 20;
        reasons.push(`Suits ${responses.learning_style} learning style`);
      }
    }

    // Personality matching (15 points)
    if (responses.personality && course.personality_traits) {
      const personalityMatches = responses.personality.filter(trait => 
        course.personality_traits.includes(trait)
      );
      if (personalityMatches.length > 0) {
        const personalityScore = (personalityMatches.length / responses.personality.length) * 15;
        score += personalityScore;
        reasons.push(`Aligns with your child's personality traits`);
      }
    }

    // Goals/Skills matching (15 points)
    if (responses.goals && course.skills_developed) {
      const goalMatches = responses.goals.filter(goal => {
        // Map goals to skills
        const goalSkillMap = {
          'creativity': ['creativity', 'creative', 'artistic', 'imagination'],
          'problem_solving': ['problem_solving', 'critical_thinking', 'logical_reasoning', 'strategic_thinking'],
          'communication': ['communication', 'public_speaking', 'articulation', 'presentation'],
          'academic': ['reading', 'language', 'literacy', 'mental_math', 'mathematics'],
          'confidence': ['confidence', 'self_expression', 'leadership'],
          'discipline': ['discipline', 'focus', 'concentration', 'patience'],
          'leadership': ['leadership', 'communication', 'confidence'],
          'technology': ['technology', 'coding', 'digital_literacy', 'computers']
        };

        const relatedSkills = goalSkillMap[goal] || [goal];
        return course.skills_developed.some(skill => 
          relatedSkills.some(rs => skill.toLowerCase().includes(rs.toLowerCase()))
        );
      });

      if (goalMatches.length > 0) {
        const goalScore = (goalMatches.length / responses.goals.length) * 15;
        score += goalScore;
        reasons.push(`Develops ${goalMatches.length} of your desired skills`);
      }
    }

    // Time commitment matching (5 points)
    if (responses.time_commitment === course.time_commitment) {
      score += 5;
      reasons.push(`Matches your available time commitment`);
    }

    // Experience level matching (5 points)
    if (responses.experience_level === course.difficulty_level) {
      score += 5;
      reasons.push(`Appropriate for ${responses.experience_level} level`);
    }

    // Challenge-based bonus (bonus points)
    if (responses.challenges && responses.challenges.length > 0) {
      const challengeSkillMap = {
        'concentration': ['concentration', 'focus', 'memory', 'discipline'],
        'confidence': ['confidence', 'self_expression', 'communication', 'leadership'],
        'social_skills': ['communication', 'leadership', 'social'],
        'academic_support': ['reading', 'language', 'mathematics', 'literacy'],
        'creative_outlet': ['creativity', 'artistic', 'imagination', 'self_expression'],
        'physical_coordination': ['coordination', 'fine_motor_skills', 'hands-on']
      };

      responses.challenges.forEach(challenge => {
        const relatedSkills = challengeSkillMap[challenge] || [];
        const hasMatchingSkill = course.skills_developed.some(skill =>
          relatedSkills.some(rs => skill.toLowerCase().includes(rs.toLowerCase()))
        );
        if (hasMatchingSkill) {
          score += 3;
          reasons.push(`Helps address ${challenge.replace('_', ' ')}`);
        }
      });
    }

    // Only include courses with a minimum score
    if (score >= 30) {
      recommendations.push({
        course_id: course.id,
        course_title: course.title,
        course_description: course.description,
        course_price: course.price,
        course_thumbnail: course.thumbnail_url,
        course_level: course.level,
        score: Math.round(score),
        reasons: reasons,
        benefits: course.benefits || [],
        skills_developed: course.skills_developed || []
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
      AND cm.id IS NOT NULL
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
