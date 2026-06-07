-- Course Recommendation System Tables

-- Table to store course metadata for recommendations
CREATE TABLE IF NOT EXISTS course_metadata (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  age_min INTEGER,
  age_max INTEGER,
  skills_developed TEXT[], -- Array of skills (e.g., ['creativity', 'logical_thinking', 'communication'])
  interests TEXT[], -- Array of interests (e.g., ['arts', 'music', 'sports', 'academics'])
  learning_style TEXT[], -- Array of learning styles (e.g., ['visual', 'hands-on', 'interactive'])
  personality_traits TEXT[], -- Array of personality traits (e.g., ['creative', 'analytical', 'social'])
  time_commitment VARCHAR(50), -- 'low', 'medium', 'high'
  difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  benefits TEXT[], -- Array of benefits
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id)
);

-- Table to store questionnaire responses
CREATE TABLE IF NOT EXISTS recommendation_responses (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  parent_name VARCHAR(255),
  parent_email VARCHAR(255),
  parent_phone VARCHAR(50),
  child_name VARCHAR(255),
  child_age INTEGER,
  responses JSONB NOT NULL, -- Store all questionnaire answers
  recommended_courses JSONB, -- Store recommended course IDs and scores
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recommendation_responses_session_id ON recommendation_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_responses_email ON recommendation_responses(parent_email);
CREATE INDEX IF NOT EXISTS idx_course_metadata_course_id ON course_metadata(course_id);

-- Insert default metadata for existing courses
INSERT INTO course_metadata (course_id, age_min, age_max, skills_developed, interests, learning_style, personality_traits, time_commitment, difficulty_level, benefits)
SELECT 
  c.id,
  5, -- default min age
  18, -- default max age
  ARRAY['skill_development']::TEXT[],
  ARRAY['general']::TEXT[],
  ARRAY['visual', 'interactive']::TEXT[],
  ARRAY['curious']::TEXT[],
  'medium',
  'beginner',
  ARRAY['Personal growth', 'Skill development']::TEXT[]
FROM courses c
WHERE NOT EXISTS (
  SELECT 1 FROM course_metadata cm WHERE cm.course_id = c.id
);

-- Update specific course metadata based on course titles
-- Art and Drawing
UPDATE course_metadata cm
SET 
  age_min = 5,
  age_max = 16,
  skills_developed = ARRAY['creativity', 'fine_motor_skills', 'visual_thinking', 'self_expression'],
  interests = ARRAY['arts', 'creative', 'visual'],
  learning_style = ARRAY['visual', 'hands-on', 'creative'],
  personality_traits = ARRAY['creative', 'imaginative', 'patient', 'detail_oriented'],
  time_commitment = 'medium',
  difficulty_level = 'beginner',
  benefits = ARRAY['Enhances creativity and imagination', 'Develops fine motor skills', 'Improves visual-spatial intelligence', 'Boosts self-confidence through artistic expression']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%art%' OR LOWER(c.title) LIKE '%drawing%';

-- Chess
UPDATE course_metadata cm
SET 
  age_min = 6,
  age_max = 18,
  skills_developed = ARRAY['strategic_thinking', 'problem_solving', 'concentration', 'patience', 'logical_reasoning'],
  interests = ARRAY['strategy', 'games', 'intellectual', 'competitive'],
  learning_style = ARRAY['logical', 'strategic', 'analytical'],
  personality_traits = ARRAY['analytical', 'patient', 'competitive', 'focused'],
  time_commitment = 'medium',
  difficulty_level = 'beginner',
  benefits = ARRAY['Improves strategic thinking and planning', 'Enhances concentration and focus', 'Develops problem-solving abilities', 'Teaches patience and sportsmanship']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%chess%';

-- Piano
UPDATE course_metadata cm
SET 
  age_min = 5,
  age_max = 18,
  skills_developed = ARRAY['musical_ability', 'coordination', 'discipline', 'memory', 'creativity'],
  interests = ARRAY['music', 'arts', 'performance'],
  learning_style = ARRAY['auditory', 'hands-on', 'practice-based'],
  personality_traits = ARRAY['creative', 'disciplined', 'patient', 'expressive'],
  time_commitment = 'high',
  difficulty_level = 'beginner',
  benefits = ARRAY['Develops musical talent and appreciation', 'Improves hand-eye coordination', 'Enhances memory and concentration', 'Builds discipline through regular practice']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%piano%';

-- Phonics
UPDATE course_metadata cm
SET 
  age_min = 3,
  age_max = 8,
  skills_developed = ARRAY['reading', 'language', 'pronunciation', 'literacy'],
  interests = ARRAY['language', 'reading', 'academics'],
  learning_style = ARRAY['auditory', 'visual', 'interactive'],
  personality_traits = ARRAY['curious', 'eager_learner', 'verbal'],
  time_commitment = 'medium',
  difficulty_level = 'beginner',
  benefits = ARRAY['Builds strong reading foundation', 'Improves pronunciation and speaking', 'Enhances language comprehension', 'Prepares for academic success']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%phonic%';

-- Public Speaking
UPDATE course_metadata cm
SET 
  age_min = 7,
  age_max = 18,
  skills_developed = ARRAY['communication', 'confidence', 'presentation', 'leadership', 'articulation'],
  interests = ARRAY['communication', 'leadership', 'performance'],
  learning_style = ARRAY['interactive', 'practice-based', 'social'],
  personality_traits = ARRAY['outgoing', 'confident', 'expressive', 'social'],
  time_commitment = 'medium',
  difficulty_level = 'beginner',
  benefits = ARRAY['Builds confidence in public speaking', 'Improves communication skills', 'Develops leadership qualities', 'Enhances articulation and presentation abilities']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%public%' OR LOWER(c.title) LIKE '%speaking%';

-- Abacus
UPDATE course_metadata cm
SET 
  age_min = 5,
  age_max = 14,
  skills_developed = ARRAY['mental_math', 'concentration', 'memory', 'speed', 'accuracy'],
  interests = ARRAY['mathematics', 'academics', 'mental_skills'],
  learning_style = ARRAY['visual', 'hands-on', 'practice-based'],
  personality_traits = ARRAY['analytical', 'focused', 'detail_oriented', 'patient'],
  time_commitment = 'medium',
  difficulty_level = 'beginner',
  benefits = ARRAY['Enhances mental calculation abilities', 'Improves concentration and focus', 'Boosts memory and visualization', 'Builds confidence in mathematics']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%abacus%';

-- Reader's Club
UPDATE course_metadata cm
SET 
  age_min = 6,
  age_max = 16,
  skills_developed = ARRAY['reading_comprehension', 'vocabulary', 'critical_thinking', 'imagination', 'communication'],
  interests = ARRAY['reading', 'literature', 'storytelling', 'academics'],
  learning_style = ARRAY['visual', 'reflective', 'discussion-based'],
  personality_traits = ARRAY['curious', 'imaginative', 'thoughtful', 'verbal'],
  time_commitment = 'low',
  difficulty_level = 'beginner',
  benefits = ARRAY['Develops love for reading', 'Expands vocabulary and language skills', 'Enhances imagination and creativity', 'Improves comprehension and critical thinking']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%reader%' OR LOWER(c.title) LIKE '%club%';

-- Toastmaster
UPDATE course_metadata cm
SET 
  age_min = 10,
  age_max = 18,
  skills_developed = ARRAY['public_speaking', 'leadership', 'communication', 'confidence', 'critical_thinking'],
  interests = ARRAY['leadership', 'communication', 'personal_development'],
  learning_style = ARRAY['interactive', 'practice-based', 'social'],
  personality_traits = ARRAY['ambitious', 'confident', 'social', 'expressive'],
  time_commitment = 'medium',
  difficulty_level = 'intermediate',
  benefits = ARRAY['Develops advanced public speaking skills', 'Builds leadership capabilities', 'Enhances professional communication', 'Boosts self-confidence and presence']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%toastmaster%';

-- Sholak (assuming it's a specialized course)
UPDATE course_metadata cm
SET 
  age_min = 6,
  age_max = 16,
  skills_developed = ARRAY['specialized_skill', 'discipline', 'focus'],
  interests = ARRAY['specialized', 'cultural', 'traditional'],
  learning_style = ARRAY['hands-on', 'practice-based', 'structured'],
  personality_traits = ARRAY['disciplined', 'curious', 'dedicated'],
  time_commitment = 'medium',
  difficulty_level = 'beginner',
  benefits = ARRAY['Develops specialized skills', 'Enhances cultural awareness', 'Builds discipline and focus', 'Provides unique learning experience']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%sholak%';

-- Computers
UPDATE course_metadata cm
SET 
  age_min = 6,
  age_max = 18,
  skills_developed = ARRAY['technology', 'coding', 'problem_solving', 'logical_thinking', 'digital_literacy'],
  interests = ARRAY['technology', 'computers', 'programming', 'digital'],
  learning_style = ARRAY['hands-on', 'logical', 'interactive'],
  personality_traits = ARRAY['analytical', 'curious', 'tech_savvy', 'innovative'],
  time_commitment = 'medium',
  difficulty_level = 'beginner',
  benefits = ARRAY['Develops essential digital skills', 'Enhances logical and computational thinking', 'Prepares for future career opportunities', 'Builds problem-solving abilities']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%computer%' OR LOWER(c.title) LIKE '%coding%' OR LOWER(c.title) LIKE '%programming%';

-- Rubiks
UPDATE course_metadata cm
SET 
  age_min = 6,
  age_max = 16,
  skills_developed = ARRAY['spatial_reasoning', 'problem_solving', 'memory', 'speed', 'pattern_recognition'],
  interests = ARRAY['puzzles', 'games', 'intellectual', 'competitive'],
  learning_style = ARRAY['visual', 'hands-on', 'practice-based'],
  personality_traits = ARRAY['analytical', 'patient', 'persistent', 'competitive'],
  time_commitment = 'low',
  difficulty_level = 'beginner',
  benefits = ARRAY['Enhances spatial intelligence', 'Improves problem-solving speed', 'Develops pattern recognition', 'Builds patience and persistence']
FROM courses c
WHERE cm.course_id = c.id AND LOWER(c.title) LIKE '%rubik%' OR LOWER(c.title) LIKE '%cube%';
